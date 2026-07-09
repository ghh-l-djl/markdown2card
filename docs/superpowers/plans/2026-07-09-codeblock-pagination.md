# Code Block Pagination Implementation Plan

**Goal:** Resolve the issue of code blocks being truncated during pagination in the Obsidian to Card plugin by implementing line-level splitting of code blocks while preserving syntax highlighting.

**Implementation Details:**
1. **DFS DOM Line Splitting:**
   - Implement `splitCodeBlockIntoLines(codeEl: HTMLElement)` which traverses the children of a syntax-highlighted code block.
   - For text nodes, splits by `\r?\n`.
   - For element nodes, tracks a stack of tag wrappers, and when text is split, clones the stack hierarchy for each line. This preserves all classes (PrismJS tokens) and inline styles.
   - Ignores `<br>` tags and triggers a line split instead.

2. **Oversized Code Block Pagination:**
   - In `splitSectionByHeight()`, check if a code block (`<pre>`) exceeds the remaining height of the card.
   - If so, use binary search to determine the maximum number of code lines (`div.red-code-line`) that can fit.
   - Append the fitting lines on the current card, then create a new page, and unshift the remaining code block lines back to the pending queue.
   - Mark split parts with `.red-pre-split` and `.red-pre-continued` classes.

3. **Styling and UI Enhancements:**
   - Modify `processElements()` so that continued code block parts (`.red-pre-continued`) display a subtle, elegant "Continued" pill indicator in place of the macOS red/yellow/green dots.
   - Update `styles.css` to styles `.red-pre-split` (no bottom border or border-radius) and `.red-pre-continued` (no top border or border-radius) to visually suggest continuous block spanning.
   - Style `.red-code-line` with a minimum height of `1.4em` so that blank code lines do not collapse.

## Completed Tasks
- [x] Write helper methods `isCodeBlock`, `splitOversizedCodeBlock`, and `splitCodeBlockIntoLines` in `src/converter.ts`.
- [x] Integrate code block pagination check inside the main loop of `splitSectionByHeight`.
- [x] Fix fits check regression in the main loop to keep other blocks paginating correctly.
- [x] Update `processElements` to swap dots for a "Continued" label on continued code parts.
- [x] Update `styles.css` with layout stitching and continuation badges.
- [x] Run production build (`npm run build`) and verify correct packaging.
