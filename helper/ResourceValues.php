<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Omeka\Api\Representation\AbstractResourceEntityRepresentation;
use Omeka\Api\Representation\ValueRepresentation;

/**
 * The decisions behind view/common/resource-values.phtml — which values of a
 * property are shown, in which language, under which label, and how a long
 * transcript is folded — so the template is markup and these are testable
 * (test/php/run.php) without rendering a page.
 *
 *     $context = $this->ResourceValues($resource);   // settings + languages, once per render
 *     ResourceValues::preferSiteLanguage($values, $context['siteLang'], $term);
 *
 * Every static method is pure. __invoke() is the only part that reads the
 * view (settings, the page language, the record's language).
 */
final class ResourceValues extends AbstractHelper
{
    /**
     * Properties whose values are translations of one another rather than
     * distinct data: the AI lede carries one "fr" and one "en" rendering of
     * the same summary, so printing both on a monolingual site doubles the row
     * for no gain. They are narrowed to the site's language whenever they
     * *have* a value in it.
     *
     * Scoped to a named list on purpose. Other properties also come in fr/en
     * pairs (dcterms:description, dcterms:alternative), but there a second
     * language can be genuine source metadata rather than a translation, so
     * they keep every value. Add a term only when its values are known to be
     * translations. Deliberately not Omeka's `filter_locale_values` site
     * setting either: that drops every non-matching value across every
     * property, which would hide French-only source metadata on the English
     * site.
     */
    public const LOCALE_PREFERRED_TERMS = ['bibo:shortDescription'];

    /**
     * The record's own prose — its full text and its descriptions — is written
     * in the record's language, but the corpus stores it untagged, so on the
     * English site a French transcript sat under <html lang="en-US"> and was
     * read with English rules (WCAG 3.1.2). Untagged literal values of these
     * terms take the language of the record's dcterms:language authority
     * (ResourceLanguage). A value's own tag always wins.
     */
    public const RECORD_PROSE_TERMS = ['bibo:content', 'dcterms:description'];

    /**
     * Long transcripts get progressive disclosure. A twelve-page issue's OCR
     * is one unbroken run (item/24073: 41,881 characters, 23,256px, 85% of the
     * page), which pushed "How to cite" 27 viewports down. Above the threshold
     * the value renders as an opening extract plus a native <details> with the
     * rest — <details>, not JS, so the full text stays in the DOM for
     * crawlers, find-in-page and print.
     *
     * 8,000 characters is an order of magnitude above a press article here
     * (item/74601 runs 2,631) and far below an issue transcript, so a piece
     * the reader came to read is never folded. The lede is cut at the last
     * line break inside the first 1,200 characters.
     */
    public const TRANSCRIPT_TERM = 'bibo:content';
    public const TRANSCRIPT_COLLAPSE_MIN = 8000;
    public const TRANSCRIPT_LEDE_MAX = 1200;

    /** U+202F narrow no-break space: locale-neutral digit grouping, as in the homepage stat strip. */
    public const FIGURE_SEP = "\u{202F}";

