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
            // Not in the navigation: the longest page title on either site,
            // for the plate page head's wrapping.
            'vue-d-ensemble' => 'Vue d’ensemble de la collection',
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
    // The live sites hide core's sub-navigation and its previous/next page
    // links (no sub-menu or site-page-pagination in their page markup).
    $settings = [
        'show_value_annotations' => true, 'filter_locale_values' => false, 'show_locale_label' => true,
        'subnav_display' => 'hide', 'show_page_pagination' => false,
    ];
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

    // An authority record whose description AI_authority_curation drafted: item
    // 654 as the live API serves it, both literals annotated
    // iwac:descriptionModel → the model's authority item.
    $opus = $r('items', 125262, 'Claude Opus 5.5', 'Software');
    $drafted = static fn (int $id): Annotation => new Annotation($id, ['iwac:descriptionModel' => [Value::link($opus)]]);
    $authority = $r('items', 654, 'Comité National d’Organisation du Pèlerinage à la Mecque (Burkina Faso)', 'Organization')
        ->with('dcterms:title', ['Comité National d’Organisation du Pèlerinage à la Mecque (Burkina Faso)'])
        ->with('dcterms:type', [Value::link($r('items', 67568, 'Notice d’autorité', 'Concept'))])
        ->with('dcterms:description', [
            new Value('Comité d’État burkinabè chargé d’organiser le pèlerinage à la Mecque, installé en décembre 2025 par le ministère de l’Administration territoriale pour les éditions 2026 et 2027. Il remplace le Comité national de suivi du pèlerinage, l’État reprenant l’organisation du hadj, et est présidé par Amadou Sidibé.', 'fr', null, null, $drafted(110401)),
            new Value('Burkinabè state committee organising the pilgrimage to Mecca, installed in December 2025 by the Ministry of Territorial Administration for the 2026 and 2027 seasons. It replaces the national pilgrimage follow-up committee as the State takes back the organisation of the hajj, and is chaired by Amadou Sidibé.', 'en', null, null, $drafted(110402)),
        ])
        ->with('dcterms:isPartOf', [Value::link($r('items', 15834, 'Organisation islamique', 'Concept'))])
        ->with('dcterms:spatial', [Value::link($r('items', 1287, 'Burkina Faso', 'Place'))]);

    return ['item' => $tabaski, 'itemSet' => $carrefour, 'articles' => $articles, 'browse' => $browse, 'authority' => $authority];
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
 * Core's page-block grid (pageLayout()->render(): the page's content child,
 * which omeka/site/page/show.phtml wraps in div.blocks) around each block's
 * own template: [layout, grid span, html, the classes the block's Layout
 * panel adds — its alignment, a block group's grid].
 *
 * @param list<array{0:string,1:int,2:string,3?:string}> $blocks
 */
function blockGrid(array $blocks): string
{
    $html = "<div class=\"blocks-inner page-layout-grid grid-template-columns-12\" style=\"column-gap: 10px; row-gap: 10px;\">";
    return $html . blocks($blocks) . "</div>";
}

/**
 * A site page as core's page controller renders it: the blocks through core's
 * grid, then the theme's omeka/site/page/show.phtml around them (the
 * breadcrumb, unless the page opens on the plate page head). A block given
 * as just ['pageTitle', span] is rendered here, through the theme's
 * page-title template with the block it belongs to, so the template can tell
 * whether it opens the page.
 *
 * @param list<array{0:string,1:int,2?:string,3?:string}> $blocks
 */
function sitePage(FakeView $view, Site $site, string $slug, array $blocks): string
{
    $page = $site->page($slug)->withLayouts(array_column($blocks, 0));
    $pageBlocks = $page->blocks();
    foreach ($blocks as $i => $block) {
        if ($block[0] === 'pageTitle' && !isset($block[2])) {
            $blocks[$i][2] = $view->partial('common/block-layout/page-title', ['block' => $pageBlocks[$i], 'pageTitle' => $page->title()]);
        }
    }
    // Laminas renders the content child first and hands it to show.phtml as
    // `content`; FakeView keeps it where layout.phtml reads it too, and
    // page() replaces it with this template's output afterwards.
    $view->content = blockGrid($blocks);
    return $view->render('omeka/site/page/show.phtml', [
        'site' => $site,
        'page' => $page,
        'pageBodyClass' => 'page site-page-' . $slug,
        'displayNavigation' => true,
    ]);
}

/**
 * The blocks of a page grid or of a block group, each in core's wrapper.
 *
 * @param list<array{0:string,1:int,2:string,3?:string}> $blocks
 */
function blocks(array $blocks): string
{
    $html = '';
    foreach ($blocks as $block) {
        [$layout, $span, $content] = $block;
        $classes = trim(sprintf('block block-%s grid-position-auto grid-span-%d %s', $layout, $span, $block[3] ?? ''));
        $html .= sprintf('<div class="%s" style="">%s</div>', $classes, $content);
    }
    return $html;
}

/**
 * An HTML page block through the theme's own template (common/block-layout/
 * html.phtml), which decides whether the prose flows into columns. Core
 * prints the purified HTML; blocks() adds core's wrapper around it.
 */
function htmlBlock(FakeView $view, string $html): string
{
    return $view->partial('common/block-layout/html', ['block' => new PageBlock('html', ['html' => $html])]);
}

/**
 * Prose as the live sites store it: CKEditor wraps paragraphs in bare <div>s,
 * and links carry absolute URLs. The homepage's "About the collection" and one
 * section of the About page (both short enough to flow into columns), and the
 * AI access page's local-extension steps (a numbered list: it stays a single
 * full-width column), each copied from the live site.
 */
function liveProse(string $name): string
{
    $prose = [
        'about-the-collection' => <<<'HTML'
<div>
<h2 dir="auto">About the collection</h2>

<p dir="auto">The&nbsp;<em>Islam West Africa Collection</em>&nbsp;(IWAC) is a collaborative, open-access digital collection developed by&nbsp;<a href="https://www.frederickmadore.com/">Frédérick Madore</a>&nbsp;and hosted by the&nbsp;<a href="https://www.zmo.de/en">Leibniz-Zentrum Moderner Orient (ZMO)</a>&nbsp;in Berlin. It builds on the&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/award-and-mentions">award-winning</a>&nbsp;<em><a href="https://web.archive.org/web/20240312164955/https://islam.domains.uflib.ufl.edu/s/bf/page/home">Islam Burkina Faso Collection</a></em>, launched in 2021. To preserve its sources for the long term, IWAC stores press articles as scans and captures them in the&nbsp;<a href="https://web.archive.org/">Wayback Machine</a>.</p>
</div>

<div>
<p dir="auto">The collection brings together&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/browse?b1196.f.type_s=document">archival documents</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/browse?b1196.f.type_s=article">newspaper articles</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/browse?b1196.f.type_s=publication">Islamic publications</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/browse?b1196.f.type_s=audiovisual">audiovisual recordings</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/browse?b1196.f.type_s=photograph">photographs</a>&nbsp;and&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/references">academic references</a>&nbsp;on Islam and Muslims in&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/benin">Benin</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/burkina-faso">Burkina Faso</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/cote-d-ivoire">Côte d&#39;Ivoire</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/niger">Niger</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/nigeria">Nigeria</a>&nbsp;and&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/togo">Togo</a>. Most materials are in French, with others in Hausa, Arabic, Dendi, Ewé, Kabiyè and English.</p>
</div>

<div>
<p dir="auto">IWAC uses&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/ocr">optical character recognition</a>&nbsp;and&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/ai-metadata-enrichment">AI-assisted metadata enrichment</a>&nbsp;to make textual documents easier to search and study. These methods support <a href="https://islam.zmo.de/s/westafrica/page/browse">filterable search</a>, an&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/index">authority index</a>&nbsp;of people, organisations, places and events, and&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/copyrights_data_reuse">open data export</a>. A suite of&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/explore">interactive visualisations</a>, including&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/spatial-exploration">maps</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/entity-networks">entity networks</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/topic-modelling">topic models</a>,&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/words-over-time">word trends</a>&nbsp;and&nbsp;<a href="https://islam.zmo.de/s/westafrica/page/sentiment-analysis">AI-assisted analysis of press attitudes</a>, helps users explore patterns across the corpus.</p>
</div>

<div>
<p data-heading="[More about the collection →](https://islam.zmo.de/s/westafrica/page/about)" dir="auto"><a href="https://islam.zmo.de/s/westafrica/page/about">More about the collection &rarr;</a></p></div>
HTML,
        'ai-access-steps' => <<<'HTML'
<p><em>As an alternative to double-clicking the file, drag it into the installation area in <strong>Settings → Extensions</strong>.</em></p>

<ol start="4">
	<li>Ask Claude an IWAC question. On first use, the extension downloads about 250 MB of public data from Hugging Face. Later searches reuse the copy stored in <code>~/.iwac-mcp/cache/</code>.</li>
</ol>

<p>The bundle includes the software it needs, so you do not have to install Python or use a command line. Claude Desktop is unavailable on Linux, and the project therefore provides Windows and macOS bundles only.</p>

<h4 data-heading="Add the research skill in Claude">Add the research skill in Claude</h4>

<ol>
	<li>Download <code>iwac-mcp-skill.zip</code> from the same <a aria-label="https://github.com/fmadore/iwac-mcp-server/releases" class="external-link" data-tooltip-position="top" href="https://github.com/fmadore/iwac-mcp-server/releases" rel="noopener nofollow" target="_blank">Releases page</a>.</li>
	<li>In Claude, open <strong>Customize → Skills → + → Create skill → Upload a skill</strong>.</li>
	<li>Select the zip file. Leave it compressed; Claude imports it directly.</li>
</ol>

<p>The skill is separate from the server extension. The extension supplies the tools and data, while the skill teaches Claude how to organise a systematic search and discuss the limits of the evidence.</p>

<h4 data-heading="Optional semantic search">Optional semantic search</h4>

<p>The standard search, index and analysis tools work without an external key. Three additional tools search articles, Islamic publications and photographs by meaning. In the local extension, enable <strong>Semantic search</strong> in its settings and provide a free <a aria-label="https://aistudio.google.com/apikey" class="external-link" data-tooltip-position="top" href="https://aistudio.google.com/api-keys" rel="noopener nofollow" target="_blank">Google AI Studio</a> key if you want these tools. This step is optional.</p>

<h3 data-heading="Option 3: add IWAC to ChatGPT">Option 3: add IWAC to ChatGPT</h3>

<p>Use ChatGPT on the web. Access to custom MCP apps depends on your plan and, for managed workspaces, your administrator's settings. OpenAI's <a aria-label="https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt" class="external-link" data-tooltip-position="top" href="https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt" rel="noopener nofollow" target="_blank">developer-mode documentation</a> gives the current availability and menu paths. If your account does not display <strong>Developer mode</strong> or <strong>Create</strong>, the feature has not been enabled for you.</p>

<p>Your plan also determines whether ChatGPT exposes the server's general search and fetch functions or the full set of read-only research tools.</p>

<ol>
	<li>Open <strong>Settings → Security and login → Advanced security</strong> and turn on <strong>Developer mode</strong>. On some accounts, this setting appears under <strong>Apps → Advanced settings</strong>.</li>
</ol>
HTML,
        'about-history.en' => <<<'HTML'
<p>IWAC grew from the practical demands of historical fieldwork rather than from a formal digitisation plan.</p>

<p>Since 2011, <a class="external-link" href="https://www.frederickmadore.com/">Frédérick Madore</a>&nbsp;has conducted fieldwork and archival research across francophone West Africa. His work examines Islamic activism among youth and women in Burkina Faso and Côte d&#39;Ivoire, Muslim minorities in southern Benin and Togo, and the history of faith-based student organisations at the Université d&#39;Abomey-Calavi in Benin and the Université de Lomé in Togo. During his Master&#39;s research, he encountered a rapidly growing body of material scattered across archives and libraries. Many postcolonial state archives in the region work with limited resources and preserve fragmented collections. Sources may be difficult to access, split among several centres, poorly catalogued or at risk of disappearance. Madore therefore began digitising and organising them himself, and the resulting research database soon outgrew its original purpose.</p>

<p>Over the following decade, Madore digitised or saved more than 24,000 pages of press clippings from over 80 newspapers dating back to 1962, some 1,500 issues from 25 Islamic publications, many of which are now defunct, and thousands of online articles preserved through the <a class="external-link" href="https://web.archive.org/">Wayback Machine</a>. Websites and URLs frequently disappear; web archiving preserves access to earlier versions of these sources. The materials came from nine archival institutions across six countries, as well as private collections held by individuals and Islamic associations. <a class="external-link" href="https://islam.zmo.de/s/westafrica/page/why_newspapers">Together, they allow researchers to trace changes within Muslim communities over time</a>.</p>

<p>Initially kept in a private <a href="https://www.zotero.org/">Zotero</a> database, the collection became a form of &quot;digital hoarding&quot;: a personal archive too large for one researcher to analyse fully. Requests from colleagues for particular clippings revealed the limits of private storage. The public database grew out of open-science principles and the goal of making research data findable, accessible, interoperable and reusable.</p>
HTML,
        'about-history.fr' => <<<'HTML'
<p>Depuis 2013,&nbsp;<a href="https://frederickmadore.com/">Fr&eacute;d&eacute;rick Madore</a>&nbsp;m&egrave;ne des enqu&ecirc;tes de terrain et des recherches dans des centres d&#39;archive &agrave; travers l&#39;Afrique de l&#39;Ouest, se concentrant sur l&#39;activisme islamique parmi les jeunes et les femmes au Burkina Faso et en C&ocirc;te d&#39;Ivoire, les minorit&eacute;s musulmanes dans le sud du B&eacute;nin et du Togo ainsi que sur l&#39;histoire des organisations estudiantines confessionnelles &agrave; l&#39;Universit&eacute; d&#39;Abomey-Calavi (B&eacute;nin) et &agrave; l&#39;Universit&eacute; de Lom&eacute; (Togo).&nbsp;Ce qui a commenc&eacute; comme une recherche de m&eacute;moire de maitrise s&#39;est transform&eacute; en une initiative majeure d&#39;humanit&eacute;s num&eacute;riques qui comble d&#39;importantes lacunes dans l&#39;accessibilit&eacute; des ressources sur l&#39;islam en Afrique de l&#39;Ouest.</p>

<p>&Agrave; travers ses efforts de documentation, Madore a num&eacute;ris&eacute; plus de 14 000 coupures de presse provenant de 15 journaux publics et priv&eacute;s couvrant l&#39;islam et les musulmans en Afrique de l&#39;Ouest de 1962 &agrave; 2024. Il a &eacute;galement pr&eacute;serv&eacute; environ 1500 publications islamiques diverses (pamphlets, bulletins, magazines et journaux), dont la plupart ne sont plus en circulation. De plus, il a archiv&eacute; des articles de presse en ligne de la r&eacute;gion gr&acirc;ce &agrave; la Wayback Machine.&nbsp;Ces documents ont &eacute;t&eacute; obtenus &agrave; partir de collections priv&eacute;es d&#39;individus et d&#39;associations islamiques, ainsi que de neuf centres d&#39;archives et biblioth&egrave;ques dans six pays diff&eacute;rents.&nbsp;<a href="https://islam.zmo.de/s/afrique_ouest/page/journaux">Ces sources offrent un excellent moyen de retracer l&#39;histoire des communaut&eacute;s musulmanes</a>.</p>

<p>Malgr&eacute; la popularit&eacute; croissante des humanit&eacute;s num&eacute;riques, &eacute;tonnamment peu d&#39;initiatives ont utilis&eacute; des outils num&eacute;riques pour &eacute;tudier et diffuser des connaissances sur l&#39;islam en Afrique de l&#39;Ouest. De nombreux projets de num&eacute;risation existants ont privil&eacute;gi&eacute; les manuscrits, comme ceux de Tombouctou, sugg&eacute;rant implicitement que ces mat&eacute;riaux sont intrins&egrave;quement plus pr&eacute;cieux et dignes d&#39;&ecirc;tre pr&eacute;serv&eacute;s que d&#39;autres documents historiques. Cette vision &eacute;troite risque de n&eacute;gliger un &eacute;ventail plus large de mat&eacute;riaux culturellement et historiquement significatifs, y compris la riche culture imprim&eacute;e islamique, les journaux et les documents nativement num&eacute;riques. L&#39;id&eacute;e de distribuer et d&#39;archiver ouvertement une grande partie de ce corpus diversifi&eacute;, et de rendre ces documents accessibles aux chercheurs du monde entier pour de nouvelles &eacute;tudes sur l&#39;islam en Afrique de l&#39;Ouest, a &eacute;t&eacute; fortement influenc&eacute;e par les d&eacute;bats sur la science ouverte.</p>
HTML,
    ];
    return $prose[$name];
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

/** An authority record (item 654) with an AI-drafted description, on the values block alone. */
function authorityPage(string $locale): array
{
    $records = records($locale);
    return page($locale, ['en' => '/s/westafrica/item/654', 'fr' => '/s/afrique_ouest/item/654'], [], [],
        static fn (FakeView $view): string => $view->render('omeka/site/item/show.phtml', ['item' => $records['authority']]),
        ['blocks' => ['main' => ['IwacThemeTest\Fixtures\valuesBlock']]],
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
            return sitePage($view, $site, $slug, [
                ['pageTitle', 12],
                ['html', 12, htmlBlock($view, $fr
                    ? '<p>La <em>Collection Islam Afrique de l’Ouest</em> retrace le développement de l’islam et des communautés musulmanes en Afrique de l’Ouest depuis les années 1960.</p>'
                    : '<p>The <em>Islam West Africa Collection</em> (IWAC) traces the development of Islam and Muslim communities in West Africa from the 1960s to the present.</p>')],
                // The history section: under ProseColumns::MAX_CHARS, so it flows.
                ['html', 12, htmlBlock($view, liveProse($fr ? 'about-history.fr' : 'about-history.en'))],
                // A procedure (from the AI access page, so English only): its
                // numbered lists keep it in one column at full width.
                ...($fr ? [] : [['html', 12, htmlBlock($view, liveProse('ai-access-steps'))]]),
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
            // A child of Exhibits in the navigation: its crumb rides the plate.
            return sitePage($view, $site, 'hajj-bf', [
                ['pageTitle', 12],
                ['html', 12, htmlBlock($view, '<p>Trace the history of the hajj in Burkina Faso, from long overland journeys to state regulation and contemporary debates over the pilgrimage’s organisation.</p>')],
                ['media', 12, mediaEmbedBlock($view, $masonry, $gallery, ['layout' => 'horizontal', 'media_display' => 'thumbnail', 'thumbnail_type' => 'large'])],
                ['media', 12, mediaEmbedBlock($view, $masonry, $embeds, ['thumbnail_type' => 'large'])],
                // "Further references" as the live page sets it: in a block
                // group under its heading, aligned centre. Core turns that
                // alignment into rules that shrink a block to its content.
                ['blockGroup', 12, blocks([
                    ['html', 12, htmlBlock($view, '<h2>Further references</h2>')],
                    ['media', 12, mediaEmbedBlock($view, $masonry, $references, ['layout' => 'horizontal', 'media_display' => 'thumbnail']), 'block-layout-alignment-block-center block-layout-alignment-text-center'],
                ]), 'block-group-grid'],
                ['media', 12, mediaEmbedBlock($view, 'common/block-layout/file', $references, ['layout' => 'horizontal', 'media_display' => 'thumbnail'])],
            ]);
        },
    );
}

/**
 * The homepage: the hero (layout.phtml renders it on the site's homepage only)
 * over core's page grid — "About the collection" in a block group, as the live
 * page sets it, and the short prose that flows into columns.
 */
function homePage(): array
{
    return page('en', ['en' => '/s/westafrica/page/home', 'fr' => '/s/afrique_ouest/page/accueil'], [], ['page-slug' => 'home'],
        static function (FakeView $view): string {
            return sitePage($view, locales()['en']['site'], 'home', [
                ['blockGroup', 12, blocks([
                    ['html', 12, htmlBlock($view, liveProse('about-the-collection'))],
                ]), 'block-group-grid'],
            ]);
        },
    );
}

/**
 * A French section page with the longest title on either site — the live
 * collection overview's — opening on the plate page head. Not linked in the
 * navigation, so it has no crumb.
 */
function overviewPage(): array
{
    return page('fr', ['en' => '/s/westafrica/page/collection-overview', 'fr' => '/s/afrique_ouest/page/vue-d-ensemble'], [], ['page-slug' => 'vue-d-ensemble'],
        static function (FakeView $view): string {
            return sitePage($view, locales()['fr']['site'], 'vue-d-ensemble', [
                ['pageTitle', 12],
                ['html', 12, htmlBlock($view, '<h2>Vue d’ensemble</h2><p>Le nombre de documents par pays, par type et par année, et la couverture de chaque journal.</p>')],
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
        'item-authority.en' => static fn () => authorityPage('en'),
        'items-browse.en' => static fn () => itemsBrowsePage(),
        'page-home.en' => static fn () => homePage(),
        'page-about.en' => static fn () => aboutPage('en'),
        'page-about.fr' => static fn () => aboutPage('fr'),
        'page-exhibit.en' => static fn () => exhibitPage(),
        'page-overview.fr' => static fn () => overviewPage(),
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
