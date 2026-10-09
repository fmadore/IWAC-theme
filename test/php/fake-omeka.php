<?php
/**
 * The slice of Omeka S — and of the modules the live sites run — that the
 * theme's templates call, faked well enough to render whole pages for the
 * JavaScript behaviour suite. Loaded by render-fixtures.php; see its docblock
 * for why the fixtures exist.
 *
 * What is real and what is faked:
 *
 * - REAL: every template under view/ (layout.phtml included), every helper
 *   under helper/, and the French catalogue the theme ships (language/fr.mo).
 * - FAKED HERE: core's view helpers (url, hyperlink, pagination, thumbnail,
 *   pageTitle, the head containers…), its representations (site, page,
 *   resource, value…) and the markup core and modules print AROUND the
 *   theme's templates — the page-block grid, the Mirador block, the sort
 *   selector, the navigation menu. Each piece says what it imitates; the
 *   core- and module-owned markup was copied from the live site (October
 *   2026), trimmed where only its length differed.
 *
 * Deliberately left out, because each would churn every fixture without
 * changing a DOM a test can see: Laminas' attribute escaping (`&#x20;` for a
 * space — htmlspecialchars decodes to the same DOM and keeps the fixtures
 * readable), the `?v=` cache-buster on asset URLs (every version bump would
 * restale every file), and core's French catalogue (strings only core
 * translates — property labels, "Close" — stay English on the French pages).
 */
declare(strict_types=1);

namespace IwacThemeTest\Fixtures;

use IwacThemeTest\FakeView;

use const IwacThemeTest\ROOT;

/** The theme's gettext catalogue, read from the compiled .mo Omeka loads. */
final class Catalog
{
    /** @var array<string,string> */
    private array $messages = [];

    public static function english(): self
    {
        return new self();
    }

    public static function fromMo(string $file): self
    {
        $catalog = new self();
        $bytes = (string) file_get_contents($file);
        $header = unpack('Vmagic/Vrevision/Vcount/Voriginals/Vtranslations', substr($bytes, 0, 20));
        if (!$header || $header['magic'] !== 0x950412de) {
            throw new \RuntimeException("$file is not a little-endian .mo catalogue");
        }
        for ($i = 0; $i < $header['count']; $i++) {
            $original = unpack('Vlength/Voffset', substr($bytes, $header['originals'] + $i * 8, 8));
            $translation = unpack('Vlength/Voffset', substr($bytes, $header['translations'] + $i * 8, 8));
            $catalog->messages[substr($bytes, $original['offset'], $original['length'])]
                = substr($bytes, $translation['offset'], $translation['length']);
        }
        return $catalog;
    }

    public function translate(string $message): string
    {
        $translated = $this->messages[$message] ?? '';
        return $translated !== '' ? $translated : $message;
    }

    public function plural(string $singular, string $plural, int $count): string
    {
        $forms = $this->messages[$singular . "\0" . $plural] ?? null;
        if ($forms === null) {
            return $count === 1 ? $singular : $plural;
        }
        // fr.po: nplurals=2; plural=(n > 1).
        return explode("\0", $forms)[$count > 1 ? 1 : 0];
    }
}

/**
 * One rendering's request: which site, path and query the page answers, and
 * the view rendering it. Representations read it to build their URLs and to
 * render their partials, as Omeka's reach the service container.
 */
final class Request
{
    public static FakeView $view;

    public static Request $current;

    public function __construct(
        public readonly Site $site,
        public readonly string $path,
        /** @var array<string,string> */
        public readonly array $query = [],
        /** @var array<string,string> */
        public readonly array $route = [],
    ) {
    }

    /** Core's url(null, [], ['query' => …, 'fragment' => …], true): the current route. */
    public function url(array $query = [], string $fragment = ''): string
    {
        $url = $this->path;
        if ($query) {
            $url .= '?' . http_build_query($query);
        }
        return $fragment !== '' ? $url . '#' . $fragment : $url;
    }
}

