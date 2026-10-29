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
 * against FakeView (FakeView.php, shared with render-fixtures.php): a stand-in
 * for Laminas' PhpRenderer that answers the helper calls a template makes from
 * plain arrays and closures. It is not Omeka; a test that needs more of Omeka
 * than a handful of stubs belongs in the live Playwright suite instead.
 */
declare(strict_types=1);

namespace IwacThemeTest {

    require_once __DIR__ . '/FakeView.php';

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

    // ---- ResourceValues: the rules behind common/resource-values ----------

    $langValue = static fn (?string $lang, string $text = '') => new class($lang, $text) {
        public function __construct(private ?string $lang, public string $text)
        {
        }

        public function lang(): ?string
        {
            return $this->lang;
        }
    };

    test('ResourceValues compares languages by primary subtag', function () {
        $rv = \OmekaTheme\Helper\ResourceValues::class;
        same('en', $rv::primarySubtag('en-US'));
        same('en', $rv::primarySubtag('EN_us'));
        same('fr', $rv::primarySubtag(' fr '));
        same('', $rv::primarySubtag(null));
        same('', $rv::primarySubtag(''));
        // Untagged values count as the site's language; others by subtag.
        check($rv::inSiteLanguage('', 'en'), 'untagged kept');
        check($rv::inSiteLanguage('en-GB', 'en'), 'en-GB on an en site');
        check(!$rv::inSiteLanguage('fr', 'en'), 'fr on an en site');
    });

    test('ResourceValues narrows only translation-pair properties, and only when the site language is there', function () use ($langValue) {
        $rv = \OmekaTheme\Helper\ResourceValues::class;
        $pair = [$langValue('fr', 'Résumé'), $langValue('en', 'Summary'), $langValue(null, 'Neutral')];

        [$kept, $narrowed] = $rv::preferSiteLanguage($pair, 'en', 'bibo:shortDescription');
        same(['Summary', 'Neutral'], array_values(array_map(static fn ($v) => $v->text, $kept)));
        check($narrowed, 'narrowed flag');
        // Keys survive, as array_filter keeps them (the template iterates them).
        same([1, 2], array_keys($kept));

        // A property that is not a translation pair keeps every language.
        [$all, $narrowedDesc] = $rv::preferSiteLanguage($pair, 'en', 'dcterms:description');
        same(3, count($all));
        check(!$narrowedDesc, 'description is not narrowed');

        // No value in the site language: nothing is dropped.
        [$frOnly, $narrowedFr] = $rv::preferSiteLanguage([$langValue('fr')], 'en', 'bibo:shortDescription');
        same(1, count($frOnly));
        check(!$narrowedFr, 'lone French lede kept');

        // Nothing to compare against outside a site request.
        same([$pair, false], $rv::preferSiteLanguage($pair, '', 'bibo:shortDescription'));

        // Only untagged and site-language values when they are all there is.
        [, $already] = $rv::preferSiteLanguage([$langValue('en'), $langValue(null)], 'en', 'bibo:shortDescription');
        check(!$already, 'nothing dropped, so nothing narrowed');

        // Core's filter_locale_values, by subtag.
        same([1, 2], array_keys($rv::filterToSiteLanguage($pair, 'en')));
    });

    test('ResourceValues labels, language chips and prose language', function () {
        $rv = \OmekaTheme\Helper\ResourceValues::class;
        same('Description', $rv::displayLabel('DescriptionAI', true));
        same('Summary', $rv::displayLabel('Summary AI ', true));
        same('DescriptionAI', $rv::displayLabel('DescriptionAI', false));
        same('Raid', $rv::displayLabel('Raid', true), 'a label not ending in AI is unchanged');

        check($rv::showLanguageChip(true, 'fr', false, false, 'en'), 'a French value on the English site');
        check(!$rv::showLanguageChip(false, 'fr', false, false, 'en'), 'show_locale_label off');
        check(!$rv::showLanguageChip(true, '', false, false, 'en'), 'untagged');
        check(!$rv::showLanguageChip(true, 'fr', true, false, 'en'), 'parsed AI table of contents');
        check(!$rv::showLanguageChip(true, 'en-US', false, true, 'en'), 'narrowed: the chip repeats <html lang>');
        check($rv::showLanguageChip(true, 'fr', false, true, 'en'), 'narrowed, but another language');

        same('fr', $rv::proseLang('fr', null, 'literal', 'bibo:content'));
        same('fr', $rv::proseLang('fr', '', 'literal', 'dcterms:description'));
        same('', $rv::proseLang('fr', 'en', 'literal', 'bibo:content'), "the value's own tag wins");
        same('', $rv::proseLang('fr', null, 'uri', 'bibo:content'), 'only literals');
        same('', $rv::proseLang('fr', null, 'literal', 'dcterms:title'), 'only the record prose terms');
        same('', $rv::proseLang('', null, 'literal', 'bibo:content'), 'unknown record language');
    });

