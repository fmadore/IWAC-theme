<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * Where the Linked resources block keeps its state in the query string — the
 * one place that decides it, read by the block's template (which page to ask
 * core for) and by common/linked-resources (its pager, its relation chips,
 * and the data-query-params linked-resources.js composes addresses from).
 *
 * The block pages through `lr_page`, not core's `page`. An item set's page
 * carries two paginated listings — this block and the ledger of the set's
 * items, which core's browse pages through `page` — and while they shared the
 * parameter, turning the ledger to page 2 also asked the block for its page
 * 2: past its last row on nearly every set, so an empty table.
 *
 * `page` is still read where nothing else claims it — item and media pages,
 * where the block is the only listing — so a link or bookmark made before the
 * rename lands on the page it named. There `page` is the block's retired
 * spelling: dropped from every URL the block builds, so the first navigation
 * moves the address onto `lr_page`, and a relation chip (which resets the
 * block to its first page) cannot inherit a stale page number. On an item
 * set's page `page` is the ledger's, and the block neither reads nor drops it.
 */
class LinkedResourcesPaging extends AbstractHelper
{
    /** The block's page number. */
    public const PAGE = 'lr_page';

    /** Core's relation filter: a compound "<resource type>:<property ids>" id. */
    public const FILTER = 'resource_property';

    /** The block's page number before the rename, honoured where unambiguous. */
    public const LEGACY_PAGE = 'page';

    /**
     * @return array{param: string, filter: string, page: int, params: list<string>,
     *     drop: list<string>, query: array<string, mixed>}
     *   - param:  the query parameter the block's pager writes
     *   - filter: the query parameter its relation chips write
     *   - page:   the page to render, 1 or more
     *   - params: every query parameter that holds the block's state
     *   - drop:   what a block URL must not carry over from the current query
     *             (its page, and the retired spelling where it was read)
     *   - query:  the current query without `drop` — the base of every block
     *             URL, so the rest of the page's state (the ledger's page, its
     *             sort) rides along unchanged
     */
    public function __invoke(object $resource): array
    {
        $params = $this->getView()->params();
        $ownsLegacy = $resource->resourceName() !== 'item_sets';

        $page = $params->fromQuery(self::PAGE);
        if (($page === null || $page === '') && $ownsLegacy) {
            $page = $params->fromQuery(self::LEGACY_PAGE);
        }

        $drop = $ownsLegacy ? [self::PAGE, self::LEGACY_PAGE] : [self::PAGE];
        $query = (array) $params->fromQuery();
        foreach ($drop as $name) {
            unset($query[$name]);
        }

        return [
            'param' => self::PAGE,
            'filter' => self::FILTER,
            // An array (?lr_page[]=2) or a word is not a page; neither is 0.
            'page' => is_numeric($page) ? max(1, (int) $page) : 1,
            'params' => [self::PAGE, self::FILTER],
            'drop' => $drop,
            'query' => $query,
        ];
    }
}
