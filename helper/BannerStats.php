<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Throwable;

final class BannerStats extends AbstractHelper
{
    private const RESOURCE_CLASSES = [
        // "Items" is every record a visitor can open as an item page: press
        // articles (36), Islamic publications (60), audiovisual (38),
        // documents (49), photographs (58), and the nine bibliographic
        // reference classes. Authority records (the index) are the one
        // deliberate exclusion — they describe the items, they are not items.
        'items' => [36, 60, 38, 49, 58, 35, 43, 88, 40, 82, 178, 52, 77, 305],
        'index' => [94, 9, 96, 54, 244],
    ];

    /**
     * How long the collection counts may be served from APCu. They change
     * when items are published, not per request; ten minutes of lag on a
     * homepage figure is invisible, two COUNT queries per homepage view are
     * not.
     */
    private const COUNTS_TTL = 600;

    private const SUMMARY_KEYS = [
        'newspapers',
        'references_count',
        'total_words',
        'total_pages',
        'unique_sources',
        'document_types',
        'audiovisual_minutes',
        'languages',
    ];

    /**
     * @return array{counts:?array<string,int>,summary:?array<string,int|float>}
     */
    public function __invoke(): array
    {
        return [
            'counts' => $this->loadCounts(),
            'summary' => $this->loadSummary(),
        ];
    }

    /** @return array<string,int>|null */
    private function loadCounts(): ?array
    {
        // Keyed by installation and class map: one APCu segment can serve
        // several Omeka installs from the same PHP pool, and a changed map
        // must not be answered with the old one's totals.
        $cacheKey = 'iwac-theme:banner-counts:' . md5(
            (defined('OMEKA_PATH') ? OMEKA_PATH : '') . json_encode(self::RESOURCE_CLASSES)
        );
        $useCache = \function_exists('apcu_enabled') && \apcu_enabled();
        if ($useCache) {
            $cached = \apcu_fetch($cacheKey, $hit);
            if ($hit && is_array($cached)) {
                return $cached;
            }
        }

        $counts = $this->queryCounts();
        // Only a real answer is cached — a failed query retries next request.
        if ($useCache && $counts !== null) {
            \apcu_store($cacheKey, $counts, self::COUNTS_TTL);
        }
        return $counts;
    }

    /** @return array<string,int>|null */
    private function queryCounts(): ?array
    {
        try {
            $api = $this->getView()->api();
            $counts = [];
            foreach (self::RESOURCE_CLASSES as $name => $classIds) {
                $counts[$name] = $api->search('items', [
                    'resource_class_id' => $classIds,
                    'is_public' => true,
                    'limit' => 0,
                ])->getTotalResults();
            }
            $counts['countries'] = 6;
            return $counts;
        } catch (Throwable $error) {
            $this->logFailure('collection counts', $error);
            return null;
        }
    }

    /** @return array<string,int|float>|null */
    private function loadSummary(): ?array
    {
        if (!defined('OMEKA_PATH')) {
            return null;
        }
        // Written by IwacVisualizations' "Pull latest data" job. The keys read
        // below are a cross-repository contract: that module's
        // scripts/validate_data.py (NESTED_FIGURES) refuses to publish a
        // snapshot whose `summary` lacks any of SUMMARY_KEYS or carries one
        // that is not a number — except `total_pages`, which the generator
        // emits only when the dataset has a pages column, and which this
        // helper already treats as optional.
        $snapshot = OMEKA_PATH . '/files/iwac-visualizations/collection-overview.json';
        if (!is_readable($snapshot)) {
            return null;
        }

        // The snapshot is the whole collection overview (timeline, countries,
        // treemap…) and changes only when the data is re-synced, yet it was
        // read and JSON-decoded on every homepage view to keep eight numbers.
        // Cache the eight, keyed on the file's mtime so a sync is picked up on
        // the next request rather than after a TTL.
        $mtime = @filemtime($snapshot);
        $cacheKey = 'iwac-theme:banner-summary:' . md5($snapshot . '|' . (string) $mtime);
        $useCache = $mtime !== false && \function_exists('apcu_enabled') && \apcu_enabled();
        if ($useCache) {
            $cached = \apcu_fetch($cacheKey, $hit);
            if ($hit && (is_array($cached) || $cached === false)) {
                return $cached ?: null;
            }
        }

        try {
            $json = file_get_contents($snapshot);
            if ($json === false) {
                return null;
            }
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
            $source = is_array($data['summary'] ?? null) ? $data['summary'] : [];
            $summary = [];
            foreach (self::SUMMARY_KEYS as $key) {
                if (isset($source[$key]) && is_numeric($source[$key])) {
                    $summary[$key] = $source[$key] + 0;
                }
            }
            if ($useCache) {
                // `false` records "parsed, nothing usable" so an empty summary
                // is not re-read on every request either.
                \apcu_store($cacheKey, $summary ?: false, self::COUNTS_TTL);
            }
            return $summary ?: null;
        } catch (Throwable $error) {
            $this->logFailure('collection overview snapshot', $error);
            return null;
        }
    }

    private function logFailure(string $source, Throwable $error): void
    {
        error_log(sprintf('[IWAC theme] Unable to load banner %s: %s', $source, $error->getMessage()));
    }
}
