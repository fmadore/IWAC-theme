<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Omeka\Api\Representation\ItemSetRepresentation;
use Throwable;

/**
 * The Hierarchy module's public block, resolved: every grouping node of a
 * hierarchy turned into what its card or chip prints, so
 * view/hierarchy/common/block-layout/hierarchy-public.phtml is markup.
 *
 *     $tree = $this->HierarchyTree($hierarchyData, $allGroupings);
 *     // list of ['label', 'url', 'itemSet', 'count', 'private',
 *     //          'thumbnail', 'category', 'children' => [...same...]]
 *
 * __invoke() reads the view (site settings, the current site, the API, the
 * module's hierarchyHelper, url()); everything it decides with that is a
 * static method taking plain values and callables, tested in
 * test/php/run.php with fakes.
 */
final class HierarchyTree extends AbstractHelper
{
    /**
     * Card category, inferred from the label: the node's own first, then its
     * parent section's. Order matters — the more specific keywords win — and
     * anything unmatched is a newspaper, the collection's bulk. Each key has
     * an icon (`.hierarchy-card__icon--{category}`) for cards without a cover.
     */
    public const CATEGORY_RULES = [
        'photo' => ['photograph', 'photo', 'fotograf', 'image'],
        'reference' => ['référence', 'reference', 'referências', 'referencias', 'notices', 'bibliograph', 'authority'],
        'document' => ['documents divers', 'document', 'documenti', 'archive', 'archivio'],
        'publication' => ['publication islamique', 'publicaciones', 'revue', 'magazine', 'bulletin', 'journal religieux'],
        'newspaper' => ['journal', 'journaux', 'article de presse', 'articles de journaux', 'press', 'presse', 'news', 'prensa'],
    ];

    public const DEFAULT_CATEGORY = 'newspaper';

    /** A grouping's label when the editor marked it private. */
    public const PRIVATE_LABEL = 'privateHGset';

    /**
     * @param array<int, array<string, mixed>> $hierarchyData the module's nested groupings
     * @param mixed $allGroupings passed through to the module's itemSetCount()
     * @return list<array<string, mixed>>
     */
    public function __invoke(array $hierarchyData, mixed $allGroupings): array
    {
        $view = $this->getView();
        $filterLocale = (bool) $view->siteSetting('filter_locale_values');
        $lang = $view->lang();
        $site = $view->currentSite();
        $siteSlug = $site->slug();

        $siteItemSetIds = [];
        foreach ($site->siteItemSets() as $siteItemSet) {
            $siteItemSetIds[] = $siteItemSet->itemSet()->id();
        }

        // A hierarchy of N nodes used to cost up to two API reads PER card
        // (item set + grouping), and top-level leaves resolved twice. Every id
        // is collected up front, each kind fetched in one search, and resolved
        // nodes are memoised.
        [$itemSetIds, $groupingIds] = self::collectIds($hierarchyData);
        /** @var array<int|string, ItemSetRepresentation> $itemSets */
        $itemSets = $this->fetchById('item_sets', $itemSetIds, 'item sets');
        $groupings = $this->fetchById('hierarchy_grouping', $groupingIds, 'groupings');

        /** @var callable(string): string $translate */
        $translate = $view->plugin('translate');
        $context = [
            'itemSets' => $itemSets,
            'groupings' => $groupings,
            'siteItemSetIds' => $siteItemSetIds,
            'linkItemSet' => (bool) $view->siteSetting('hierarchy_link_itemSet'),
            'valueLang' => $filterLocale ? [$lang, ''] : null,
            'translate' => $translate,
            // The module prints a translated " (131 items)"; the integer is
            // parsed back out of it (parseCount). Fragile if the module ever
            // changes the format — counts would disappear, not break.
            'count' => static function (object $grouping) use ($view, $allGroupings): ?int {
                try {
                    return self::parseCount($view->hierarchyHelper()->itemSetCount($grouping, $allGroupings));
                } catch (Throwable $e) {
                    error_log('[IWAC theme] Unable to resolve hierarchy item count: ' . $e->getMessage());
                    return null;
                }
            },
            'url' => static fn (string $route, array $params): string => (string) $view->url($route, ['site-slug' => $siteSlug] + $params),
        ];
        $cache = [];
        $resolve = static function (array $grouping) use ($context, &$cache): array {
            $data = $grouping['data'] ?? [];
            $key = ($data['groupingID'] ?? null) . '|' . ($data['itemSet'] ?? null) . '|' . ($data['label'] ?? '');
            return $cache[$key] ??= self::resolveNode($grouping, $context);
        };
        return self::buildTree($hierarchyData, $resolve);
    }

    /**
     * Every item set id and grouping id in the tree, each once, in order of
     * first appearance.
     *
     * @param array<int, array<string, mixed>> $hierarchyData
     * @return array{0: list<int|string>, 1: list<int|string>}
     */
    public static function collectIds(array $hierarchyData): array
    {
        $itemSets = [];
        $groupings = [];
        $walk = static function (array $grouping) use (&$walk, &$itemSets, &$groupings): void {
            $data = $grouping['data'] ?? [];
            if (!empty($data['itemSet'])) {
                $itemSets[$data['itemSet']] = true;
            }
            if (!empty($data['groupingID'])) {
                $groupings[$data['groupingID']] = true;
            }
            foreach ($grouping['children'] ?? [] as $child) {
                $walk($child);
            }
        };
        foreach ($hierarchyData as $topLevel) {
            $walk($topLevel);
        }
        return [array_keys($itemSets), array_keys($groupings)];
    }

