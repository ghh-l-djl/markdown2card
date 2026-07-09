# markdown2card

Language: English | [简体中文](./README.zh-CN.md)

## Preview

![Card Flow Overview](./全览效果.png)
*Card Flow Overview: A multi-page grid preview of the generated cards, showing the full flow layout.*

![Card Details](./细节图.png)
*Card Details: A close-up view of a single card's rendering details, showcasing precise typography, margins, and background styles.*

![Settings Panel](./操作面板.png)
*Settings Panel: A feature-rich settings sidebar that allows switching themes, selecting custom background styles and fonts, adjusting footer visibility, and providing one-click copy or export actions.*

![Mermaid & Image Support](./支持mermaid和图片.png)
*Mermaid & Image Support: Easily scales and renders embedded images and Mermaid diagrams onto the cards, including automatic scaling and appending full-size exports for oversized diagrams.*

![Auto-Pagination & LaTeX](./代码自动分页-支持latex.png)
*Auto-Pagination, Code Blocks & LaTeX: Supports rendering and syntax highlighting for code blocks and LaTeX math formulas, with automatic physical pagination based on actual card height to prevent content clipping.*

---

This repository contains the source for the `markdown2card` Obsidian plugin.
It renders the active Markdown note as exportable social-card images.

## What It Does

- Opens a dedicated `markdown2card` preview view inside Obsidian.
- Converts Markdown into fixed-ratio image cards with live preview.
- Automatically paginates long content by the actual rendered card height, so content is not silently clipped.
- Supports manual page breaks with `---`.
- Renders Mermaid diagrams into card-safe SVG blocks, including dark-theme contrast fixes, auto scaling for oversized diagrams, and appended original-size Mermaid exports when a diagram would exceed the card.
- Provides multiple image templates, including default, notes, Xiaohongshu, Weibo, WeChat, magazine, quote, terminal, GitHub, and signature styles.
- Supports theme switching, cover styles, custom fonts, background images, footer visibility, image crop/zoom, table scaling, current-page export, all-pages export, and clipboard copy.
- Lets users choose the preview UI language, defaulting to English with a Chinese option.
- Writes exports to a configurable destination. Relative paths are written inside the vault; absolute macOS/Linux or Windows paths are written to the file system.
- Supports ZIP archive output or a PNG folder named after the current Markdown file.
- Can optionally run post-export actions that mark the source note as source material, create a publish-ready Markdown note, and link the exported assets.

## Template Notes

- Xiaohongshu template keeps the bottom interaction bar and distributes likes, favorites, and comments evenly.
- Weibo template uses a Weibo-style header with uploadable avatar, red V badge, current time, editable saved location, and a follow button. It disables the bottom footer area.
- Templates that remove the footer free that space for auto pagination.

## Development

```bash
npm install
npm run build
```

The build emits `main.js` next to `manifest.json` and `styles.css`, matching the
layout expected by Obsidian community plugins.

There is currently no automated test script. For UI changes, run `npm run build`
and manually verify preview generation, auto pagination, Mermaid rendering,
first-enable rendering, template switching, theme switching, language switching, export path handling,
ZIP and PNG-folder export formats, optional post-export Markdown metadata updates,
appended oversized Mermaid exports, and copy behavior in an Obsidian vault.