/** A site page, as SitePageBySlug, breadcrumbs and the PWA manifest read it. */
final class Page
{
    public function __construct(private Site $site, private string $slug, private string $title)
    {
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function title(): string
    {
        return $this->title;
    }

    public function siteUrl(): string
    {
        return $this->site->url() . '/page/' . $this->slug;
    }
}

final class Site
{
    /**
     * @param array<string,string> $pages slug => title
     * @param list<array{0:string,1:list<string>}> $navigation [top-level slug, child slugs]
     */
    public function __construct(
        private int $id,
        private string $slug,
        private string $title,
        private string $summary,
        private array $pages,
        private array $navigation,
        private string $homepage,
    ) {
    }

    public function id(): int
    {
        return $this->id;
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function title(): string
    {
        return $this->title;
    }

    public function summary(): string
    {
        return $this->summary;
    }

    public function url(): string
    {
        return '/s/' . $this->slug;
    }

    /** @return list<Page> */
    public function pages(): array
    {
        $pages = [];
        foreach ($this->pages as $slug => $title) {
            $pages[] = new Page($this, $slug, $title);
        }
        return $pages;
    }

    public function page(string $slug): Page
    {
        return new Page($this, $slug, $this->pages[$slug] ?? throw new \LogicException("no page '$slug'"));
    }

    public function homepage(): Page
    {
        return $this->page($this->homepage);
    }

    /** @return list<Page> */
    public function linkedPages(): array
    {
        return array_map(fn (array $entry): Page => $this->page($entry[0]), $this->navigation);
    }

    public function publicNav(): object
    {
        $site = $this;
        return new class($site) {
            public function __construct(private Site $site)
            {
            }

            public function menu(): self
            {
                return $this;
            }

            public function renderMenu($container, array $options = []): string
            {
                return $this->site->renderMenu($options);
            }
        };
    }

    /**
     * Laminas' Menu::renderNormalMenu() over the site navigation, in its own
     * layout (four-space steps, `class="navigation"` on the root list only).
     * Live markup marks the current page's branch `li.active` and its own
     * link aria-current="page" — in the header and the footer alike.
     */
    public function renderMenu(array $options): string
    {
        $maxDepth = (int) ($options['maxDepth'] ?? -1);
        $here = Request::$current->path;
        $item = function (string $slug, array $children, int $depth, string $pad) use (&$item, $maxDepth, $here): string {
            $page = $this->page($slug);
            $url = $page->siteUrl();
            $childUrls = array_map(fn (string $child): string => $this->page($child)->siteUrl(), $children);
            $active = $url === $here || in_array($here, $childUrls, true);
            $html = $pad . '<li' . ($active ? ' class="active"' : '') . ">\n"
                . $pad . '    <a href="' . htmlspecialchars($url) . '"' . ($url === $here ? ' aria-current="page"' : '') . '>'
                . htmlspecialchars($page->title()) . "</a>\n";
            if ($children && ($maxDepth < 0 || $depth < $maxDepth)) {
                $html .= $pad . "    <ul>\n";
                foreach ($children as $child) {
                    $html .= $item($child, [], $depth + 1, $pad . '        ');
                }
                $html .= $pad . "    </ul>\n";
            }
            return $html . $pad . "</li>\n";
        };
        $html = "<ul class=\"navigation\">\n";
        foreach ($this->navigation as [$slug, $children]) {
            $html .= $item($slug, $children, 0, '    ');
        }
        return $html . '</ul>';
    }
}

/** A property, as resource-values.phtml labels it. */
final class Property
{
    public function __construct(private string $term, private string $label)
    {
    }

    public function term(): string
    {
        return $this->term;
    }

