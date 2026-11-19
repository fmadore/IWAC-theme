<?php
/**
 * The theme, through the real Omeka S release's own theme manager.
 *
 *     OMEKA_PATH=/path/to/omeka-s php test/php/omeka-compatibility.php
 *
 * CI's omeka-compatibility job unpacks the official Omeka S 4.2.1 release
 * (SHA-256 verified), installs the working tree as themes/IWAC-theme and runs
 * this; release.yml runs it again on the unpacked release ZIP, so a file that
 * .gitattributes export-ignores by mistake fails the release rather than the
 * live site. Ported from DRE-theme's tests/OmekaCompatibilityTest.php, plus
 * the helper registration Omeka performs at render time.
 *
 * Every warning, notice and deprecation raised from here on is an error:
 * production runs PHP 8.5, which deprecates things 8.4 accepted silently.
 *
 * OMEKA_THEME overrides the theme directory name (default: IWAC-theme, the
 * name the live sites are configured against — release.yml's archive prefix).
 *
 * Core template overrides: a theme template whose path under view/ also exists
 * under core's application/view/ shadows that core template. core-overrides.json
 * (beside this script) records the SHA-256 of each shadowed core file at the
 * Omeka release the theme copies were last compared against. When
 * OMEKA_S_VERSION is bumped, every core template that changed upstream fails
 * here by name, and that list is the re-diff worklist. Once the theme copies
 * are ported, refresh the manifest from the new release:
 *
 *     OMEKA_PATH=/path/to/omeka-s php test/php/omeka-compatibility.php --write-overrides
 *
 * which rewrites it from the current core and theme, prints what changed, and
 * then runs the checks as usual. The manifest is read via __DIR__ and the
 * templates from OMEKA_PATH/themes/<theme>/view, so release.yml (whose theme
 * is the unpacked ZIP, without test/) checks the same thing.
 */
declare(strict_types=1);

$omekaPath = rtrim((string) getenv('OMEKA_PATH'), '/\\');
if ($omekaPath === '' || !is_file($omekaPath . '/vendor/autoload.php')) {
    fwrite(STDERR, "OMEKA_PATH must point to an unpacked Omeka S release.\n");
    exit(2);
}
$themeName = getenv('OMEKA_THEME') ?: 'IWAC-theme';
$manifestFile = __DIR__ . '/core-overrides.json';
$writeOverrides = in_array('--write-overrides', array_slice($argv, 1), true);

// Omeka's bootstrap also installs its PHP 8.5 framework compatibility overrides.
require $omekaPath . '/bootstrap.php';
require_once $omekaPath . '/application/Module.php';

error_reporting(E_ALL);
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

use Laminas\ServiceManager\ServiceManager;
use Laminas\View\Helper\AbstractHelper;
use Omeka\Module as CoreModule;
use Omeka\Service\ThemeManagerFactory;
use Omeka\Site\Theme\Manager as ThemeManager;

$failures = [];
$notes = [];
$checks = 0;
$check = static function (string $what, bool $ok, string $detail = '') use (&$failures, &$checks): void {
    $checks++;
    if (!$ok) {
        $failures[] = $what . ($detail !== '' ? "\n      {$detail}" : '');
    }
};