    test('ResourceValues folds a transcript only past the threshold, at a line break', function () {
        $rv = \OmekaTheme\Helper\ResourceValues::class;
        $short = str_repeat('mot ', 1999) . 'fin'; // 7,999 characters
        same(null, $rv::transcript('bibo:content', 'literal', $short));
        $long = str_repeat("Ligne de texte numérisé.\n", 400); // well over 8,000 bytes
        same(null, $rv::transcript('dcterms:description', 'literal', $long), 'another property');
        same(null, $rv::transcript('bibo:content', 'uri', $long), 'not a literal');

        [$lede, $rest, $words] = $rv::transcript('bibo:content', 'literal', $long);
        check(strlen($lede) <= $rv::TRANSCRIPT_LEDE_MAX + 200, 'lede inside its window');
        check(str_ends_with($lede, 'numérisé.'), 'cut at a line break, never mid-word: ' . substr($lede, -20));
        same($long, $lede . "\n" . $rest, 'nothing lost or duplicated');
        same($rv::countWords($rest), $words);

        // No break opportunity anywhere: a character-wise cut, never inside
        // a multibyte character.
        $unbroken = str_repeat('é', 9000);
        [$ledeU, $restU] = $rv::transcript('bibo:content', 'literal', $unbroken);
        same(1200, mb_strlen($ledeU));
        check(mb_check_encoding($ledeU, 'UTF-8') && mb_check_encoding($restU, 'UTF-8'), 'valid UTF-8 on both sides');

        same("12\u{202F}345", $rv::formatCount(12345));
    });

    test('ResourceValues swaps a square thumbnail for the medium one, escaped or not', function () {
        $rv = \OmekaTheme\Helper\ResourceValues::class;
        $escape = static fn ($s): string => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
        $resource = new class {
            public function thumbnailDisplayUrl(string $type): string
            {
                return "/files/{$type}/logo.png?a=1&b=2";
            }
        };
        $html = '<img src="/files/square/logo.png?a=1&amp;b=2"> /files/square/logo.png?a=1&b=2';
        same('<img src="/files/medium/logo.png?a=1&amp;b=2"> /files/medium/logo.png?a=1&b=2',
            $rv::mediumThumbnails($html, $resource, $escape));
        same($html, $rv::mediumThumbnails($html, null, $escape), 'no linked resource');
        same($html, $rv::mediumThumbnails($html, new class {
        }, $escape), 'a resource without thumbnails');
    });

    test('MoveBlockingHeadScripts takes every parser-blocking script, inline ones in place (regression: Mapping "MappingBasemap is not defined")', function () {
        // What headScript()->getContainer() holds: one stdClass per script, in
        // the shape a live place record has — Mapping's inline credentials block
        // sits between mapping-basemap.js and the scripts after it.
        $item = static fn (string $type, array $attributes, ?string $source = null) => (object) [
            'type' => $type,
            'attributes' => $attributes,
            'source' => $source,
        ];
        $container = new \ArrayObject([
            $item('text/javascript', ['src' => '/application/asset/vendor/jquery/jquery.min.js']),
            $item('text/javascript', ['src' => '/application/asset/js/global.js']),
            $item('text/javascript', ['src' => '/modules/Mapping/asset/js/mapping-basemap.js']),
            $item('text/javascript', [], 'MappingBasemap.credentials.CartoDB.apikey = "";'),
            $item('module', ['src' => '/modules/Mirador/asset/js/mirador-4.mjs']),
            $item('text/javascript', ['src' => '/modules/Mapping/asset/js/mapping-show.js']),
            $item('text/javascript', ['src' => '/modules/IwacSearch/asset/dist/header.js', 'defer' => 'defer']),
            $item('text/javascript', ['src' => '/modules/Async/asset/js/a.js', 'async' => 'async']),
            $item('text/javascript', ['async' => 'async'], 'window.inlineAsync = 1;'),
            $item('application/ld+json', [], '{"@context":"https://schema.org"}'),
            $item('', ['src' => '/modules/Other/asset/js/other.js']),
            $item('text/javascript', ['src' => '/themes/IWAC-theme/asset/js/citation.js?v=2.23.0']),
            $item('text/javascript', ['src' => '/modules/Other/asset/js/citation.js']),
            'not a script',
        ]);
        $label = static fn ($i): string => $i instanceof \stdClass ? ($i->attributes['src'] ?? $i->source) : $i;
        $move = (new \OmekaTheme\Helper\MoveBlockingHeadScripts())->setView(new FakeView());
        $moved = $move($container);

        // Order is the whole point: the inline block travels between the two
        // files it sat between, and nothing is reordered on either side.
        same([
            '/application/asset/vendor/jquery/jquery.min.js',
            '/application/asset/js/global.js',
            '/modules/Mapping/asset/js/mapping-basemap.js',
            'MappingBasemap.credentials.CartoDB.apikey = "";',
            '/modules/Mapping/asset/js/mapping-show.js',
            'window.inlineAsync = 1;',
            '/modules/Other/asset/js/other.js',
            '/themes/IWAC-theme/asset/js/dist/citation.min.js?v=2.23.0',
            '/modules/Other/asset/js/citation.js',
        ], array_map($label, $moved));
        same([
            '/modules/Mirador/asset/js/mirador-4.mjs',
            '/modules/IwacSearch/asset/dist/header.js',
            '/modules/Async/asset/js/a.js',
            '{"@context":"https://schema.org"}',
            'not a script',
        ], array_map($label, array_values($container->getArrayCopy())));
        // Nothing moved is deferred: running synchronously is what keeps
        // jQuery's ready waiting for DOMContentLoaded.
        foreach ($moved as $script) {
            check(empty($script->attributes['defer']), $label($script) . ' must not be deferred');
        }
        // Idempotent: a second pass finds nothing left to move.
        same([], $move($container));
    });

