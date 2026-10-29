<?php
/**
 * PHPStan bootstrap (phpstan.neon.dist): what Omeka's own bootstrap.php
 * provides at runtime — the OMEKA_PATH constant and Composer's autoloader for
 * Omeka\ and Laminas\ — without its chdir() and request setup, so the view
 * helpers are analysed against the real classes they extend and receive.
 *
 * OMEKA_PATH must point at an unpacked official Omeka S release (CI's
 * omeka-compatibility job downloads 4.2.1; locally, see the Build section of
 * CLAUDE.md).
 */
$omekaPath = (string) getenv('OMEKA_PATH');
if ($omekaPath === '' || !is_file($omekaPath . '/vendor/autoload.php')) {
    fwrite(STDERR, "phpstan-bootstrap: set OMEKA_PATH to an unpacked Omeka S release.\n");
    exit(2);
}
defined('OMEKA_PATH') || define('OMEKA_PATH', $omekaPath);
require $omekaPath . '/vendor/autoload.php';
