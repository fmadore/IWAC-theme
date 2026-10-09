<?php
/**
 * PHP tests for the theme's view helpers and the template logic that has
 * broken before. Plain PHP, no framework and no Composer install: run with
 *
 *     php test/php/run.php          (or `npm run test:php`)
 *
 * CI runs it on both ends of the supported PHP range (see build.yml).
 *
 * Until this existed the PHP side had syntax checks and nothing else — every
 * behavioural test in the repo drove the JavaScript. Templates are rendered
 * against FakeView below: a stand-in for Laminas' PhpRenderer that answers the
 * helper calls a template makes from plain arrays and closures. It is not
 * Omeka; a test that needs more of Omeka than a handful of stubs belongs in
 * the live Playwright suite instead.
 */
declare(strict_types=1);

namespace IwacThemeTest {

    require_once __DIR__ . '/stubs.php';

    const ROOT = __DIR__ . '/../..';

    foreach (glob(ROOT . '/helper/*.php') as $helperFile) {
        require_once $helperFile;
    }

    /**
     * Minimal PhpRenderer stand-in. Settings come from arrays; any other helper
     * a template calls must be registered in $helpers, so a template reaching
     * for something the test did not anticipate fails loudly instead of
     * rendering against a silent null.
     */
    final class FakeView
    {
        /** @var array<string,callable|object> */
        public array $helpers = [];

        /** @var list<array{0:string,1:array}> every partial() call, in order */
        public array $partials = [];

        public function __construct(
            public array $themeSettings = [],
            public array $siteSettings = [],
            public array $query = [],
        ) {
            $escape = static fn ($s): string => htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $this->helpers = [
                'escapeHtml' => $escape,
                'escapeHtmlAttr' => $escape,
                'translate' => static fn ($s): string => (string) $s,
                'themeSetting' => fn (string $id, $default = null) => $this->themeSettings[$id] ?? $default,
                'siteSetting' => fn (string $id, $default = null) => $this->siteSettings[$id] ?? $default,
                'setting' => static fn (string $id, $default = null) => $default,
                'assetUrl' => static fn (string $file, $module = null): string => '/themes/IWAC-theme/asset/' . $file,
                'lang' => static fn (): string => 'en',
                'trigger' => static fn (...$args) => null,
                'status' => static fn () => new class {
                    public function isSiteRequest(): bool
                    {
                        return true;
                    }
                },
                'params' => fn () => new class($this->query) {
                    public function __construct(private array $query)
                    {
                    }

                    public function fromQuery($name = null, $default = null)
                    {
                        return $name === null ? $this->query : ($this->query[$name] ?? $default);
                    }
                },
                'thumbnail' => static fn (...$args): string => '',
                'partial' => function (string $name, array $vars = []): string {
                    $this->partials[] = [$name, $vars];
                    return '';
                },
            ];
            foreach (['AiGeneratedTerms', 'BannerStats', 'BrowseLayout', 'FrenchSpacing', 'ResourceLanguage', 'ResourceTags', 'SitePageBySlug'] as $name) {
                $class = '\\OmekaTheme\\Helper\\' . $name;
                $this->helpers[$name] = (new $class())->setView($this);
            }
        }

        public function plugin(string $name)
        {
            return $this->helpers[$name] ?? throw new \LogicException("FakeView has no helper '$name'");
        }

        public function __call(string $name, array $args)
        {
            return ($this->plugin($name))(...$args);
        }

        /** Render a theme template (path relative to view/) with $vars in scope. */
        public function render(string $template, array $vars = []): string
        {
            $render = function (string $__file, array $__vars): string {
                extract($__vars);
                ob_start();
                try {
                    include $__file;
                } catch (\Throwable $e) {
                    // Drop the half-rendered page so it doesn't bury the failure.
                    ob_end_clean();
                    throw $e;
                }
                return (string) ob_get_clean();
            };
            return \Closure::bind($render, $this, self::class)(ROOT . '/view/' . $template, $vars);
        }
    }

    // ---- Tiny runner --------------------------------------------------------

    $tests = [];
    function test(string $name, callable $fn): void
    {
        global $tests;
        $tests[$name] = $fn;
    }

    function check(bool $condition, string $message): void
    {
        if (!$condition) {
            throw new \RuntimeException($message);
        }
    }

    function same($expected, $actual, string $message = ''): void
    {
        if ($expected !== $actual) {
            throw new \RuntimeException(
                ($message ? "$message\n" : '') . '  expected: ' . var_export($expected, true)
                . "\n  actual:   " . var_export($actual, true)
            );
        }
    }

    // ---- Helpers ------------------------------------------------------------

    test('FrenchSpacing binds high punctuation with a narrow no-break space', function () {
        $fs = (new FakeView())->helpers['FrenchSpacing'];
        $nnbsp = "\u{202F}";
        same("Gala de bienfaisance{$nnbsp}: le Chamci", $fs('Gala de bienfaisance : le Chamci'));
        same("«{$nnbsp}Islam{$nnbsp}»", $fs('« Islam »'));
        same("Pourquoi{$nnbsp}?{$nnbsp}!", $fs("Pourquoi ?\u{00A0}!"));
        // English puts no space before the mark, so nothing changes.
        same('Title: subtitle', $fs('Title: subtitle'));
        // A mark at the head of its own line is the author's and stays put.
        same("line\n: kept", $fs("line\n: kept"));
        same('', $fs(null));
    });