    public function label(): string
    {
        return $this->label;
    }
}

/**
 * The properties the fixtures use: term => [label, alternate label]. The
 * alternate is what the IWAC resource templates rename a property to.
 */
const PROPERTIES = [
    'dcterms:title' => ['Title', null],
    'dcterms:type' => ['Type', null],
    'dcterms:publisher' => ['Publisher', null],
    'dcterms:date' => ['Date', null],
    'dcterms:language' => ['Language', null],
    'dcterms:subject' => ['Subject', null],
    'dcterms:spatial' => ['Spatial Coverage', null],
    'dcterms:description' => ['Description', null],
    'dcterms:alternative' => ['Alternative Title', null],
    'bibo:shortDescription' => ['Short Description', 'DescriptionAI'],
    'iwac:summaryModel' => ['AI Model - Summary', null],
];

/** What resource-values.phtml takes: term => property, alternate label, values. */
function valueRows(array $values): array
{
    $rows = [];
    foreach ($values as $term => $list) {
        [$label, $alternate] = PROPERTIES[$term] ?? throw new \LogicException("no property '$term'");
        $rows[$term] = ['property' => new Property($term, $label), 'alternate_label' => $alternate, 'values' => $list];
    }
    return $rows;
}

/** A value annotation: its own values, rendered by core through common/resource-values. */
final class Annotation
{
    /** @param array<string,list<Value>> $values */
    public function __construct(private int $id, private array $values)
    {
    }

    public function id(): int
    {
        return $this->id;
    }

    public function displayValues(): string
    {
        // Core passes the annotation as $resource; it carries no language or
        // template of its own, which is what null tells the template too.
        return Request::$view->partial('common/resource-values', ['values' => valueRows($this->values), 'resource' => null]);
    }
}

final class Value
{
    public function __construct(
        private string $text,
        private string $lang = '',
        private ?Resource $linked = null,
        private ?string $html = null,
        private ?Annotation $annotation = null,
    ) {
    }

    public static function link(Resource $resource): self
    {
        return new self('', '', $resource);
    }

    public function type(): string
    {
        if (!$this->linked) {
            return 'literal';
        }
        return ['items' => 'resource:item', 'item_sets' => 'resource:itemset', 'media' => 'resource:media'][$this->linked->resourceName()];
    }

    public function lang(): string
    {
        return $this->lang;
    }

    public function value(): string
    {
        return $this->text;
    }

    public function valueResource(): ?Resource
    {
        return $this->linked;
    }

    public function valueAnnotation(): ?Annotation
    {
        return $this->annotation;
    }

    public function isPublic(): bool
    {
        return true;
    }

    public function __toString(): string
    {
        return $this->linked ? $this->linked->displayTitle() : $this->text;
    }

    /** Core's asHtml(): linkPretty('square') for a resource, escaped text otherwise. */
    public function asHtml($lang = null): string
    {
        if ($this->html !== null) {
            return $this->html;
        }
        if ($this->linked) {
            $thumbnail = $this->linked->thumbnailDisplayUrl('square');
            return '<a class="resource-link" href="' . htmlspecialchars($this->linked->url()) . '">'
                . ($thumbnail ? '<img src="' . htmlspecialchars($thumbnail) . '" alt="">' : '')
                . '<span class="resource-name">' . htmlspecialchars($this->linked->displayTitle()) . '</span></a>';
        }
        return nl2br(htmlspecialchars($this->text), false);
    }
}

/** An item, item set or media representation. */
final class Resource
{
    private const PATHS = ['items' => 'item', 'item_sets' => 'item-set', 'media' => 'media'];

    /** @var array<string,list<Value>> */
    private array $values = [];

    /** @var list<array{0:string,1:Resource}> resources whose $term value points here */
    private array $subjects = [];

    public function __construct(
        private Site $site,
        private string $resourceName,
        private int $id,
        private string $title,
        private ?string $classLabel = null,
        private ?string $thumbnail = null,
        private ?string $description = null,
    ) {
    }

    /** @param list<Value|string> $values */
    public function with(string $term, array $values): self
    {
        $this->values[$term] = array_map(static fn ($v) => $v instanceof Value ? $v : new Value($v), $values);
        return $this;
    }

    public function linkedFrom(string $term, Resource $subject): self
    {
        $this->subjects[] = [$term, $subject];
        return $this;
    }

    public function id(): int
    {
        return $this->id;
    }

    public function resourceName(): string
    {
        return $this->resourceName;
    }

