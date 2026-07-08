# Mermaid Pagination Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the pagination around Mermaid code blocks in Obsidian cards to fit headings, short descriptions, and long descriptions according to user-specified pagination rules.

**Architecture:** We will implement an element-level preprocessor that measures text block lines using the `probe` element and splits blocks surrounding Mermaid blocks accordingly. In the pagination loop, we recognize the added page breaks and enforce keep-together behavior using group look-ahead.

**Tech Stack:** TypeScript, DOM manipulation.

## Global Constraints
* indents: Two-space indentation.
* imports: Double quotes for ES modules.
* Quotes: Double quotes for most strings.
* Type declarations: Use explicit return types for all functions.

---

### Task 1: Add Helper Methods in Converter Class
We need to add the core helper methods for element analysis, line height measurement, text splitting, and keep-together checks.

**Files:**
- Modify: `src/converter.ts:318-324` (inserting functions after `isSplittableTextBlock`)

**Interfaces:**
- Produces:
  - `isMermaidBlock(el: HTMLElement): boolean`
  - `isPageBreakMarker(el: HTMLElement): boolean`
  - `measureLineMetrics(block: HTMLElement, probe: HTMLElement): { lineHeight: number; paddingHeight: number }`
  - `countTextLines(block: HTMLElement, probe: HTMLElement): number`
  - `splitTextBlockToLastNLines(block: HTMLElement, n: number, probe: HTMLElement): [HTMLElement, HTMLElement]`
  - `splitTextBlockToFirstNLines(block: HTMLElement, n: number, probe: HTMLElement): [HTMLElement, HTMLElement]`
  - `findPrecedingTextBlock(arr: HTMLElement[], startIdx: number): number`
  - `findSucceedingTextBlock(arr: HTMLElement[], startIdx: number): number`
  - `preprocessMermaidBlocks(blocks: HTMLElement[], probe: HTMLElement): void`
  - `getKeepTogetherGroup(pending: HTMLElement[], probe: HTMLElement): HTMLElement[] | null`

- [ ] **Step 1: Write helper implementation**

Add the helper methods in `src/converter.ts` as static private methods:

