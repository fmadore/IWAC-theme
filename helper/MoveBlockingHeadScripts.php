<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * Take every parser-blocking script out of the <head>, in document order, so
 * layout.phtml can print them at the end of <body> instead.
 *
 * Why the end of <body>: a synchronous script in the <head> holds the first
 * paint until it has downloaded and run. jQuery alone was 31 KB of the ~68 KB
 * of render-blocking bytes, finishing at 1075ms on a throttled Moto G4 — worth
 * ~400ms of mobile FCP. At the end of <body> the same scripts no longer hold
 * the paint, and they still run synchronously, in the order they were
 * enqueued, while the document is loading — which is what every module script
 * was written against.
 *
 * Why not `defer`, which is what 2.19–2.24 did: deferring changes the order in
 * two ways no pass over the <head> can repair.
 *
 * - An inline block cannot be deferred. It runs where it stands, so it now
 *   runs BEFORE every deferred library it follows. The Mapping module's inline
 *   `MappingBasemap.credentials… = ""` threw "MappingBasemap is not defined"
 *   on every place record once mapping-basemap.js was deferred.
 * - A deferred jQuery finds `document.readyState` already "interactive", so it
 *   fires `ready` on a timer instead of waiting for DOMContentLoaded, and that
 *   timer can land between two deferred scripts. mapping-show.js's ready
 *   callback then ran before control.fit-bounds.js had loaded: "L.Control.
 *   FitBounds is not a constructor", and a blank map whenever the race lost.
 *
 * Moving them keeps both properties: inline and external scripts stay
 * interleaved exactly as enqueued, and jQuery loads while the document is
 * still parsing, so `ready` waits for DOMContentLoaded as it always did. The
 * one order that changes is against inline scripts in the page content, which
 * now run before the head's libraries — the same exposure 2.19–2.24 had, and
 * measured then: no inline block on the public site calls `$` or a module
 * library at parse time.
 *
 * Left in the <head>: `type="module"` and scripts with `defer` or `async`
 * (none of them blocks the parser, and they are fetched sooner from there),
 * and data islands (JSON, ld+json, importmap — never executed).
 *
 * Also swaps the theme's citation.js for its minified twin, which the module
 * enqueuing it (IWAC-SEO) cannot know about.
 */
final class MoveBlockingHeadScripts extends AbstractHelper
{
    /** MIME types a browser executes as a classic script. */
    private const CLASSIC_TYPES = [
        '',
        'text/javascript',
        'application/javascript',
        'application/x-javascript',
        'text/ecmascript',
        'application/ecmascript',
    ];

    /**
     * @param \ArrayObject<array-key, mixed> $container headScript()->getContainer():
     *                                                 stdClass items with `type`,
     *                                                 `attributes` and `source`
     * @return list<\stdClass> the scripts removed from it, in document order
     */
    public function __invoke(\ArrayObject $container): array
    {
        $kept = [];
        $moved = [];
        foreach ($container->getArrayCopy() as $key => $item) {
            // Laminas' HeadScript stores each script as a stdClass.
            if (!$item instanceof \stdClass) {
                $kept[$key] = $item;
                continue;
            }
            $attributes = isset($item->attributes) && is_array($item->attributes) ? $item->attributes : [];
            $src = (string) ($attributes['src'] ?? '');
            // Only the THEME's copy — a module shipping its own citation.js
            // keeps the file it asked for.
            if (strpos($src, '/themes/') !== false && strpos($src, 'asset/js/citation.js') !== false) {
                $item->attributes['src'] = str_replace('asset/js/citation.js', 'asset/js/dist/citation.min.js', $src);
            }
            if ($this->blocksParser($item, $attributes, $src)) {
                $moved[] = $item;
            } else {
                $kept[$key] = $item;
            }
        }
        $container->exchangeArray($kept);
        return $moved;
    }

    /** @param array<string, mixed> $attributes */
    private function blocksParser(\stdClass $item, array $attributes, string $src): bool
    {
        $type = strtolower(trim((string) ($item->type ?? $attributes['type'] ?? '')));
        if (!in_array($type, self::CLASSIC_TYPES, true)) {
            return false;
        }
        // Without a src, `defer` and `async` mean nothing: an inline block runs
        // where it stands, so it has to travel with the libraries it follows.
        if ($src === '') {
            return true;
        }
        return empty($attributes['defer']) && empty($attributes['async']);
    }
}
