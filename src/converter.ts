import { loadMermaid, type App } from "obsidian";
import type YanqiPlugin from "./main";

export class RedConverter {
  private static app: App;
  private static plugin: YanqiPlugin;
  private static readonly overflowTolerance = 2;

  static initialize(app: App, plugin: YanqiPlugin): void {
    this.app = app;
    this.plugin = plugin;
  }

  static hasValidContent(element: HTMLElement): boolean {
    if (element.querySelectorAll(".red-content-section").length > 0) return true;
    return this.hasRenderableContent(element);
  }

  static async renderMermaidCodeBlocks(element: HTMLElement, markdownSource = ""): Promise<void> {
    const fallbackSources = this.extractMermaidSources(markdownSource);
    await this.waitForNativeMermaid(element);
    for (let attempt = 0; attempt < 3; attempt++) {
      const blocks = this.collectMermaidCodeBlocks(element, fallbackSources);
      if (!blocks.length) return;

      try {
        const mermaid = await loadMermaid();
        for (const { container, source } of blocks) {
          await this.renderMermaidBlock(mermaid, container, source);
        }
        if (!this.collectMermaidCodeBlocks(element, fallbackSources).length) return;
      } catch (error) {
        if (attempt === 2) console.error("Mermaid 渲染失败:", error);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 180 * (attempt + 1)));
    }
  }

  static formatContent(element: HTMLElement): void {
    const sourceChildren = this.getRenderableSourceChildren(element);
    if (!this.hasRenderableContent(element)) {
      element.empty();
      element.createEl("div", {
        cls: "red-empty-message",
        text: "温馨提示\n当前文档还没有可生成卡片的内容\n现在编辑文档，实时预览效果"
      });
      element.dispatchEvent(new CustomEvent("content-validation-change", { detail: { isValid: false }, bubbles: true }));
      return;
    }

    element.dispatchEvent(new CustomEvent("content-validation-change", { detail: { isValid: true }, bubbles: true }));

    const previewContainer = document.createElement("div");
    previewContainer.className = "red-preview-container";
    const imagePreview = document.createElement("div");
    imagePreview.className = "red-image-preview";
    const copyButton = document.createElement("button");
    copyButton.className = "red-copy-button";
    copyButton.title = "复制图片";
    copyButton.setAttribute("aria-label", "复制图片到剪贴板");
    copyButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 12.4316V7.8125C13 6.2592 14.2592 5 15.8125 5H40.1875C41.7408 5 43 6.2592 43 7.8125V32.1875C43 33.7408 41.7408 35 40.1875 35H35.5163" stroke="#9b9b9b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M32.1875 13H7.8125C6.2592 13 5 14.2592 5 15.8125V40.1875C5 41.7408 6.2592 43 7.8125 43H32.1875C33.7408 43 35 41.7408 35 40.1875V15.8125C35 14.2592 33.7408 13 32.1875 13Z" fill="none" stroke="#9b9b9b" stroke-width="4" stroke-linejoin="round"/></svg>`;
    previewContainer.appendChild(copyButton);

    const headerArea = document.createElement("div");
    headerArea.className = "red-preview-header";
    const contentArea = document.createElement("div");
    contentArea.className = "red-preview-content markdown-preview-view markdown-rendered";
    const footerArea = document.createElement("div");
    footerArea.className = "red-preview-footer";
    const contentContainer = document.createElement("div");
    contentContainer.className = "red-content-container";

    const section = this.createSectionsFromParts(sourceChildren.map((el) => el.cloneNode(true) as HTMLElement), 0, true);
    if (section) contentContainer.appendChild(section);

    contentArea.appendChild(contentContainer);
    imagePreview.appendChild(headerArea);
    imagePreview.appendChild(contentArea);
    imagePreview.appendChild(footerArea);
    previewContainer.appendChild(imagePreview);
    element.empty();
    element.appendChild(previewContainer);
    element.dispatchEvent(new CustomEvent("copy-button-added", { detail: { copyButton }, bubbles: true }));
  }

  private static getRenderableSourceChildren(element: HTMLElement): HTMLElement[] {
    const children = Array.from(element.children) as HTMLElement[];
    if (children.length === 1 && this.isMarkdownPreviewWrapper(children[0])) {
      return this.flattenMarkdownPreviewWrappers(children[0]);
    }
    return children.flatMap((child) => this.isMarkdownPreviewWrapper(child) ? this.flattenMarkdownPreviewWrappers(child) : [child]);
  }

  private static flattenMarkdownPreviewWrappers(element: HTMLElement): HTMLElement[] {
    const children = Array.from(element.children) as HTMLElement[];
    if (!children.length) return [element];
    return children.flatMap((child) => this.isMarkdownPreviewWrapper(child) ? this.flattenMarkdownPreviewWrappers(child) : [child]);
  }

  private static isMarkdownPreviewWrapper(element: HTMLElement): boolean {
    return element.classList.contains("markdown-preview-sizer")
      || element.classList.contains("markdown-preview-section")
      || element.classList.contains("mod-header")
      || element.classList.contains("mod-footer");
  }

  static async autoPaginate(previewEl: HTMLElement): Promise<void> {
    const contentContainer = previewEl.querySelector<HTMLElement>(".red-content-container");
    if (!contentContainer) return;
    await this.waitForLayoutBox(contentContainer);
    await this.waitForImages(previewEl);
    await this.waitForMermaid(previewEl);
    await this.waitForLayoutBox(contentContainer);
    this.prepareMermaidBlocks(previewEl, contentContainer);
    const sections = Array.from(contentContainer.querySelectorAll<HTMLElement>(":scope > .red-content-section"));
    if (!sections.length) return;

    const nextSections: HTMLElement[] = [];
    sections.forEach((section) => nextSections.push(...this.splitSectionByHeight(section, contentContainer)));
    const visibleSections = nextSections.filter((section) => this.hasRenderableContent(section));
    if (!visibleSections.length) return;

    contentContainer.empty();
    visibleSections.forEach((section, index) => {
      section.dataset.index = String(index);
      section.classList.toggle("red-cover", index === 0 && section.classList.contains("red-cover"));
      section.classList.toggle("red-section-active", index === 0);
      contentContainer.appendChild(section);
    });
  }

  private static createSectionsFromParts(content: HTMLElement[], index: number, isFirstCard: boolean): Node {
    const settings = this.plugin.settingsManager?.getSettings();
    const renderableContent = content.filter((el) => this.isRenderableElement(el));
    const pages: HTMLElement[][] = [[]];
    let currentPage = 0;
    renderableContent.forEach((el) => {
      if (this.isManualPageBreak(el)) {
        currentPage++;
        pages[currentPage] = [];
      } else {
        pages[currentPage].push(el);
      }
    });

    if (pages.length === 1 && !renderableContent.some((el) => this.isManualPageBreak(el))) {
      const section = document.createElement("section");
      section.className = "red-content-section";
      section.dataset.index = String(index);
      if (isFirstCard) section.classList.add("red-cover", settings?.coverStyle || "cover-classic");
      renderableContent.forEach((el) => section.appendChild(el));
      this.processElements(section);
      return section;
    }

    const fragment = document.createDocumentFragment();
    pages.forEach((pageContent, pageIndex) => {
      if (pageContent.length === 0) return;
      const section = document.createElement("section");
      section.className = "red-content-section";
      section.dataset.index = `${index}-${pageIndex}`;
      if (isFirstCard && pageIndex === 0) section.classList.add("red-cover", settings?.coverStyle || "cover-classic");
      pageContent.forEach((el) => section.appendChild(el));
      this.processElements(section);
      fragment.appendChild(section);
    });
    return fragment;
  }

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
    this.scaleMermaidBlocksInSpecialGroups(pending, probe, contentContainer);

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
      if (group && group.length > 1) {
        if (hasBody(current)) {
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
        
        // Append the entire group to current page atomically
        group.forEach((el) => {
          current.appendChild(el);
        });
        
        // Remove the processed elements from pending queue
        pending.splice(0, group.length);
        continue;
      }

      pending.shift();
      if (fits(current, block)) {
        current.appendChild(block);
        continue;
      }

      if (hasBody(current)) {
        if (this.isListBlock(block)) {
          const splitBlocks = this.splitOversizedListBlock(block, current, probe);
          if (splitBlocks.length > 1 && fits(current, splitBlocks[0])) {
            current.appendChild(splitBlocks.shift()!);
            pages.push(current);
            current = makePage(false);
            pending.unshift(...splitBlocks);
            continue;
          }
        }

        if (this.isCodeBlock(block)) {
          const splitBlocks = this.splitOversizedCodeBlock(block, current, probe);
          if (splitBlocks.length > 1 && fits(current, splitBlocks[0])) {
            current.appendChild(splitBlocks.shift()!);
            pages.push(current);
            current = makePage(false);
            pending.unshift(...splitBlocks);
            continue;
          }
        }

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

      if (this.isListBlock(block)) {
        const splitBlocks = this.splitOversizedListBlock(block, makePage(false), probe);
        if (splitBlocks.length > 1) {
          pending.unshift(...splitBlocks);
          continue;
        }
      }

      if (this.isCodeBlock(block)) {
        const splitBlocks = this.splitOversizedCodeBlock(block, makePage(false), probe);
        if (splitBlocks.length > 1) {
          pending.unshift(...splitBlocks);
          continue;
        }
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

  private static createMeasureSection(section: HTMLElement, contentContainer: HTMLElement): HTMLElement {
    const probe = section.cloneNode(false) as HTMLElement;
    probe.classList.add("red-section-active", "red-pagination-measure");
    probe.style.setProperty("display", "block", "important");
    probe.style.setProperty("position", "absolute", "important");
    probe.style.setProperty("visibility", "hidden", "important");
    probe.style.setProperty("pointer-events", "none", "important");
    probe.style.setProperty("z-index", "-1", "important");
    probe.style.setProperty("left", "0", "important");
    probe.style.setProperty("top", "0", "important");
    const style = window.getComputedStyle(section);
    const marginLeft = parseFloat(style.marginLeft) || 0;
    const marginRight = parseFloat(style.marginRight) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;
    const computedWidth = contentContainer.clientWidth - marginLeft - marginRight - borderLeft - borderRight;
    probe.style.setProperty("width", `${Math.max(1, computedWidth)}px`, "important");
    probe.style.setProperty("height", `${Math.max(1, contentContainer.clientHeight)}px`, "important");
    probe.style.setProperty("overflow", "hidden", "important");
    contentContainer.appendChild(probe);
    return probe;
  }

  private static async waitForLayoutBox(element: HTMLElement): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 1200) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 20 && element.clientWidth > 20 && element.clientHeight > 20) return;
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
  }

  private static isOverflowing(el: HTMLElement): boolean {
    return el.scrollHeight > el.clientHeight + this.overflowTolerance;
  }
  private static isListBlock(block: HTMLElement): boolean {
    const tag = block.tagName.toLowerCase();
    return tag === "ul" || tag === "ol";
  }

  private static splitOversizedListBlock(block: HTMLElement, emptyPage: HTMLElement, probe: HTMLElement): HTMLElement[] {
    if (!this.isListBlock(block)) return [block];
    const children = Array.from(block.children) as HTMLElement[];
    if (children.length <= 1) return [block];

    let low = 1;
    let high = children.length - 1;
    let best = 0;

    const testFits = (count: number): boolean => {
      const candidate = block.cloneNode(false) as HTMLElement;
      for (let i = 0; i < count; i++) {
        candidate.appendChild(children[i].cloneNode(true));
      }
      probe.replaceChildren(
        ...Array.from(emptyPage.children).map((child) => child.cloneNode(true)),
        candidate
      );
      return !this.isOverflowing(probe);
    };

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (testFits(mid)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (best <= 0) return [block];

    const leftList = block.cloneNode(false) as HTMLElement;
    for (let i = 0; i < best; i++) {
      leftList.appendChild(children[i].cloneNode(true));
    }

    const rightList = block.cloneNode(false) as HTMLElement;
    for (let i = best; i < children.length; i++) {
      rightList.appendChild(children[i].cloneNode(true));
    }

    if (block.tagName.toLowerCase() === "ol") {
      const startAttr = block.getAttribute("start");
      const baseStart = startAttr ? parseInt(startAttr, 10) : 1;
      rightList.setAttribute("start", String(baseStart + best));
    }

    return [leftList, rightList];
  }

  private static isCodeBlock(block: HTMLElement): boolean {
    return block.tagName.toLowerCase() === "pre";
  }

  private static splitOversizedCodeBlock(block: HTMLElement, emptyPage: HTMLElement, probe: HTMLElement): HTMLElement[] {
    if (!this.isCodeBlock(block)) return [block];
    const codeEl = block.querySelector("code");
    if (!codeEl) return [block];

    let lineDivs = Array.from(codeEl.querySelectorAll<HTMLElement>(":scope > .red-code-line"));
    if (lineDivs.length === 0) {
      const lines = this.splitCodeBlockIntoLines(codeEl);
      codeEl.empty();
      lines.forEach((line) => codeEl.appendChild(line));
      lineDivs = lines;
    }

    if (lineDivs.length <= 1) return [block];

    let low = 1;
    let high = lineDivs.length - 1;
    let best = 0;

    const testFits = (count: number): boolean => {
      const candidatePre = block.cloneNode(false) as HTMLElement;
      const candidateCode = codeEl.cloneNode(false) as HTMLElement;
      candidatePre.appendChild(candidateCode);
      for (let i = 0; i < count; i++) {
        candidateCode.appendChild(lineDivs[i].cloneNode(true));
      }
      probe.replaceChildren(
        ...Array.from(emptyPage.children).map((child) => child.cloneNode(true)),
        candidatePre
      );
      return !this.isOverflowing(probe);
    };

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (testFits(mid)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (best <= 0) return [block];

    const leftPre = block.cloneNode(false) as HTMLElement;
    const leftCode = codeEl.cloneNode(false) as HTMLElement;
    leftPre.appendChild(leftCode);
    for (let i = 0; i < best; i++) {
      leftCode.appendChild(lineDivs[i].cloneNode(true));
    }

    const rightPre = block.cloneNode(false) as HTMLElement;
    const rightCode = codeEl.cloneNode(false) as HTMLElement;
    rightPre.appendChild(rightCode);
    for (let i = best; i < lineDivs.length; i++) {
      rightCode.appendChild(lineDivs[i].cloneNode(true));
    }

    rightPre.classList.add("red-pre-continued");
    leftPre.classList.add("red-pre-split");

    return [leftPre, rightPre];
  }

  private static splitCodeBlockIntoLines(codeEl: HTMLElement): HTMLElement[] {
    const lines: HTMLElement[] = [];
    let currentLineNodes: Node[] = [];
    const stack: HTMLElement[] = [];

    function traverse(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        const parts = text.split(/\r?\n/);
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            const lineContainer = document.createElement("div");
            lineContainer.className = "red-code-line";
            currentLineNodes.forEach(n => lineContainer.appendChild(n));
            lines.push(lineContainer);
            currentLineNodes = [];
          }
          const partText = parts[i];
          if (partText !== "") {
            if (stack.length === 0) {
              currentLineNodes.push(document.createTextNode(partText));
            } else {
              const rootClone = stack[0].cloneNode(false) as HTMLElement;
              let currentParent = rootClone;
              for (let j = 1; j < stack.length; j++) {
                const childClone = stack[j].cloneNode(false) as HTMLElement;
                currentParent.appendChild(childClone);
                currentParent = childClone;
              }
              currentParent.appendChild(document.createTextNode(partText));
              currentLineNodes.push(rootClone);
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName.toLowerCase() === "br") {
          const lineContainer = document.createElement("div");
          lineContainer.className = "red-code-line";
          currentLineNodes.forEach(n => lineContainer.appendChild(n));
          lines.push(lineContainer);
          currentLineNodes = [];
          return;
        }
        stack.push(el);
        for (let i = 0; i < el.childNodes.length; i++) {
          traverse(el.childNodes[i]);
        }
        stack.pop();
      }
    }

    for (let i = 0; i < codeEl.childNodes.length; i++) {
      traverse(codeEl.childNodes[i]);
    }

    if (currentLineNodes.length > 0 || lines.length === 0) {
      const lineContainer = document.createElement("div");
      lineContainer.className = "red-code-line";
      currentLineNodes.forEach(n => lineContainer.appendChild(n));
      lines.push(lineContainer);
    }

    return lines;
  }

  private static splitOversizedTextBlock(block: HTMLElement, emptyPage: HTMLElement, probe: HTMLElement): HTMLElement[] {
    if (!this.isSplittableTextBlock(block)) return [block];
    const text = (block.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length < 2) return [block];

    const chunks: HTMLElement[] = [];
    let start = 0;
    while (start < text.length && chunks.length < 80) {
      let low = 1;
      let high = text.length - start;
      let best = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = block.cloneNode(false) as HTMLElement;
        candidate.textContent = text.slice(start, start + mid).trim();
        probe.replaceChildren(...Array.from(emptyPage.children).map((child) => child.cloneNode(true)), candidate);
        if (!this.isOverflowing(probe)) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (best <= 0) return [block];
      const chunk = block.cloneNode(false) as HTMLElement;
      chunk.textContent = text.slice(start, start + best).trim();
      chunks.push(chunk);
      start += best;
      while (text[start] === " ") start++;
    }

    return start >= text.length ? chunks : [block];
  }

  private static isSplittableTextBlock(block: HTMLElement): boolean {
    const tag = block.tagName.toLowerCase();
    if (!["p", "li", "blockquote"].includes(tag)) return false;
    if (block.querySelector("img, table, pre, code, iframe, video, audio")) return false;
    return Boolean(block.textContent?.trim());
  }

  private static isMermaidBlock(el: HTMLElement): boolean {
    return el.classList.contains("mermaid") || el.classList.contains("red-mermaid");
  }

  private static isPageBreakMarker(el: HTMLElement): boolean {
    return el.classList.contains("red-page-break") || this.isManualPageBreak(el);
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
      if (this.isMermaidBlock(arr[j]) || this.isPageBreakMarker(arr[j]) || this.isHeadingBlock(arr[j])) {
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
          if (lines === 2) {
            const pageBreak = document.createElement("div");
            pageBreak.className = "red-page-break";
            blocks.splice(preTextIdx, 0, pageBreak);
            i += 1;
          } else if (lines > 2) {
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
              const [prefix, suffix] = this.splitTextBlockToFirstNLines(succeedingText, 2, probe);
              const pageBreak = document.createElement("div");
              pageBreak.className = "red-page-break";
              blocks.splice(succTextIdx, 1, prefix, pageBreak, suffix);
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
        if (lines === 2) {
          textBlockCount++;
          if (textBlockCount > 1) return null;
          continue;
        }
      }
      return null;
    }

    if (hasOneLineText) {
      const start = Math.max(0, mermaidIdx - 2);
      return pending.slice(start, mermaidIdx + 1);
    } else if (textBlockCount > 0) {
      const start = mermaidIdx - 1;
      return pending.slice(start, mermaidIdx + 1);
    } else {
      const start = Math.max(0, mermaidIdx - 2);
      return pending.slice(start, mermaidIdx + 1);
    }
  }

  private static endsWithHeading(page: HTMLElement): boolean {
    const last = page.lastElementChild;
    return last instanceof HTMLElement && this.isHeadingBlock(last);
  }

  private static takeTrailingHeadings(page: HTMLElement): HTMLElement[] {
    const headings: HTMLElement[] = [];
    while (this.endsWithHeading(page)) {
      headings.unshift(page.removeChild(page.lastElementChild!) as HTMLElement);
    }
    return headings;
  }

  private static isHeadingBlock(block: HTMLElement): boolean {
    return /^H[1-6]$/.test(block.tagName);
  }

  private static isManualPageBreak(el: HTMLElement): boolean {
    return el.tagName === "HR" && !this.isFootnoteSeparator(el);
  }

  private static isFootnoteSeparator(el: HTMLElement): boolean {
    return el.classList.contains("footnotes-sep") || el.classList.contains("footnote-separator");
  }

  private static hasRenderableContent(element: HTMLElement): boolean {
    return Array.from(element.children).some((child) => {
      return child instanceof HTMLElement && this.isRenderableElement(child);
    });
  }

  private static isRenderableElement(el: HTMLElement): boolean {
    if (el.matches("style, script")) return false;
    if (el.classList.contains("metadata-container") || el.classList.contains("frontmatter")) return false;
    if (this.isManualPageBreak(el)) return true;
    if (el.classList.contains("mermaidTooltip")) return false;
    if (el.getAttribute("aria-hidden") === "true" && !el.textContent?.trim()) return false;
    if (el.matches(".mermaid > style, .mermaid style")) return false;
    return Boolean(el.textContent?.trim() || el.querySelector("img, table, pre, code, iframe, video, audio, svg"));
  }

  private static collectMermaidCodeBlocks(element: HTMLElement, fallbackSources: string[] = []): Array<{ container: HTMLElement; source: string }> {
    const blocks: Array<{ container: HTMLElement; source: string }> = [];
    const codeBlocks = Array.from(element.querySelectorAll<HTMLElement>(
      "pre > code.language-mermaid, pre > code[class*='language-mermaid'], pre.language-mermaid > code"
    ));
    codeBlocks.forEach((code, index) => {
      const pre = code.parentElement;
      if (!pre || pre.querySelector("svg")) return;
      const domSource = this.normalizeMermaidSource(code.textContent || "");
      const source = domSource || fallbackSources[index] || "";
      if (!source) return;
      blocks.push({ container: pre, source });
    });

    return blocks;
  }

  private static extractMermaidSources(markdown: string): string[] {
    const sources: string[] = [];
    const fence = /(^|\n)(`{3,}|~{3,})[ \t]*mermaid[^\n]*\n([\s\S]*?)(?:\n\2[ \t]*(?=\n|$))/gi;
    let match: RegExpExecArray | null;
    while ((match = fence.exec(markdown)) !== null) {
      const source = this.normalizeMermaidSource(match[3] || "");
      if (source) sources.push(source);
    }
    return sources;
  }

  private static normalizeMermaidSource(source: string): string {
    return source
      .replace(/^\s*```\s*mermaid\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .replace(/^\s*mermaid\s*\n/i, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00A0/g, " ")
      .trim();
  }

  private static async waitForNativeMermaid(element: HTMLElement): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 700) {
      const rawBlocks = element.querySelectorAll("pre > code.language-mermaid, pre > code[class*='language-mermaid'], pre.language-mermaid > code");
      if (!rawBlocks.length) return;
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
  }

  private static async renderMermaidBlock(mermaid: any, container: HTMLElement, source: string): Promise<void> {
    if (typeof mermaid?.render !== "function") return;
    try {
      if (typeof mermaid?.parse === "function") await mermaid.parse(source);
      const id = `red-mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await mermaid.render(id, source);
      const svg = typeof result === "string" ? result : result?.svg;
      if (!svg || /Syntax error in text/i.test(svg)) return;
      container.className = "mermaid red-mermaid";
      container.removeAttribute("style");
      container.innerHTML = svg;
      if (typeof result?.bindFunctions === "function") result.bindFunctions(container);
    } catch (error) {
      console.error("Mermaid 代码块渲染失败:", error);
    }
  }

  private static async waitForImages(element: HTMLElement): Promise<void> {
    const images = Array.from(element.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      if (img.decode) return img.decode().catch(() => undefined);
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }));
  }

  private static async waitForMermaid(element: HTMLElement): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 1500) {
      const mermaidBlocks = Array.from(element.querySelectorAll<HTMLElement>(".mermaid"));
      if (!mermaidBlocks.length || mermaidBlocks.every((block) => block.querySelector("svg") || block.querySelector(".mermaid-error"))) break;
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
  }

  private static prepareMermaidBlocks(previewEl: HTMLElement, contentContainer: HTMLElement): void {
    const contentHeight = Math.max(1, contentContainer.clientHeight);
    const pageInnerWidth = Math.max(1, contentContainer.clientWidth - 4);
    
    // Create a temporary probe for accurate line counting
    const tempProbe = this.createMeasureSection(
      contentContainer.querySelector<HTMLElement>(".red-content-section") || contentContainer,
      contentContainer
    );

    previewEl.querySelectorAll<HTMLElement>(".mermaid").forEach((block) => {
      block.classList.add("red-mermaid");
      const svg = block.querySelector<SVGSVGElement>("svg");
      if (!svg) return;

      const width = Math.max(svg.viewBox.baseVal.width || svg.getBoundingClientRect().width || svg.clientWidth, 1);
      const height = Math.max(svg.viewBox.baseVal.height || svg.getBoundingClientRect().height || svg.clientHeight, 1);
      if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      // Scan surrounding elements to determine reserved height
      let precedingText: HTMLElement | null = null;
      let precedingHeadingsCount = 0;
      let prev = block.previousElementSibling;
      while (prev instanceof HTMLElement) {
        if (prev.classList.contains("mermaid") || prev.tagName === "HR") {
          break;
        }
        if (this.isHeadingBlock(prev)) {
          precedingHeadingsCount++;
        } else if (this.isSplittableTextBlock(prev)) {
          precedingText = prev;
          break;
        }
        prev = prev.previousElementSibling;
      }

      let reserveHeight = 0;

      if (precedingText) {
        const lines = this.countTextLines(precedingText, tempProbe);
        if (lines === 1) {
          // Scenario 2: 1-line text and preceding 1 heading
          reserveHeight = 28 + (precedingHeadingsCount > 0 ? 84 : 0);
        } else {
          // Scenario 3: last 2 lines of text
          reserveHeight = 56;
        }
      } else if (precedingHeadingsCount > 0) {
        // Scenario 1: headings only (at most 2 headings)
        const headingsToKeep = Math.min(2, precedingHeadingsCount);
        reserveHeight = headingsToKeep * 60; // 60px per heading
      } else {
        // Scenario 4: look at succeeding text block
        let succeedingText: HTMLElement | null = null;
        let next = block.nextElementSibling;
        while (next instanceof HTMLElement) {
          if (next.classList.contains("mermaid") || next.tagName === "HR" || this.isHeadingBlock(next)) {
            break;
          }
          if (this.isSplittableTextBlock(next)) {
            succeedingText = next;
            break;
          }
          next = next.nextElementSibling;
        }

        if (succeedingText) {
          const lines = this.countTextLines(succeedingText, tempProbe);
          if (lines > 0) {
            const linesToKeep = Math.min(2, lines);
            reserveHeight = linesToKeep * 28; // 28px per line
          }
        }
      }

      // Add safety padding and reserve height
      const availableHeight = Math.max(120, contentHeight - 48 - reserveHeight);
      const availableWidth = Math.max(120, pageInnerWidth - 36);
      const scale = Math.min(1, availableWidth / width, availableHeight / height);
      block.dataset.redMermaidOriginalWidth = String(Math.ceil(width));
      block.dataset.redMermaidOriginalHeight = String(Math.ceil(height));
      block.style.setProperty("--red-mermaid-scale", String(scale));
      block.style.setProperty("--red-mermaid-width", `${Math.ceil(width * scale)}px`);
      block.style.setProperty("--red-mermaid-height", `${Math.ceil(height * scale)}px`);
      if (scale < 1) block.classList.add("red-mermaid-scaled");
      svg.style.width = "var(--red-mermaid-width)";
      svg.style.height = "var(--red-mermaid-height)";
      svg.style.maxWidth = "100%";
      svg.style.display = "block";
    });

    tempProbe.remove();
  }

  private static scaleMermaidBlocksInSpecialGroups(blocks: HTMLElement[], probe: HTMLElement, contentContainer: HTMLElement): void {
    const contentHeight = Math.max(1, contentContainer.clientHeight);
    const pageInnerWidth = Math.max(1, contentContainer.clientWidth - 4);

    for (let i = 0; i < blocks.length; i++) {
      if (this.isMermaidBlock(blocks[i])) {
        const mermaidBlock = blocks[i];
        
        let group: HTMLElement[] | null = null;
        for (let j = Math.max(0, i - 4); j <= i; j++) {
          const candidateGroup = this.getKeepTogetherGroup(blocks.slice(j), probe);
          if (candidateGroup && candidateGroup.includes(mermaidBlock)) {
            group = candidateGroup;
            break;
          }
        }

        let reserveHeight = 0;
        if (group) {
          group.forEach((el) => {
            if (el !== mermaidBlock && !this.isPageBreakMarker(el)) {
              const clone = el.cloneNode(true) as HTMLElement;
              probe.replaceChildren(clone);
              const style = window.getComputedStyle(clone);
              const marginTop = parseFloat(style.marginTop) || 0;
              const marginBottom = parseFloat(style.marginBottom) || 0;
              reserveHeight += clone.offsetHeight + marginTop + marginBottom;
            }
          });
        }

        const svg = mermaidBlock.querySelector<SVGSVGElement>("svg");
        if (svg) {
          const width = Math.max(svg.viewBox.baseVal.width || svg.getBoundingClientRect().width || svg.clientWidth, 1);
          const height = Math.max(svg.viewBox.baseVal.height || svg.getBoundingClientRect().height || svg.clientHeight, 1);
          if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

          // Deduct safety padding and reserve height
          const availableHeight = Math.max(120, contentHeight - 48 - reserveHeight);
          const availableWidth = Math.max(120, pageInnerWidth - 36);
          const scale = Math.min(1, availableWidth / width, availableHeight / height);

          mermaidBlock.dataset.redMermaidOriginalWidth = String(Math.ceil(width));
          mermaidBlock.dataset.redMermaidOriginalHeight = String(Math.ceil(height));
          mermaidBlock.style.setProperty("--red-mermaid-scale", String(scale));
          mermaidBlock.style.setProperty("--red-mermaid-width", `${Math.ceil(width * scale)}px`);
          mermaidBlock.style.setProperty("--red-mermaid-height", `${Math.ceil(height * scale)}px`);
          if (scale < 1) mermaidBlock.classList.add("red-mermaid-scaled");
          else mermaidBlock.classList.remove("red-mermaid-scaled");
          svg.style.width = "var(--red-mermaid-width)";
          svg.style.height = "var(--red-mermaid-height)";
          svg.style.maxWidth = "100%";
          svg.style.display = "block";
        }
      }
    }
    probe.replaceChildren();
  }

  private static previousContentIsHeading(block: HTMLElement): boolean {
    let previous = block.previousElementSibling;
    while (previous instanceof HTMLElement && !this.isRenderableElement(previous)) {
      previous = previous.previousElementSibling;
    }
    return previous instanceof HTMLElement && this.isHeadingBlock(previous);
  }

  private static processElements(container: HTMLElement): void {
    container.querySelectorAll("strong, em").forEach((el) => el.classList.add("red-emphasis"));
    container.querySelectorAll("a").forEach((el) => el.classList.add("red-link"));
    container.querySelectorAll("table").forEach((el) => el.classList.add("red-table"));
    container.querySelectorAll("hr").forEach((el) => el.classList.add("red-hr"));
    container.querySelectorAll("del").forEach((el) => el.classList.add("red-del"));
    container.querySelectorAll(".task-list-item").forEach((el) => el.classList.add("red-task-list-item"));
    container.querySelectorAll(".footnotes").forEach((el) => el.classList.add("red-footnotes"));
    container.querySelectorAll(".footnotes-list").forEach((el) => el.classList.add("red-footnotes-list"));
    container.querySelectorAll(".footnotes-sep, .footnote-separator").forEach((el) => el.classList.add("red-footnotes-sep"));
    container.querySelectorAll(".footnote-ref, .footnote-backref").forEach((el) => el.classList.add("red-footnote"));
    container.querySelectorAll(".mermaid").forEach((el) => el.classList.add("red-mermaid"));
    container.querySelectorAll("pre code").forEach((el) => {
      const pre = el.parentElement;
      if (!pre) return;
      pre.classList.add("red-pre");
      if (pre.classList.contains("red-pre-continued")) {
        if (!pre.querySelector(".red-code-continued-label")) {
          const label = document.createElement("div");
          label.className = "red-code-continued-label";
          label.textContent = "Continued";
          pre.insertBefore(label, pre.firstChild);
        }
      } else {
        if (!pre.querySelector(".red-code-dots")) {
          const dots = document.createElement("div");
          dots.className = "red-code-dots";
          ["red", "yellow", "green"].forEach((color) => {
            const dot = document.createElement("span");
            dot.className = `red-code-dot red-code-dot-${color}`;
            dots.appendChild(dot);
          });
          pre.insertBefore(dots, pre.firstChild);
        }
      }
      pre.querySelector(".copy-code-button")?.remove();
    });
    container.querySelectorAll("span.internal-embed[alt][src]").forEach((el) => this.replaceInternalEmbed(el as HTMLElement));
    container.querySelectorAll("blockquote").forEach((el) => {
      el.classList.add("red-blockquote");
      el.querySelectorAll("p").forEach((p) => p.classList.add("red-blockquote-p"));
    });
  }

  private static replaceInternalEmbed(originalSpan: HTMLElement): void {
    const src = originalSpan.getAttribute("src");
    const alt = originalSpan.getAttribute("alt");
    if (!src) return;
    try {
      const linktext = src.split("|")[0];
      const file = this.app.metadataCache.getFirstLinkpathDest(linktext, "");
      if (!file) return;
      const absolutePath = this.app.vault.adapter.getResourcePath(file.path);
      const img = document.createElement("img");
      img.src = absolutePath;
      if (alt) img.alt = alt;
      img.className = "red-image";
      originalSpan.parentNode?.replaceChild(img, originalSpan);
    } catch (error) {
      console.error("图片处理失败:", error);
    }
  }
}