```typescript
  private static isMermaidBlock(el: HTMLElement): boolean {
    return el.classList.contains("mermaid") || el.classList.contains("red-mermaid");
  }

  private static isPageBreakMarker(el: HTMLElement): boolean {
    return el.classList.contains("red-page-break") || el.tagName === "HR";
  }

  private static measureLineMetrics(block: HTMLElement, probe: HTMLElement): { lineHeight: number; paddingHeight: number } {
    const clone1 = block.cloneNode(true) as HTMLElement;
    clone1.innerHTML = "A";
    probe.replaceChildren(clone1);
    const h1 = clone1.clientHeight;

    const clone2 = block.cloneNode(true) as HTMLElement;
    clone2.innerHTML = "A<br>A";
    probe.replaceChildren(clone2);
    const h2 = clone2.clientHeight;

    const lineHeight = h2 - h1;
    const paddingHeight = h1 - lineHeight;
    
    if (isNaN(lineHeight) || lineHeight <= 0) {
      return { lineHeight: 20, paddingHeight: 0 };
    }
    return { lineHeight, paddingHeight };
  }

  private static countTextLines(block: HTMLElement, probe: HTMLElement): number {
    if (!block.textContent?.trim()) return 0;
    const { lineHeight, paddingHeight } = this.measureLineMetrics(block, probe);
    
    const clone = block.cloneNode(true) as HTMLElement;
    probe.replaceChildren(clone);
    const hFull = clone.clientHeight;
    
    const lines = Math.round((hFull - paddingHeight) / lineHeight);
    return Math.max(1, lines);
  }

  private static splitTextBlockToLastNLines(block: HTMLElement, n: number, probe: HTMLElement): [HTMLElement, HTMLElement] {
    const text = (block.textContent || "").replace(/\s+/g, " ").trim();
    const { lineHeight, paddingHeight } = this.measureLineMetrics(block, probe);

    let low = 0;
    let high = text.length;
    let bestSplitIdx = text.length;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const suffixText = text.slice(mid).trim();
      
      const suffixClone = block.cloneNode(true) as HTMLElement;
      suffixClone.textContent = suffixText;
      probe.replaceChildren(suffixClone);
      
      const hFull = suffixClone.clientHeight;
      const lines = Math.round((hFull - paddingHeight) / lineHeight);
      
      if (lines <= n) {
        bestSplitIdx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    let splitIdx = bestSplitIdx;
    if (splitIdx > 0 && splitIdx < text.length) {
      const leftSpace = text.lastIndexOf(" ", splitIdx);
      const rightSpace = text.indexOf(" ", splitIdx);
      if (leftSpace !== -1 && (splitIdx - leftSpace < 10 || rightSpace === -1)) {
        splitIdx = leftSpace + 1;
      } else if (rightSpace !== -1) {
        splitIdx = rightSpace + 1;
      }
    }

    const prefixText = text.slice(0, splitIdx).trim();
    const suffixText = text.slice(splitIdx).trim();

    const prefixBlock = block.cloneNode(true) as HTMLElement;
    prefixBlock.textContent = prefixText;
    
    const suffixBlock = block.cloneNode(true) as HTMLElement;
    suffixBlock.textContent = suffixText;

    return [prefixBlock, suffixBlock];
  }

  private static splitTextBlockToFirstNLines(block: HTMLElement, n: number, probe: HTMLElement): [HTMLElement, HTMLElement] {
    const text = (block.textContent || "").replace(/\s+/g, " ").trim();
    const { lineHeight, paddingHeight } = this.measureLineMetrics(block, probe);

    let low = 0;
    let high = text.length;
    let bestSplitIdx = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const prefixText = text.slice(0, mid).trim();
      
      const prefixClone = block.cloneNode(true) as HTMLElement;
      prefixClone.textContent = prefixText;
      probe.replaceChildren(prefixClone);
      
      const hFull = prefixClone.clientHeight;
      const lines = Math.round((hFull - paddingHeight) / lineHeight);
      
      if (lines <= n) {
        bestSplitIdx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    let splitIdx = bestSplitIdx;
    if (splitIdx > 0 && splitIdx < text.length) {
      const leftSpace = text.lastIndexOf(" ", splitIdx);
      const rightSpace = text.indexOf(" ", splitIdx);
      if (leftSpace !== -1 && (splitIdx - leftSpace < 10 || rightSpace === -1)) {
        splitIdx = leftSpace + 1;
      } else if (rightSpace !== -1) {
        splitIdx = rightSpace + 1;
      }
    }

    const prefixText = text.slice(0, splitIdx).trim();
    const suffixText = text.slice(splitIdx).trim();

    const prefixBlock = block.cloneNode(true) as HTMLElement;
    prefixBlock.textContent = prefixText;
    
    const suffixBlock = block.cloneNode(true) as HTMLElement;
    suffixBlock.textContent = suffixText;

    return [prefixBlock, suffixBlock];
  }

  private static findPrecedingTextBlock(arr: HTMLElement[], startIdx: number): number {
    for (let j = startIdx; j >= 0; j--) {
      if (this.isMermaidBlock(arr[j]) || this.isPageBreakMarker(arr[j])) {
        break;
      }
      if (this.isSplittableTextBlock(arr[j])) {
        return j;
      }
    }
    return -1;
  }

  private static findSucceedingTextBlock(arr: HTMLElement[], startIdx: number): number {
    for (let j = startIdx; j < arr.length; j++) {
      if (this.isMermaidBlock(arr[j]) || this.isPageBreakMarker(arr[j]) || this.isHeadingBlock(arr[j])) {
        break;
      }
      if (this.isSplittableTextBlock(arr[j])) {
        return j;
      }
    }
    return -1;
  }

  private static preprocessMermaidBlocks(blocks: HTMLElement[], probe: HTMLElement): void {
    let i = blocks.length - 1;
    while (i >= 0) {
      if (this.isMermaidBlock(blocks[i])) {
        const preTextIdx = this.findPrecedingTextBlock(blocks, i - 1);
        if (preTextIdx !== -1) {
          const precedingText = blocks[preTextIdx];
          const lines = this.countTextLines(precedingText, probe);
          if (lines > 1) {
            const [prefix, suffix] = this.splitTextBlockToLastNLines(precedingText, 2, probe);
            const pageBreak = document.createElement("div");
            pageBreak.className = "red-page-break";
            blocks.splice(preTextIdx, 1, prefix, pageBreak, suffix);
            i += 2;
          }
        } else {
          const succTextIdx = this.findSucceedingTextBlock(blocks, i + 1);
          if (succTextIdx !== -1) {
            const succeedingText = blocks[succTextIdx];
            const lines = this.countTextLines(succeedingText, probe);
            if (lines > 2) {
              const [suffix, prefix] = this.splitTextBlockToFirstNLines(succeedingText, 2, probe);
              const pageBreak = document.createElement("div");
              pageBreak.className = "red-page-break";
              blocks.splice(succTextIdx, 1, suffix, pageBreak, prefix);
            }
          }
        }
      }
      i--;
    }
  }

  private static getKeepTogetherGroup(pending: HTMLElement[], probe: HTMLElement): HTMLElement[] | null {
    if (pending.length === 0) return null;

    if (this.isMermaidBlock(pending[0])) {
      if (pending.length > 1 && this.isSplittableTextBlock(pending[1])) {
        const lines = this.countTextLines(pending[1], probe);
        if (lines <= 2) {
          return [pending[0], pending[1]];
        }
      }
      return null;
    }

    let mermaidIdx = -1;
    for (let i = 0; i < pending.length; i++) {
      if (this.isMermaidBlock(pending[i])) {
        mermaidIdx = i;
        break;
      }
      if (this.isPageBreakMarker(pending[i])) {
        break;
      }
    }

    if (mermaidIdx === -1) return null;

    let textBlockCount = 0;
    let headingsCount = 0;
    let hasOneLineText = false;
    
    for (let i = 0; i < mermaidIdx; i++) {
      const el = pending[i];
      if (this.isHeadingBlock(el)) {
        headingsCount++;
        continue;
      }
      if (this.isSplittableTextBlock(el)) {
        const lines = this.countTextLines(el, probe);
        if (lines === 1) {
          textBlockCount++;
          hasOneLineText = true;
          if (textBlockCount > 1) return null;
          continue;
        }
      }
      return null;
    }

    if (hasOneLineText) {
      if (headingsCount > 1) {
        return pending.slice(mermaidIdx - 2, mermaidIdx + 1);
      }
    } else {
      if (headingsCount > 2) {
        return pending.slice(mermaidIdx - 2, mermaidIdx + 1);
      }
    }

    return pending.slice(0, mermaidIdx + 1);
  }
```