    public function displayTitle($default = null, $lang = null): string
    {
        return $this->title !== '' ? $this->title : (string) $default;
    }

    public function displayDescription($default = null, $lang = null)
    {
        return $this->description ?? $default;
    }

    public function url($action = null): string
    {
        return $this->site->url() . '/' . self::PATHS[$this->resourceName] . '/' . $this->id;
    }

    public function siteUrl($siteSlug = null, $canonical = false, $action = null): string
    {
        return $this->url();
    }

    /** Core's link(): the hyperlink helper on this resource's URL. */
    public function link($text, $action = null, array $attributes = []): string
    {
        return $this->linkRaw(htmlspecialchars((string) $text), $action, $attributes);
    }

    public function linkRaw($html, $action = null, array $attributes = []): string
    {
        return '<a href="' . htmlspecialchars($this->url()) . '"' . attributes($attributes) . '>' . $html . '</a>';
    }

    public function value(string $term, array $options = [])
    {
        $values = $this->values[$term] ?? [];
        if (!empty($options['all'])) {
            return $values;
        }
        return $values[0] ?? ($options['default'] ?? null);
    }

    public function values(): array
    {
        return valueRows($this->values);
    }

    public function displayValues(): string
    {
        return Request::$view->partial('common/resource-values', ['values' => $this->values(), 'resource' => $this]);
    }

    public function resourceClass(): ?object
    {
        return $this->classLabel === null ? null : (object) ['label' => $this->classLabel];
    }

    public function displayResourceClassLabel(): ?string
    {
        return $this->classLabel;
    }

    public function resourceTemplate(): ?object
    {
        return null;
    }

    public function primaryMedia(): ?object
    {
        return null;
    }

    public function item(): ?Resource
    {
        return null;
    }

    public function thumbnailDisplayUrl(string $type): ?string
    {
        return $this->thumbnail === null ? null : '/files/' . $type . '/' . $this->thumbnail . '.jpg';
    }

    public function created(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('2021-03-04T10:00:00+00:00');
    }

    /** The relation facets core offers for this resource's subject values. */
    private function relations(): array
    {
        $relations = [];
        foreach ($this->subjects as [$term]) {
            $relations[$term] = RELATIONS[$term] ?? throw new \LogicException("no relation for '$term'");
        }
        return $relations;
    }

    public function subjectValueTotalCount($property = null, $resourceType = null, $siteId = null): int
    {
        return count($this->subjects);
    }

    /**
     * Core's displaySubjectValues(): one page of the resources that point
     * here, filtered by ?resource_property=, rendered through the theme's
     * common/linked-resources.
     */
    public function displaySubjectValues(array $options = []): string
    {
        $view = Request::$view;
        $page = max(1, (int) ($options['page'] ?? 1));
        $perPage = (int) ($options['perPage'] ?? 25);
        $resourceProperty = $options['resourceProperty'] ?? null;
        if (!$this->subjects) {
            return '';
        }
        $properties = [];
        foreach ($this->relations() as $term => [$compoundId]) {
            [$label] = PROPERTIES[$term];
            $properties[] = ['compound_id' => $compoundId, 'label' => $label, 'label_is_translatable' => true, 'term' => $term];
        }
        $subjects = array_values(array_filter(
            $this->subjects,
            static fn (array $s): bool => !$resourceProperty || RELATIONS[$s[0]][0] === $resourceProperty,
        ));
        $grouped = [];
        foreach (array_slice($subjects, ($page - 1) * $perPage, $perPage) as [$term, $subject]) {
            $grouped[$term][] = [
                'val' => new class($subject) {
                    public function __construct(private Resource $subject)
                    {
                    }

                    public function resource(): Resource
                    {
                        return $this->subject;
                    }
                },
                'property_label' => PROPERTIES[$term][0],
                'property_alternate_label' => null,
            ];
        }
        return $view->partial('common/linked-resources', [
            'objectResource' => $this,
            'subjectValues' => array_values($grouped),
            'page' => $page,
            'perPage' => $perPage,
            'totalCount' => count($subjects),
            'resourceProperty' => $resourceProperty,
            'resourcePropertiesAll' => ['items' => $properties, 'item_sets' => [], 'media' => []],
        ]);
    }
}

/** Subject-value relations: term => [core's compound facet id, label]. */
const RELATIONS = [
    'dcterms:publisher' => ['items:5-86'],
    'dcterms:subject' => ['items:3-86,329'],
];

/** An asset (page-block image), as core's thumbnail() and asset.phtml read it. */
final class Asset
{
    public function __construct(private string $hash, private string $altText = '')
    {
    }

