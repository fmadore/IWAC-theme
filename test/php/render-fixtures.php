<?php
/**
 * Render the theme's templates into the pages the JavaScript behaviour suite
 * loads, so every DOM test drives the markup the live site serves instead of
 * a hand-written imitation of it.
 *
 *     php test/php/render-fixtures.php           write test/fixtures/rendered/  (npm run build:fixtures)
 *     php test/php/render-fixtures.php --check   fail if a committed file differs from a fresh render
 *                                                (npm run check:fixtures)
 *
 * WHY. The JS tests used to build their DOM from strings typed into each test.
 * A renamed data-* hook, class or id in a .phtml then passed the PHP suite
 * (which never reads the scripts) and the JS suite (which never read the
 * template) while breaking the live page. Now a template change rewrites the
 * fixture, the rewrite shows in review, and a hook the scripts no longer find
 * fails `npm test`.
 *
 * HOW. Each fixture is a whole page: the real layout.phtml around a real
 * content template, rendered through FakeView with fake-omeka.php standing in
 * for core and the modules (see its docblock for exactly what is faked). The
 * data is realistic — records, menus and settings modelled on the live sites
 * — and fixed, so a render is byte-for-byte deterministic: no dates, no
 * per-run ids, no version strings, LF line endings whatever the checkout.
 * manifest.json records each fixture's URL (tests load it at that address)
 * and every template that went into it.
 *
 * Templates are the only input that should change a fixture. If a render
 * differs between PHP versions, that is a finding about the templates, not
 * noise — CI runs --check on both ends of the supported range.
 */
declare(strict_types=1);

namespace IwacThemeTest\Fixtures;

use IwacThemeTest\FakeView;

use const IwacThemeTest\ROOT;

require_once __DIR__ . '/FakeView.php';
require_once __DIR__ . '/fake-omeka.php';

const OUT_DIR = ROOT . '/test/fixtures/rendered';

// ---- The two sites ----------------------------------------------------------

/** Everything that differs between the English and the French site. */
function locales(): array
{
    static $locales = null;
    if ($locales !== null) {
        return $locales;
    }
    $en = new Site(1, 'westafrica', 'Islam West Africa Collection',
        'The Islam West Africa Collection (IWAC) is an open-access digital database of archival documents, newspaper articles, Islamic publications and photographs on Islam and Muslims in West Africa.',
        [
            'home' => 'Home', 'browse' => 'Browse', 'benin' => 'Benin', 'burkina-faso' => 'Burkina Faso',
            'cote-d-ivoire' => "Côte d'Ivoire", 'references' => 'References', 'index' => 'Index',
            'exhibits' => 'Exhibits', 'hajj-bf' => 'Hajj in Burkina Faso', 'secularism' => 'Secularism',
            'about' => 'About', 'why_newspapers' => 'Why newspapers?', 'team' => 'Team',
        ],
        [
            ['browse', ['benin', 'burkina-faso', 'cote-d-ivoire']], ['references', []], ['index', []],
            ['exhibits', ['hajj-bf', 'secularism']], ['about', ['why_newspapers', 'team']],
        ],
        'home',
    );
    $fr = new Site(2, 'afrique_ouest', 'Collection Islam Afrique de l’Ouest',
        'La Collection Islam Afrique de l’Ouest (CIAO) est une base de données numérique en libre accès de documents d’archives, d’articles de presse, de publications islamiques et de photographies sur l’islam et les musulmans en Afrique de l’Ouest.',
        [
            'accueil' => 'Accueil', 'parcourir' => 'Parcourir', 'benin' => 'Bénin', 'burkina-faso' => 'Burkina Faso',
            'cote-d-ivoire' => "Côte d'Ivoire", 'references' => 'Références', 'index' => 'Index',
            'expositions' => 'Expositions', 'hadj-bf' => 'Hadj au Burkina Faso', 'laicite' => 'Laïcité',
            'a-propos' => 'À propos', 'pourquoi-les-journaux' => 'Pourquoi les journaux?', 'equipe' => 'Équipe',
        ],
        [
            ['parcourir', ['benin', 'burkina-faso', 'cote-d-ivoire']], ['references', []], ['index', []],
            ['expositions', ['hadj-bf', 'laicite']], ['a-propos', ['pourquoi-les-journaux', 'equipe']],
        ],
        'accueil',
    );
    $common = [
        'nav_depth' => '0',
        'footer_menu' => '1',
        'footer_menu_depth' => '2',
        'resource_tags' => ['resource_class'],
        'browse_layout' => 'togglegrid',
        'pwa_enabled' => '1',
    ];
    $settings = ['show_value_annotations' => true, 'filter_locale_values' => false, 'show_locale_label' => true];
    return $locales = [
        'en' => [
            'site' => $en,
            'lang' => 'en-US',
            'catalog' => Catalog::english(),
            'searchUrl' => '/s/westafrica/search/everything',
            'themeSettings' => $common + [
                'site_title_acronym' => 'IWAC',
                'footer_site_info' => "<p>An open-access digital database on Islam and Muslims in Benin, Burkina Faso, Côte d'Ivoire, Niger, Nigeria, and Togo.</p>",
            ],
            'siteSettings' => $settings + ['locale' => 'en_US'],
            'pages' => ['about' => 'about', 'team' => 'team'],
        ],
        'fr' => [
            'site' => $fr,
            'lang' => 'fr',
            'catalog' => Catalog::fromMo(ROOT . '/language/fr.mo'),
            'searchUrl' => '/s/afrique_ouest/recherche/tout',
            'themeSettings' => $common + [
                'site_title_acronym' => 'CIAO',
                'footer_site_info' => "<p>Une base de données numérique en libre accès sur l’islam et les musulmans au Bénin, au Burkina Faso, en Côte d'Ivoire, au Niger, au Nigeria et au Togo.</p>",
            ],
            'siteSettings' => $settings + ['locale' => 'fr'],
            'pages' => ['about' => 'a-propos', 'team' => 'equipe'],
        ],
    ];
}

