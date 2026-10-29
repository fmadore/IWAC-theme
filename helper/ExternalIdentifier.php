<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Omeka\Api\Representation\ValueRepresentation;

/**
 * Recognises the two external identifiers the collection links out to — a DOI
 * and a Wikidata entity — so resource-values.phtml can print them with their
 * scheme's mark instead of core's bare `uri-value-link`.
 *
 * Both are catalogued as URI values: `bibo:doi` holds https://doi.org/10.…
 * and `dcterms:identifier` holds https://www.wikidata.org/wiki/Q…, each
 * labelled with the bare identifier (references, the journals and publishers
 * reconciled with them, and the index entities alike). A bare or `doi:` DOI
 * typed as a literal on `bibo:doi` is read too.
 *
 * The link is rebuilt from the identifier rather than taken from the value, so
 * an http://, dx.doi.org or /entity/ spelling lands on the one canonical
 * address, and the text is the identifier itself whatever the value's label
 * says (the mark already names the scheme). Anything else returns null and
 * keeps core's markup.
 */
final class ExternalIdentifier extends AbstractHelper
{
    private const WIKIDATA = '~^https?://(?:www\.|m\.)?wikidata\.org/(?:wiki|entity)/(?:Special:EntityPage/)?(Q[1-9][0-9]*)/?$~i';

    private const DOI_URL = '~^https?://(?:dx\.)?doi\.org/(10\.[0-9]{4,9}/\S+)$~i';

    private const DOI_LITERAL = '~^(?:doi:\s*)?(10\.[0-9]{4,9}/\S+)$~i';

    /**
     * @param ValueRepresentation $value
     * @return array{scheme:'doi'|'wikidata', id:string, url:string, label:string}|null
     */
    public function __invoke(object $value, string $term = ''): ?array
    {
        $type = method_exists($value, 'type') ? (string) $value->type() : '';
        if ($type === 'uri' && method_exists($value, 'uri')) {
            return self::fromUri((string) $value->uri());
        }
        if ($type === 'literal' && $term === 'bibo:doi' && method_exists($value, 'value')) {
            return self::fromDoiLiteral((string) $value->value());
        }
        return null;
    }

    /** @return array{scheme:'doi'|'wikidata', id:string, url:string, label:string}|null */
    public static function fromUri(string $uri): ?array
    {
        $uri = trim($uri);
        if (preg_match(self::WIKIDATA, $uri, $m)) {
            $qid = strtoupper($m[1]);
            return ['scheme' => 'wikidata', 'id' => $qid, 'url' => 'https://www.wikidata.org/wiki/' . $qid, 'label' => 'Wikidata'];
        }
        if (preg_match(self::DOI_URL, $uri, $m)) {
            return self::doi(rawurldecode($m[1]));
        }
        return null;
    }

    /** @return array{scheme:'doi'|'wikidata', id:string, url:string, label:string}|null */
    public static function fromDoiLiteral(string $text): ?array
    {
        return preg_match(self::DOI_LITERAL, trim($text), $m) ? self::doi($m[1]) : null;
    }

    /**
     * A DOI may carry any printable character. doi.org resolves the common
     * ones (/ ( ) ; :) unencoded; only the characters that end or break a URL
     * path are escaped.
     *
     * @return array{scheme:'doi', id:string, url:string, label:string}
     */
    private static function doi(string $doi): array
    {
        $path = str_replace(['%', '#', '?', '"', '<', '>'], ['%25', '%23', '%3F', '%22', '%3C', '%3E'], $doi);
        return ['scheme' => 'doi', 'id' => $doi, 'url' => 'https://doi.org/' . $path, 'label' => 'DOI'];
    }
}
