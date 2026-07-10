# Plain SVG Icon Implementation Plan

> **Status:** Implemented. This file is a historical plan; the current icon contract is authoritative in `CLAUDE.md`, `src/icons.ts`, `src/main.ts`, and `icon-plain.svg`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a plain, monochrome SVG version of the plugin icon, register it globally within Obsidian, and display it in the sidebar ribbon and views.

**Architecture:** We will create `icon-plain.svg` containing scaled monochrome paths. We will export this SVG path string as a constant in `src/icons.ts`, call Obsidian's `addIcon` in `src/main.ts`, and update all icon-related references to point to the registered custom icon.

**Tech Stack:** TypeScript, esbuild (for build), Obsidian API.

## Global Constraints
- TypeScript with ES modules and two-space indentation.
- Explicit return types for exported methods and lifecycle methods.
- Conventional commit messages.

---

### Task 1: Create `icon-plain.svg`

**Files:**
- Create: `icon-plain.svg`

**Interfaces:**
- Produces: `icon-plain.svg` asset containing monochrome, scaled vector paths.

- [ ] **Step 1: Write `icon-plain.svg`**

Create the file `/Users/ghh/Documents/编程/项目/obsidian-to-card/icon-plain.svg` with the following content:

```xml
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M52.93 17.969H26.172C21.21 17.969 17.188 21.991 17.188 26.953V73.047C17.188 78.009 21.21 82.031 26.172 82.031H57.031C61.993 82.031 66.016 78.009 66.016 73.047V31.055L52.93 17.969Z" stroke="currentColor" stroke-width="4.7" stroke-linejoin="round" fill="none" />
  <path d="M52.93 17.969V30.078C52.93 32.128 54.591 33.789 56.641 33.789H66.016" stroke="currentColor" stroke-width="4.7" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path d="M26.172 57.617V42.578H32.031L38.281 50.391L44.531 42.578H50.391V57.617H44.531V50.781L40.039 56.445H36.523L32.031 50.781V57.617H26.172Z" fill="currentColor" />
  <path d="M59.766 49.023H69.922" stroke="currentColor" stroke-width="3.9" stroke-linecap="round" fill="none" />
  <path d="M66.406 43.945L71.484 49.023L66.406 54.102" stroke="currentColor" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <rect x="57.031" y="42.578" width="25.781" height="28.516" rx="5.859" stroke="currentColor" stroke-width="3.9" stroke-linejoin="round" fill="none" />
  <path d="M63.281 61.719L68.359 56.055L72.852 60.742L75.391 58.008L79.492 62.891V65.234H63.281V61.719Z" fill="currentColor" />
  <circle cx="75.391" cy="50.586" r="2.734" fill="currentColor" />
</svg>
```

- [ ] **Step 2: Commit the SVG asset**

```bash
git add icon-plain.svg
git commit -m "feat: add plain/monochrome SVG icon"
```

---

### Task 2: Update `src/icons.ts` and `src/main.ts` for registration

**Files:**
- Modify: `src/icons.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: Raw SVG paths from Task 1.
- Produces: `MARKDOWN2CARD_ICON` ID and registers it in Obsidian's icon library.

- [ ] **Step 1: Modify `src/icons.ts`**

Update `src/icons.ts` to export the new icon name and raw SVG path content:

```typescript
export const MARKDOWN2CARD_ICON = "markdown2card-sidebar-icon";

export const MARKDOWN2CARD_ICON_SVG = `<path d="M52.93 17.969H26.172C21.21 17.969 17.188 21.991 17.188 26.953V73.047C17.188 78.009 21.21 82.031 26.172 82.031H57.031C61.993 82.031 66.016 78.009 66.016 73.047V31.055L52.93 17.969Z" stroke="currentColor" stroke-width="4.7" stroke-linejoin="round" fill="none" />
<path d="M52.93 17.969V30.078C52.93 32.128 54.591 33.789 56.641 33.789H66.016" stroke="currentColor" stroke-width="4.7" stroke-linecap="round" stroke-linejoin="round" fill="none" />
<path d="M26.172 57.617V42.578H32.031L38.281 50.391L44.531 42.578H50.391V57.617H44.531V50.781L40.039 56.445H36.523L32.031 50.781V57.617H26.172Z" fill="currentColor" />
<path d="M59.766 49.023H69.922" stroke="currentColor" stroke-width="3.9" stroke-linecap="round" fill="none" />
<path d="M66.406 43.945L71.484 49.023L66.406 54.102" stroke="currentColor" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round" fill="none" />
<rect x="57.031" y="42.578" width="25.781" height="28.516" rx="5.859" stroke="currentColor" stroke-width="3.9" stroke-linejoin="round" fill="none" />
<path d="M63.281 61.719L68.359 56.055L72.852 60.742L75.391 58.008L79.492 62.891V65.234H63.281V61.719Z" fill="currentColor" />
<circle cx="75.391" cy="50.586" r="2.734" fill="currentColor" />`;
```

- [ ] **Step 2: Modify `src/main.ts`**

Import `addIcon` and `MARKDOWN2CARD_ICON_SVG`. Register the icon at the beginning of `onload()`:

```typescript
// Add addIcon to import from "obsidian"
import { addIcon, Notice, Plugin } from "obsidian";
// Add MARKDOWN2CARD_ICON_SVG to imports from "./icons"
import { MARKDOWN2CARD_ICON, MARKDOWN2CARD_ICON_SVG } from "./icons";

// inside onload() method:
addIcon(MARKDOWN2CARD_ICON, MARKDOWN2CARD_ICON_SVG);
```

- [ ] **Step 3: Compile and verify build**

Run: `npm run build`
Expected: esbuild compiles successfully and creates `main.js`.

- [ ] **Step 4: Commit code changes**

```bash
git add src/icons.ts src/main.ts
git commit -m "feat: register custom plain SVG icon in main plugin entry"
```
