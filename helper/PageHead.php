<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Omeka\Api\Representation\SitePageBlockRepresentation;
use Omeka\Api\Representation\SitePageRepresentation;
use Omeka\Api\Representation\SiteRepresentation;
use Throwable;

/**
 * The plate page head: when a site page opens on its page-title block, that
 * block is printed as a slim full-bleed band in the hero's press-plate recipe
 * (components/banner/_page-head.scss), carrying the page's breadcrumb above
 * its title.
 *
 * Two templates ask the same question and must agree, or a page prints its
 * crumb twice or not at all:
 *   - common/block-layout/page-title.phtml: is THIS block the plate?
 *   - omeka/site/page/show.phtml (core's, overridden): does this page open
 *     on the plate? Then the plate prints the crumb and show.phtml does not.
 * Both answers come from opensWithTitle(), and the trail both print comes
 * from trail(), so the decision lives in one place.
 *
 * The rules, as pure statics with tests in test/php/run.php:
 *   - only the page's FIRST block, and only when it is a page title — a title
 *     placed further down keeps the h1.title section-head voice;
 *   - never on the site's homepage, which carries the hero;
 *   - the trail is core's: the current page's ancestors in the site
 *     navigation, empty for a top-level page or one not in the navigation
 *     (core prints no crumb at depth 0 either).
 *
 * Any failure degrades to "no plate": the page renders today's h1 and core's
 * crumb placement, never a broken page.
 */
final class PageHead extends AbstractHelper
{
    public const TITLE_LAYOUT = 'pageTitle';

    public function __invoke(): self
    {
        return $this;
    }

    /**
     * Whether $block is the plate: the opening page-title block of a section
     * page.
     *
     * @param SitePageBlockRepresentation|null $block
     */
    public function isPlate(?object $block): bool
    {
        try {
            if (!$block || !method_exists($block, 'page')) {
                return false;
            }
            $page = $block->page();
            $first = $page->blocks()[0] ?? null;
            if (!$first || $first->id() !== $block->id()) {
                return false;
            }
            return $this->opensWithPlate($page);
        } catch (Throwable $error) {
            return false;
        }
    }

    /**
     * Whether $page opens on the plate.
     *
     * @param SitePageRepresentation $page
     */
    public function opensWithPlate(object $page): bool
    {
        try {
            $layouts = [];
            foreach ($page->blocks() as $block) {
                $layouts[] = (string) $block->layout();
            }
            $site = $this->getView()->currentSite();
            $isHomepage = $site && self::homepageSlug($site) === $page->slug();
            return self::opensWithTitle($layouts, $isHomepage);
        } catch (Throwable $error) {
            return false;
        }
    }

    /**
     * The current page's crumb trail in the site navigation.
     *
     * @return list<array{label:string,url:?string}>
     */
    public function crumbs(): array
    {
        try {
            $site = $this->getView()->currentSite();
            if (!$site) {
                return [];
            }
            $nav = $site->publicNav();
            $active = $nav->findActive($nav->getContainer());
            return self::trail(is_array($active) ? ($active['page'] ?? null) : null);
        } catch (Throwable $error) {
            return [];
        }
    }

    /**
     * Omeka's homepage, as the site root resolves it (Site\IndexController):
     * the configured homepage, else the first page linked in the navigation.
     * layout.phtml decides where the hero goes by the same answer.
     *
     * @param SiteRepresentation $site
     */
    public static function homepageSlug(object $site): ?string
    {
        $homepage = $site->homepage();
        if (!$homepage) {
            $linked = $site->linkedPages();
            $homepage = $linked ? reset($linked) : null;
        }
        return $homepage ? (string) $homepage->slug() : null;
    }

    /**
     * A page opens on the plate when its first block is a page title and it
     * is not the homepage.
     *
     * @param list<string> $layouts the page's block layouts, in order
     */
    public static function opensWithTitle(array $layouts, bool $isHomepage): bool
    {
        return !$isHomepage && ($layouts[0] ?? null) === self::TITLE_LAYOUT;
    }

    /**
     * The crumbs for a Laminas navigation page: each ancestor that is itself
     * a page, root first, as a link, then the page itself without one. A page
     * whose parent is the container (depth 0) has no trail — a lone current
     * crumb is decoration, not wayfinding — and neither has no page at all.
     *
     * @param object|null $active a Laminas\Navigation\Page\AbstractPage
     * @return list<array{label:string,url:?string}>
     */
    public static function trail(?object $active): array
    {
        if (!$active || !method_exists($active, 'getLabel')) {
            return [];
        }
        $crumbs = [['label' => (string) $active->getLabel(), 'url' => null]];
        $page = $active;
        while (method_exists($page, 'getParent') && ($parent = $page->getParent())) {
            if (!method_exists($parent, 'getLabel') || !method_exists($parent, 'getHref')) {
                break; // the container: the root of the navigation
            }
            array_unshift($crumbs, ['label' => (string) $parent->getLabel(), 'url' => (string) $parent->getHref()]);
            $page = $parent;
        }
        return count($crumbs) > 1 ? $crumbs : [];
    }

    /**
     * A CSS `url("…")` for an admin-uploaded banner, to print into the
     * layout's inline <style> as the plate's image — or null for anything
     * that is not a plain http(s) or path-absolute URL. The value lands in a
     * <style> element, where HTML escaping does nothing, so quotes,
     * backslashes, parentheses, angle brackets, whitespace and control
     * characters are refused rather than escaped.
     */
    public static function imageValue(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }
        if (!preg_match('~\A(?:https?://[^/\s]|/(?!/))[^\s"\'()<>\\\\\x00-\x1F\x7F]*\z~', $url)) {
            return null;
        }
        return 'url("' . $url . '")';
    }
}
