# Page blocks: which options to use

For whoever builds or edits pages on the IWAC sites (Admin → Sites → *site* →
Pages → *page*). It covers the three blocks that carry images and media —
**Media embed**, **Asset** and **Item carousel** — and the **Block group** that
often holds them: which options the theme honours, what it does with them on a
desktop and on a phone, and which to pick for a given page.

Every block has two panels in the editor: its own options (under the block's
attachments) and a **Layout** panel (gear icon) with Template, Alignment, grid
span and so on. "Template" below means the Layout panel's Template menu.

## Media embed

Shows items or media from the collection as cards: an image or player, the
title, and a caption.

| Option | What the theme does |
|---|---|
| **Layout** — Vertical / Horizontal | Vertical stacks the cards; Horizontal puts them in a grid of 1, 2, 3 or 4 columns (phone, ≥600px, ≥768px, ≥1024px). Ignored by the Masonry template. |
| **Media display** — Embed media / Thumbnail only | Thumbnail shows the image only, linked to the item, on a card with its title and caption. Embed shows the media itself: an image, or a player for audio, video and YouTube. |
| **Thumbnail type** — Square / Medium / Large | Square crops every image to the same square; Medium and Large keep the image's shape. |
| **Show title** — Item title / File name / None | The card's heading. |
| **Caption** (per attachment) | Shown under the title, in small muted italic. A short line — place and year, author and year — reads best. |
| **Template** — Default / **Masonry** | See below. |

### When to choose Masonry

Pick **Template → Masonry** when a block has **four or more cards of different
heights**: photographs that mix portrait and landscape, or references whose
titles run from one line to four. The default horizontal grid makes each row as
tall as its tallest card, so every shorter card leaves a hole under it; Masonry
places each card under the shortest column instead, keeping the order you set
running left to right.

- Use **Thumbnail type → Large** (or Medium) with it. With Square every image is
  the same height and there is nothing to pack.
- Masonry replaces the Layout option: columns are at least 240px wide, so a
  block shows four across the page on a desktop, three on a small laptop, two
  on a tablet and one on a phone.
- A Masonry block always fills the width its grid span gives it: the Layout
  panel's **Alignment** (left, centre, right) is ignored, because it would
  shrink the block to a single column. **Text alignment** is honoured inside
  each card.
- It works with both displays. With **Embed media**, videos keep a 16:9 frame
  and every medium sits on the same card as a thumbnail would.
- A block with fewer cards than columns is centred, at the same card width.
- For one to three cards of the same shape, the default template is enough.

Example: the Hajj in Burkina Faso exhibit's "Further references" — five
reference cards whose titles run one to four lines — is the case Masonry was
built for.

## Asset

An image uploaded to the site (Admin → Assets), not a collection item: photos of
fieldwork and archives, partner logos, portraits.

| Option | What the theme does |
|---|---|
| **Caption** | Shown under the image. It also names the image for screen readers when the asset has no alt text, and names the full-screen viewer's button. |
| **Alt text** (on the asset itself) | Read by screen readers. Give one to every image that carries information and has no caption. |
| **Page** link | The image links to that page, with its title (or the "Alternative link title") under it. A linked image does not open the full-screen viewer. |
| **Alignment** (Layout panel) | Left, centre or right within its grid column. |

Any image that is not linked opens in a **full-screen viewer** when clicked,
with zoom and, when the page has several, previous and next. Large originals
are fine: inside a block group an image is capped at about 840px wide, a
standalone Asset block shows its images as cards up to 320px wide, and the
full detail is a click away.

## Block group: images beside text

A Block group with a grid lays its blocks side by side using their **grid span**
(out of 12): an Asset at span 3 beside an HTML block at span 9 is the About
page's "From fieldwork to open access" pattern.

- From 768px wide the spans are kept: the image is a column beside the text.
- **On a phone the group stacks**: each block takes the full width, the image
  first, then the text. The image keeps its own size up to the screen's width
  (a 200px portrait stays 200px; a photograph fills the screen), and sits left,
  centred or right as its Alignment says.
- Order the blocks in the group the way they should read on a phone.

## Item carousel

A horizontal run of item images, scrolled by swipe, trackpad, keyboard or the
arrow buttons.

| Option | What the theme does |
|---|---|
| **Items per slide** | The number of slides visible at once from 1024px. From 600px it shows two (or one, if that is the setting); on a phone 1.2, so the next slide peeks in and says "this scrolls". |
| **Thumbnail type**, **Show title**, **Show caption**, **Text align** | Honoured. |
| **Fill entire slide** | Crops images to fill the slide; the other stretch options keep the whole image. |
| **Auto-slide** | Honoured, with a stop/start button. It pauses while the pointer is over the carousel, stops for good once the reader uses the arrows or tabs into it, and never starts for a reader who has asked their system for reduced motion. |
| **Overlay title/caption** | Not used: titles and captions stay below the image. |
| **Infinite loop** | Not used: the carousel shows a position counter ("2 / 12") and a progress rule instead. |

The arrows and counter appear only when the slides do not all fit.

## On a phone, every time

Check a page at phone width after building it (in a desktop browser, the
developer tools' device mode will do). The theme stacks block groups and
narrows grids below 768px, but the order and the size of what you upload are
yours.
