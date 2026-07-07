# markdown2card

This repository contains the source for the `markdown2card` Obsidian plugin.
It renders the active Markdown note as exportable social-card images.

## What It Does

- Opens a dedicated `markdown2card` preview view inside Obsidian.
- Converts Markdown into fixed-ratio image cards with live preview.
- Automatically paginates long content by the actual rendered card height, so content is not silently clipped.
- Supports manual page breaks with `---`.
- Provides multiple image templates, including default, notes, Xiaohongshu, Weibo, WeChat, magazine, quote, terminal, GitHub, and signature styles.
- Supports theme switching, cover styles, custom fonts, background images, footer visibility, image crop/zoom, table scaling, current-page export, all-pages ZIP export, and clipboard copy.

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
and manually verify preview generation, auto pagination, template switching, theme
switching, export, and copy behavior in an Obsidian vault.
