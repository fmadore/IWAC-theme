<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
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
 */
final class SitePageBySlug extends AbstractHelper
{
    /** @var array<int,array<string,object>> slug => page representation, per site id */
    private array $pagesBySite = [];

    /**
     * @param list<string> $slugs candidates, in order of preference
     * @param object|null  $site  defaults to the current site
     * @return object|null the matching SitePageRepresentation
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
