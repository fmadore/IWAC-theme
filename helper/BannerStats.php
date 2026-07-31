<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Throwable;

final class BannerStats extends AbstractHelper
{
    private const RESOURCE_CLASSES = [
        'items' => [36, 60, 38, 49],
        'index' => [94, 9, 96, 54, 244],
        'references' => [35, 43, 88, 40, 82, 178, 52, 77, 305],
    ];

    private const SUMMARY_KEYS = [
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
        $snapshot = OMEKA_PATH . '/files/iwac-visualizations/collection-overview.json';
        if (!is_readable($snapshot)) {
            return null;
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