/** The Internationalisation module's locale list for a page at $paths[locale]. */
function alternates(array $paths): array
{
    $sites = locales();
    return [
        ['site' => $sites['en']['site'], 'locale' => 'en_US', 'locale_label' => 'English (United States)', 'url' => $paths['en']],
        ['site' => $sites['fr']['site'], 'locale' => 'fr', 'locale_label' => 'français', 'url' => $paths['fr']],
    ];
}

// ---- Records ----------------------------------------------------------------

/** The records the pages show, as one site presents them. */
function records(string $locale): array
{
    $site = locales()[$locale]['site'];
    $fr = $locale === 'fr';
    $r = static fn (string $name, int $id, string $title, ?string $class = null, ?string $thumb = null, ?string $description = null): Resource
        => new Resource($site, $name, $id, $title, $class, $thumb, $description);

    $french = $r('items', 8355, 'Français', 'Language')->with('dcterms:alternative', ['fr']);
    $model = $r('items', 79610, 'Gemini 2.5 Flash', 'Software');
    $carrefour = $r('item_sets', 2200, 'Carrefour africain', 'Periodical', 'e5bc168e5a531b2f7de6b9b7779ecde47c5b7c83');
    $tabaski = $r('items', 8558, 'La Tabaski à Ouagadougou', 'Article', '4f3f1bc60d4df5a7e41f3f5e65e66b0d2675b018')
        ->with('dcterms:title', ['La Tabaski à Ouagadougou'])
        ->with('dcterms:type', [Value::link($r('items', 67396, 'Article de presse', 'Concept'))])
        ->with('dcterms:publisher', [Value::link($carrefour)])
        ->with('dcterms:date', [new Value('1966-04-09', '', null, $fr ? '9 avril 1966' : 'April 9, 1966')])
        ->with('dcterms:language', [Value::link($french)])
        ->with('bibo:shortDescription', [
            new Value('Muslims in Haute-Volta celebrated Eid al-Adha, or Tabaski, on Saturday, April 2. In Ouagadougou, the head of state attended the main prayer at Place d’Armes, followed by the ritual sacrifice of a sheep by the capital’s chief imam.', 'en', null, null,
                new Annotation(106302, ['iwac:summaryModel' => [Value::link($model)]])),
            new Value('Les musulmans de Haute-Volta ont célébré l’Aïd al-Adha, ou Tabaski, le samedi 2 avril. À Ouagadougou, le chef de l’État a assisté à la grande prière sur la place d’Armes, suivie du sacrifice rituel d’un mouton par le grand imam de la capitale.', 'fr', null, null,
                new Annotation(106303, ['iwac:summaryModel' => [Value::link($model)]])),
        ])
        ->with('dcterms:subject', [Value::link($r('items', 1301, 'Tabaski', 'Concept'))])
        ->with('dcterms:spatial', [Value::link($r('items', 1290, 'Ouagadougou', 'Place'))]);

    // Carrefour africain's run, oldest numbers first, as its ledger lists them.
    $articles = [];
    foreach ([
        [8558, 'La Tabaski à Ouagadougou', '1966-04-09'],
        [8560, 'Le Ramadan à Bobo-Dioulasso', '1966-01-15'],
        [8571, 'Départ des pèlerins pour La Mecque', '1966-03-05'],
        [8583, 'Inauguration de la grande mosquée de Kaya', '1967-02-11'],
        [8590, 'Le congrès de l’Union culturelle musulmane', '1967-06-24'],
        [8602, 'Les écoles franco-arabes en Haute-Volta', '1967-10-07'],
        [8615, 'Retour des pèlerins à Ouagadougou', '1968-04-20'],
        [8627, 'La communauté musulmane et le développement', '1968-08-31'],
        [8634, 'Mawlid : la nuit du Prophète à Ouahigouya', '1968-06-08'],
        [8648, 'Le grand imam reçu par le président Lamizana', '1969-01-18'],
        [8655, 'Construction d’une médersa à Dori', '1969-05-03'],
        [8661, 'Fin du Ramadan : la prière de l’Aïd', '1969-12-13'],
        [8674, 'Ouverture d’une école coranique à Koudougou', '1970-01-24'],
        [8681, 'Les pèlerins voltaïques de retour de La Mecque', '1970-03-21'],
        [8689, 'Le mois de Ramadan à Ouagadougou', '1970-11-07'],
        [8696, 'Assemblée générale de la communauté musulmane', '1971-01-16'],
        [8702, 'Tabaski : la prière sur la place d’Armes', '1971-02-06'],
        [8711, 'Une délégation voltaïque au congrès islamique de Dakar', '1971-04-17'],
        [8719, 'La médersa de Bobo-Dioulasso a dix ans', '1971-06-26'],
        [8724, 'Les imams de Ouahigouya en séminaire', '1971-09-11'],
        [8733, 'Mawlid à Bobo-Dioulasso', '1971-05-08'],
        [8740, 'Hadj : départ du premier contingent', '1972-01-08'],
        [8748, 'Islam et éducation en milieu rural', '1972-03-04'],
        [8755, 'La nouvelle mosquée de Fada N’Gourma', '1972-05-20'],
        [8761, 'Fin du Ramadan à Dédougou', '1972-11-11'],
    ] as [$id, $title, $date]) {
        $articles[] = $id === 8558 ? $tabaski : $r('items', $id, $title, 'Article', substr(sha1($title), 0, 40))
            ->with('dcterms:title', [$title])
            ->with('dcterms:date', [new Value($date, '', null, localDate($date, $fr))])
            ->with('dcterms:language', [Value::link($french)]);
    }
    $carrefour
        ->with('dcterms:title', ['Carrefour africain'])
        ->with('dcterms:description', [new Value('Hebdomadaire d’information publié à Ouagadougou de 1959 à 1983.', 'fr')])
        ->with('dcterms:spatial', [Value::link($r('items', 1287, 'Burkina Faso', 'Place'))]);
    // Every article names the periodical as its publisher: 25 of them, and
    // the book below, make 26 linked resources — one more than the Linked
    // resources block lists a page, so it has a pager of its own beside the
    // ledger's (five a page).
    foreach ($articles as $article) {
        $carrefour->linkedFrom('dcterms:publisher', $article);
    }
    $carrefour->linkedFrom('dcterms:subject', $r('items', 14022, 'Presse et islam en Haute-Volta (1959-1983)', 'Book')
        ->with('dcterms:date', [new Value('2014', '', null, '2014')]));

    // The item browse, sorted by title.
    $browse = [];
    foreach ([
        ['Annuaire des associations islamiques du Togo', 'Document', 'An inventory of the Muslim associations registered in Lomé.'],
        ['Bulletin de l’Union musulmane du Togo, n° 3', 'Islamic periodical', null],
        ['Conférence sur la laïcité à Cotonou', 'Article', 'Report on a public lecture on secularism and religious freedom.'],
        ['Discours du grand imam de Niamey', 'Audio', null],
    ] as $n => [$title, $class, $description]) {
        $browse[] = $r('items', 21000 + $n, $title, $class, substr(sha1($title), 0, 40), $description)
            ->with('dcterms:title', [$title]);
    }

    return ['item' => $tabaski, 'itemSet' => $carrefour, 'articles' => $articles, 'browse' => $browse];
}

