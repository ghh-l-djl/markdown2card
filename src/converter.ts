import type { App } from "obsidian";
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

  static formatContent(element: HTMLElement): void {
    const sourceChildren = Array.from(element.children) as HTMLElement[];
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
    contentArea.className = "red-preview-content";
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

  static async autoPaginate(previewEl: HTMLElement): Promise<void> {
    const contentContainer = previewEl.querySelector<HTMLElement>(".red-content-container");
    if (!contentContainer) return;
    await this.waitForImages(previewEl);
    const sections = Array.from(contentContainer.querySelectorAll<HTMLElement>(":scope > .red-content-section"));
    if (!sections.length) return;

    const nextSections: HTMLElement[] = [];
    sections.forEach((section) => nextSections.push(...this.splitSectionByHeight(section, contentContainer)));
    if (!nextSections.length) return;

    contentContainer.empty();
    nextSections.forEach((section, index) => {
      section.dataset.index = String(index);
      section.classList.toggle("red-cover", index === 0 && section.classList.contains("red-cover"));
      section.classList.toggle("red-section-active", index === 0);
      contentContainer.appendChild(section);
    });
  }

  private static createSectionsFromParts(content: HTMLElement[], index: number, isFirstCard: boolean): Node {
    const settings = this.plugin.settingsManager?.getSettings();
    const pages: HTMLElement[][] = [[]];
    let currentPage = 0;
    content.forEach((el) => {
      if (this.isManualPageBreak(el)) {
        currentPage++;
        pages[currentPage] = [];
      } else {
        pages[currentPage].push(el);
      }
    });

    if (pages.length === 1 && !content.some((el) => this.isManualPageBreak(el))) {
      const section = document.createElement("section");
      section.className = "red-content-section";
      section.dataset.index = String(index);
      if (isFirstCard) section.classList.add("red-cover", settings?.coverStyle || "cover-classic");
      content.forEach((el) => section.appendChild(el));
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

    const pending = body.map((el) => el.cloneNode(true) as HTMLElement);
    while (pending.length) {
      const block = pending.shift()!;
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
          if (trailingHeadings.length && hasBody(current)) {
            pages.push(current);
            current = makePage(false);
            pending.unshift(...trailingHeadings, block);
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
    probe.style.setProperty("width", `${Math.max(1, contentContainer.clientWidth)}px`, "important");
    probe.style.setProperty("height", `${Math.max(1, contentContainer.clientHeight)}px`, "important");
    probe.style.setProperty("overflow", "hidden", "important");
    contentContainer.appendChild(probe);
    return probe;
  }

  private static isOverflowing(el: HTMLElement): boolean {
    return el.scrollHeight > el.clientHeight + this.overflowTolerance;
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
      if (child.matches("style, script")) return false;
      return Boolean(child.textContent?.trim() || child.querySelector("img, table, pre, code, iframe, video, audio"));
    });
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
