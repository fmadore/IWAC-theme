<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * A count with its thousands grouped by U+202F NARROW NO-BREAK SPACE, in every
 * locale: "12 345". The decimal mark differs between the sites' languages, a
 * grouping space reads the same in both, and it never breaks across a line.
 *
 *     echo $escape($this->Figure($total));  // "12 345"
 *
 * The rule in docs/DESIGN-SYSTEM.md §2c ("Figures"). Until this existed the
 * same number_format() call was written out in the hero, the pager, the
 * hierarchy block and ResourceValues, and the fulltext search page printed its
 * totals ungrouped.
 */
final class Figure extends AbstractHelper
{
    public const GROUP_SEPARATOR = "\u{202F}";

    public function __invoke(mixed $count): string
    {
        return self::format($count);
    }

    /** Whole numbers only; anything that is not a number reads as 0. */
    public static function format(mixed $count): string
    {
        return number_format(is_numeric($count) ? (int) $count : 0, 0, '.', self::GROUP_SEPARATOR);
    }
}