    /**
     * The settings and languages one render of the values list needs.
     *
     * @param AbstractResourceEntityRepresentation|null $resource
     * @return array{labelInfo: mixed, showLocale: bool, filterLocale: bool, lang: ?string,
     *     showValueAnnotations: bool, siteLang: string, aiGeneratedTerms: list<string>, recordLang: string}
     */
    public function __invoke(?object $resource = null): array
    {
        $view = $this->getView();
        if ($view->status()->isSiteRequest()) {
            $labelInfo = $view->siteSetting('property_label_information');
            $showLocale = (bool) $view->siteSetting('show_locale_label', true);
            $filterLocale = (bool) $view->siteSetting('filter_locale_values');
            $lang = $view->lang();
            $showValueAnnotations = (bool) $view->siteSetting('show_value_annotations', false);
        } else {
            $labelInfo = $view->setting('property_label_information');
            $showLocale = true;
            $filterLocale = false;
            $lang = null;
            $showValueAnnotations = true;
        }
        $siteLang = self::primarySubtag($lang);

        // The record's language, for its untagged prose — '' when unknown,
        // ambiguous, or the page's own.
        $recordLang = (string) $view->ResourceLanguage($resource);
        if ($recordLang === $siteLang) {
            $recordLang = '';
        }

        return [
            'labelInfo' => $labelInfo,
            'showLocale' => $showLocale,
            'filterLocale' => $filterLocale,
            'lang' => $lang === null ? null : (string) $lang,
            'showValueAnnotations' => $showValueAnnotations,
            'siteLang' => $siteLang,
            // Properties produced by an AI pipeline, which get the EU "AI
            // generated" label (AiGeneratedTerms, gated by template id).
            'aiGeneratedTerms' => $view->AiGeneratedTerms($resource),
            'recordLang' => $recordLang,
        ];
    }

    /**
     * A language tag's primary subtag, lowercased: "en" for "en-US" or "en_US".
     *
     * Languages are compared by primary subtag, never by full string. Value
     * tags in this collection are bare ("fr", "en"), but lang() returns the
     * site locale — "en-US" on the English site — so core's exact strcasecmp
     * cannot match an "en" value against it. Omeka stores the locale with an
     * underscore.
     */
    public static function primarySubtag(mixed $lang): string
    {
        $lang = strtolower(trim((string) $lang));
        if ($lang === '') {
            return '';
        }
        return explode('-', str_replace('_', '-', $lang))[0];
    }

    /** True for an untagged value or one in the site's language. */
    public static function inSiteLanguage(mixed $valueLang, string $siteLang): bool
    {
        $valueLang = self::primarySubtag($valueLang);
        return $valueLang === '' || $valueLang === $siteLang;
    }

    /**
     * Core's `filter_locale_values`, by primary subtag: untagged values and
     * values in the site's language. Keys are preserved, as array_filter does.
     *
     * @param array<array-key, ValueRepresentation> $values
     * @return array<array-key, ValueRepresentation>
     */
    public static function filterToSiteLanguage(array $values, string $siteLang): array
    {
        return array_filter($values, static fn ($value): bool => self::inSiteLanguage($value->lang(), $siteLang));
    }

    /**
     * For a LOCALE_PREFERRED_TERMS property that has a value in the site's
     * language: keep untagged values and that language. Any other property,
     * or one with no value in the site language, keeps every value. Returns
     * the values and whether anything was narrowed — after which every
     * surviving language tag repeats <html lang>.
     *
     * @param array<array-key, ValueRepresentation> $values
     * @return array{0: array<array-key, ValueRepresentation>, 1: bool}
     */
    public static function preferSiteLanguage(array $values, string $siteLang, string $term): array
    {
        if (!in_array($term, self::LOCALE_PREFERRED_TERMS, true) || $siteLang === '') {
            return [$values, false];
        }
        $hasSiteLang = false;
        foreach ($values as $value) {
            if (self::primarySubtag($value->lang()) === $siteLang) {
                $hasSiteLang = true;
                break;
            }
        }
        if (!$hasSiteLang) {
            return [$values, false];
        }
        $preferred = self::filterToSiteLanguage($values, $siteLang);
        return [$preferred, count($preferred) !== count($values)];
    }

    /**
     * The label an AI-generated property shows: the EU "AI generated" mark
     * already signals provenance, so a trailing "AI" ("DescriptionAI") is
     * dropped to avoid reading "AI … AI generated".
     */
    public static function displayLabel(string $label, bool $isAiGenerated): string
    {
        return $isAiGenerated ? (string) preg_replace('/\s*AI\s*$/i', '', $label) : $label;
    }

