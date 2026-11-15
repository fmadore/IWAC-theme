<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * The two admin-tunable colour seeds layout.phtml injects as --primary-base
 * and --secondary-base, with their defaults.
 *
 *     ['primary' => '#1c2f9e', 'secondary' => '#85253a'] = $this->BrandSeeds(
 *         $this->themeSetting('primary_color'), $this->themeSetting('secondary_color'));
 *
 * A stored value wins when it is a #rrggbb hex — with one exception. Omeka
 * saves every field of the theme settings form, defaults included, the first
 * time an admin presses Save; so a site configured before 2.33 holds the OLD
 * defaults (#e64a19 burnt orange, #394f68 slate) as if someone had chosen
 * them, and the press-blue redesign would never reach it. Those two exact
 * values are therefore read as "unset" and resolve to today's defaults. An
 * admin who genuinely wants the old orange can store it one step off
 * (#e64a1a) — the difference is invisible, the intent is explicit.
 */
final class BrandSeeds extends AbstractHelper
{
    public const PRIMARY_DEFAULT = '#1c2f9e';
    public const SECONDARY_DEFAULT = '#85253a';

    /** Defaults of earlier releases, stored by any settings save before 2.33. */
    public const LEGACY_PRIMARY = ['#e64a19'];
    public const LEGACY_SECONDARY = ['#394f68'];

    /** @return array{primary: string, secondary: string} */
    public function __invoke(mixed $primary, mixed $secondary): array
    {
        return [
            'primary' => self::primary($primary),
            'secondary' => self::secondary($secondary),
        ];
    }

    public static function primary(mixed $value): string
    {
        return self::resolve($value, self::PRIMARY_DEFAULT, self::LEGACY_PRIMARY);
    }

    public static function secondary(mixed $value): string
    {
        return self::resolve($value, self::SECONDARY_DEFAULT, self::LEGACY_SECONDARY);
    }

    /** @param list<string> $legacy */
    private static function resolve(mixed $value, string $default, array $legacy): string
    {
        if (!is_string($value)) {
            return $default;
        }
        $value = strtolower(trim($value));
        if (!preg_match('/^#[0-9a-f]{6}$/', $value) || in_array($value, $legacy, true)) {
            return $default;
        }
        return $value;
    }
}
