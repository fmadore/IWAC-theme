<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * Bind French high punctuation to the word it belongs to.
 *
 * French sets a space before « : ; ! ? » and after « « ». Stored as an ordinary
 * space it is a legal line-break opportunity, so a narrow column can start a
 * line with the punctuation mark alone. Measured on item/74601 at 375px: the
 * headline "Gala de bienfaisance : le Chamci récolte plus de 54 millions" broke
 * to five lines with " : le Chamci" opening line three — a colon reading as a
 * bullet at the head of a line.
 *
 * The fix is the character French typography actually calls for: U+202F NARROW
 * NO-BREAK SPACE. Same visual gap, no break opportunity — the mark can only
 * ever end a line, bound to the word it punctuates. (U+00A0 would work as a
 * break guard but is a full space; the narrow form is the correct width and is
 * what the homepage stat strip already uses for digit grouping.)
 *
 * Safe to run over English strings: it only ever rewrites a space that is
 * *already* sitting before high punctuation, and English convention puts none
 * there. Returns plain text — the caller still escapes.
 */
final class FrenchSpacing extends AbstractHelper
{
    /** U+202F NARROW NO-BREAK SPACE. */
    private const NNBSP = "\u{202F}";

    public function __invoke(?string $text): string
    {
        $text = (string) $text;
        if ($text === '') {
            return '';
        }

        // Any run of ordinary/no-break whitespace before : ; ! ? » becomes one
        // narrow no-break space. `\h` (horizontal whitespace) keeps newlines
        // out of it — a mark at the head of its own line is the author's.
        $text = preg_replace('/\h+([:;!?»])/u', self::NNBSP . '$1', $text);
        // …and the opening guillemet binds forward to the word it opens.
        return (string) preg_replace('/(«)\h+/u', '$1' . self::NNBSP, (string) $text);
    }
}
