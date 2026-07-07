# markdown2card

This directory contains the source for the `markdown2card` Obsidian plugin.
It keeps the published plugin behavior split into maintainable TypeScript
modules for local secondary development.

## Development

```bash
npm install
npm run build
```

The build emits `main.js` next to `manifest.json` and `styles.css`, matching the
layout expected by Obsidian community plugins.
