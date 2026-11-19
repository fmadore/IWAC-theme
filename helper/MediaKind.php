<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * Which resource-page block renders a media — the one rule behind the three
 * blocks that share an item's media, so each media is drawn by exactly one:
 *
 *     $mediaKind = $this->plugin('MediaKind');           // loads the class too
 *     if ($mediaKind($media) === $mediaKind::VIDEO) { … }
 *
 * - WEB_ARCHIVE → `webArchive` (web-archive.phtml): the ReplayWeb.page player.
 *   Two players over one .wacz mean two service-worker clients and twice the
 *   range traffic, so core's media embed must not mount its own.
 * - VIDEO → `videoEmbeds` (video-embeds.phtml): a responsive, cookie-less
 *   YouTube frame instead of core's fixed 420x315 youtube.com iframe.
 * - VIEWER → `mediaEmbeds` (media-embeds.phtml), or the Mirador block that
 *   replaces it on the live sites: everything else.
 *
 * Each template used to carry its own half of this rule ("keep in sync with
 * that template"); now each asks classify() and keeps only the kind it owns.
 *
 * A new fileless ingester (see CLAUDE.md, "Mirador only shows file-backed
 * media") needs a kind here AND its own block: Mirador builds its manifest
 * from stored files, so a media it cannot show must be claimed by a block
 * that can, and excluded from VIEWER by being classified here.
 *
 * Templates must fetch the helper (as above) before naming the class
 * statically: Omeka requires a theme helper's file on demand, the first time
 * it is fetched — not at bootstrap.
 */
final class MediaKind extends AbstractHelper
{
    /** Core's media embed / the Mirador viewer: file-backed media. */
    public const VIEWER = 'viewer';

    /** The theme's videoEmbeds block: media ingested from YouTube. */
    public const VIDEO = 'video';

    /** The theme's webArchive block: WACZ/WARC captures. */
    public const WEB_ARCHIVE = 'webArchive';

    /**
     * Mirrors WebArchive\Module::MEDIA_TYPES. The module plays both formats
     * through the same viewer, so matching only 'application/wacz' would
     * silently drop a .warc upload.
     */
    public const WEB_ARCHIVE_TYPES = ['application/wacz', 'application/warc'];

    /** The renderer core's `youtube` ingester assigns. */
    public const YOUTUBE_RENDERER = 'youtube';

    /**
     * The kind of $media: one of VIEWER, VIDEO, WEB_ARCHIVE.
     *
     * @param \Omeka\Api\Representation\MediaRepresentation $media
     */
    public function __invoke(object $media): string
    {
        return self::classify($media);
    }

    /**
     * Web-archive type first, then the YouTube renderer, else the viewer.
     *
     * @param \Omeka\Api\Representation\MediaRepresentation $media
     */
    public static function classify(object $media): string
    {
        if (method_exists($media, 'mediaType') && in_array($media->mediaType(), self::WEB_ARCHIVE_TYPES, true)) {
            return self::WEB_ARCHIVE;
        }
        if (method_exists($media, 'renderer') && $media->renderer() === self::YOUTUBE_RENDERER) {
            return self::VIDEO;
        }
        return self::VIEWER;
    }
}