    test('the layout moves the head scripts after view.layout and prints them ahead of the body scripts', function () {
        $layout = (string) file_get_contents(ROOT . '/view/layout/layout.phtml');
        $trigger = strpos($layout, "\$this->trigger('view.layout');");
        $pass = strpos($layout, '$bodyEndScripts = $this->MoveBlockingHeadScripts($this->headScript()->getContainer());');
        $head = strpos($layout, '<?php echo $this->headScript(); ?>');
        $headClose = strpos($layout, '</head>');
        $restore = strpos($layout, '$this->headScript()->getContainer()->exchangeArray($bodyEndScripts);');
        $footer = strpos($layout, "partial('common/footer')");
        $inline = strpos($layout, 'echo $this->inlineScript()');
        check($trigger !== false && $pass !== false, 'view.layout trigger or move pass missing from layout.phtml');
        check($pass > $trigger, 'the move pass must run after modules enqueue on view.layout');
        check($head !== false && $head > $pass && $head < $headClose, 'the <head> must print what the pass left in it');
        check($restore !== false && $restore > $footer && $restore < $inline, 'the moved scripts must print after the content, ahead of inlineScript()');
        $bodyEcho = strpos($layout, 'echo $this->headScript();', (int) $restore);
        check($bodyEcho !== false && $bodyEcho < $inline, 'the moved scripts must be echoed before inlineScript()');
        // A deferred jQuery fires `ready` before the deferred scripts behind it.
        check(!preg_match("/prependFile\\([^;]*jquery\\.min\\.js[^;]*defer/", $layout), 'jQuery must not be deferred');
        $ini = (string) file_get_contents(ROOT . '/config/theme.ini');
        check((bool) preg_match('/^helpers\[\] = "MoveBlockingHeadScripts"\r?$/m', $ini), 'MoveBlockingHeadScripts is not registered in theme.ini');
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

    test('the linked-resources search form and feedback come from one partial (T-25)', function () {
        $fake = new FakeView([], [], ['page' => '2', 'resource_property' => 'items:3', 'lr_q' => 'old']);
        $fake->helpers['queryToHiddenInputs'] = static function (array $skip = []) use ($fake): string {
            $html = '';
            foreach ($fake->query as $name => $value) {
                if (!in_array($name, $skip, true)) {
                    $html .= '<input type="hidden" name="' . $name . '" value="' . $value . '">';
                }
            }
            return $html;
        };
        $form = $fake->render('common/linked-resources-search.phtml', [
            'part' => 'form', 'action' => '/item/1#resources-linked', 'inputId' => 'linked-resources-search',
            'searchName' => 'lr_q', 'searchValue' => 'Tabaski "1966"', 'label' => 'Search the linked resources by title',
            'skip' => ['lr_page', 'page', 'lr_q', 'lr_sort'],
            'sortId' => 'linked-resources-sort', 'sortName' => 'lr_sort', 'sortValue' => 'title-asc',
            'sortOptions' => ['date-desc' => 'Newest first', 'title-asc' => 'Title (A-Z)'],
        ]);
        check(str_contains($form, '<form class="linked-resources__query" method="get" action="/item/1#resources-linked" role="search">'), 'a GET form: it works without JavaScript');
        check(str_contains($form, 'id="linked-resources-search"') && str_contains($form, 'name="lr_q"'), 'input id/name');
        check(str_contains($form, 'value="Tabaski &quot;1966&quot;"'), 'the current search, escaped');
        check(str_contains($form, 'aria-label="Search the linked resources by title"'), 'input name');
        check(str_contains($form, 'class="linked-resources__search-input"'), 'the class linked-resources.js binds');
        check(str_contains($form, '<option value="title-asc" selected>'), 'the current order is selected');
        check(str_contains($form, 'name="resource_property" value="items:3"'), 'the relation filter rides along');
        check(!str_contains($form, 'name="page"') && !str_contains($form, 'value="old"'), 'a new search resets the page and replaces the old search');
        check(str_contains($form, '<button type="submit" class="linked-resources__apply">'), 'the no-JS submit');

        // The ledger: no select, and hidden fields that qualify the search.
        $ledger = $fake->render('common/linked-resources-search.phtml', [
            'part' => 'form', 'action' => '/item-set/2', 'inputId' => 'item-set-resources-search',
            'searchName' => 'property[title][text]', 'searchValue' => '', 'label' => 'Search the items in this set by title',
            'skip' => ['page', 'property[title][text]'], 'hidden' => ['property[title][type]' => 'in'],
        ]);
        check(!str_contains($ledger, '<select'), 'no sort without options');
        check(str_contains($ledger, 'name="property[title][type]" value="in" data-requires="property[title][text]"'), 'a qualifying field names the search it qualifies');

        $feedback = $fake->render('common/linked-resources-search.phtml', ['part' => 'feedback', 'noResults' => true, 'noResultsText' => 'None <here>']);
        check(str_contains($feedback, 'class="linked-resources__status" role="status"'), 'status region');
        check(str_contains($feedback, '<p>None &lt;here&gt;</p>'), 'empty state escaped');
        $found = $fake->render('common/linked-resources-search.phtml', ['part' => 'feedback', 'noResults' => false, 'noResultsText' => 'None']);
        check(!str_contains($found, 'linked-resources__no-results'), 'no empty state when the search found rows');
        // Both ledgers use it, and neither keeps its own copy.
        foreach (['common/linked-resources.phtml', 'omeka/site/item/browse.phtml'] as $template) {
            $source = (string) file_get_contents(ROOT . '/view/' . $template);
            same(2, substr_count($source, "partial('common/linked-resources-search'"), $template);
            check(!str_contains($source, 'linked-resources__search-input'), "$template still has its own copy");
        }
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

    test('the citation panel names its subject: an item, or a page for a webpage record', function () {
        $fake = new FakeView();
        $citation = static fn (string $kind): array => [
            'record' => ['id' => 11, 'kind' => $kind],
            'defaultStyle' => 'chicago',
            'styles' => ['chicago' => ['label' => 'Chicago', 'html' => 'Madore, Frédérick. “Hadj au Burkina Faso.”']],
            'downloads' => [['label' => 'BibTeX', 'url' => 'https://islam.zmo.de/cite/page/11/bibtex']],
            'zoteroRdf' => null,
        ];

        $page = $fake->render('common/citation.phtml', ['citation' => $citation('webpage')]);
        check(str_contains($page, '>How to cite this page</h2>'), 'a webpage record is headed as a page');
        check(str_contains($page, 'href="https://islam.zmo.de/cite/page/11/bibtex"'), 'the page downloads are linked');
        check(!str_contains($page, 'Zotero RDF'), 'a page offers no Zotero RDF link');

        $item = $fake->render('common/citation.phtml', ['citation' => $citation('newspaper')]);
        check(str_contains($item, '>How to cite this item</h2>'), 'any other kind is headed as an item');
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

    test('the footer gathers childless menu entries into one column of links (T-23)', function () {
        $menuHtml = '<ul class="navigation"><li><a href="/p/parcourir">Parcourir</a><ul><li><a href="/p/benin">Bénin</a></li></ul></li>'
            . '<li><a href="/p/references">Références</a></li><li class="active"><a href="/p/index">Index</a></li>'
            . '<li><a href="/p/expositions">Expositions</a><ul><li><a href="/p/hadj">Hadj</a></li></ul></li>'
            . '<li><a href="/p/a-propos">À propos</a></li></ul>';
        $site = new class($menuHtml) {
            public function __construct(private string $html)
            {
            }

            public function publicNav()
            {
                $html = $this->html;
                return new class($html) {
                    public function __construct(private string $html)
                    {
                    }

                    public function menu()
                    {
                        return $this;
                    }

                    public function renderMenu($container, array $options): string
                    {
                        return $this->html;
                    }
                };
            }
        };
        $html = (new FakeView(['footer_menu' => '1']))->render('common/footer.phtml', ['site' => $site]);
        preg_match('/<div class="main-footer__col2">(.*?)<\/div>/s', $html, $col);
        $menu = $col[1] ?? '';
        // One links column, standing where Références stood, holding the three childless entries.
        check(str_contains($menu, '<li class="main-footer__menu-links"><ul><li><a href="/p/references">Références</a></li><li class="active"><a href="/p/index">Index</a></li><li><a href="/p/a-propos">À propos</a></li></ul></li>'), 'childless entries not grouped: ' . $menu);
        check(strpos($menu, 'Parcourir') < strpos($menu, 'main-footer__menu-links') && strpos($menu, 'main-footer__menu-links') < strpos($menu, 'Expositions'), 'column out of place');
        same(1, substr_count($menu, 'Bénin'), 'nested entries kept as they were');
    });

    test('partner logos link in the page language where the partner has one, and say so where not (T-23)', function () {
        $menuCalls = [];
        $render = static function (string $locale) use (&$menuCalls): string {
            $fake = new FakeView(['footer_site_info' => '<p>About</p>']);
            $fake->helpers['lang'] = static fn (): string => $locale;
            return $fake->render('common/footer.phtml', ['site' => fakeSite($menuCalls)]);
        };
        $french = $render('fr');
        // No partner publishes French: English pages, marked hreflang="en"; the Senate is German only.
        check(str_contains($french, 'href="https://www.zmo.de/en" hreflang="en"'), 'ZMO on the French site');
        check(str_contains($french, 'href="https://www.berlin.de/sen/wgp/" hreflang="de"'), 'Senate is German');
        $english = $render('en_US');
        check(str_contains($english, 'href="https://www.zmo.de/en" target="_blank"'), 'no hreflang where it matches the page');
        same(4, substr_count($english, 'class="main-footer__logo"'));
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

    test('the Linked resources block pages through lr_page, never the ledger\'s page (regression: shared ?page=)', function () {
        $resource = static fn (string $name): object => new class($name) {
            public function __construct(private string $name)
            {
            }

            public function resourceName(): string
            {
                return $this->name;
            }
        };
        $paging = static fn (string $name, array $query): array => (new FakeView([], [], $query))->helpers['LinkedResourcesPaging']($resource($name));

        // On an item set's page, ?page= is the ledger's: never read, never dropped.
        $set = $paging('item_sets', ['page' => '2', 'sort_by' => 'title']);
        same(1, $set['page'], "the ledger's page 2 must not turn the block");
        same(['page' => '2', 'sort_by' => 'title'], $set['query'], "the ledger's page rides along in the block's URLs");
        same(['lr_page'], $set['drop']);
        same(3, $paging('item_sets', ['page' => '2', 'lr_page' => '3'])['page']);

        // Where the block is the only listing, a pre-rename ?page= still lands —
        // and is dropped from the URLs it builds, lr_page winning when both are there.
        foreach (['items', 'media'] as $name) {
            $item = $paging($name, ['page' => '3', 'resource_property' => 'items:5-86']);
            same(3, $item['page'], "$name: legacy ?page=");
            same(['resource_property' => 'items:5-86'], $item['query'], "$name: retired page dropped, filter kept");
            same(['lr_page', 'page'], $item['drop'], $name);
            same(2, $paging($name, ['page' => '3', 'lr_page' => '2'])['page'], "$name: lr_page wins");
        }

        foreach (['abc', '0', '-4', ['2']] as $hostile) {
            same(1, $paging('items', ['lr_page' => $hostile])['page'], 'lr_page=' . var_export($hostile, true));
        }
        same(['lr_page', 'resource_property', 'lr_q', 'lr_sort'], $paging('items', [])['params'], 'the root names its state for linked-resources.js');

        // The search and the sort: normalised, never trusted.
        $state = $paging('items', ['lr_q' => "  Côte \t d'Ivoire ", 'lr_sort' => 'title-desc', 'resource_property' => 'items:3-86']);
        same("Côte d'Ivoire", $state['q'], 'whitespace collapsed');
        same('title-desc', $state['sortKey']);
        same('items:3-86', $state['resourceProperty']);
        same(100, mb_strlen($paging('items', ['lr_q' => str_repeat('é', 300)])['q']), 'a search is cut at 100 characters');
        foreach ([['lr_q' => ['x']], ['lr_sort' => 'id; DROP'], ['lr_sort' => ['date-asc']], ['resource_property' => ['items:3']]] as $hostile) {
            $state = $paging('items', $hostile);
            same(['', 'date-desc', null], [$state['q'], $state['sortKey'], $state['resourceProperty']], var_export($hostile, true));
        }
    });

    test('the linked items are asked of the API over every row, never through the shared paginator', function () {
        $class = \OmekaTheme\Helper\LinkedResourcesPaging::class;
        $query = $class::apiQuery(1023, 0, '', 'date-desc', 3, 25);
        same([[
            'joiner' => 'and', 'property' => '', 'type' => 'res', 'text' => '1023',
        ]], $query['property'], 'any property pointing at the record');
        same(['dcterms:date', 'desc'], [$query['sort_by'], $query['sort_order']]);
        same([25, 50], [$query['limit'], $query['offset']], 'limit/offset for page 3');
        check(!isset($query['page']) && !isset($query['per_page']), "page/per_page reconfigure core's one Omeka\\Paginator — the ledger's pager");
        check(!isset($query['site_id']), 'no site filter unless the site asks for one');

        $query = $class::apiQuery(1023, 3, 'Ramadan', 'title-asc', 1, 25, 2);
        same(3, $query['property'][0]['property'], 'one relation');
        same(['joiner' => 'and', 'property' => 'dcterms:title', 'type' => 'in', 'text' => 'Ramadan'], $query['property'][1], 'the title search');
        same(['title', 'asc', 0, 2], [$query['sort_by'], $query['sort_order'], $query['offset'], $query['site_id']]);
        same(['dcterms:date', 'desc'], [$class::apiQuery(1, 0, '', 'bogus', 1, 25)['sort_by'], $class::apiQuery(1, 0, '', 'bogus', 1, 25)['sort_order']], 'an unknown order is the default');

        same([3, 3, 0, 0], [$class::propertyId('3-86,329'), $class::propertyId('3'), $class::propertyId(''), $class::propertyId(null)]);
    });

    test('the pager form writes the parameter its caller names (default: page)', function () {
        $skipped = [];
        $render = static function (array $extra) use (&$skipped): string {
            $fake = new FakeView();
            $fake->helpers['hyperlink'] = static fn ($text, $url, array $attrs = []): string => '<a href="' . $url . '"></a>';
            $fake->helpers['queryToHiddenInputs'] = static function (array $skip = []) use (&$skipped): string {
                $skipped = $skip;
                return '';
            };
            return $fake->render('common/pagination.phtml', $extra + [
                'totalCount' => 60, 'offset' => 25, 'perPage' => 25, 'currentPage' => 2, 'pageCount' => 3,
                'previousPageUrl' => '?p=1', 'nextPageUrl' => '?p=3',
            ]);
        };
        // Core's pagination() helper passes no $pageParam: the page's own listing.
        check(str_contains($render([]), 'name="page" class="page-input-top"'), 'default page field');
        same(['page'], $skipped);
        $block = $render(['pageParam' => 'lr_page', 'dropParams' => ['lr_page', 'page']]);
        check(str_contains($block, 'name="lr_page" class="page-input-top"'), 'the block\'s page field');
        check(!str_contains($block, 'name="page"'), 'the block\'s form must not write the ledger\'s page');
        same(['lr_page', 'lr_page', 'page'], $skipped);
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

    // ---- AI table of contents and the value list (T-17) ---------------------

    test('the AI table of contents parses into page / title / byline / summary entries', function () {
        $fake = new FakeView();
        $text = "p. 1-2 : L'islam au Togo (Issa Moussa)\nUn résumé\nsur deux lignes.\r\n\r\n"
            . "p. 3 : Suite du feuilleton (1)\nLa suite.\n\n\n"
            . "Éditorial sans page\nTexte <b>brut</b>.";
        $html = $fake->render('common/ai-toc.phtml', ['text' => $text]);
        same(3, substr_count($html, '<li class="ai-toc__entry">'));
        check(str_contains($html, '<span class="ai-toc__pages">p.&nbsp;1-2</span>'), 'page range');
        check(str_contains($html, '<span class="ai-toc__title">L&#039;islam au Togo</span>'), 'title, escaped, byline peeled');
        check(str_contains($html, '<span class="ai-toc__author">(Issa Moussa)</span>'), 'byline');
        // Soft wraps in a summary collapse to spaces.
        check(str_contains($html, '<p class="ai-toc__summary">Un résumé sur deux lignes.</p>'), 'summary joined');
        // "(1)" is a continuation marker, not an author.
        check(str_contains($html, '<span class="ai-toc__title">Suite du feuilleton (1)</span>'), 'numeric pair kept in title');
        same(1, substr_count($html, 'ai-toc__author'));
        // An entry without "p. … :" keeps its whole header as the title; markup is escaped.
        check(str_contains($html, '<span class="ai-toc__title">Éditorial sans page</span>'), 'unpaged entry');
        check(str_contains($html, 'Texte &lt;b&gt;brut&lt;/b&gt;.'), 'summary escaped');

        // Nothing to parse: the raw value, never swallowed.
        check(str_contains($fake->render('common/ai-toc.phtml', ['text' => ' ']), 'ai-toc--raw'), 'empty parse falls back to raw');
    });

    /** A values array for resource-values.phtml: term => [label, [values]]. */
    function valueRows(array $rows): array
    {
        $values = [];
        foreach ($rows as $term => [$label, $list, $alternate]) {
            $values[$term] = ['property' => fakeProperty($label), 'alternate_label' => $alternate, 'values' => $list];
        }
        return $values;
    }

    test('the AI lede narrows to the site language and carries the EU provenance mark', function () {
        $values = valueRows([
            'bibo:shortDescription' => ['Short description', [
                fakeValue('Résumé en français.', null, 'fr'),
                fakeValue('Summary in English.', null, 'en'),
            ], 'DescriptionAI'],
            'dcterms:description' => ['Description', [
                fakeValue('Description française.', null, 'fr'),
                fakeValue('English description.', null, 'en'),
            ], null],
        ]);
        $english = (new FakeView())->render('common/resource-values.phtml', ['values' => $values, 'resource' => null]);
        // The lede: the English rendering only, no "en" chip (it would restate <html lang>).
        check(str_contains($english, 'Summary in English.') && !str_contains($english, 'Résumé en français.'), 'lede not narrowed');
        check(!(bool) preg_match('/data-property-term="bibo:shortDescription".*?<span class="language">/s', explode('dcterms:description', $english)[0]), 'redundant language chip on the narrowed lede');
        // AI provenance: the class, the labelled EU mark, and "DescriptionAI" → "Description".
        check(str_contains($english, 'class="property property--ai" data-property-term="bibo:shortDescription"'), 'AI class missing');
        check(str_contains($english, 'class="property__ai-eu" role="img" aria-label="AI-generated content — verify against the original source."'), 'EU mark missing');
        check((bool) preg_match('/<dt>\s*Description\s*<span class="property__ai-eu"/', $english), 'trailing "AI" not stripped from the label');
        // Other fr/en pairs are genuine metadata: both kept, each with its chip.
        check(str_contains($english, 'Description française.') && str_contains($english, 'English description.'), 'description narrowed');
        check(str_contains($english, '<span class="language">fr</span>'), 'chip on a departing value');

        // On a regional French locale (fr_FR) the lede narrows to French.
        $french = new FakeView();
        $french->helpers['lang'] = static fn (): string => 'fr_FR';
        $onFrench = $french->render('common/resource-values.phtml', ['values' => $values, 'resource' => null]);
        check(str_contains($onFrench, 'Résumé en français.') && !str_contains($onFrench, 'Summary in English.'), 'lede not narrowed to French');

        // A lede with no value in the site language keeps what it has.
        $frenchOnly = valueRows(['bibo:shortDescription' => ['Short description', [fakeValue('Seulement en français.', null, 'fr')], null]]);
        check(str_contains((new FakeView())->render('common/resource-values.phtml', ['values' => $frenchOnly, 'resource' => null]), 'Seulement en français.'), 'lone French lede dropped');
    });

    test('a long transcript folds past its opening extract; a press article does not', function () {
        $paragraph = str_repeat('Le mot de la fin. ', 40) . "\n";
        $long = str_repeat($paragraph, 15); // ~10,800 characters
        $short = str_repeat($paragraph, 3);
        $render = static fn (string $text): string => (new FakeView())->render('common/resource-values.phtml', [
            'values' => valueRows(['bibo:content' => ['Content', [fakeValue($text)], null]]),
            'resource' => null,
        ]);

        $folded = $render($long);
        check(str_contains($folded, '<details class="transcript__rest">'), 'long transcript not folded');
        // The extract ends on a line break inside the first 1,200 characters.
        preg_match('/<div class="transcript__lede value-content" dir="auto">(.*?)<\/div>/s', $folded, $lede);
        check(isset($lede[1]) && mb_strlen(strip_tags($lede[1])) <= 1400, 'extract too long');
        // The remainder's word count — 3,000 words less the one-paragraph
        // extract's 200 — grouped with a narrow no-break space.
        same(200, preg_match_all('/\S+/u', strip_tags($lede[1])), 'extract should be the first paragraph');
        check(str_contains($folded, "Read the full text — 2\u{202F}800 more words"), 'word count missing or ungrouped');
        // The full text is all still in the page.
        same(15 * 40, substr_count($folded, 'Le mot de la fin.'));

        $plain = $render($short);
        check(!str_contains($plain, '<details'), 'short text folded');
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

    /** A URI value as core models it: the address, plus an optional label. */
    function fakeUri(string $uri, string $label = ''): object
    {
        return new class($uri, $label) {
            public function __construct(private string $uri, private string $label)
            {
            }

            public function type(): string
            {
                return 'uri';
            }

            public function uri(): string
            {
                return $this->uri;
            }

            public function value(): string
            {
                return $this->label;
            }

            public function lang(): string
            {
                return '';
            }

            public function valueResource()
            {
                return null;
            }

            public function valueAnnotation()
            {
                return null;
            }

            public function isPublic(): bool
            {
                return true;
            }

            /** Core's Uri data type: the label (else the address) in a link. */
            public function asHtml($lang = null): string
            {
                $text = $this->label !== '' ? $this->label : $this->uri;
                return '<a class="uri-value-link" target="_blank" href="' . htmlspecialchars($this->uri) . '">' . htmlspecialchars($text) . '</a>';
            }
        };
    }

    test('ExternalIdentifier reads a Wikidata entity or a DOI, and nothing else', function () {
        $id = (new FakeView())->helpers['ExternalIdentifier'];
        $wikidata = ['scheme' => 'wikidata', 'id' => 'Q141697087', 'url' => 'https://www.wikidata.org/wiki/Q141697087', 'label' => 'Wikidata'];
        same($wikidata, $id(fakeUri('https://www.wikidata.org/wiki/Q141697087', 'Q141697087'), 'dcterms:identifier'));
        // Every spelling lands on the one canonical page, whatever the label.
        same($wikidata, $id(fakeUri('http://www.wikidata.org/entity/Q141697087', 'Wikidata')));
        same($wikidata, $id(fakeUri('https://m.wikidata.org/wiki/q141697087')));
        // A property or a lexeme is not an entity the collection reconciles to.
        same(null, $id(fakeUri('https://www.wikidata.org/wiki/Property:P31')));

        $doi = ['scheme' => 'doi', 'id' => '10.48734/akofena.n018.vol.1.13.2025', 'url' => 'https://doi.org/10.48734/akofena.n018.vol.1.13.2025', 'label' => 'DOI'];
        same($doi, $id(fakeUri('https://doi.org/10.48734/akofena.n018.vol.1.13.2025', '10.48734/akofena.n018.vol.1.13.2025'), 'bibo:doi'));
        same($doi, $id(fakeUri('http://dx.doi.org/10.48734/akofena.n018.vol.1.13.2025')));
        // A typed DOI on bibo:doi, bare or prefixed; the same text elsewhere is just text.
        same($doi, $id(fakeValue('10.48734/akofena.n018.vol.1.13.2025'), 'bibo:doi'));
        same($doi, $id(fakeValue('doi: 10.48734/akofena.n018.vol.1.13.2025'), 'bibo:doi'));
        same(null, $id(fakeValue('10.48734/akofena.n018.vol.1.13.2025'), 'dcterms:identifier'));
        // An encoded DOI reads decoded, and only path-breaking characters are re-escaped.
        $sici = $id(fakeUri('https://doi.org/10.1002/%28SICI%291097-4571%28199806%2949%3A8%3C693%3A%3AAID-ASI4%3E3.0.CO%3B2-0'));
        same('10.1002/(SICI)1097-4571(199806)49:8<693::AID-ASI4>3.0.CO;2-0', $sici['id']);
        same('https://doi.org/10.1002/(SICI)1097-4571(199806)49:8%3C693::AID-ASI4%3E3.0.CO;2-0', $sici['url']);

        same(null, $id(fakeUri('https://example.org/10.1234/x')));
        same(null, $id(fakeValue('iwac-index-0000001'), 'dcterms:identifier'));
    });

    test('a DOI or Wikidata value carries its mark; other links keep core markup', function () {
        $values = valueRows([
            'bibo:doi' => ['doi', [fakeUri('https://doi.org/10.48734/akofena.n018.vol.1.13.2025', '10.48734/akofena.n018.vol.1.13.2025')], null],
            'dcterms:identifier' => ['Identifier', [
                fakeUri('https://www.wikidata.org/wiki/Q216920', 'Q216920'),
                fakeValue('iwac-index-0000001'),
            ], null],
            'fabio:hasURL' => ['URL', [fakeUri('https://example.org/article', 'Article')], null],
        ]);
        $html = (new FakeView())->render('common/resource-values.phtml', ['values' => $values, 'resource' => null]);

        check(str_contains($html, '<a class="uri-value-link ext-id ext-id--doi" href="https://doi.org/10.48734/akofena.n018.vol.1.13.2025" target="_blank" rel="noopener" dir="ltr"><span class="ext-id__mark" role="img" aria-label="DOI" title="DOI"></span><span class="ext-id__id" translate="no">10.48734/akofena.n018.vol.1.13.2025</span></a>'), 'DOI link');
        check(str_contains($html, 'class="uri-value-link ext-id ext-id--wikidata" href="https://www.wikidata.org/wiki/Q216920"'), 'Wikidata link');
        check(str_contains($html, 'aria-label="Wikidata"'), 'the scheme must name the Wikidata link');
        // The IWAC key beside it, and an ordinary URL, are untouched.
        check(str_contains($html, '<span class="value-content" dir="auto">iwac-index-0000001</span>'), 'literal identifier changed');
        check(str_contains($html, '<span class="value-content" dir="auto"><a class="uri-value-link" target="_blank" href="https://example.org/article">Article</a></span>'), 'plain URI lost core markup');
        same(2, substr_count($html, 'ext-id__mark'), 'one mark per recognised identifier');
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