/** What NumericDataTypes prints for an ISO date in the site's locale. */
function localDate(string $iso, bool $fr): string
{
    [$y, $m, $d] = array_map('intval', explode('-', $iso));
    $months = $fr
        ? ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return $fr ? "$d {$months[$m - 1]} $y" : "{$months[$m - 1]} $d, $y";
}

/** IWAC-SEO's iwacCitation() view-model for item 8558 (formatted as the module does). */
function citation(string $locale): array
{
    $site = locales()[$locale]['site'];
    $url = 'https://islam.zmo.de' . $site->url() . '/item/8558';
    $link = '<a href="' . $url . '">' . $url . '</a>';
    $fr = $locale === 'fr';
    return [
        'record' => ['id' => 8558],
        'defaultStyle' => 'chicago',
        'styles' => [
            'chicago' => ['label' => 'Chicago', 'html' => $fr
                ? '« La Tabaski à Ouagadougou ». <em>Carrefour africain</em>, 9 avril 1966. ' . $link . '.'
                : '“La Tabaski à Ouagadougou.” <em>Carrefour africain</em>, April 9, 1966. ' . $link . '.'],
            'apa' => ['label' => 'APA', 'html' => $fr
                ? 'La Tabaski à Ouagadougou. (1966, 9 avril). <em>Carrefour africain</em>. ' . $link
                : 'La Tabaski à Ouagadougou. (1966, April 9). <em>Carrefour africain</em>. ' . $link],
            'mla' => ['label' => 'MLA', 'html' => $fr
                ? '« La Tabaski à Ouagadougou ». <em>Carrefour africain</em>, 9 avril 1966. ' . $link . '.'
                : '“La Tabaski à Ouagadougou.” <em>Carrefour africain</em>, 9 April 1966. ' . $link . '.'],
        ],
        'downloads' => [
            ['label' => 'BibTeX', 'url' => 'https://islam.zmo.de/cite/8558/bibtex'],
            ['label' => 'RIS', 'url' => 'https://islam.zmo.de/cite/8558/ris'],
            ['label' => 'CSL JSON', 'url' => 'https://islam.zmo.de/cite/8558/csljson'],
        ],
        'zoteroRdf' => 'https://islam.zmo.de/unapi?id=' . rawurlencode($url) . '&format=rdf_zotero',
    ];
}

