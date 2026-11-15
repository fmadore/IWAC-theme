<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * How the footer sets the site menu Omeka rendered for it.
 *
 *     <?php $menu = $this->FooterMenu($site->publicNav()->menu()->renderMenu(…)); ?>
 *     <nav class="main-footer__menu main-footer__menu--<?php echo $menu['layout']; ?>">
 *         <?php echo $menu['html']; ?>
 *
 * Two layouts, decided by the markup rather than by the depth setting (a
 * depth of 2 over a menu with no sub-pages is still a flat list):
 *
 *   - "index":   no top-level entry has children. The menu is one row of
 *                section links and is printed as rendered.
 *   - "sitemap": at least one entry has children. Top-level entries are
 *                column heads over their sub-pages, and an entry WITHOUT
 *                children (References, Index, …) would be a head over an
 *                empty column — so those are gathered into one column of
 *                plain links, standing where the first of them stood.
 *
 * The gathering is a DOM round-trip on the renderer's own well-formed markup;
 * if anything about it fails, the menu is returned as rendered.
 *
 * Pure static so test/php/run.php can pin it without a view; footer.phtml
 * calls it through the invokable, which also guarantees Omeka has required
 * this file (see CLAUDE.md, "a helper's statics need the helper loaded").
 */
final class FooterMenu extends AbstractHelper
{
    public const LAYOUT_INDEX = 'index';
    public const LAYOUT_SITEMAP = 'sitemap';

    /** @return array{html: string, layout: string} */
    public function __invoke(mixed $html): array
    {
        return self::arrange(is_string($html) ? $html : '');
    }

    /** @return array{html: string, layout: string} */
    public static function arrange(string $html): array
    {
        $asRendered = ['html' => $html, 'layout' => self::LAYOUT_INDEX];
        if (trim($html) === '' || !class_exists(\DOMDocument::class)) {
            return $asRendered;
        }
        $doc = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $loaded = $doc->loadHTML(
            '<?xml encoding="utf-8"?><div id="footer-menu-root">' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $root = $loaded ? $doc->getElementById('footer-menu-root') : null;
        if (!$root) {
            return $asRendered;
        }
        $menu = null;
        foreach ($root->childNodes as $node) {
            if ($node instanceof \DOMElement && $node->tagName === 'ul') {
                $menu = $node;
                break;
            }
        }
        if (!$menu) {
            return $asRendered;
        }

        $childless = [];
        $parents = 0;
        foreach (iterator_to_array($menu->childNodes) as $item) {
            if (!$item instanceof \DOMElement || $item->tagName !== 'li') {
                continue;
            }
            $hasSubmenu = false;
            foreach ($item->childNodes as $child) {
                if ($child instanceof \DOMElement && $child->tagName === 'ul') {
                    $hasSubmenu = true;
                }
            }
            if ($hasSubmenu) {
                $parents++;
            } else {
                $childless[] = $item;
            }
        }
        if ($parents === 0) {
            return $asRendered;
        }
        if (!$childless) {
            return ['html' => $html, 'layout' => self::LAYOUT_SITEMAP];
        }

        $column = $doc->createElement('li');
        $column->setAttribute('class', 'main-footer__menu-links');
        $list = $doc->createElement('ul');
        $column->appendChild($list);
        $menu->insertBefore($column, $childless[0]);
        foreach ($childless as $item) {
            $list->appendChild($item);
        }
        $out = '';
        foreach ($root->childNodes as $node) {
            $out .= $doc->saveHTML($node);
        }
        return ['html' => $out, 'layout' => self::LAYOUT_SITEMAP];
    }
}
