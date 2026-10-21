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
    ] + (isset($options['itemSetSearch']) ? ['itemSetSearch' => $options['itemSetSearch']] : []));
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
/**
 * IwacSearch's item-set surface, as its iwacItemSetSearch helper prints it
 * (view/common/iwac-item-set-search.phtml around common/iwac-search-mount),
 * bootstrap trimmed to the keys that differ from any page block. A copy: the
 * theme does not render it.
 */
function itemSetSearchSurface(): string
{
    return <<<'HTML'
        <section
            class="iwac-search-block iwac-search-block--full iwac-search-block--item-set"
            aria-label="Search the items in this set"
        >
            <noscript>
                <p>
                    Search requires JavaScript.
                    <a href="/s/westafrica/item?item_set_id=2200">Browse the items instead.</a>
                </p>
            </noscript>
            <div data-iwac-search-root data-iwac-block-id="set" class="iwac-search-block__root" id="iwac-search-root-set">
                <div class="iwac-search-block__skeleton" aria-hidden="true"></div>
            </div>
            <script type="application/json" id="iwac-search-state-set">{"block_id":"set","mode":"full","locked_filters":"item_set_ids:=[2200]"}</script>
        </section>
        HTML;
}

function itemSetPage(array $query = [], bool $xhr = false, bool $setSearch = false): array
{
    $records = records('en');
    $perPage = 5;
    $page = (int) ($query['page'] ?? 1);
    // Core's browse narrows the set's items by the ledger's title search
    // (?property[title][text]=), as the API does for any property row.
    $articles = $records['articles'];
    $title = $query['property']['title']['text'] ?? '';
    if ($title !== '') {
        $articles = array_values(array_filter(
            $articles,
            static fn (Resource $article): bool => str_contains(Api::fold($article->displayTitle()), Api::fold($title)),
        ));
    }
    return page('en', ['en' => '/s/westafrica/item-set/2200', 'fr' => '/s/afrique_ouest/item-set/2200'], $query, [],
        static fn (FakeView $view): string => $view->render('omeka/site/item/browse.phtml', [
            'itemSet' => $records['itemSet'],
            'items' => array_slice($articles, ($page - 1) * $perPage, $perPage),
        ]),
        [
            'blocks' => ['main' => ['IwacThemeTest\Fixtures\valuesBlock', 'IwacThemeTest\Fixtures\linkedResourcesBlock']],
            'browse' => [count($articles), $page, $perPage],
            'xhr' => $xhr,
        ] + ($setSearch ? ['itemSetSearch' => itemSetSearchSurface()] : []),
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

/** A page block attachment as core's Media embed block reads it. */
function attachment(Resource $item, ?Resource $media, string $caption = ''): object
{
    return new class($item, $media, $caption) {
        public function __construct(private Resource $item, private ?Resource $media, private string $caption)
        {
        }

        public function item(): Resource
        {
            return $this->item;
        }

        public function media(): ?Resource
        {
            return $this->media;
        }

        public function caption(): string
        {
            return $this->caption;
        }
    };
}

/**
 * Core's Media embed block (Omeka\Site\BlockLayout\Media::render()): the classes
 * it builds from the block's options, then $template with the variables core
 * hands every template of this block. $template is common/block-layout/file (the
 * default) or a theme block template under common/block-template/.
 *
 * @param list<object> $attachments
 */
function mediaEmbedBlock(FakeView $view, string $template, array $attachments, array $data = []): string
{
    $classes = ['media-embed'];
    $classes[] = ($data['layout'] ?? '') === 'horizontal' ? 'layout-horizontal' : 'layout-vertical';
    $classes[] = ($data['media_display'] ?? '') === 'thumbnail' ? 'media-display-thumbnail' : 'media-display-embed';
    $classes[] = count($attachments) > 3 ? 'multiple-attachments' : 'attachment-count-' . count($attachments);
    return $view->partial($template, [
        'block' => null,
        'attachments' => $attachments,
        'thumbnailType' => $data['thumbnail_type'] ?? 'square',
        'link' => 'item',
        'showTitleOption' => $data['show_title_option'] ?? 'item_title',
        'classes' => $classes,
        'mediaDisplay' => $data['media_display'] ?? null,
    ]);
}

/**
 * An exhibit page built the way the Hajj exhibit is: Media embed blocks of
 * photographs, of embedded media and of academic references, three of them on
 * the theme's "Masonry" template and the references once more on core's default
 * horizontal layout. The photographs are the collection's own, with their real
 * storage ids and shapes (600x800 portraits beside 800x600 landscapes); the
 * references and their captions are the live exhibit's.
 */
function exhibitPage(): array
{
    $l = locales()['en'];
    $site = $l['site'];
    $photo = static function (int $id, string $title, string $hash) use ($site): Resource {
        $item = new Resource($site, 'items', $id, $title, 'Image', $hash);
        return (new Resource($site, 'media', $id + 50000, $title, null, $hash))->of($item);
    };
    $photos = [
        [12296, 'Maison du Hadj', '117b4eb718c2f1c173173fb97b063a1d2af036cb', 'Lomé, 2019'],
        [12278, 'Mosquée de l’Université de Lomé', '042cf16352b5e2a02014129e3a36af0b7618cddd', 'Lomé, 2021'],
        [12291, 'Grande mosquée de Niamey', '9f09cda61d536ed970695bb675d1d2f8127fa5c3', 'Niamey, 2022'],
        [12294, 'Mosquée Kadhafi', '1be6fde4e23aeda5d6155efe87e6cda5afa458d5', 'Lomé, 2019'],
        [12254, 'Mosquée de Ganvié', 'd82bdc47b538148d6d839d690e4c4d496f083056', 'Ganvié, 2019'],
        [12263, 'Ancienne mosquée centrale de Porto-Novo', '3f2983f488ac9313f42f4acf6d36d710b3320a6b', 'Porto-Novo, 2019'],
    ];
    $gallery = array_map(static function (array $p) use ($photo): object {
        $media = $photo($p[0], $p[1], $p[2]);
        return attachment($media->item(), $media, '<p>' . $p[3] . '</p>');
    }, $photos);
    $video = new Resource($site, 'items', 110621, 'Rencontre bilan de l’organisation du hadj 2026 de Excellences voyages avec ses pèlerins', 'Moving image');
    $embeds = [
        $gallery[0],
        attachment($video, (new Resource($site, 'media', 160621, $video->displayTitle()))->of($video)->youtube('R3-2MuTCi7k'), '<p>CERFI TV, 2026</p>'),
        $gallery[2],
    ];
    $references = array_map(
        static fn (array $r): object => attachment(new Resource($site, 'items', $r[0], $r[1], 'Thesis'), null, '<p>' . $r[2] . '</p>'),
        [
            [15699, 'L’islam au Burkina Faso : problématique de l’organisation du hadj', 'Mahamoudou Oubda (2003)'],
            [4966, 'L’administration coloniale française et les pèlerins de La Mecque : le cas des Voltaïques', 'Juliette Van Duc (1995)'],
            [5076, 'Le pèlerinage des Voltaïque/Burkinabè aux Lieux saints de l’islam passé présent', 'Juliette Van Duc (1988)'],
            [5033, 'Le pèlerinage des Voltaïques/Burkinabè aux lieux saints de l’islam, passé-présent : orientation générale de thèse', 'Juliette Van Duc (1991)'],
            [5034, 'Quelques aperçus relatifs aux pèlerins de la Mecque : le cas des Voltaïques-Burkinabè', 'Juliette Van Duc (1993)'],
        ],
    );
    $masonry = 'common/block-template/media-masonry';
    return page('en', ['en' => '/s/westafrica/page/hajj-bf', 'fr' => '/s/afrique_ouest/page/hadj-bf'], [], ['page-slug' => 'hajj-bf'],
        static function (FakeView $view) use ($site, $gallery, $embeds, $references, $masonry): string {
            $view->htmlElement('body')->appendAttribute('class', 'page site-page-hajj-bf');
            return blockGrid([
                ['pageTitle', 12, $view->partial('common/block-layout/page-title', ['pageTitle' => $site->page('hajj-bf')->title()])],
                ['html', 12, '<p>Trace the history of the hajj in Burkina Faso, from long overland journeys to state regulation and contemporary debates over the pilgrimage’s organisation.</p>'],
                ['media', 12, mediaEmbedBlock($view, $masonry, $gallery, ['layout' => 'horizontal', 'media_display' => 'thumbnail', 'thumbnail_type' => 'large'])],
                ['media', 12, mediaEmbedBlock($view, $masonry, $embeds, ['thumbnail_type' => 'large'])],
                ['media', 12, mediaEmbedBlock($view, $masonry, $references, ['layout' => 'horizontal', 'media_display' => 'thumbnail'])],
                ['media', 12, mediaEmbedBlock($view, 'common/block-layout/file', $references, ['layout' => 'horizontal', 'media_display' => 'thumbnail'])],
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
        // The same page where IwacSearch covers the set: its surface in place
        // of the ledger.
        'item-set.search.en' => static fn () => itemSetPage([], false, true),
        // What linked-resources.js fetches (X-Requested-With: fetch) when a
        // facet chip or the ledger's pager is used on item-set.en.
        'item-set.xhr-publisher.en' => static fn () => itemSetPage(['resource_property' => 'items:5'], true),
        'item-set.xhr-subject.en' => static fn () => itemSetPage(['resource_property' => 'items:3'], true),
        // ...and when a search is typed or an order picked: the block's form
        // (its search, then its order — the select always has a value), and
        // the ledger's title row.
        'item-set.xhr-search.en' => static fn () => itemSetPage(['lr_q' => 'ramadan', 'lr_sort' => 'date-desc'], true),
        'item-set.xhr-search-none.en' => static fn () => itemSetPage(['lr_q' => 'zzz', 'lr_sort' => 'date-desc'], true),
        'item-set.xhr-sort-title.en' => static fn () => itemSetPage(['lr_sort' => 'title-asc'], true),
        'item-set.xhr-ledger-search.en' => static fn () => itemSetPage(['property' => ['title' => [
            'joiner' => 'and', 'property' => 'dcterms:title', 'type' => 'in', 'text' => 'ramadan',
        ]]], true),
        // The ledger's page 2. The block in it is still on its own first page.
        'item-set.xhr-page-2.en' => static fn () => itemSetPage(['page' => '2'], true),
        // Once the other root has moved, a request also carries that root's
        // state from the address, appended after the control's own: the
        // ledger's Next after the Subject chip, the block's Next after the
        // ledger's.
        'item-set.xhr-page-2-subject.en' => static fn () => itemSetPage(['page' => '2', 'resource_property' => 'items:3'], true),
        'item-set.xhr-both-page-2.en' => static fn () => itemSetPage(['lr_page' => '2', 'page' => '2'], true),
        'items-browse.en' => static fn () => itemsBrowsePage(),
        'page-about.en' => static fn () => aboutPage('en'),
        'page-about.fr' => static fn () => aboutPage('fr'),
        'page-exhibit.en' => static fn () => exhibitPage(),
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