    public function altText(): string
    {
        return $this->altText;
    }

    public function name(): string
    {
        return 'IMG_' . substr($this->hash, 0, 4) . '.jpg';
    }

    public function thumbnailDisplayUrl(string $type): string
    {
        return '/files/asset/' . $this->hash . '.webp';
    }
}

/** HTML attributes in the order given, values escaped. */
function attributes(array $attributes): string
{
    $html = '';
    foreach ($attributes as $name => $value) {
        $html .= ' ' . $name . '="' . htmlspecialchars((string) $value) . '"';
    }
    return $html;
}

/** headMeta(), headLink(), headScript(), headStyle(), headTitle(): accept everything, print nothing. */
final class HeadContainer
{
    private \ArrayObject $container;

    public function __construct()
    {
        $this->container = new \ArrayObject();
    }

    public function getContainer(): \ArrayObject
    {
        return $this->container;
    }

    public function __call(string $name, array $args): self
    {
        return $this;
    }

    public function __toString(): string
    {
        return '';
    }
}

/** inlineScript(): the body-end scripts, which the fixtures keep as a record of what a page loads. */
final class InlineScript
{
    /** @var list<string> */
    private array $files = [];

    public function prependFile(string $src): self
    {
        array_unshift($this->files, $src);
        return $this;
    }

    public function appendFile(string $src): self
    {
        $this->files[] = $src;
        return $this;
    }

    public function __toString(): string
    {
        return implode("\n", array_map(static fn (string $src): string => '<script src="' . htmlspecialchars($src) . '"></script>', $this->files));
    }
}

/** htmlElement('html' | 'body'): attributes templates add, printed as the open tag. */
final class HtmlElement
{
    /** @var array<string,string> */
    private array $attributes = [];

    public function __construct(private string $tag)
    {
    }

    public function setAttribute(string $name, string $value): self
    {
        $this->attributes[$name] = $value;
        return $this;
    }

    public function appendAttribute(string $name, string $value): self
    {
        $this->attributes[$name] = trim(($this->attributes[$name] ?? '') . ' ' . $value);
        return $this;
    }

    public function __toString(): string
    {
        return '<' . $this->tag . attributes($this->attributes) . '>';
    }
}

/**
 * Core's pagination helper. Called with figures it describes that listing;
 * called bare it describes the page's own browse (the controller's paginator).
 */
final class Pagination
{
    private string $fragment = '';

    public function __construct(private FakeView $view, private int $totalCount, private int $page, private int $perPage)
    {
    }

    public function setFragment(string $fragment): self
    {
        $this->fragment = $fragment;
        return $this;
    }

    private function pageUrl(int $page): string
    {
        // Core keeps the query and sets page in it.
        $query = Request::$current->query;
        $query['page'] = $page;
        return Request::$current->url($query, $this->fragment);
    }

