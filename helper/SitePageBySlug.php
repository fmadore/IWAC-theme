<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Omeka\Api\Representation\SitePageRepresentation;
use Omeka\Api\Representation\SiteRepresentation;
use Throwable;

/**
 * Find one of this site's pages by slug — the first of several candidates,
 * because the two IWAC sites name the same page differently ("browse" on the
 * English site, "parcourir" on the French one).
 *
 * The banner's stat links and the resource-page breadcrumbs each carried their
 * own copy of this lookup. One pass over the site's pages is memoised per site
 * for the request, so any number of lookups costs a single load. The pages
 * come through Omeka's visibility filter, so a private page never becomes a
 * link a visitor cannot open.
 *
 * Any failure degrades to null: callers render an unlinked figure or a shorter
 * trail, never a broken page.
 *
 * The candidate lists are the constants below. Omeka requires this file only
 * when the helper is first fetched, so a caller fetches it before naming one:
 * `$pageBySlug = $this->plugin('SitePageBySlug');`, then
 * `$pageBySlug(SitePageBySlug::BROWSE)` — never
 * `$this->SitePageBySlug(SitePageBySlug::BROWSE)`, whose argument is evaluated
 * before the fetch.
 */
final class SitePageBySlug extends AbstractHelper
{
    /** The items browse page: "browse" on the English site, "parcourir" on the French one. */
    public const BROWSE = ['browse', 'parcourir'];

    /** The authority index page: "index" on both sites. */
    public const INDEX = ['index'];

    /** The collection-overview dashboard: "collection-overview" (EN), "vue-d-ensemble" (FR). */
    public const OVERVIEW = ['collection-overview', 'vue-d-ensemble'];

    /** @var array<int,array<string,SitePageRepresentation>> slug => page, per site id */
    private array $pagesBySite = [];

    /**
     * @param list<string> $slugs candidates, in order of preference
     * @param SiteRepresentation|null $site defaults to the current site
     * @return SitePageRepresentation|null
     */
    public function __invoke(array $slugs, ?object $site = null): ?object
    {
        try {
            $site ??= $this->getView()->currentSite();
            if (!$site) {
                return null;
            }
            $siteId = (int) $site->id();
            if (!isset($this->pagesBySite[$siteId])) {
                $pages = [];
                foreach ($site->pages() as $page) {
                    $pages[$page->slug()] = $page;
                }
                $this->pagesBySite[$siteId] = $pages;
            }
            foreach ($slugs as $slug) {
                if (isset($this->pagesBySite[$siteId][$slug])) {
                    return $this->pagesBySite[$siteId][$slug];
                }
            }
        } catch (Throwable $error) {
            // Degraded state: the caller renders without the link.
        }
        return null;
    }
}
