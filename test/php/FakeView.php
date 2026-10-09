<?php
/**
 * The PHP test harness's stand-in for Laminas' PhpRenderer, shared by the
 * template tests (run.php) and the fixture renderer (render-fixtures.php).
 *
 * Requiring this file is the whole bootstrap: the stubbed Laminas base class,
 * every theme helper, and the ROOT constant both entry points resolve
 * templates against. Plain PHP — no Composer install, no Omeka checkout.
 */
declare(strict_types=1);

namespace IwacThemeTest;

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

    /** @var list<string> every template render() included, relative to view/, in order */
    public array $rendered = [];

    /**
     * The variables of the template being rendered. Laminas' partial() called
     * without a variable array renders with these — how common/footer, given
     * nothing by layout.phtml, still sees the layout's $site.
     */
    public array $vars = [];

    /** What layout.phtml prints as the page body (Laminas sets it on the layout's view model). */
    public string $content = '';

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
        // The theme's own helpers, registered from the list Omeka registers
        // them from — config/theme.ini — under the same case-sensitive names.
        $ini = (string) file_get_contents(ROOT . '/config/theme.ini');
        preg_match_all('/^helpers\[\]\s*=\s*"([A-Za-z]+)"\s*$/m', $ini, $names);
        foreach ($names[1] as $name) {
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
        $this->rendered[] = $template;
        $outer = $this->vars;
        $this->vars = $vars;
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
        try {
            return \Closure::bind($render, $this, self::class)(ROOT . '/view/' . $template, $vars);
        } finally {
            $this->vars = $outer;
        }
    }
}
