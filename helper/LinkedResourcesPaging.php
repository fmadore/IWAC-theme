<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Omeka\Api\Representation\AbstractResourceEntityRepresentation;

/**
 * Where the Linked resources block keeps its state in the query string — the
 * one place that decides it, read by the block's template (what to ask core
 * for) and by common/linked-resources (its query, its pager, its relation
 * chips, its search form, and the data-query-params linked-resources.js
 * composes addresses from).
 *
 * The block's state is four parameters:
 *
 * - `lr_page`: its page. Not core's `page`: an item set's page carries two
 *   paginated listings — this block and the ledger of the set's items, which
 *   core's browse pages through `page` — and while they shared the parameter,
 *   turning the ledger to page 2 also asked the block for its page 2: past
 *   its last row on nearly every set, so an empty table.
 * - `resource_property`: core's relation filter, a compound
 *   "<resource type>:<property ids>" id.
 * - `lr_q`: a title search over EVERY linked item, not the rows on screen.
 * - `lr_sort`: one of SORTS, again over every linked item.
 *
 * The last two exist because core's displaySubjectValues() takes neither a
 * search nor an order: it lists one page, grouped by relation, and through 2.24
 * the block's title filter and sort could only rearrange those 25 rows (241
 * linked resources on item/1023, so a tenth of them). The items that link here
 * are now listed through the API's item search instead — see apiQuery().
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

    /** The title search. */
    public const SEARCH = 'lr_q';

    /** The order, one of SORTS' keys. */
    public const SORT = 'lr_sort';

    /** The block's page number before the rename, honoured where unambiguous. */
    public const LEGACY_PAGE = 'page';

    /** Rows a page. */
    public const PER_PAGE = 25;

    /**
     * Sort key => [the API's sort_by, sort_order]. Newest first by default:
     * the order the archive's own search defaults to, and the one a reader of
     * a person's or a newspaper's record most often wants.
     */
    public const SORTS = [
        'date-desc' => ['dcterms:date', 'desc'],
        'date-asc' => ['dcterms:date', 'asc'],
        'title-asc' => ['title', 'asc'],
        'title-desc' => ['title', 'desc'],
    ];

    public const DEFAULT_SORT = 'date-desc';

    /** A search is a title fragment, not a document: anything longer is cut. */
    private const MAX_SEARCH = 100;

    /**
     * @return array{param: string, filter: string, search: string, sort: string,
     *     page: int, perPage: int, q: string, sortKey: string,
     *     resourceProperty: ?string, params: list<string>, drop: list<string>,
     *     query: array<string, mixed>}
     *   - param:  the query parameter the block's pager writes
     *   - filter: the query parameter its relation chips write
     *   - search / sort: the parameters its search form writes
     *   - page:   the page to render, 1 or more
     *   - perPage: rows a page
     *   - q:      the title search, trimmed ('' for none)
     *   - sortKey: the order, always a key of SORTS
     *   - resourceProperty: the relation filter as a string, or null
     *   - params: every query parameter that holds the block's state
     *   - drop:   what a block URL must not carry over from the current query
     *             (its page, and the retired spelling where it was read)
     *   - query:  the current query without `drop` — the base of every block
     *             URL, so the rest of the page's state (the ledger's page, its
     *             sort, the block's own search) rides along unchanged
     *
     * @param AbstractResourceEntityRepresentation $resource
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

        $q = $params->fromQuery(self::SEARCH);
        $q = is_string($q) ? trim((string) preg_replace('/\s+/u', ' ', $q)) : '';
        $q = mb_substr($q, 0, self::MAX_SEARCH);

        $sort = $params->fromQuery(self::SORT);
        $sortKey = is_string($sort) && isset(self::SORTS[$sort]) ? $sort : self::DEFAULT_SORT;

        // An array (?resource_property[]=…) is not a filter; core would
        // strpos() it and fail.
        $resourceProperty = $params->fromQuery(self::FILTER);
        $resourceProperty = is_string($resourceProperty) && $resourceProperty !== '' ? $resourceProperty : null;

        return [
            'param' => self::PAGE,
            'filter' => self::FILTER,
            'search' => self::SEARCH,
            'sort' => self::SORT,
            // An array (?lr_page[]=2) or a word is not a page; neither is 0.
            'page' => is_numeric($page) ? max(1, (int) $page) : 1,
            'perPage' => self::PER_PAGE,
            'q' => $q,
            'sortKey' => $sortKey,
            'resourceProperty' => $resourceProperty,
            'params' => [self::PAGE, self::FILTER, self::SEARCH, self::SORT],
            'drop' => $drop,
            'query' => $query,
        ];
    }

    /**
     * The API item search for one page of the items linking to $objectId:
     * through $propertyId, or through any property when it is 0, their title
     * containing $q, in $sortKey's order.
     *
     * `res` with no property is core's "has any value pointing at this
     * resource", the same relation displaySubjectValues() lists — but as an
     * item search, so it filters, orders and pages over every item at once.
     * Core's search counts each item once, where displaySubjectValues()
     * counted values (an article linking a person as both subject and author
     * was two rows).
     *
     * The title is matched on dcterms:title, which every IWAC template uses
     * as its title property. `in` is a LIKE, which the database collation
     * makes case- and accent-insensitive: "cote" finds "Côte d'Ivoire".
     *
     * limit/offset, never page/per_page: the API sets page and per_page on
     * core's one shared Omeka\Paginator — the object the pagination() helper
     * renders from — so on an item set's page this query would reconfigure
     * the ledger's pager, exactly as the block's own pagination() call once
     * did (see common/linked-resources).
     *
     * @return array<string, mixed>
     */
    public static function apiQuery(
        int $objectId,
        int $propertyId,
        string $q,
        string $sortKey,
        int $page,
        int $perPage,
        ?int $siteId = null
    ): array {
        [$sortBy, $sortOrder] = self::SORTS[$sortKey] ?? self::SORTS[self::DEFAULT_SORT];
        $property = [[
            'joiner' => 'and',
            'property' => $propertyId > 0 ? $propertyId : '',
            'type' => 'res',
            'text' => (string) $objectId,
        ]];
        if ($q !== '') {
            $property[] = ['joiner' => 'and', 'property' => 'dcterms:title', 'type' => 'in', 'text' => $q];
        }
        $query = [
            'property' => $property,
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
            'limit' => max(1, $perPage),
            'offset' => max(0, $page - 1) * max(1, $perPage),
        ];
        if ($siteId) {
            $query['site_id'] = $siteId;
        }
        return $query;
    }

    /**
     * The property id in core's compound relation filter ("3-86,329" → 3,
     * "3" → 3, "" → 0).
     */
    public static function propertyId(?string $compound): int
    {
        return (int) strtok((string) $compound, '-');
    }
}