    test('BrowseLayout honours the setting, then ?view= overrides it', function () {
        $cases = [
            // setting, ?view=, isGrid, hasToggle
            ['grid', null, true, false],
            ['list', null, false, false],
            ['togglegrid', null, true, true],
            ['togglelist', null, false, true],
            ['togglegrid', 'list', false, true],
            ['togglelist', 'grid', true, true],
            // Anything that is not "list" means grid — the helper never
            // echoes the raw parameter back.
            ['togglelist', '<script>', true, true],
        ];
        foreach ($cases as [$setting, $view, $isGrid, $hasToggle]) {
            $fake = new FakeView(['browse_layout' => $setting], [], $view === null ? [] : ['view' => $view]);
            $layout = $fake->helpers['BrowseLayout']();
            $label = "$setting + view=" . var_export($view, true);
            same($isGrid, $layout['isGrid'], $label);
            same($hasToggle, $layout['hasToggle'], $label);
            // aria-pressed, never `disabled` (T-10).
            same('aria-pressed="' . ($isGrid ? 'true' : 'false') . '"', $layout['gridState'], $label);
            same('aria-pressed="' . ($isGrid ? 'false' : 'true') . '"', $layout['listState'], $label);
        }

        $decorated = new FakeView(['browse_layout' => 'list', 'image_decoration' => ['media']]);
        same('decoration decoration--thumbnail', $decorated->helpers['BrowseLayout']()['decorationClass']);
    });

    test('AiGeneratedTerms adds template-gated terms only on their template', function () {
        $helper = (new FakeView())->helpers['AiGeneratedTerms'];
        $onTemplate = static fn (?int $id) => new class($id) {
            public function __construct(private ?int $id)
            {
            }

            public function resourceTemplate()
            {
                return $this->id === null ? null : new class($this->id) {
                    public function __construct(private int $id)
                    {
                    }

                    public function id(): int
                    {
                        return $this->id;
                    }
                };
            }
        };
        same(['bibo:shortDescription'], $helper(null));
        same(['bibo:shortDescription'], $helper($onTemplate(null)));
        same(['bibo:shortDescription'], $helper($onTemplate(5)));
        same(['bibo:shortDescription', 'dcterms:tableOfContents'], $helper($onTemplate(21)));
    });

    test('DeferHeadScripts defers every external classic script (regression: Mapping "$ is not defined")', function () {
        // What headScript()->getContainer() holds: one stdClass per script.
        $item = static fn (string $type, array $attributes, ?string $source = null) => (object) [
            'type' => $type,
            'attributes' => $attributes,
            'source' => $source,
        ];
        $container = new \ArrayObject([
            'jquery' => $item('text/javascript', ['src' => '/application/asset/vendor/jquery/jquery.min.js', 'defer' => 'defer']),
            'inline' => $item('text/javascript', [], 'window.Omeka=window.Omeka||{};'),
            'leaflet' => $item('text/javascript', ['src' => '/modules/Mapping/asset/node_modules/leaflet/dist/leaflet.js']),
            'mapping' => $item('text/javascript', ['src' => '/modules/Mapping/asset/js/mapping-show.js']),
            'untyped' => $item('', ['src' => '/modules/Other/asset/js/other.js']),
            'module' => $item('module', ['src' => '/modules/Mirador/asset/js/mirador-4.mjs']),
            'async' => $item('text/javascript', ['src' => '/modules/Async/asset/js/a.js', 'async' => 'async']),
            'ldjson' => $item('application/ld+json', [], '{"@context":"https://schema.org"}'),
            'citation' => $item('text/javascript', ['src' => '/themes/IWAC-theme/asset/js/citation.js?v=2.23.0']),
            'moduleCitation' => $item('text/javascript', ['src' => '/modules/Other/asset/js/citation.js']),
        ]);
        $defer = (new \OmekaTheme\Helper\DeferHeadScripts())->setView(new FakeView());
        same(5, $defer($container), 'leaflet, mapping, untyped, citation and the module citation get deferred');

        foreach (['jquery', 'leaflet', 'mapping', 'untyped', 'citation', 'moduleCitation'] as $key) {
            same('defer', $container[$key]->attributes['defer'] ?? null, "$key should be deferred");
        }
        foreach (['inline', 'module', 'async', 'ldjson'] as $key) {
            check(!isset($container[$key]->attributes['defer']), "$key must not be deferred");
        }
        // Order is the whole point: the container is never reordered.
        same(['jquery', 'inline', 'leaflet', 'mapping', 'untyped', 'module', 'async', 'ldjson', 'citation', 'moduleCitation'], array_keys($container->getArrayCopy()));
        // The theme's citation.js is swapped for its minified twin; a module's is not.
        same('/themes/IWAC-theme/asset/js/dist/citation.min.js?v=2.23.0', $container['citation']->attributes['src']);
        same('/modules/Other/asset/js/citation.js', $container['moduleCitation']->attributes['src']);
        // Idempotent: a second pass changes nothing.
        same(0, $defer($container));
    });

    test('the layout runs the head-script defer pass after view.layout', function () {
        $layout = (string) file_get_contents(ROOT . '/view/layout/layout.phtml');
        $trigger = strpos($layout, "\$this->trigger('view.layout');");
        $pass = strpos($layout, '$this->DeferHeadScripts($this->headScript()->getContainer())');
        check($trigger !== false && $pass !== false, 'view.layout trigger or defer pass missing from layout.phtml');
        check($pass > $trigger, 'the defer pass must run after modules enqueue on view.layout');
        $ini = (string) file_get_contents(ROOT . '/config/theme.ini');
        check((bool) preg_match('/^helpers\[\] = "DeferHeadScripts"\r?$/m', $ini), 'DeferHeadScripts is not registered in theme.ini');
    });

    // ---- Templates ----------------------------------------------------------

    /** A site whose navigation records the options each renderMenu() got. */
    function fakeSite(array &$menuCalls): object
    {
        return new class($menuCalls) {
            public function __construct(private array &$calls)
            {
            }

            public function publicNav()
            {
                $calls = &$this->calls;
                return new class($calls) {
                    public function __construct(private array &$calls)
                    {
                    }

                    public function menu()
                    {
                        return $this;
                    }

                    public function renderMenu($container, array $options): string
                    {
                        $this->calls[] = $options;
                        return '<ul class="navigation"></ul>';
                    }
                };
            }
        };
    }

    test('footer renders when the menu-depth field was cleared (regression: PHP 8 TypeError)', function () {
        $menuCalls = [];
        $fake = new FakeView([
            'footer_menu' => '1',
            // What Omeka stores for an emptied Number element.
            'footer_menu_depth' => '',
            'footer_site_info' => '<p>About</p>',
        ]);
        $html = $fake->render('common/footer.phtml', ['site' => fakeSite($menuCalls)]);
        check(str_contains($html, 'main-footer__col2'), 'footer menu column missing');
        // Empty means "all levels", the same as 0.
        same([['maxDepth' => -1]], $menuCalls);
    });