// ---- Blocks -------------------------------------------------------------------

/** The Mirador module's resource-page block, as the live item pages print it. */
function miradorBlock(): string
{
    return "<div class=\"block resource-block block-mirador\">\n    \n<div id=\"mirador-1\" class=\"mirador viewer\"></div>\n</div>\n";
}

/** Core's values block: the resource's displayValues(), i.e. common/resource-values. */
function valuesBlock(FakeView $view, Resource $resource): string
{
    return $resource->displayValues();
}

/** Core's linked-resources block, which the theme overrides. */
function linkedResourcesBlock(FakeView $view, Resource $resource): string
{
    return $view->partial('common/resource-page-block-layout/linked-resources', ['resource' => $resource]);
}

/**
 * Core's page-block grid (omeka/site/page/show.phtml), which wraps each
 * block's own template: [layout, grid span, html].
 *
 * @param list<array{0:string,1:int,2:string}> $blocks
 */
function blockGrid(array $blocks): string
{
    $html = "<div class=\"blocks\">\n    <div class=\"blocks-inner page-layout-grid grid-template-columns-12\" style=\"column-gap: 10px; row-gap: 10px;\">";
    foreach ($blocks as [$layout, $span, $content]) {
        $html .= sprintf('<div class="block block-%s grid-position-auto grid-span-%d" style="">%s</div>', $layout, $span, $content);
    }
    return $html . "</div>\n</div>\n";
}

