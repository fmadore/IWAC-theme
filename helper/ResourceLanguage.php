<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Throwable;

/**
 * The language a resource's own text is written in, as a BCP 47 tag.
 *
 * The collection's titles and transcripts are untagged — a French article on
 * the English site rendered "La Tabaski à Ouagadougou" and its full text under
 * <html lang="en-US">, so screen readers read French with English rules (WCAG
 * 3.1.2). What the record does carry is a `dcterms:language` value linked to a
 * language authority, and those authorities hold their ISO 639 code as
 * `dcterms:alternative` ("fr", "ar", "dyu"…). That code is what this returns.
 *
 * Three authorities carry no usable code — Mooré ("Moore"), Kabyè ("Kabiye")
 * and Espagnol (none) — so a small map keyed by the authority's French and
 * English names fills in for those, and doubles as the reading of a literal
 * language value. Codes are ISO 639-1 where one exists, else ISO 639-3, both
 * valid BCP 47 primary subtags.
 *
 * A record in several languages returns '' — which one its title is in is not
 * something the record says, and no `lang` beats a wrong one. So does any
 * failure: a missing language is a pronunciation nuisance, not a broken page.
 *
 *     $this->ResourceLanguage($item)        // "fr", or ''
 *     $this->ResourceLanguage($item, true)  // ' lang="fr" dir="auto"', or ''
 *
 * The attribute form is empty when the language is the page's own (by primary
 * subtag), so a French record on the French site adds nothing to the markup.
 */
final class ResourceLanguage extends AbstractHelper
{
    /** Authority names (lowercased) → BCP 47, for authorities without a usable code. */
    private const NAMED = [
        'français' => 'fr', 'french' => 'fr',
        'anglais' => 'en', 'english' => 'en',
        'arabe' => 'ar', 'arabic' => 'ar',
        'allemand' => 'de', 'german' => 'de',
        'italien' => 'it', 'italian' => 'it',
        'espagnol' => 'es', 'spanish' => 'es',
        'slovène' => 'sl', 'slovene' => 'sl',
        'haoussa' => 'ha', 'hausa' => 'ha',
        'dioula' => 'dyu', 'dyula' => 'dyu',
        'ewé' => 'ee', 'ewe' => 'ee',
        'dendi' => 'ddn',
        'mooré' => 'mos', 'moore' => 'mos',
        'kabyè' => 'kbp', 'kabiyé' => 'kbp', 'kabiye' => 'kbp',
    ];

    /** A bare language subtag: what an authority's code or a literal value may be. */
    private const SUBTAG = '/^[a-z]{2,3}$/';

    /** @var array<int,string> authority id => code ('' when it has none), per request */
    private array $authorityCodes = [];

    /**
     * @param object|null $resource an item or media representation
     * @param bool $asAttribute return ` lang="…" dir="auto"` (or '') instead of the code
     */
    public function __invoke(?object $resource, bool $asAttribute = false): string
    {
        $code = $resource ? $this->codeFor($resource) : '';
        if (!$asAttribute) {
            return $code;
        }
        $attributes = $this->attributesFor($code);
        // The code matched SUBTAG, so it needs no escaping.
        return $attributes ? ' lang="' . $attributes['lang'] . '" dir="auto"' : '';
    }

    /**
     * The same, as an attribute array for helpers that take one
     * (`$resource->link($text, null, $attributes)`):
     *
     *     $this->plugin('ResourceLanguage')->attributes($item)  // ['lang' => 'fr', 'dir' => 'auto'], or []
     *
     * @return array<string,string>
     */
    public function attributes(?object $resource): array
    {
        return $this->attributesFor($resource ? $this->codeFor($resource) : '');
    }

    /** @return array<string,string> */
    private function attributesFor(string $code): array
    {
        if ($code === '' || $code === $this->pageLanguage()) {
            return [];
        }
        return ['lang' => $code, 'dir' => 'auto'];
    }

    private function codeFor(object $resource): string
    {
        try {
            $codes = [];
            foreach ($this->languageValues($resource) as $value) {
                $code = $this->valueCode($value);
                if ($code !== '') {
                    $codes[$code] = true;
                }
            }
            // A media has no language of its own; it is a page of its item.
            if (!$codes && method_exists($resource, 'item') && method_exists($resource, 'resourceName')
                && $resource->resourceName() === 'media'
            ) {
                $item = $resource->item();
                return is_object($item) ? $this->codeFor($item) : '';
            }
            return count($codes) === 1 ? (string) array_key_first($codes) : '';
        } catch (Throwable $error) {
            return '';
        }
    }

    /** @return iterable<mixed> */
    private function languageValues(object $resource): iterable
    {
        if (!method_exists($resource, 'value')) {
            return [];
        }
        $values = $resource->value('dcterms:language', ['all' => true]);
        return is_iterable($values) ? $values : [];
    }

    private function valueCode(mixed $value): string
    {
        if (!is_object($value)) {
            return '';
        }
        $authority = method_exists($value, 'valueResource') ? $value->valueResource() : null;
        if (is_object($authority)) {
            $id = (int) $authority->id();
            if (!isset($this->authorityCodes[$id])) {
                $this->authorityCodes[$id] = $this->authorityCode($authority);
            }
            return $this->authorityCodes[$id];
        }
        return $this->literalCode(method_exists($value, 'value') ? (string) $value->value() : '');
    }

    private function authorityCode(object $authority): string
    {
        $alternatives = $authority->value('dcterms:alternative', ['all' => true]);
        foreach (is_iterable($alternatives) ? $alternatives : [] as $alternative) {
            $candidate = strtolower(trim((string) $alternative));
            if (preg_match(self::SUBTAG, $candidate)) {
                return $candidate;
            }
        }
        return $this->literalCode((string) $authority->displayTitle());
    }

    private function literalCode(string $text): string
    {
        $text = mb_strtolower(trim($text));
        if (preg_match(self::SUBTAG, $text)) {
            return $text;
        }
        return self::NAMED[$text] ?? '';
    }

    /** The page's primary subtag: "en" for an en-US site, "fr" for a fr one. */
    private function pageLanguage(): string
    {
        try {
            $lang = (string) $this->getView()->lang();
        } catch (Throwable $error) {
            return '';
        }
        return strtolower(explode('-', str_replace('_', '-', trim($lang)))[0]);
    }
}