    test('footer maps menu depth N to maxDepth N-1', function () {
        $menuCalls = [];
        $fake = new FakeView(['footer_menu' => '1', 'footer_menu_depth' => '2']);
        $fake->render('common/footer.phtml', ['site' => fakeSite($menuCalls)]);
        same([['maxDepth' => 1]], $menuCalls);
    });

    /** One literal value, optionally annotated; valueAnnotation() builds a fresh object per call, as Omeka's does. */
    function fakeValue(string $text, ?int $annotationId = null, string $lang = '', ?object $linked = null): object
    {
        return new class($text, $annotationId, $lang, $linked) {
            public function __construct(private string $text, private ?int $annotationId, private string $lang, private ?object $linked)
            {
            }

            public function type(): string
            {
                return $this->linked ? 'resource:item' : 'literal';
            }

            public function lang(): string
            {
                return $this->lang;
            }

            public function value(): string
            {
                return $this->text;
            }

            public function valueResource()
            {
                return $this->linked;
            }

            public function __toString(): string
            {
                return $this->text;
            }

            public function asHtml($lang = null): string
            {
                return htmlspecialchars($this->text, ENT_QUOTES);
            }

            public function isPublic(): bool
            {
                return true;
            }

            public function valueAnnotation()
            {
                return $this->annotationId === null ? null : new class($this->annotationId) {
                    public function __construct(private int $id)
                    {
                    }

                    public function id(): int
                    {
                        return $this->id;
                    }

                    public function displayValues(): string
                    {
                        return '<dl><dd>note ' . $this->id . '</dd></dl>';
                    }
                };
            }
        };
    }

    function fakeProperty(string $label): object
    {
        return new class($label) {
            public function __construct(private string $label)
            {
            }

            public function label(): string
            {
                return $this->label;
            }
        };
    }

    test('value annotations get unique ids (regression: spl_object_id reuse)', function () {
        $fake = new FakeView([], ['show_value_annotations' => true]);
        $values = [];
        foreach (['dcterms:subject' => [101, 102], 'dcterms:spatial' => [103, 104]] as $term => $ids) {
            $values[$term] = [
                'property' => fakeProperty($term),
                'alternate_label' => null,
                'values' => array_map(static fn (int $id) => fakeValue("v$id", $id), $ids),
            ];
        }
        $html = $fake->render('common/resource-values.phtml', ['values' => $values, 'resource' => null]);

        preg_match_all('/\sid="(value-annotation-[^"]+)"/', $html, $m);
        same(8, count($m[1]), 'expected a region id and a heading id per annotation');
        same(count($m[1]), count(array_unique($m[1])), 'duplicate ids: ' . implode(', ', $m[1]));

        // Every trigger points at the region that holds its own note.
        preg_match_all('/aria-controls="([^"]+)"/', $html, $controls);
        foreach ([101, 102, 103, 104] as $i => $id) {
            same("value-annotation-$id", $controls[1][$i]);
        }
    });

    test('ledger dates print the rendered value once-escaped (regression: double escape)', function () {
        $fake = new FakeView();
        $date = new class {
            public function asHtml(): string
            {
                return 'l&#039;an 2000';
            }

            public function __toString(): string
            {
                return "l'an 2000";
            }
        };
        $resource = new class($date) {
            public function __construct(private object $date)
            {
            }

            public function displayTitle($default = null, $lang = null): string
            {
                return 'Title';
            }

            public function url(): string
            {
                return '/s/westafrica/item/1';
            }

            public function value(string $term, array $options = [])
            {
                return $term === 'dcterms:date' ? $this->date : null;
            }

            public function resourceName(): string
            {
                return 'items';
            }

            public function created()
            {
                return null;
            }
        };
        $html = $fake->render('common/linked-resources-table.phtml', [
            'rows' => [['resource' => $resource, 'relationLabel' => null]],
            'showRelation' => false,
            'valueLang' => null,
        ]);
        check(str_contains($html, 'l&#039;an 2000'), 'rendered date missing');
        check(!str_contains($html, '&amp;#039;'), 'rendered date was escaped a second time');
    });

    /** A browse-card resource whose values are keyed by term. */
    function fakeCardResource(array $values): object
    {
        return new class($values) {
            public function __construct(private array $values)
            {
            }

            public function value(string $term, array $options = [])
            {
                return $this->values[$term] ?? ($options['default'] ?? null);
            }

            public function displayTitle($default = null, $lang = null): string
            {
                return 'The display title';
            }

            public function displayDescription($default = null, $lang = null)
            {
                return null;
            }

            public function primaryMedia()
            {
                return null;
            }

            public function link($text, $action = null, array $attributes = []): string
            {
                $attrs = '';
                foreach ($attributes as $name => $value) {
                    $attrs .= ' ' . $name . '="' . htmlspecialchars((string) $value) . '"';
                }
                return '<a href="/item/1"' . $attrs . '>' . htmlspecialchars((string) $text) . '</a>';
            }
        };
    }

    test("resource cards use the site's browse heading property", function () {
        $render = static fn (array $vars): string => (new FakeView())->render('common/resource-card.phtml', $vars + [
            'isGrid' => true,
            'valueLang' => null,
            'liClass' => 'item',
            'decorationClass' => '',
            'bodyTerm' => null,
            'bodyTruncate' => '',
        ]);

        $withTerm = $render([
            'resource' => fakeCardResource(['bibo:shortTitle' => 'Short title']),
            'headingTerm' => 'bibo:shortTitle',
        ]);
        check(str_contains($withTerm, '>Short title</a>'), 'heading property not used');

        // A resource without the property gets core's placeholder, not a blank link.
        $missing = $render(['resource' => fakeCardResource([]), 'headingTerm' => 'bibo:shortTitle']);
        check(str_contains($missing, '>[Untitled]</a>'), 'missing heading value not defaulted');

        $noTerm = $render(['resource' => fakeCardResource(['bibo:shortTitle' => 'Short title']), 'headingTerm' => '']);
        check(str_contains($noTerm, '>The display title</a>'), 'title fallback lost');

        // An explicit heading still wins over the term.
        $explicit = $render([
            'resource' => fakeCardResource(['bibo:shortTitle' => 'Short title']),
            'headingTerm' => 'bibo:shortTitle',
            'heading' => 'Explicit',
        ]);
        check(str_contains($explicit, '>Explicit</a>'), 'explicit heading overridden');
    });