// ---- Pages --------------------------------------------------------------------

/**
 * Render one page: $content through the real templates, then layout.phtml
 * around it (or, for an XHR, layout's chrome-less fast path).
 *
 * @param callable(FakeView): string $content
 * @return array{html:string,url:string,lang:string,xhr:bool,templates:list<string>}
 */
function page(string $locale, array $paths, array $query, array $route, callable $content, array $options = []): array
{
    $l = locales()[$locale];
    $request = new Request($l['site'], $paths[$locale], $query, $route);
    $view = siteView($request, $l + [
        'alternates' => alternates($paths),
        'blocks' => $options['blocks'] ?? [],
        'browse' => $options['browse'] ?? null,
    ]);
    $xhr = (bool) ($options['xhr'] ?? false);
    if ($xhr) {
        $_SERVER['HTTP_X_REQUESTED_WITH'] = 'fetch';
    }
    try {
        $view->content = $content($view);
        $html = $view->render('layout/layout.phtml', ['site' => $l['site']]);
    } finally {
        unset($_SERVER['HTTP_X_REQUESTED_WITH']);
    }
    // Templates check out CRLF on a Windows working copy; the fixture must
    // not depend on which machine rendered it.
    $html = rtrim(str_replace("\r", '', $html)) . "\n";
    return [
        'html' => $html,
        'url' => $request->url($query),
        'lang' => $l['lang'],
        'xhr' => $xhr,
        'templates' => array_values(array_unique($view->rendered)),
    ];
}

function itemPage(string $locale): array
{
    $records = records($locale);
    return page($locale, ['en' => '/s/westafrica/item/8558', 'fr' => '/s/afrique_ouest/item/8558'], [], [],
        static fn (FakeView $view): string => $view->render('omeka/site/item/show.phtml', ['item' => $records['item']]),
        ['blocks' => ['main' => [
            static fn (): string => miradorBlock(),
            'IwacThemeTest\Fixtures\valuesBlock',
            // IWAC-SEO's "How to cite" block hands its view-model to the theme's partial.
            static fn (FakeView $view): string => $view->partial('common/citation', ['citation' => citation($locale)]),
        ]]],
    );
}

/**
 * Carrefour africain's item-set page: its own Linked resources block (the
 * articles that name it, 25 a page through ?lr_page=) above the ledger of its
 * items (five a page through ?page=) — the two `.linked-resources` roots
 * linked-resources.js keeps apart.
 */
function itemSetPage(array $query = [], bool $xhr = false): array
{
    $records = records('en');
    $perPage = 5;
    $page = (int) ($query['page'] ?? 1);
    return page('en', ['en' => '/s/westafrica/item-set/2200', 'fr' => '/s/afrique_ouest/item-set/2200'], $query, [],
        static fn (FakeView $view): string => $view->render('omeka/site/item/browse.phtml', [
            'itemSet' => $records['itemSet'],
            'items' => array_slice($records['articles'], ($page - 1) * $perPage, $perPage),
        ]),
        [
            'blocks' => ['main' => ['IwacThemeTest\Fixtures\valuesBlock', 'IwacThemeTest\Fixtures\linkedResourcesBlock']],
            'browse' => [count($records['articles']), $page, $perPage],
            'xhr' => $xhr,
        ],
    );
}

