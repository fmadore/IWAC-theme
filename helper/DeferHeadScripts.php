<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * Defer every external classic script in the <head>, so that all of them run
 * after the (deferred) jQuery, in document order.
 *
 * layout.phtml defers jQuery and Omeka's global.js (worth ~400ms of mobile FCP;
 * the reasoning is beside the prependFile() calls there). A classic script a
 * module enqueues through headScript() is otherwise synchronous: it runs while
 * the parser is still in the <head>, BEFORE the deferred jQuery, and any
 * top-level `$(…)` in it throws. That is what blanked every place record from
 * 2.19 to 2.23 — the Mapping module's mapping-show.js opens with
 * `$(document).ready(…)`, threw "$ is not defined", and left #mapping-map a
 * 700px empty box. Its five Leaflet files and MappingModule.js had no jQuery
 * dependency, so they survived; only the one script that needed jQuery broke.
 *
 * Deferring all of them restores the one property those scripts were written
 * against — they run after jQuery and in the order they were enqueued — since
 * deferred classic scripts execute in document order once parsing is done,
 * before DOMContentLoaded (so `$(document).ready` callbacks still fire).
 *
 * Left alone: inline blocks (nothing to defer), `type="module"` (already
 * deferred), data islands (JSON, ld+json, importmap — not executed), and
 * scripts that asked for `async` (they opted out of ordering on purpose).
 *
 * The one thing deferring could break is an inline block that calls a module's
 * library AT PARSE TIME, since it would now run before the library. None does:
 * on every sampled live page type (home, item with Mirador, place record,
 * browse, item sets, index search, the browse page, 404, both languages) the
 * inline blocks only assign data — Omeka.jsTranslate, Mirador's `miradors`
 * config, IwacSearch's endpoint map — and the namespace bridge in layout.phtml
 * covers the one that assigns onto a deferred global.
 *
 * Also swaps the theme's citation.js for its minified twin, which the module
 * enqueuing it (IWAC-SEO) cannot know about.
 */
final class DeferHeadScripts extends AbstractHelper
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
     * @param iterable<mixed> $container headScript()->getContainer(): stdClass
     *                                   items with `type` and `attributes`
     * @return int how many scripts were deferred by this call
     */
    public function __invoke(iterable $container): int
    {
        $deferred = 0;
        foreach ($container as $item) {
            // Laminas' HeadScript stores each script as a stdClass.
            if (!$item instanceof \stdClass || !isset($item->attributes) || !is_array($item->attributes)) {
                continue;
            }
            $src = (string) ($item->attributes['src'] ?? '');
            if ($src === '') {
                continue;
            }
            $type = strtolower(trim((string) ($item->type ?? $item->attributes['type'] ?? '')));
            if (!in_array($type, self::CLASSIC_TYPES, true)) {
                continue;
            }
            if (!empty($item->attributes['async'])) {
                continue;
            }
            if (empty($item->attributes['defer'])) {
                $item->attributes['defer'] = 'defer';
                $deferred++;
            }
            // Only the THEME's copy — a module shipping its own citation.js
            // keeps the file it asked for.
            if (strpos($src, '/themes/') !== false && strpos($src, 'asset/js/citation.js') !== false) {
                $item->attributes['src'] = str_replace(
                    'asset/js/citation.js',
                    'asset/js/dist/citation.min.js',
                    $src
                );
            }
        }
        return $deferred;
    }
}