try {
    $services = new ServiceManager();
    $services->setService('Config', ['page_templates' => [], 'block_templates' => []]);
    $manager = (new ThemeManagerFactory())($services, 'Omeka\Site\ThemeManager');
    $theme = $manager->getTheme($themeName);

    $check('Omeka ' . CoreModule::VERSION . " discovers themes/{$themeName}", false !== $theme);
    $check('Omeka accepts theme.ini and its version constraint',
        $theme && $theme->getState() === ThemeManager::STATE_ACTIVE,
        $theme ? 'state: ' . $theme->getState() : 'theme not registered');
    $check('the declared Omeka floor is 4.2.1, the release this is tested on',
        $theme && $theme->getIni('omeka_version_constraint') === '^4.2.1',
        $theme ? 'omeka_version_constraint = ' . var_export($theme->getIni('omeka_version_constraint'), true) : '');

    // What MvcListeners::registerThemeHelpers() does for the current theme:
    // require helper/<Name>.php and register \OmekaTheme\Helper\<Name> under
    // <Name>. The filename has to match theme.ini EXACTLY — the servers'
    // filesystem is case-sensitive even when this one is not (CLAUDE.md).
    $helpers = $theme ? (array) ($theme->getIni('helpers') ?? []) : [];
    $check('theme.ini declares the view helpers', count($helpers) > 0);
    $themeDir = $omekaPath . '/themes/' . $themeName;
    $onDisk = is_dir($themeDir . '/helper') ? scandir($themeDir . '/helper') : [];
    foreach ($helpers as $helper) {
        $file = $helper . '.php';
        $check("helper/{$file} exists with theme.ini's exact spelling", in_array($file, $onDisk, true));
        if (!in_array($file, $onDisk, true)) {
            continue;
        }
        require_once $themeDir . '/helper/' . $file;
        $class = '\\OmekaTheme\\Helper\\' . $helper;
        $check("{$class} is defined by helper/{$file}", class_exists($class));
        if (class_exists($class)) {
            $instance = new $class();
            $check("{$class} is a Laminas view helper", $instance instanceof AbstractHelper);
            $check("{$class} is invokable, as the plugin broker calls it", is_callable($instance));
        }
    }

    // Core templates the theme overrides (docblock): every path under view/
    // that also exists under core's application/view/, with core's hash.
    $coreView = $omekaPath . '/application/view';
    $themeView = $themeDir . '/view';
    $shadowed = [];
    if (is_dir($themeView)) {
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($themeView, FilesystemIterator::SKIP_DOTS));
        foreach ($files as $file) {
            if (!$file instanceof SplFileInfo || !$file->isFile() || $file->getExtension() !== 'phtml') {
                continue;
            }
            $path = str_replace('\\', '/', substr($file->getPathname(), strlen($themeView) + 1));
            if (is_file($coreView . '/' . $path)) {
                $shadowed[$path] = (string) hash_file('sha256', $coreView . '/' . $path);
            }
        }
    }
    ksort($shadowed, SORT_STRING);

    if ($writeOverrides) {
        $previous = is_file($manifestFile) ? json_decode((string) file_get_contents($manifestFile), true) : null;
        $before = is_array($previous) && is_array($previous['overrides'] ?? null) ? $previous['overrides'] : [];
        $json = json_encode(['omeka' => CoreModule::VERSION, 'overrides' => $shadowed],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        // PHP pretty-prints with four spaces; the repo's JSON files use two.
        $json = (string) preg_replace_callback('/^ +/m',
            static fn (array $m): string => substr($m[0], 0, intdiv(strlen($m[0]), 2)), $json);
        file_put_contents($manifestFile, $json . "\n");
        echo 'Wrote ' . count($shadowed) . ' core override(s) at Omeka ' . CoreModule::VERSION
            . ' to test/php/core-overrides.json'
            . (is_array($previous) && is_string($previous['omeka'] ?? null) ? ' (was ' . $previous['omeka'] . ')' : '')
            . ".\n";
        foreach ($shadowed as $path => $hash) {
            if (!isset($before[$path])) {
                echo "  + {$path}\n";
            } elseif ($before[$path] !== $hash) {
                echo "  ~ {$path}\n";
            }
        }
        foreach (array_keys(array_diff_key($before, $shadowed)) as $path) {
            echo "  - {$path}\n";
        }
    }

    $manifest = is_file($manifestFile) ? json_decode((string) file_get_contents($manifestFile), true) : null;
    $manifestOk = is_array($manifest) && is_string($manifest['omeka'] ?? null) && is_array($manifest['overrides'] ?? null);
    $check('test/php/core-overrides.json parses as {"omeka": "<version>", "overrides": {...}}', $manifestOk,
        is_file($manifestFile) ? 'json_decode: ' . json_last_error_msg() : 'file missing (run --write-overrides)');
    if ($manifestOk) {
        $recordedAt = $manifest['omeka'];
        if ($recordedAt !== CoreModule::VERSION) {
            // Not a failure: the hashes are the gate. A clean run on a newer
            // release only means none of the overridden templates moved.
            $notes[] = "core-overrides.json was recorded at Omeka {$recordedAt}, this is " . CoreModule::VERSION
                . '; once nothing below is listed (or the listed templates are ported), record this release with --write-overrides.';
        }
        foreach ($manifest['overrides'] as $path => $hash) {
            $path = (string) $path;
            if (!is_file($themeView . '/' . $path)) {
                $check("stale entry: core-overrides.json lists {$path}, but the theme has no view/{$path}", false,
                    'remove the entry (--write-overrides)');
                continue;
            }
            if (!is_file($coreView . '/' . $path)) {
                $check("core removed application/view/{$path}: the override view/{$path} now shadows nothing", false,
                    'delete or rename the theme copy, then drop the entry (--write-overrides)');
                continue;
            }
            $check("core's {$path} changed since Omeka {$recordedAt}",
                hash_file('sha256', $coreView . '/' . $path) === $hash,
                "re-diff view/{$path} against application/view/{$path}, port what applies, then refresh the manifest (--write-overrides)");
        }
        foreach (array_keys($shadowed) as $path) {
            $check("unrecorded override: view/{$path} shadows core's application/view/{$path}",
                array_key_exists($path, $manifest['overrides']),
                'record it (--write-overrides)');
        }
    }
} catch (Throwable $error) {
    $failures[] = 'uncaught ' . get_class($error) . ': ' . $error->getMessage()
        . "\n      at " . $error->getFile() . ':' . $error->getLine();
}

foreach ($notes as $note) {
    echo '  note: ' . $note . "\n";
}
if ($failures) {
    fwrite(STDERR, 'Omeka compatibility: ' . count($failures) . " failure(s) of {$checks} checks\n\n");
    foreach ($failures as $failure) {
        fwrite(STDERR, '  ✗ ' . $failure . "\n");
    }
    exit(1);
}
echo "Omeka compatibility: {$checks} checks passed (themes/{$themeName}).\n";