    public function __toString(): string
    {
        $pageCount = (int) max(1, ceil($this->totalCount / $this->perPage));
        $page = min($this->page, $pageCount);
        return $this->view->partial('common/pagination', [
            'totalCount' => $this->totalCount,
            'perPage' => $this->perPage,
            'currentPage' => $page,
            'previousPage' => $page > 1 ? $page - 1 : null,
            'nextPage' => $page < $pageCount ? $page + 1 : null,
            'pageCount' => $pageCount,
            'query' => Request::$current->query,
            'firstPageUrl' => $this->pageUrl(1),
            'previousPageUrl' => $this->pageUrl(max(1, $page - 1)),
            'nextPageUrl' => $this->pageUrl(min($pageCount, $page + 1)),
            'lastPageUrl' => $this->pageUrl($pageCount),
            'pagelessUrl' => Request::$current->url(array_diff_key(Request::$current->query, ['page' => 1])),
            'offset' => ($page - 1) * $this->perPage,
        ]);
    }
}

/**
 * Core's resourcePageBlocks($resource, $region): the blocks an admin stacked
 * on this resource type's page (Themes → Configure resource pages).
 *
 * @param list<callable(FakeView, object): string> $blocks
 */
function resourcePageBlocks(FakeView $view, object $resource, array $blocks): object
{
    return new class($view, $resource, $blocks) {
        public function __construct(private FakeView $view, private object $resource, private array $blocks)
        {
        }

        public function hasBlocks(): bool
        {
            return (bool) $this->blocks;
        }

        public function getBlocks(): string
        {
            return implode("\n", array_map(fn (callable $block): string => $block($this->view, $this->resource), $this->blocks));
        }
    };
}

/**
 * A FakeView wired as a site request on $request: real partials, the theme's
 * catalogue, and core's and the modules' helpers faked as above.
 *
 * @param array $page what the page definition supplies: themeSettings,
 *   siteSettings, lang, catalog, searchUrl, alternates, browse, blocks
 */
function siteView(Request $request, array $page): FakeView
{
    $view = new FakeView($page['themeSettings'], $page['siteSettings'], $request->query);
    Request::$current = $request;
    Request::$view = $view;
    /** @var Catalog $catalog */
    $catalog = $page['catalog'];
    $html = new HtmlElement('html');
    $body = new HtmlElement('body');
    $head = [];
    $inline = new InlineScript();
    $none = static fn (...$args): string => '';

    $view->helpers = [
        // Laminas' partial(): a theme template, with only the variables passed —
        // or, passed none, the caller's. Anything core or a module would answer
        // is faked by name above, so a template reaching for an unfaked partial
        // fails here, loudly.
        'partial' => static function (string $name, ?array $vars = null) use ($view): string {
            $file = $name . '.phtml';
            if (!is_file(ROOT . '/view/' . $file)) {
                throw new \LogicException("'$name' is not a theme template, and render-fixtures.php fakes no core partial by that name");
            }
            return $view->render($file, $vars ?? $view->vars);
        },
        'translate' => static fn ($message): string => $catalog->translate((string) $message),
        'translatePlural' => static fn (string $one, string $many, int $n): string => $catalog->plural($one, $many, $n),
        'lang' => static fn (): string => $page['lang'],
        'assetUrl' => static fn (string $file, $module = null): string => $module === 'Omeka'
            ? '/application/asset/' . $file
            : ($module ? '/modules/' . $module . '/asset/' . $file : '/themes/IWAC-theme/asset/' . $file),
        'params' => static fn () => new class($request) {
            public function __construct(private Request $request)
            {
            }

            public function fromQuery($name = null, $default = null)
            {
                return $name === null ? $this->request->query : ($this->request->query[$name] ?? $default);
            }

            public function fromRoute($name = null, $default = null)
            {
                return $name === null ? $this->request->route : ($this->request->route[$name] ?? $default);
            }
        },
        'currentSite' => static fn (): Site => $request->site,
        // Laminas' url(): the current route (a bool third argument is
        // $reuseMatchedParams), with the query and fragment asked for.
        'url' => static fn ($route = null, array $params = [], $options = [], $reuse = false): string => is_array($options)
            ? $request->url($options['query'] ?? [], (string) ($options['fragment'] ?? ''))
            : $request->url(),
        'hyperlink' => static fn ($text, $url, array $attributes = []): string => '<a href="' . htmlspecialchars((string) $url) . '"' . attributes($attributes) . '>' . htmlspecialchars((string) $text) . '</a>',
        'thumbnail' => static function ($representation, string $type, array $attributes = []): string {
            $src = $representation->thumbnailDisplayUrl($type);
            return $src ? '<img' . attributes($attributes + ['src' => $src]) . '>' : '';
        },
        'queryToHiddenInputs' => static function (array $skip = []) use ($request): string {
            $html = '';
            foreach ($request->query as $name => $value) {
                if (!in_array($name, $skip, true)) {
                    $html .= '<input type="hidden" name="' . htmlspecialchars($name) . '" value="' . htmlspecialchars((string) $value) . '">';
                }
            }
            return $html;
        },
        'pagination' => static function ($partialName = null, $totalCount = null, $currentPage = null, $perPage = null) use ($view, $page): Pagination {
            if ($totalCount === null) {
                [$totalCount, $currentPage, $perPage] = $page['browse'] ?? throw new \LogicException('this page has no browse paginator');
            }
            return new Pagination($view, (int) $totalCount, (int) $currentPage, (int) $perPage);
        },
        // Core's pageTitle(): level 0 feeds <title> and returns the text.
        'pageTitle' => static fn ($title, $level = 1): string => $level === 0
            ? htmlspecialchars((string) $title)
            : sprintf('<h%1$d><span class="title">%2$s</span></h%1$d>', $level, htmlspecialchars((string) $title)),
        'searchFilters' => $none,
        'browse' => static fn () => new class($request) {
            public function __construct(private Request $request)
            {
            }

            /** Core's common/sort-selector, as the live browse page prints it (options trimmed). */
            public function renderSortSelector(string $resourceType): string
            {
                $sortBy = $this->request->query['sort_by'] ?? 'created';
                $sortOrder = $this->request->query['sort_order'] ?? 'desc';
                $option = static fn (string $value, string $label, string $current): string => '            <option value="' . $value . '"' . ($value === $current ? ' selected' : '') . '>' . $label . "</option>\n";
                return "<form class=\"sorting\" action=\"\">\n"
                    . '    <input type="hidden" name="page" value="1">    <select name="sort_by" aria-label="Sort by">' . "\n"
                    . $option('created', 'Created', $sortBy)
                    . $option('title', 'Title', $sortBy)
                    . $option('numeric:timestamp:7', 'Date (numeric:timestamp)', $sortBy)
                    . "        </select>\n"
                    . "    <select name=\"sort_order\" aria-label=\"Sort order\">\n"
                    . str_replace('            ', '        ', $option('asc', 'Ascending', $sortOrder) . $option('desc', 'Descending', $sortOrder))
                    . "    </select>\n"
                    . "    <button type=\"submit\">Sort</button>\n"
                    . '</form>';
            }
        },
        'resourcePageBlocks' => static fn (object $resource, string $region = 'main') => resourcePageBlocks($view, $resource, $page['blocks'][$region] ?? []),
        // The modules both live sites run, by the helper names templates probe for.
        'getHelperPluginManager' => static fn () => new class {
            public function has(string $name): bool
            {
                return in_array($name, ['languageSwitcher', 'iwacSearchUrl'], true);
            }
        },
        'iwacSearchUrl' => static fn (): string => $page['searchUrl'],
        // Internationalisation: the module hands the theme's template its locale list.
        'languageSwitcher' => static fn (): string => $view->partial('common/language-switcher', [
            'site' => $request->site,
            'locales' => $page['alternates'],
            'localeLabels' => array_column($page['alternates'], 'locale_label', 'locale'),
            'defaultLocale' => 'en_US',
            'displayLocale' => 'code',
        ]),
        'userBar' => $none,
        'jsTranslate' => $none,
        'doctype' => static fn (): string => '<!DOCTYPE html>',
        'htmlElement' => static fn (string $tag): HtmlElement => $tag === 'html' ? $html : $body,
        'inlineScript' => static fn (): InlineScript => $inline,
        'themeSettingAsset' => static fn (...$args) => null,
    ] + $view->helpers;
    foreach (['headMeta', 'headTitle', 'headLink', 'headScript', 'headStyle'] as $container) {
        $head[$container] = new HeadContainer();
        $view->helpers[$container] = static fn (...$args): HeadContainer => $head[$container];
    }
    return $view;
}
