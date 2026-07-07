import type { App } from "obsidian";
import type YanqiPlugin from "./main";

export class RedConverter {
  private static app: App;
  private static plugin: YanqiPlugin;

  static initialize(app: App, plugin: YanqiPlugin): void {
    this.app = app;
    this.plugin = plugin;
  }

  static hasValidContent(element: HTMLElement): boolean {
    const headingLevel = this.plugin.settingsManager?.getSettings().headingLevel || "h1";
    return element.querySelectorAll(headingLevel).length > 0;
  }

  static formatContent(element: HTMLElement): void {
    const settings = this.plugin.settingsManager?.getSettings();
    const headingLevel = settings?.headingLevel || "h1";
    const headers = Array.from(element.querySelectorAll<HTMLElement>(headingLevel));
    if (headers.length === 0) {
      element.empty();
      element.createEl("div", {
        cls: "red-empty-message",
        text: `温馨提示\n请使用${headingLevel === "h1" ? "一级标题(#)" : "二级标题(##)"}来分割内容\n每个标题将生成一张独立的图片\n现在编辑文档，实时预览效果`
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

    headers.forEach((header, index) => {
      const section = this.createContentSection(header, index);
      if (section) contentContainer.appendChild(section);
    });

    contentArea.appendChild(contentContainer);
    imagePreview.appendChild(headerArea);
    imagePreview.appendChild(contentArea);
    imagePreview.appendChild(footerArea);
    previewContainer.appendChild(imagePreview);
    element.empty();
    element.appendChild(previewContainer);
    element.dispatchEvent(new CustomEvent("copy-button-added", { detail: { copyButton }, bubbles: true }));
  }

  private static createContentSection(header: HTMLElement, index: number): Node {
    const settings = this.plugin.settingsManager?.getSettings();
    const headingLevel = settings?.headingLevel || "h1";
    const content: HTMLElement[] = [];
    let current = header.nextElementSibling as HTMLElement | null;
    while (current && current.tagName !== headingLevel.toUpperCase()) {
      content.push(current.cloneNode(true) as HTMLElement);
      current = current.nextElementSibling as HTMLElement | null;
    }

    const pages: HTMLElement[][] = [[]];
    let currentPage = 0;
    content.forEach((el) => {
      if (el.tagName === "HR") {
        currentPage++;
        pages[currentPage] = [];
      } else {
        pages[currentPage].push(el);
      }
    });

    if (pages.length === 1 && !content.some((el) => el.tagName === "HR")) {
      const section = document.createElement("section");
      section.className = "red-content-section";
      section.dataset.index = String(index);
      if (index === 0) section.classList.add("red-cover", settings?.coverStyle || "cover-classic");
      section.appendChild(header.cloneNode(true));
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
      if (index === 0 && pageIndex === 0) section.classList.add("red-cover", settings?.coverStyle || "cover-classic");
      section.appendChild(header.cloneNode(true));
      pageContent.forEach((el) => section.appendChild(el));
      this.processElements(section);
      fragment.appendChild(section);
    });
    return fragment;
  }

  private static processElements(container: HTMLElement): void {
    container.querySelectorAll("strong, em").forEach((el) => el.classList.add("red-emphasis"));
    container.querySelectorAll("a").forEach((el) => el.classList.add("red-link"));
    container.querySelectorAll("table").forEach((el) => el.classList.add("red-table"));
    container.querySelectorAll("hr").forEach((el) => el.classList.add("red-hr"));
    container.querySelectorAll("del").forEach((el) => el.classList.add("red-del"));
    container.querySelectorAll(".task-list-item").forEach((el) => el.classList.add("red-task-list-item"));
    container.querySelectorAll(".footnote-ref, .footnote-backref").forEach((el) => el.classList.add("red-footnote"));
    container.querySelectorAll("pre code").forEach((el) => {
      const pre = el.parentElement;
      if (!pre) return;
      pre.classList.add("red-pre");
      const dots = document.createElement("div");
      dots.className = "red-code-dots";
      ["red", "yellow", "green"].forEach((color) => {
        const dot = document.createElement("span");
        dot.className = `red-code-dot red-code-dot-${color}`;
        dots.appendChild(dot);
      });
      pre.insertBefore(dots, pre.firstChild);
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
