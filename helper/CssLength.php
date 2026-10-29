<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * A free-text theme setting that is spliced into inline CSS, accepted only if
 * it is one plain length: `400px`, `50vh`, `32rem`, `60svh`.
 *
 *     $height = $this->CssLength($this->themeSetting('banner_height'));  // '400px' or null
 *
 * escapeHtmlAttr() stops an attribute breakout, not `10px; background:
 * url(https://…)` inside a style attribute or a <style> block. The banner
 * height (common/banner.phtml) and its mobile counterpart (layout.phtml)
 * each carried their own copy of this pattern.
 */
final class CssLength extends AbstractHelper
{
    public const PATTERN = '/^-?[0-9]*\.?[0-9]+(px|em|rem|%|vh|vw|svh|dvh|lvh)$/';

    /** The trimmed length, or null when the value is empty or anything else. */
    public function __invoke(mixed $value): ?string
    {
        return self::parse($value);
    }

    public static function parse(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }
        $value = trim((string) $value);
        return $value !== '' && preg_match(self::PATTERN, $value) ? $value : null;
    }
}