- [ ] **Step 2: Build the project to verify compilation**

Run: `npm run build`
Expected: Successful build with zero TypeScript compiler errors.

---

### Task 2: Integrate Preprocessor and Keep-Together Logic into splitSectionByHeight
We will update `splitSectionByHeight` to trigger the preprocessor and check group bounds.

**Files:**
- Modify: `src/converter.ts:170-251` (entire `splitSectionByHeight` method)

**Interfaces:**
- Consumes: All helper methods implemented in Task 1.

- [ ] **Step 1: Replace splitSectionByHeight implementation**

Replace the existing implementation of `splitSectionByHeight` in `src/converter.ts` with the following:

```typescript
  private static splitSectionByHeight(section: HTMLElement, contentContainer: HTMLElement): HTMLElement[] {
    const children = Array.from(section.children) as HTMLElement[];
    if (!children.length) return [section.cloneNode(true) as HTMLElement];

    const body = children;
    const pages: HTMLElement[] = [];
    const probe = this.createMeasureSection(section, contentContainer);
    const makePage = (isFirstPage: boolean): HTMLElement => {
      const page = section.cloneNode(false) as HTMLElement;
      page.classList.remove("red-section-active");
      if (!isFirstPage) {
        page.classList.remove("red-cover");
        const coverStyle = this.plugin.settingsManager?.getSettings().coverStyle;
        if (coverStyle) page.classList.remove(coverStyle);
      }
      return page;
    };
    let current = makePage(true);

    const hasBody = (page: HTMLElement) => page.childElementCount > 0;
    const fits = (page: HTMLElement, candidate: HTMLElement): boolean => {
      probe.replaceChildren(...Array.from(page.children).map((child) => child.cloneNode(true)), candidate.cloneNode(true));
      return !this.isOverflowing(probe);
    };

    // Preprocess blocks to apply Mermaid pagination rules
    const pending = body.map((el) => el.cloneNode(true) as HTMLElement);
    this.preprocessMermaidBlocks(pending, probe);

    while (pending.length) {
      const block = pending[0];

      // Handle page break marker
      if (this.isPageBreakMarker(block)) {
        pending.shift();
        if (hasBody(current)) {
          pages.push(current);
          current = makePage(false);
        }
        continue;
      }

      // Handle keep-together group
      const group = this.getKeepTogetherGroup(pending, probe);
      if (group && group.length > 1 && hasBody(current)) {
        const fitsGroup = (page: HTMLElement, elements: HTMLElement[]): boolean => {
          probe.replaceChildren(
            ...Array.from(page.children).map((child) => child.cloneNode(true)),
            ...elements.map((el) => el.cloneNode(true))
          );
          return !this.isOverflowing(probe);
        };
        
        if (!fitsGroup(current, group)) {
          pages.push(current);
          current = makePage(false);
        }
      }

      pending.shift();
      if (fits(current, block)) {
        current.appendChild(block);
        continue;
      }

      if (hasBody(current)) {
        if (this.endsWithHeading(current)) {
          const splitBlocks = this.splitOversizedTextBlock(block, current, probe);
          if (splitBlocks.length > 1 && fits(current, splitBlocks[0])) {
            current.appendChild(splitBlocks.shift()!);
            pages.push(current);
            current = makePage(false);
            pending.unshift(...splitBlocks);
            continue;
          }

          const trailingHeadings = this.takeTrailingHeadings(current);
          if (trailingHeadings.length) {
            if (hasBody(current)) {
              pages.push(current);
              current = makePage(false);
              pending.unshift(...trailingHeadings, block);
            } else {
              trailingHeadings.forEach((heading) => current.appendChild(heading));
              current.appendChild(block);
              pages.push(current);
              current = makePage(false);
            }
            continue;
          }
        }

        pages.push(current);
        current = makePage(false);
        pending.unshift(block);
        continue;
      }

      const splitBlocks = this.splitOversizedTextBlock(block, makePage(false), probe);
      if (splitBlocks.length > 1) {
        pending.unshift(...splitBlocks);
        continue;
      }

      current.appendChild(block);
      pages.push(current);
      current = makePage(false);
    }

    if (hasBody(current) || !pages.length) pages.push(current);
    probe.remove();
    pages.forEach((page) => this.processElements(page));
    return pages;
  }
```

- [ ] **Step 2: Build the project to verify compilation**

Run: `npm run build`
Expected: Successful build with zero TypeScript compiler errors.
