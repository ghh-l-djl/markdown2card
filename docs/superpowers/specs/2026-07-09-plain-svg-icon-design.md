# Design Spec: Plain SVG Icon Registration and Sidebar Display

## Goal
Generate a plain/monochrome SVG version of the plugin icon (`icon.svg`), register it with Obsidian's global icon registry, and display it in the sidebar ribbon and view headers, aligning with Obsidian's Lucide-based style guidelines.

## Requirements
1. **Plain SVG File**: Create `/Users/ghh/Documents/编程/项目/obsidian-to-card/icon-plain.svg` derived from the original `icon.svg`.
2. **Coordination System**: Scale the SVG coordinates from `512` to `100` to fit Obsidian's default `viewBox="0 0 100 100"` container.
3. **Cohesive Styling**: Use `currentColor` for strokes and fills, removing gradients, shadow filters, and background panels.
4. **Plugin Integration**:
   - Register the icon via `addIcon` in `src/main.ts` `onload()`.
   - Update `src/icons.ts` to expose the new custom icon ID and the raw SVG path string.
   - Verify that the custom icon is used for the sidebar ribbon item and the view tab header.

## Proposed Design Details

### 1. Coordinate Scaling and Path Simplification
Using a scale factor of `100 / 512 = 0.1953125`, the original paths will be converted:

| Original Path Element (512x512) | Scaled Path Element (100x100) | Style |
|---|---|---|
| **Document Border**:<br>`M271 92H134C108.595 92 88...` | Scaled to 100x100 coordinates | `stroke="currentColor" fill="none" stroke-width="4.7" stroke-linejoin="round"` |
| **Folded Corner**:<br>`M271 92V154C271 164.493...` | Scaled to 100x100 coordinates | `stroke="currentColor" fill="none" stroke-width="4.7" stroke-linecap="round" stroke-linejoin="round"` |
| **Letter "M"**:<br>`M134 295V218H164...` | Scaled to 100x100 coordinates | `fill="currentColor"` |
| **Arrow Stem**:<br>`M306 251H358` | Scaled to 100x100 coordinates | `stroke="currentColor" fill="none" stroke-width="3.9" stroke-linecap="round"` |
| **Arrow Head**:<br>`M340 225L366 251...` | Scaled to 100x100 coordinates | `stroke="currentColor" fill="none" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round"` |
| **Card Box**:<br>`rect x="292" y="218" width="132" height="146" rx="30"` | Scaled to `rect x="57" y="42.6" width="25.8" height="28.5" rx="5.9"` | `stroke="currentColor" fill="none" stroke-width="3.9" stroke-linejoin="round"` |
| **Mountains**:<br>`M324 316L350 287...` | Scaled to 100x100 coordinates | `fill="currentColor"` |
| **Sun**:<br>`circle cx="386" cy="259" r="14"` | Scaled to `circle cx="75.4" cy="50.6" r="2.7"` | `fill="currentColor"` |

### 2. Code Changes

#### `src/icons.ts`
Export the raw inner elements:
```typescript
export const MARKDOWN2CARD_ICON = "markdown-to-card-icon";
export const MARKDOWN2CARD_ICON_SVG = `...scaled paths here...`;
```

#### `src/main.ts`
Import `addIcon` and `MARKDOWN2CARD_ICON_SVG` and call `addIcon` inside `onload`:
```typescript
import { addIcon, Plugin } from "obsidian";
import { MARKDOWN2CARD_ICON, MARKDOWN2CARD_ICON_SVG } from "./icons";

// inside onload():
addIcon(MARKDOWN2CARD_ICON, MARKDOWN2CARD_ICON_SVG);
```

## Verification Plan
1. Compile the plugin using `npm run build`.
2. Inspect `icon-plain.svg` visually or in a web browser.
3. Validate that the plugin loads correctly and the custom icon appears in the sidebar ribbon.
