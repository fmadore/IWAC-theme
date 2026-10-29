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
 */
declare(strict_types=1);

$omekaPath = rtrim((string) getenv('OMEKA_PATH'), '/\\');
if ($omekaPath === '' || !is_file($omekaPath . '/vendor/autoload.php')) {
    fwrite(STDERR, "OMEKA_PATH must point to an unpacked Omeka S release.\n");
    exit(2);
}
$themeName = getenv('OMEKA_THEME') ?: 'IWAC-theme';

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
} catch (Throwable $error) {
    $failures[] = 'uncaught ' . get_class($error) . ': ' . $error->getMessage()
        . "\n      at " . $error->getFile() . ':' . $error->getLine();
}

if ($failures) {
    fwrite(STDERR, 'Omeka compatibility: ' . count($failures) . " failure(s) of {$checks} checks\n\n");
    foreach ($failures as $failure) {
        fwrite(STDERR, '  ✗ ' . $failure . "\n");
    }
    exit(1);
}
echo "Omeka compatibility: {$checks} checks passed (themes/{$themeName}).\n";
