<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * The AI-written table of contents of a periodical issue, read back into
 * entries for common/ai-toc.phtml.
 *
 * The summary pipeline (iwac-ai-pipelines/AI_summary_issue/03_update_omeka_toc.py)
 * writes dcterms:tableOfContents as a deterministic string — one entry per
 * article, "p. {pages} : {title} ({authors})\n{summary}", entries joined by a
 * blank line. Each entry comes back as its page marker, title, byline and
 * one-paragraph summary.
 *
 *     $entries = $this->AiTableOfContents($text);
 *     // [['pages' => '3-4', 'title' => '…', 'author' => '…', 'summary' => '…'], …]
 *
 * An empty list means nothing parsed; the template then prints the raw text
 * rather than swallowing the value.
 */
final class AiTableOfContents extends AbstractHelper
{
    /** @return list<array{pages: ?string, title: string, author: ?string, summary: string}> */
    public function __invoke(mixed $text): array
    {
        return self::parse($text);
    }

    /** The text with Windows line ends folded and the ends trimmed: what the raw fallback prints. */
    public static function normalize(mixed $text): string
    {
        return is_scalar($text) ? trim(str_replace("\r\n", "\n", (string) $text)) : '';
    }

    /** @return list<array{pages: ?string, title: string, author: ?string, summary: string}> */
    public static function parse(mixed $text): array
    {
        $entries = [];
        // Entries are separated by one or more blank lines.
        foreach (preg_split('/\n[ \t]*\n+/', self::normalize($text)) ?: [] as $block) {
            $block = trim($block);
            if ($block === '') {
                continue;
            }
            // First line is the header ("p. … : …"); the remainder is the
            // one-paragraph summary (any soft wraps collapse to spaces).
            $parts = explode("\n", $block, 2);
            $header = trim($parts[0]);
            $summary = isset($parts[1]) ? trim((string) preg_replace('/\s*\n\s*/', ' ', $parts[1])) : '';

            $pages = null;
            $title = $header;
            $author = null;

            // "p. {pages} : {rest}" — pages never contain a colon, so split on the first.
            if (preg_match('/^p\.\s*([^:]+?)\s*:\s*(.+)$/su', $header, $m)) {
                $pages = trim($m[1]);
                $title = trim($m[2]);
            }
            // Peel a trailing "(authors)" byline when it reads like a name — not
            // a bare "(1)" continuation marker, and not an empty pair.
            if (preg_match('/^(.*\S)\s*\(([^()]+)\)\s*$/u', $title, $m)
                && preg_match('/\p{L}/u', $m[2])
                && !preg_match('/^\s*\d+\s*$/', $m[2])
            ) {
                $title = trim($m[1]);
                $author = trim($m[2]);
            }

            $entries[] = ['pages' => $pages, 'title' => $title, 'author' => $author, 'summary' => $summary];
        }
        return $entries;
    }
}
