<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * Whether an HTML page block's prose is set in newspaper columns.
 *
 *     <?php if ($this->ProseColumns($html)): ?><div class="prose-columns">…
 *
 * The design brief (2.33) is that prose FILLS the content width — never a
 * capped measure with an empty right-hand half beside it. A short block
 * reaches a comfortable line length by flowing into balanced columns at wide
 * viewports (asset/sass/components/blocks/prose-columns/); a long one stays a
 * single column at full container width, because multi-column text taller
 * than the viewport makes the reader scroll down, back up, and down again.
 *
 * "Short" is decided here, on the block's stored HTML, by two rules:
 *
 *   1. Length. Between MIN_CHARS and MAX_CHARS characters of visible text.
 *      Under MIN_CHARS (a one-line intro, a lone heading) there is nothing to
 *      balance — two columns of two lines read as a mistake. Over MAX_CHARS
 *      the two columns of the widest container (1300px, ~75 characters a
 *      line) outgrow a laptop viewport.
 *   2. Content. Nothing that does not belong in a text column: tables,
 *      figures, images, embeds, media, forms, preformatted text, block
 *      quotes. Any one of them keeps the block in a single column.
 *
 * Pure static so test/php/run.php can pin both rules without a view;
 * common/block-layout/html.phtml calls it through the invokable, which also
 * guarantees Omeka has required this file (see CLAUDE.md, "a helper's statics
 * need the helper loaded").
 */
final class ProseColumns extends AbstractHelper
{
    public const MIN_CHARS = 600;
    public const MAX_CHARS = 1800;

    /** Elements that keep a block in one column wherever they appear. */
    public const BLOCKING_ELEMENTS = [
        'table', 'figure', 'img', 'picture', 'iframe', 'video', 'audio', 'embed', 'object',
        'canvas', 'svg', 'form', 'pre', 'blockquote', 'script', 'style',
    ];

    public function __invoke(mixed $html): bool
    {
        return self::flows(is_string($html) ? $html : '');
    }

    /** True when $html is short, plain prose that should flow into columns. */
    public static function flows(string $html): bool
    {
        if (self::hasBlockingElement($html)) {
            return false;
        }
        $length = self::textLength($html);
        return $length >= self::MIN_CHARS && $length <= self::MAX_CHARS;
    }

    /** Visible characters: tags stripped, entities decoded, whitespace runs as one. */
    public static function textLength(string $html): int
    {
        // A tag is a word boundary (`<p>a</p><p>b</p>` is "a b", not "ab").
        $text = strip_tags(str_replace('<', ' <', $html));
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim((string) preg_replace('/[\s\x{00A0}\x{202F}]+/u', ' ', $text));
        return mb_strlen($text, 'UTF-8');
    }

    public static function hasBlockingElement(string $html): bool
    {
        $names = implode('|', self::BLOCKING_ELEMENTS);
        return (bool) preg_match('/<(?:' . $names . ')\b/i', $html);
    }
}
