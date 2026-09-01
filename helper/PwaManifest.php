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
        // Alt text for both install-dialog screenshots; they are two crops of
        // one image, so they describe the same thing.
        $screenshotLabel = $view->translate('Newspaper covers and archival documents from the collection');

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
            // Screenshots are what turn Chrome's terse install bar into the
            // richer dialog (a wide one for desktop, a narrow one for Android).
            // They are the homepage hero, duotoned offline by
            // scripts/gen-pwa-icons.js — the icon is a mark, so this is the one
            // place in the PWA where the collection's own material can show.
            // The `sizes` strings below must match the files that script emits;
            // it asserts they do, and fails the build if they drift.
            'screenshots' => [
                [
                    'src' => $icon('screenshot-wide.webp'),
                    'sizes' => '1280x720',
                    'type' => 'image/webp',
                    'form_factor' => 'wide',
                    'label' => $screenshotLabel,
                ],
                [
                    'src' => $icon('screenshot-narrow.webp'),
                    'sizes' => '540x960',
                    'type' => 'image/webp',
                    'form_factor' => 'narrow',
                    'label' => $screenshotLabel,
                ],
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