    /**
     * Whether a value's language chip is shown: never on the parsed AI table
     * of contents, and not on a narrowed property where it would only restate
     * <html lang>. Everywhere else it marks a value that departs from the page.
     */
    public static function showLanguageChip(bool $showLocale, mixed $valueLang, bool $isAiToc, bool $narrowed, string $siteLang): bool
    {
        return $showLocale && (bool) $valueLang && !$isAiToc
            && !($narrowed && self::primarySubtag($valueLang) === $siteLang);
    }

    /**
     * The `lang` an untagged literal of the record's own prose takes: the
     * record's language, or '' (no attribute).
     */
    public static function proseLang(string $recordLang, mixed $valueLang, string $valueType, string $term): string
    {
        return ($recordLang !== '' && !$valueLang && 'literal' === $valueType && in_array($term, self::RECORD_PROSE_TERMS, true))
            ? $recordLang
            : '';
    }

    /**
     * A long transcript as [lede, rest, words in rest], or null when the value
     * is shown whole: another property, not a literal, at or under the
     * threshold, or no remainder after the cut.
     *
     * @return array{0: string, 1: string, 2: int}|null
     */
    public static function transcript(string $term, string $valueType, string $text): ?array
    {
        if ($term !== self::TRANSCRIPT_TERM || 'literal' !== $valueType || strlen($text) <= self::TRANSCRIPT_COLLAPSE_MIN) {
            return null;
        }
        [$lede, $rest] = self::splitTranscript($text);
        if ($rest === '') {
            return null;
        }
        return [$lede, $rest, self::countWords($rest)];
    }

    /**
     * Cut at the last line break inside the lede window (or, failing a line
     * break in its last two thirds, the last space). Both are ASCII bytes, so
     * the byte-wise UTF-8 split is safe; with no break opportunity at all the
     * cut is character-wise, so it cannot land mid-codepoint.
     *
     * @return array{0: string, 1: string}
     */
    public static function splitTranscript(string $text): array
    {
        $max = self::TRANSCRIPT_LEDE_MAX;
        $window = substr($text, 0, $max + 200);
        $cut = strrpos($window, "\n");
        if ($cut === false || $cut < (int) ($max / 3)) {
            $cut = strrpos($window, ' ');
        }
        if ($cut === false) {
            return [mb_substr($text, 0, $max), ltrim(mb_substr($text, $max))];
        }
        return [rtrim(substr($text, 0, $cut)), ltrim(substr($text, $cut))];
    }

    public static function countWords(string $text): int
    {
        return preg_match_all('/\S+/u', $text) ?: 0;
    }

    /** "12 345" with the narrow no-break space. */
    public static function formatCount(int $count): string
    {
        return number_format($count, 0, '.', self::FIGURE_SEP);
    }

    /**
     * Swap a linked resource's square thumbnail for the uncropped medium one
     * in its rendered HTML.
     *
     * Core renders a linked resource through linkPretty('square'): a
     * centre-cropped 200px square, so a wide logo lost both ends (the
     * "Bibliothèque du Congrès" source mark read "ARY"). The stylesheet sizes
     * these marks by height, so the medium derivative fits. Done on asHtml()'s
     * output rather than by calling linkPretty('medium'), so whatever modules
     * add on rep.value.html is kept. The URL appears attribute-escaped in the
     * <img>; both spellings are replaced.
     *
     * @param AbstractResourceEntityRepresentation|null $valueResource
     * @param callable(string): string $escapeAttr
     */
    public static function mediumThumbnails(string $html, ?object $valueResource, callable $escapeAttr): string
    {
        if (!$valueResource || !method_exists($valueResource, 'thumbnailDisplayUrl')) {
            return $html;
        }
        $square = (string) $valueResource->thumbnailDisplayUrl('square');
        $medium = (string) $valueResource->thumbnailDisplayUrl('medium');
        if ($square === '' || $medium === '' || $square === $medium) {
            return $html;
        }
        return str_replace([$escapeAttr($square), $square], [$escapeAttr($medium), $medium], $html);
    }
}