    test('item browse delegates to the shared listing unless it is an item set', function () {
        $fake = new FakeView();
        $fake->render('omeka/site/item/browse.phtml', ['items' => ['a', 'b']]);
        same(1, count($fake->partials));
        [$name, $vars] = $fake->partials[0];
        same('common/resource-browse', $name);
        same(['a', 'b'], $vars['resources']);
        same('items', $vars['resourceName']);
        same('item', $vars['liClass']);
    });

    /** A site with the given page slugs; counts how often its pages are loaded. */
    function fakePagedSite(array $slugs, int &$loads, bool $throws = false): object
    {
        return new class($slugs, $loads, $throws) {
            public function __construct(private array $slugs, private int &$loads, private bool $throws)
            {
            }

            public function id(): int
            {
                return 1;
            }

            public function url(): string
            {
                return '/s/westafrica';
            }

            public function pages(): array
            {
                $this->loads++;
                if ($this->throws) {
                    throw new \RuntimeException('page API down');
                }
                return array_map(static fn (string $slug) => new class($slug) {
                    public function __construct(private string $slug)
                    {
                    }

                    public function slug(): string
                    {
                        return $this->slug;
                    }

                    public function title(): string
                    {
                        return ucfirst($this->slug);
                    }

                    public function siteUrl(): string
                    {
                        return '/s/westafrica/page/' . $this->slug;
                    }
                }, $this->slugs);
            }
        };
    }

    test('SitePageBySlug returns the first candidate the site has, loading pages once', function () {
        $loads = 0;
        $fake = new FakeView();
        $site = fakePagedSite(['index', 'parcourir', 'vue-d-ensemble'], $loads);
        $fake->helpers['currentSite'] = static fn () => $site;
        $lookup = $fake->helpers['SitePageBySlug'];

        same('parcourir', $lookup(['browse', 'parcourir'])->slug());
        same('index', $lookup(['index'])->slug());
        same(null, $lookup(['collection-overview']));
        same('vue-d-ensemble', $lookup(['collection-overview', 'vue-d-ensemble'], $site)->slug());
        same(1, $loads, 'pages should load once per site per request');
    });

    test('SitePageBySlug degrades to null when the page API fails', function () {
        $loads = 0;
        $fake = new FakeView();
        same(null, $fake->helpers['SitePageBySlug'](['browse'], fakePagedSite(['browse'], $loads, true)));
        $fake->helpers['currentSite'] = static fn () => null;
        same(null, $fake->helpers['SitePageBySlug'](['browse']));
    });

    test('breadcrumbs lead Home / Browse / current title', function () {
        $loads = 0;
        $fake = new FakeView();
        $site = fakePagedSite(['browse', 'index'], $loads);
        $fake->helpers['currentSite'] = static fn () => $site;
        $resource = new class {
            public function displayTitle($default = null, $lang = null): string
            {
                return 'Gala : le Chamci';
            }
        };
        $html = $fake->render('common/breadcrumbs.phtml', ['resource' => $resource]);
        preg_match_all('/<a href="([^"]+)">([^<]+)<\/a>/', $html, $links);
        same(['/s/westafrica', '/s/westafrica/page/browse'], $links[1]);
        same(['Home', 'Browse'], $links[2]);
        check(str_contains($html, '<span aria-current="page">Gala : le Chamci</span>'), 'current crumb missing');
    });