function itemsBrowsePage(): array
{
    $records = records('en');
    $query = ['sort_by' => 'title', 'sort_order' => 'asc'];
    return page('en', ['en' => '/s/westafrica/item', 'fr' => '/s/afrique_ouest/item'], $query, [],
        static fn (FakeView $view): string => $view->render('omeka/site/item/browse.phtml', ['items' => $records['browse']]),
        ['browse' => [12, 1, 4]],
    );
}

/** The About page: asset blocks (captioned, alt-only, linked to a page) and a conference carousel. */
function aboutPage(string $locale): array
{
    $l = locales()[$locale];
    $site = $l['site'];
    $fr = $locale === 'fr';
    $slug = $l['pages']['about'];
    $carousel = [];
    foreach ([
        [1284, $fr ? 'Colloque « Islam et politique en Afrique de l’Ouest »' : 'Conference “Islam and politics in West Africa”', 'Bayreuth, 2023', '0c9d5b1e3f4a8d27c6e1b0a9f8e7d6c5b4a39281'],
        [1285, $fr ? 'Atelier sur les archives de la presse' : 'Workshop on press archives', 'Lomé, 2019', '1d8e6c2f4a5b9e38d7f2c1b0a9f8e7d6c5b4a392'],
        [1286, $fr ? 'Journée d’étude sur les manuscrits ajami' : 'Study day on Ajami manuscripts', 'Berlin, 2018', '2e7f5d3a6b4c0f49e8a3d2c1b0a9f8e7d6c5b4a3'],
    ] as [$id, $title, $caption, $hash]) {
        $item = new Resource($site, 'items', $id, $title, 'Event');
        $media = new Resource($site, 'media', $id + 50000, $title, null, $hash);
        $carousel[] = new class($item, $media, $caption) {
            public function __construct(private Resource $item, private Resource $media, private string $caption)
            {
            }

            public function item(): Resource
            {
                return $this->item;
            }

            public function media(): Resource
            {
                return $this->media;
            }

            public function caption(): string
            {
                return $this->caption;
            }
        };
    }
    $asset = static fn (array $attachments): array => array_map(
        static fn (array $a): array => $a + ['page' => null, 'caption' => '', 'alt_link_title' => ''],
        $attachments,
    );
    return page($locale, ['en' => '/s/westafrica/page/about', 'fr' => '/s/afrique_ouest/page/a-propos'], [], ['page-slug' => $slug],
        static function (FakeView $view) use ($site, $slug, $fr, $asset, $carousel, $l): string {
            // Core's page/show.phtml.
            $view->htmlElement('body')->appendAttribute('class', 'page site-page-' . $slug);
            return blockGrid([
                ['pageTitle', 12, $view->partial('common/block-layout/page-title', ['pageTitle' => $site->page($slug)->title()])],
                ['html', 12, $fr
                    ? '<p>La <em>Collection Islam Afrique de l’Ouest</em> retrace le développement de l’islam et des communautés musulmanes en Afrique de l’Ouest depuis les années 1960.</p>'
                    : '<p>The <em>Islam West Africa Collection</em> (IWAC) traces the development of Islam and Muslim communities in West Africa from the 1960s to the present.</p>'],
                // No alt text on the asset: the caption names it.
                ['asset', 3, $view->partial('common/block-layout/asset', ['attachments' => $asset([
                    ['asset' => new Asset('548c34588b16d934918dbb1b4b90a6f417cd604e'), 'caption' => $fr ? 'Bibliothèque nationale du Togo' : 'Togo National Library'],
                ])])],
                // Alt text, no caption.
                ['asset', 2, $view->partial('common/block-layout/asset', ['attachments' => $asset([
                    ['asset' => new Asset('b8bacea4677e97f7600fa7a8b5da1fa00dac1734', 'Frédérick Madore')],
                ])])],
                // Linked to a page: a link, not a plate.
                ['asset', 2, $view->partial('common/block-layout/asset', ['attachments' => $asset([
                    ['asset' => new Asset('731d0ffa3ddca0f9dcaaa31adf4a072a6ddfafb8'), 'page' => $site->page($l['pages']['team'])],
                ])])],
                ['carousel', 12, $view->partial('common/block-layout/item-carousel', [
                    'attachments' => $carousel,
                    'thumbnailType' => 'large',
                    'showTitleOption' => 'item_title',
                    'showCaption' => 'true',
                    'perPage' => 3,
                    'slideCSSTextAlign' => 'center',
                    'slideCSSStretch' => 'default',
                    'autoSlideDuration' => 5000,
                    'blockID' => 191,
                    'carouselHeading' => $fr ? 'Conférences' : 'Conferences',
                ])],
            ]);
        },
    );
}

