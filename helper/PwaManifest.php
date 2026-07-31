<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

final class PwaManifest extends AbstractHelper
{
    public function __invoke(object $site): array
    {
        $view = $this->getView();
        $siteTitle = (string) $site->title();
        $acronym = trim((string) $view->themeSetting('site_title_acronym'));
        $shortName = $acronym !== '' ? $acronym : $siteTitle;
        $description = '';
        if (method_exists($site, 'summary') && $site->summary()) {
            $description = (string) $site->summary();
        } elseif ($view->themeSetting('footer_site_info')) {
            $description = trim(strip_tags((string) $view->themeSetting('footer_site_info')));
        }

        $language = $view->lang() ?: 'en';
        $siteBase = rtrim($site->url(), '/') . '/';
        $icon = static fn (string $file): string => $view->assetUrl('img/pwa/' . $file);
        $searchUrl = $view->getHelperPluginManager()->has('iwacSearchUrl')
            ? $view->iwacSearchUrl()
            : $siteBase . 'search';

        return [
            'id' => $siteBase,
            'name' => $siteTitle,
            'short_name' => $shortName,
            'description' => $description,
            'start_url' => $siteBase,
            'scope' => $siteBase,
            'display' => 'standalone',
            'display_override' => ['standalone', 'minimal-ui'],
            'orientation' => 'any',
            'lang' => $language,
            'dir' => str_starts_with(strtolower($language), 'ar') ? 'rtl' : 'ltr',
            'theme_color' => '#fdfcfb',
            'background_color' => '#f7f5f3',
            'categories' => ['education', 'books', 'news'],
            'prefer_related_applications' => false,
            'icons' => [
                ['src' => $icon('icon-192.png'), 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => $icon('icon-512.png'), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => $icon('icon-maskable-192.png'), 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'maskable'],
                ['src' => $icon('icon-maskable-512.png'), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
                ['src' => $icon('icon-monochrome-512.png'), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'monochrome'],
            ],
            'shortcuts' => [
                [
                    'name' => $view->translate('Browse items'),
                    'url' => $siteBase . 'item',
                    'icons' => [['src' => $icon('icon-192.png'), 'sizes' => '192x192', 'type' => 'image/png']],
                ],
                [
                    'name' => $view->translate('Search'),
                    'url' => $searchUrl,
                    'icons' => [['src' => $icon('icon-192.png'), 'sizes' => '192x192', 'type' => 'image/png']],
                ],
            ],
        ];
    }
}