    test('BannerStats counts items and index records, and survives a failing API', function () {
        $queries = [];
        $fake = new FakeView();
        $fake->helpers['api'] = static function () use (&$queries) {
            return new class($queries) {
                public function __construct(private array &$queries)
                {
                }

                public function search(string $resource, array $query)
                {
                    $this->queries[] = $query;
                    $total = count($query['resource_class_id']) * 100;
                    return new class($total) {
                        public function __construct(private int $total)
                        {
                        }

                        public function getTotalResults(): int
                        {
                            return $this->total;
                        }
                    };
                }
            };
        };
        $stats = $fake->helpers['BannerStats']();
        same(1400, $stats['counts']['items']);
        same(500, $stats['counts']['index']);
        same(6, $stats['counts']['countries']);
        same(2, count($queries));
        foreach ($queries as $query) {
            // Public records only, and a count — never a page of results.
            same(true, $query['is_public']);
            same(0, $query['limit']);
        }

        $fake->helpers['api'] = static fn () => throw new \RuntimeException('database away');
        $previousLog = ini_set('error_log', PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null');
        try {
            same(null, $fake->helpers['BannerStats']()['counts']);
        } finally {
            ini_set('error_log', (string) $previousLog);
        }
    });

    test('BannerStats reads the eight snapshot figures IwacVisualizations publishes, and survives a bad file', function () {
        // OMEKA_PATH is only read by BannerStats, and this runs after the
        // counts test above, so defining it here changes nothing else.
        $root = sys_get_temp_dir() . '/iwac-theme-banner-' . getmypid();
        @mkdir($root . '/files/iwac-visualizations', 0777, true);
        if (!defined('OMEKA_PATH')) {
            define('OMEKA_PATH', $root);
        }
        $snapshot = OMEKA_PATH . '/files/iwac-visualizations/collection-overview.json';
        file_put_contents($snapshot, json_encode([
            'summary' => [
                'newspapers' => 41, 'references_count' => 1200, 'total_words' => 9876543,
                'total_pages' => 34567, 'unique_sources' => 88, 'document_types' => 7,
                'audiovisual_minutes' => 1234.5, 'languages' => 5,
                'not_a_banner_figure' => 1, 'total_articles' => 'n/a',
            ],
            'timeline' => [['year' => 1990, 'count' => 3]],
        ]));
        $fake = new FakeView();
        $fake->helpers['api'] = static fn () => throw new \RuntimeException('not under test');
        $previousLog = ini_set('error_log', PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null');
        try {
            same([
                'newspapers' => 41, 'references_count' => 1200, 'total_words' => 9876543,
                'total_pages' => 34567, 'unique_sources' => 88, 'document_types' => 7,
                'audiovisual_minutes' => 1234.5, 'languages' => 5,
            ], $fake->helpers['BannerStats']()['summary']);

            file_put_contents($snapshot, '{"summary": ');
            same(null, $fake->helpers['BannerStats']()['summary']);
        } finally {
            ini_set('error_log', (string) $previousLog);
            @unlink($snapshot);
        }
    });

    test('web archive block: h2 section head, player sized by the stylesheet', function () {
        $fake = new FakeView();
        $sink = new class {
            public function __call(string $name, array $args)
            {
                return $this;
            }
        };
        $fake->helpers['headLink'] = static fn () => $sink;
        $fake->helpers['headScript'] = static fn () => $sink;
        $fake->helpers['translatePlural'] = static fn (string $one, string $many, int $n): string => $n === 1 ? $one : $many;
        $media = static fn (int $id, string $type) => new class($id, $type) {
            public function __construct(private int $id, private string $type)
            {
            }

            public function id(): int
            {
                return $this->id;
            }

            public function mediaType(): string
            {
                return $this->type;
            }

            public function mediaData(): array
            {
                return [];
            }

            public function originalUrl(): string
            {
                return '/files/original/' . $this->id . '.wacz';
            }
        };
        $item = new class([$media(1, 'image/jpeg'), $media(2, 'application/wacz'), $media(3, 'application/warc')]) {
            public function __construct(private array $media)
            {
            }

            public function media(): array
            {
                return $this->media;
            }
        };

        $html = $fake->render('common/resource-page-block-layout/web-archive.phtml', ['resource' => $item]);
        same(2, substr_count($html, '<replay-web-page'), 'one player per wacz/warc capture');
        check((bool) preg_match('/<h2 class="web-archive__heading">\s*Archived web pages\s*<\/h2>/', $html), 'section head is not an h2');
        check(!str_contains($html, 'style='), 'inline style on the player');
        same(2, substr_count($html, 'class="web-archive__player"'));

        $none = new class {
            public function media(): array
            {
                return [];
            }
        };
        same('', trim($fake->render('common/resource-page-block-layout/web-archive.phtml', ['resource' => $none])));
    });

    test('social links are named with each network\'s own spelling', function () {
        $menuCalls = [];
        $fake = new FakeView([
            'youtube_url' => 'https://www.youtube.com/@iwac',
            'linkedin_url' => 'https://www.linkedin.com/company/zmo',
        ]);
        $html = $fake->render('common/footer.phtml', ['site' => fakeSite($menuCalls)]);
        check(str_contains($html, 'aria-label="YouTube"'), 'YouTube label');
        check(str_contains($html, 'aria-label="LinkedIn"'), 'LinkedIn label');
        check(!str_contains($html, '<!--'), 'HTML comments shipped in the footer');
    });

    test('pagination groups its figures with a narrow no-break space', function () {
        $fake = new FakeView();
        $fake->helpers['hyperlink'] = static fn ($text, $url, array $attrs = []): string => '<a href="' . $url . '"></a>';
        $fake->helpers['queryToHiddenInputs'] = static fn (...$args): string => '';
        $html = $fake->render('common/pagination.phtml', [
            'totalCount' => 12345,
            'offset' => 1000,
            'perPage' => 25,
            'currentPage' => 41,
            'pageCount' => 494,
            'previousPageUrl' => '?page=40',
            'nextPageUrl' => '?page=42',
        ]);
        $nnbsp = "\u{202F}";
        check(str_contains($html, "1{$nnbsp}001–1{$nnbsp}025 of 12{$nnbsp}345"), 'row count not grouped');
        check(str_contains($html, 'of 494'), 'page count missing');
        // The page field stays a plain number a reader can type over.
        check(str_contains($html, 'value="41"'), 'page input value altered');
    });

    test('asset images never take their alt text from the filename', function () {
        $fake = new FakeView();
        $fake->helpers['thumbnail'] = static fn ($asset, $type, array $attrs = []): string => '<img alt="' . htmlspecialchars($attrs['alt'] ?? 'MISSING') . '">';
        $asset = static fn (string $alt) => new class($alt) {
            public function __construct(private string $alt)
            {
            }

            public function altText(): string
            {
                return $this->alt;
            }

            public function name(): string
            {
                return 'IMG_2045-final.jpg';
            }
        };
        $attachment = static fn (object $a, string $caption) => ['asset' => $a, 'caption' => $caption, 'alt_link_title' => '', 'page' => null];
        $html = $fake->render('common/block-layout/asset.phtml', ['attachments' => [
            $attachment($asset('Conference hall, Lomé, 2019'), ''),
            $attachment($asset(''), 'Opening <em>session</em>'),
            $attachment($asset(''), ''),
        ]]);
        preg_match_all('/<img alt="([^"]*)">/', $html, $alts);
        same(['Conference hall, Lomé, 2019', 'Opening session', ''], $alts[1]);
    });

    test('the 404 page and the PWA shortcut open the browse page, not /item (T-16)', function () {
        $loads = 0;
        $site = fakePagedSite(['parcourir', 'index'], $loads);
        $sink = new class {
            public function __call(string $name, array $args)
            {
                return $this;
            }
        };
        $fake = new FakeView();
        $fake->helpers['htmlElement'] = static fn () => $sink;
        $fake->helpers['headTitle'] = static fn () => $sink;
        $html = $fake->render('error/404.phtml', ['site' => $site]);
        check(str_contains($html, 'href="/s/westafrica/page/parcourir" class="error-page__button error-page__button--secondary"'), 'browse button not on the browse page');
        // T-19: the 1.22:1 watermark numeral is decoration.
        check(str_contains($html, '<span class="error-page__code" aria-hidden="true">404</span>'), '404 numeral exposed to AT');

        // A fresh view: SitePageBySlug memoises pages per site id, and both fakes are site 1.
        $other = new FakeView();
        $other->helpers['htmlElement'] = static fn () => $sink;
        $other->helpers['headTitle'] = static fn () => $sink;
        $bare = $other->render('error/404.phtml', ['site' => fakePagedSite(['index'], $loads)]);
        check(str_contains($bare, 'href="/s/westafrica/item" class="error-page__button'), 'no browse page: /item fallback');

        $fake->helpers['getHelperPluginManager'] = static fn () => new class {
            public function has(string $name): bool
            {
                return false;
            }
        };
        $manifest = (new \OmekaTheme\Helper\PwaManifest())->setView($fake);
        $siteWithTitle = new class($site) {
            public function __construct(private object $site)
            {
            }

            public function __call(string $name, array $args)
            {
                return $this->site->$name(...$args);
            }

            public function title(): string
            {
                return 'Collection Islam Afrique de l’Ouest';
            }
        };
        $shortcuts = $manifest($siteWithTitle)['shortcuts'];
        same('/s/westafrica/page/parcourir', $shortcuts[0]['url']);
        // Without IwacSearch, core's fulltext search — /search is no core route.
        same('/s/westafrica/index/search', $shortcuts[1]['url']);
    });

    // ---- Homepage hero --------------------------------------------------------

    /** Render common/banner.phtml with a snapshot of $summary figures (null: no snapshot). */
    function renderBanner(array $settings, bool $compact, ?array $summary = null): string
    {
        $root = sys_get_temp_dir() . '/iwac-theme-banner-' . getmypid();
        @mkdir($root . '/files/iwac-visualizations', 0777, true);
        if (!defined('OMEKA_PATH')) {
            define('OMEKA_PATH', $root);
        }
        $snapshot = OMEKA_PATH . '/files/iwac-visualizations/collection-overview.json';
        if ($summary !== null) {
            file_put_contents($snapshot, json_encode(['summary' => $summary]));
        }
        $fake = new FakeView($settings);
        $fake->helpers['themeSettingAsset'] = static fn () => null;
        $fake->helpers['currentSite'] = static fn () => null;
        $fake->helpers['api'] = static fn () => throw new \RuntimeException('no API in this test');
        $previousLog = ini_set('error_log', PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null');
        try {
            return $fake->render('common/banner.phtml', ['compact' => $compact]);
        } finally {
            ini_set('error_log', (string) $previousLog);
            @unlink($snapshot);
        }
    }

    test('the full hero is a labelled region; the compact band is not (T-08)', function () {
        $hero = renderBanner(['banner_heading' => 'Islam West Africa Collection'], false);
        check((bool) preg_match('/<section class="banner[^"]*"[^>]*aria-labelledby="banner-heading">/', $hero), 'hero is not a section named by its heading');
        check(str_contains($hero, '<h1 class="banner__heading" id="banner-heading">Islam West Africa Collection</h1>'), 'heading id missing');
        check(str_ends_with(rtrim($hero), '</section>'), 'hero section not closed');

        $unnamed = renderBanner([], false);
        check((bool) preg_match('/<section class="banner[^"]*"[^>]*aria-label="Introduction">/', $unnamed), 'a hero without a heading needs a label');

        $band = renderBanner([], true);
        check(str_contains($band, '<div class="banner banner--compact"'), 'compact band should stay a div');
        check(!str_contains($band, '<section') && !str_contains($band, 'aria-label'), 'compact band must not be a landmark');
    });

    test('the corpus tier carries its figure count for the column template (T-07)', function () {
        $summary = [
            'total_words' => 9876543, 'total_pages' => 34567, 'references_count' => 1200,
            'unique_sources' => 88, 'document_types' => 7, 'audiovisual_minutes' => 1234, 'languages' => 5,
        ];
        $html = renderBanner([], false, $summary);
        check(str_contains($html, 'class="banner__substats banner__substats--n7"'), 'seven figures, --n7');
        same(7, substr_count($html, 'class="banner__substat"'));

        unset($summary['languages'], $summary['document_types']);
        check(str_contains(renderBanner([], false, $summary), 'banner__substats--n5'), 'five figures, --n5');
        check(!str_contains(renderBanner([], false), 'banner__substats'), 'no snapshot, no tier');
    });

    test('linked values show the uncropped medium thumbnail, keeping the rendered markup (T-09)', function () {
        $fake = new FakeView();
        $escape = static fn (string $s): string => str_replace('/', '&#x2F;', htmlspecialchars($s, ENT_QUOTES));
        $logo = new class {
            public function resourceName(): string
            {
                return 'items';
            }

            public function thumbnailDisplayUrl(string $type): ?string
            {
                return 'https://islam.zmo.de/files/' . $type . '/c586e3e7.jpg';
            }
        };
        // What core's linkPretty('square') renders, attribute-escaped, plus
        // something a module might append on rep.value.html.
        $linked = new class($logo, $escape) {
            public function __construct(private object $logo, private \Closure $escape)
            {
            }

            public function type(): string
            {
                return 'resource:item';
            }

            public function lang(): string
            {
                return '';
            }

            public function value(): string
            {
                return '';
            }

            public function valueResource()
            {
                return $this->logo;
            }

            public function asHtml($lang = null): string
            {
                return '<a class="resource-link" href="/s/westafrica/item/415"><img src="'
                    . ($this->escape)('https://islam.zmo.de/files/square/c586e3e7.jpg')
                    . '" alt=""><span class="resource-name">Bibliothèque du Congrès</span></a><span class="module-mark"></span>';
            }

            public function isPublic(): bool
            {
                return true;
            }

            public function valueAnnotation()
            {
                return null;
            }
        };
        // FakeView's escapeHtmlAttr leaves "/" alone; Laminas' encodes it. Use the real spelling.
        $fake->helpers['escapeHtmlAttr'] = $escape;
        $html = $fake->render('common/resource-values.phtml', ['values' => [
            'dcterms:source' => ['property' => fakeProperty('Source'), 'alternate_label' => null, 'values' => [$linked]],
        ], 'resource' => null]);
        check(str_contains($html, 'files&#x2F;medium&#x2F;c586e3e7.jpg'), 'medium derivative not swapped in');
        check(!str_contains($html, 'square'), 'square derivative left behind');
        check(str_contains($html, '<span class="module-mark"></span>'), "the value's rendered markup must be kept");
    });

    // ---- Record language (T-02) ---------------------------------------------

    /** A language authority as the IWAC index stores it: titles plus an ISO code as dcterms:alternative. */
    function fakeLanguage(int $id, string $title, array $alternatives): object
    {
        return new class($id, $title, $alternatives) {
            public function __construct(private int $id, private string $title, private array $alternatives)
            {
            }

            public function id(): int
            {
                return $this->id;
            }

            public function displayTitle($default = null, $lang = null): string
            {
                return $this->title;
            }

            public function value(string $term, array $options = [])
            {
                return $term === 'dcterms:alternative' ? $this->alternatives : null;
            }
        };
    }

    /** A record whose values are keyed by term; value(…, ['all' => true]) returns the list. */
    function fakeRecord(array $values, string $resourceName = 'items', ?object $item = null): object
    {
        return new class($values, $resourceName, $item) {
            public function __construct(private array $values, private string $resourceName, private ?object $item)
            {
            }

            public function value(string $term, array $options = [])
            {
                $values = $this->values[$term] ?? [];
                if (!empty($options['all'])) {
                    return $values;
                }
                return $values[0] ?? ($options['default'] ?? null);
            }

            public function resourceName(): string
            {
                return $this->resourceName;
            }

            public function item()
            {
                return $this->item;
            }

            public function displayTitle($default = null, $lang = null): string
            {
                return 'La Tabaski à Ouagadougou';
            }

            public function displayDescription($default = null, $lang = null)
            {
                return null;
            }

            public function primaryMedia()
            {
                return null;
            }

            public function link($text, $action = null, array $attributes = []): string
            {
                $attrs = '';
                foreach ($attributes as $name => $value) {
                    $attrs .= ' ' . $name . '="' . htmlspecialchars((string) $value) . '"';
                }
                return '<a href="/item/8558"' . $attrs . '>' . htmlspecialchars((string) $text) . '</a>';
            }

            public function linkRaw($html, $action = null, array $attributes = []): string
            {
                $attrs = '';
                foreach ($attributes as $name => $value) {
                    $attrs .= ' ' . $name . '="' . htmlspecialchars((string) $value) . '"';
                }
                return '<a href="/item/8558"' . $attrs . '>' . $html . '</a>';
            }
        };
    }

    function french(): object
    {
        return fakeValue('Français', null, '', fakeLanguage(8355, 'Français', ['fr']));
    }

    test('ResourceLanguage reads the ISO code off the dcterms:language authority', function () {
        $fake = new FakeView();
        $language = $fake->helpers['ResourceLanguage'];
        same('fr', $language(fakeRecord(['dcterms:language' => [french()]])));
        // Authorities whose alternative is a name, or absent, fall back to the name map.
        $moore = fakeValue('Mooré', null, '', fakeLanguage(8384, 'Mooré', ['Moore']));
        same('mos', $language(fakeRecord(['dcterms:language' => [$moore]])));
        $spanish = fakeValue('Espagnol', null, '', fakeLanguage(26353, 'Espagnol', []));
        same('es', $language(fakeRecord(['dcterms:language' => [$spanish]])));
        // A literal language value reads the same way.
        same('ar', $language(fakeRecord(['dcterms:language' => [fakeValue('Arabe')]])));
        same('dyu', $language(fakeRecord(['dcterms:language' => [fakeValue('dyu')]])));
        // Two languages: which one the title is in is unknown, so nothing.
        $arabic = fakeValue('Arabe', null, '', fakeLanguage(8323, 'Arabe', ['ar']));
        same('', $language(fakeRecord(['dcterms:language' => [french(), $arabic]])));
        // …but the same language twice is still one.
        same('fr', $language(fakeRecord(['dcterms:language' => [french(), french()]])));
        // No language, an unknown one, or no record at all.
        same('', $language(fakeRecord([])));
        same('', $language(fakeRecord(['dcterms:language' => [fakeValue('Klingon')]])));
        same('', $language(null));
        // A media takes its item's language.
        same('fr', $language(fakeRecord([], 'media', fakeRecord(['dcterms:language' => [french()]]))));
    });

    test('ResourceLanguage marks only text that departs from the page language', function () {
        $fake = new FakeView();
        $language = $fake->helpers['ResourceLanguage'];
        $frenchRecord = fakeRecord(['dcterms:language' => [french()]]);
        same(' lang="fr" dir="auto"', $language($frenchRecord, true));
        same(['lang' => 'fr', 'dir' => 'auto'], $language->attributes($frenchRecord));
        same('', $language(fakeRecord(['dcterms:language' => [fakeValue('English')]]), true));
        same('', $language(fakeRecord([]), true));
        // On the French site (lang() "fr", or a regional "fr_FR"), French adds nothing.
        foreach (['fr', 'fr_FR'] as $siteLocale) {
            $frenchSite = new FakeView();
            $frenchSite->helpers['lang'] = static fn (): string => $siteLocale;
            same('', $frenchSite->helpers['ResourceLanguage']($frenchRecord, true), $siteLocale);
        }
    });

    test('item headline carries the record language on the English site', function () {
        $fake = new FakeView();
        $sink = new class {
            public function __call(string $name, array $args)
            {
                return $this;
            }
        };
        $titles = [];
        $fake->helpers['headLink'] = static fn () => $sink;
        $fake->helpers['htmlElement'] = static fn () => $sink;
        // Core's pageTitle(): at level 0 it records the <title> and returns the escaped text.
        $fake->helpers['pageTitle'] = static function ($title, $level = 1) use (&$titles): string {
            $titles[] = [$title, $level];
            return htmlspecialchars((string) $title);
        };
        $html = $fake->render('omeka/site/item/show.phtml', ['item' => fakeRecord(['dcterms:language' => [french()]])]);
        check(str_contains($html, '<h1 lang="fr" dir="auto"><span class="title">La Tabaski à Ouagadougou</span></h1>'), 'headline missing lang: ' . $html);
        same([['La Tabaski à Ouagadougou', 0]], $titles, 'the <title> must still come from pageTitle()');

        $english = $fake->render('omeka/site/item/show.phtml', ['item' => fakeRecord([])]);
        check(str_contains($english, '<h1><span class="title">'), 'an untagged record keeps the bare core markup');
    });

    test('breadcrumb and card titles carry the record language', function () {
        $loads = 0;
        $fake = new FakeView();
        $site = fakePagedSite(['browse'], $loads);
        $fake->helpers['currentSite'] = static fn () => $site;
        $record = fakeRecord(['dcterms:language' => [french()]]);
        $crumbs = $fake->render('common/breadcrumbs.phtml', ['resource' => $record]);
        check(str_contains($crumbs, '<span aria-current="page" lang="fr" dir="auto">La Tabaski à Ouagadougou</span>'), 'current crumb missing lang');
        check(substr_count($crumbs, 'lang="fr"') === 1, 'only the current crumb is in the record language');

        $card = $fake->render('common/resource-card.phtml', [
            'resource' => $record, 'isGrid' => true, 'valueLang' => null, 'liClass' => 'item',
            'decorationClass' => '', 'bodyTerm' => null, 'bodyTruncate' => '', 'headingTerm' => '',
        ]);
        check(str_contains($card, '<a href="/item/8558" lang="fr" dir="auto">La Tabaski à Ouagadougou</a>'), 'card title missing lang');
        // A heading value with its own tag keeps it.
        $tagged = $fake->render('common/resource-card.phtml', [
            'resource' => $record, 'isGrid' => true, 'valueLang' => null, 'liClass' => 'item',
            'decorationClass' => '', 'bodyTerm' => null, 'bodyTruncate' => '',
            'heading' => fakeValue('Al-Tabaski', null, 'ar'),
        ]);
        check(str_contains($tagged, '<a href="/item/8558" lang="ar" dir="auto">Al-Tabaski</a>'), "heading value's own tag lost");
    });

    test('a card with a heading links its thumbnail once, silently (T-12)', function () {
        $fake = new FakeView();
        $fake->helpers['thumbnail'] = static fn ($resource, $type, array $attrs = []): string => '<img alt="' . htmlspecialchars($attrs['alt'] ?? 'MISSING') . '">';
        $vars = ['resource' => fakeRecord([]), 'isGrid' => true, 'valueLang' => null, 'liClass' => 'item',
            'decorationClass' => '', 'bodyTerm' => null, 'bodyTruncate' => '', 'headingTerm' => ''];
        $card = $fake->render('common/resource-card.phtml', $vars);
        check(str_contains($card, '<a href="/item/8558" tabindex="-1" aria-hidden="true"><img alt=""></a>'), 'thumbnail link is not a silent duplicate: ' . $card);
        same(1, substr_count($card, 'La Tabaski à Ouagadougou'), 'the title is announced once');

        // Without a heading the thumbnail is the only link, so it keeps a name.
        $bare = $fake->render('common/resource-card.phtml', ['showHeading' => false] + $vars);
        check(str_contains($bare, '<a href="/item/8558"><img alt="La Tabaski à Ouagadougou"></a>'), 'lone thumbnail link lost its name');
    });

    test('untagged full text and descriptions take the record language; chrome does not', function () {
        $fake = new FakeView();
        $values = [
            'bibo:content' => ['property' => fakeProperty('Content'), 'alternate_label' => null, 'values' => [fakeValue('Le texte intégral.')]],
            'dcterms:description' => ['property' => fakeProperty('Description'), 'alternate_label' => null, 'values' => [
                fakeValue('Une description.'),
                fakeValue('An English description.', null, 'en'),
            ]],
            'dcterms:subject' => ['property' => fakeProperty('Subject'), 'alternate_label' => null, 'values' => [fakeValue('Tabaski')]],
        ];
        $record = fakeRecord(['dcterms:language' => [french()]]);
        $html = $fake->render('common/resource-values.phtml', ['values' => $values, 'resource' => $record]);
        check(str_contains($html, '<span class="value-content" dir="auto" lang="fr">Le texte intégral.</span>'), 'content missing lang');
        check(str_contains($html, '<span class="value-content" dir="auto" lang="fr">Une description.</span>'), 'description missing lang');
        // A value's own tag wins, and goes on the <dd> as before.
        check(str_contains($html, '<span class="value-content" dir="auto">An English description.</span>'), 'tagged value relabelled');
        check(str_contains($html, '<dd class="value" lang="en">'), "tagged value's own lang lost");
        // Subjects are index terms, not the record's prose.
        check(str_contains($html, '<span class="value-content" dir="auto">Tabaski</span>'), 'subject relabelled');
        check(!str_contains($html, '<dd class="value" lang="fr"'), 'the record language must not go on the <dd> (it holds site chrome)');

        // On the French site the page language already covers it.
        $frenchSite = new FakeView();
        $frenchSite->helpers['lang'] = static fn (): string => 'fr';
        $onFrench = $frenchSite->render('common/resource-values.phtml', ['values' => $values, 'resource' => $record]);
        check(!str_contains($onFrench, 'lang="fr"'), 'redundant lang on the French site');
    });

    // ---- Run ----------------------------------------------------------------

    $failed = 0;
    foreach ($tests as $name => $fn) {
        try {
            $fn();
            echo "ok - $name\n";
        } catch (\Throwable $e) {
            $failed++;
            echo "not ok - $name\n  " . get_class($e) . ': ' . str_replace("\n", "\n  ", $e->getMessage()) . "\n";
        }
    }
    echo sprintf("%d tests, %d failed\n", count($tests), $failed);
    exit($failed ? 1 : 0);
}