    /**
     * One grouping node as its card prints it.
     *
     * @param array<string, mixed> $grouping
     * @param array{itemSets: array<int|string, ItemSetRepresentation>, groupings: array<int|string, object>,
     *     siteItemSetIds: list<mixed>, linkItemSet: bool, valueLang: mixed,
     *     translate: callable(string): string, count: callable(object): ?int,
     *     url: callable(string, array<string, mixed>): string} $context
     * @return array{label: string, url: ?string, itemSet: ?ItemSetRepresentation, count: ?int, private: bool}
     */
    public static function resolveNode(array $grouping, array $context): array
    {
        $data = $grouping['data'] ?? [];
        $groupingId = $data['groupingID'] ?? null;
        $itemSetId = $data['itemSet'] ?? null;
        $customLabel = (string) ($data['label'] ?? '');
        $translate = $context['translate'];

        $itemSet = null;
        $private = false;
        if ($itemSetId) {
            $itemSet = $context['itemSets'][$itemSetId] ?? null;
            if (!$itemSet) {
                // Not found, or not visible to this visitor.
                $private = true;
            } elseif ($context['siteItemSetIds'] && !in_array($itemSet->id(), $context['siteItemSetIds'], true)) {
                // Not one of this site's item sets.
                $itemSet = null;
                $private = true;
            }
        }

        $label = $customLabel;
        if ($label === self::PRIVATE_LABEL) {
            $label = $translate('(Private)');
            $private = true;
        }
        if ($label === '') {
            $label = $itemSet ? (string) $itemSet->displayTitle(null, $context['valueLang']) : $translate('[Untitled]');
        }

        $count = null;
        if ($groupingId && isset($context['groupings'][$groupingId])) {
            $count = ($context['count'])($context['groupings'][$groupingId]);
        }

        $url = null;
        if (!$private) {
            if ($itemSet && $context['linkItemSet']) {
                $url = ($context['url'])('site/resource-id', ['controller' => 'item-set', 'id' => $itemSet->id()]);
            } elseif (($itemSet || $customLabel !== '') && $groupingId) {
                $url = ($context['url'])('site/hierarchy', ['grouping-id' => $groupingId]);
            }
        }

        return ['label' => (string) $label, 'url' => $url, 'itemSet' => $itemSet, 'count' => $count, 'private' => $private];
    }

    /**
     * The resolved tree: each node with its cover, its category (from its own
     * label, then its parent's) and its children, recursively.
     *
     * @param array<int, array<string, mixed>> $groupings
     * @param callable(array<string, mixed>): array{label: string, url: ?string, itemSet: ?ItemSetRepresentation, count: ?int, private: bool} $resolve
     * @return list<array<string, mixed>>
     */
    public static function buildTree(array $groupings, callable $resolve, ?string $parentLabel = null): array
    {
        $nodes = [];
        foreach ($groupings as $grouping) {
            $node = $resolve($grouping);
            $node['thumbnail'] = self::thumbnailUrl($node['itemSet']);
            $node['category'] = self::categoryFor($node['label'], $parentLabel);
            $node['children'] = self::buildTree($grouping['children'] ?? [], $resolve, $node['label']);
            $nodes[] = $node;
        }
        return $nodes;
    }

    /** The integer in the module's " (1,234 items)", or null. */
    public static function parseCount(?string $formatted): ?int
    {
        if ($formatted && preg_match('/(\d[\d\s,\.]*)/', $formatted, $m)) {
            return (int) preg_replace('/\D+/', '', $m[1]);
        }
        return null;
    }

    /** One of CATEGORY_RULES' keys. */
    public static function categoryFor(string $nodeLabel, ?string $parentLabel = null): string
    {
        $haystack = mb_strtolower($nodeLabel . ' | ' . ($parentLabel ?? ''));
        foreach (self::CATEGORY_RULES as $category => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($haystack, $needle)) {
                    return $category;
                }
            }
        }
        return self::DEFAULT_CATEGORY;
    }

    /**
     * The card cover: the item set's square thumbnail (already cropped, and
     * small), else its medium one, else none.
     *
     * @param ItemSetRepresentation|null $itemSet
     */
    public static function thumbnailUrl(?object $itemSet): ?string
    {
        if (!$itemSet) {
            return null;
        }
        return $itemSet->thumbnailDisplayUrl('square') ?: $itemSet->thumbnailDisplayUrl('medium');
    }

    /**
     * @param list<int|string> $ids
     * @return array<int|string, object> id => representation; empty on failure
     */
    private function fetchById(string $resource, array $ids, string $what): array
    {
        if (!$ids) {
            return [];
        }
        $map = [];
        try {
            foreach ($this->getView()->api()->search($resource, ['id' => $ids])->getContent() as $representation) {
                $map[$representation->id()] = $representation;
            }
        } catch (Throwable $e) {
            error_log("[IWAC theme] Unable to preload hierarchy {$what}: " . $e->getMessage());
        }
        return $map;
    }
}