/** name => renderer. A test names the fixture; manifest.json says where it lives. */
function fixtures(): array
{
    return [
        'item.en' => static fn () => itemPage('en'),
        'item.fr' => static fn () => itemPage('fr'),
        'item-set.en' => static fn () => itemSetPage(),
        // What linked-resources.js fetches (X-Requested-With: fetch) when a
        // facet chip or the ledger's pager is used on item-set.en.
        'item-set.xhr-publisher.en' => static fn () => itemSetPage(['resource_property' => 'items:5-86'], true),
        'item-set.xhr-subject.en' => static fn () => itemSetPage(['resource_property' => 'items:3-86,329'], true),
        // The ledger's page 2. The block in it is still on its own first page.
        'item-set.xhr-page-2.en' => static fn () => itemSetPage(['page' => '2'], true),
        // Once the other root has moved, a request also carries that root's
        // state from the address, appended after the control's own: the
        // ledger's Next after the Subject chip, the block's Next after the
        // ledger's.
        'item-set.xhr-page-2-subject.en' => static fn () => itemSetPage(['page' => '2', 'resource_property' => 'items:3-86,329'], true),
        'item-set.xhr-both-page-2.en' => static fn () => itemSetPage(['lr_page' => '2', 'page' => '2'], true),
        'items-browse.en' => static fn () => itemsBrowsePage(),
        'page-about.en' => static fn () => aboutPage('en'),
        'page-about.fr' => static fn () => aboutPage('fr'),
    ];
}

// ---- Write / check --------------------------------------------------------------

$check = in_array('--check', $argv, true);
$files = [];
$manifest = [];
foreach (fixtures() as $name => $render) {
    $page = $render();
    $files[$name . '.html'] = $page['html'];
    unset($page['html']);
    $manifest[$name] = $page;
}
$files['manifest.json'] = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";

$existing = is_dir(OUT_DIR) ? array_map('basename', glob(OUT_DIR . '/*') ?: []) : [];
$orphans = array_values(array_diff($existing, array_keys($files)));

if ($check) {
    $problems = [];
    foreach ($files as $file => $content) {
        $path = OUT_DIR . '/' . $file;
        if (!is_file($path)) {
            $problems[] = "missing test/fixtures/rendered/$file";
        } elseif (str_replace("\r", '', (string) file_get_contents($path)) !== $content) {
            $problems[] = "stale   test/fixtures/rendered/$file";
        }
    }
    foreach ($orphans as $file) {
        $problems[] = "orphaned test/fixtures/rendered/$file (no fixture renders it)";
    }
    if ($problems) {
        fwrite(STDERR, "✗ rendered test fixtures are out of date — run `npm run build:fixtures` and commit test/fixtures/rendered:\n");
        foreach ($problems as $problem) {
            fwrite(STDERR, "  $problem\n");
        }
        exit(1);
    }
    echo '✓ test/fixtures/rendered matches a fresh render of its ' . count($manifest) . " pages\n";
    exit(0);
}

if (!is_dir(OUT_DIR)) {
    mkdir(OUT_DIR, 0777, true);
}
foreach ($files as $file => $content) {
    file_put_contents(OUT_DIR . '/' . $file, $content);
}
foreach ($orphans as $file) {
    unlink(OUT_DIR . '/' . $file);
}
echo '✓ rendered ' . count($manifest) . " pages into test/fixtures/rendered/\n";
