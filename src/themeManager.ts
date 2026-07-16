import type { App } from "obsidian";
import type { YanqiTheme } from "./types";
import type { SettingsManager } from "./settings/settings";

export class ThemeManager {
  currentTheme: YanqiTheme;
  currentFont = "-apple-system";
  currentFontSize = 16;

  constructor(public app: App, private settingsManager: SettingsManager) {}

  setCurrentTheme(id: string): boolean {
    const theme = this.settingsManager.getTheme(id);
    if (!theme) {
      console.error("主题未找到:", id);
      return false;
    }
    this.currentTheme = theme;
    return true;
  }

  setFont(fontFamily: string): void {
    this.currentFont = fontFamily;
  }

  setFontSize(size: number): void {
    this.currentFontSize = size;
  }

  applyTheme(element: HTMLElement, theme?: YanqiTheme): void {
    const targetTheme = theme || this.currentTheme || this.settingsManager.getTheme("default");
    if (!targetTheme) return;
    const styles = targetTheme.styles;
    const imagePreview = element.querySelector<HTMLElement>(".red-image-preview");

    const isDark = this.isThemeDark(targetTheme);
    if (imagePreview) {
      imagePreview.classList.remove("theme-dark", "theme-light");
      imagePreview.classList.add(isDark ? "theme-dark" : "theme-light");
    }

    this.applyInlineStyle(imagePreview, styles.imagePreview);

    const header = element.querySelector<HTMLElement>(".red-preview-header");
    if (header && styles.header) {
      header.querySelectorAll<HTMLElement>(".red-user-avatar").forEach((el) => this.resetAndApplyInlineStyle(el, styles.header.avatar?.container));
      header.querySelectorAll<HTMLElement>(".red-avatar-placeholder").forEach((el) => this.resetAndApplyInlineStyle(el, styles.header.avatar?.placeholder));
      header.querySelectorAll<HTMLElement>(".red-user-avatar img").forEach((el) => this.resetAndApplyInlineStyle(el, styles.header.avatar?.image));
      header.querySelectorAll<HTMLElement>(".red-user-name-container").forEach((el) => this.resetAndApplyInlineStyle(el, styles.header.nameContainer));
      header.querySelectorAll<HTMLElement>(".red-user-name").forEach((el) => this.resetAndApplyInlineStyle(el, styles.header.userName));
      header.querySelectorAll<HTMLElement>(".red-user-id").forEach((el) => this.resetAndApplyInlineStyle(el, styles.header.userId));
      header.querySelectorAll<HTMLElement>(".red-post-time, .red-header-more").forEach((el) => this.resetAndApplyInlineStyle(el, styles.header.postTime));
      header.querySelectorAll<HTMLElement>(".red-verified-icon").forEach((el) => this.resetAndApplyInlineStyle(el, styles.header.verifiedIcon));
    }

    const footer = element.querySelector<HTMLElement>(".red-preview-footer");
    if (footer && styles.footer) {
      this.resetAndApplyInlineStyle(footer, styles.footer.container);
      footer.querySelectorAll<HTMLElement>(".red-footer-text").forEach((el) => this.resetAndApplyInlineStyle(el, styles.footer.text));
      footer.querySelectorAll<HTMLElement>(".red-footer-separator").forEach((el) => this.resetAndApplyInlineStyle(el, styles.footer.separator));
    }

    ["h1", "h2", "h3", "h4", "h5", "h6"].forEach((tag) => {
      element.querySelectorAll<HTMLElement>(tag).forEach((el) => {
        if (!el.querySelector(".content")) {
          const content = createSpan();
          content.className = "content";
          while (el.firstChild) content.appendChild(el.firstChild);
          el.appendChild(content);
          const after = createSpan();
          after.className = "after";
          el.appendChild(after);
        }
        const styleKey: "h1" | "h2" | "h3" | "base" = tag === "h1"
          ? "h1"
          : tag === "h2"
            ? "h2"
            : tag === "h3"
              ? "h3"
              : "base";
        const titleStyle = styles.title?.[styleKey] || (tag === "h1" ? styles.title?.h2 : undefined) || styles.title?.base;
        this.applyInlineStyle(el, `${titleStyle?.base || ""}; font-family: ${this.currentFont};`);
        this.applyInlineStyle(el.querySelector<HTMLElement>(".content"), titleStyle?.content);
        this.applyInlineStyle(el.querySelector<HTMLElement>(".after"), titleStyle?.after);
      });
    });

    element.querySelectorAll<HTMLElement>("p").forEach((el) => {
      if (!el.parentElement?.closest("p") && !el.parentElement?.closest("blockquote") && !el.parentElement?.closest(".callout")) {
        this.applyInlineStyle(el, `${styles.paragraph}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`);
      }
    });
    element.querySelectorAll<HTMLElement>("ul, ol").forEach((el) => this.applyInlineStyle(el, styles.list?.container));
    element.querySelectorAll<HTMLElement>("li").forEach((el) => this.applyInlineStyle(el, `${styles.list?.item || ""}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`));
    element.querySelectorAll<HTMLElement>(".task-list-item").forEach((el) => this.applyInlineStyle(el, `${styles.list?.taskList || ""}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`));
    element.querySelectorAll<HTMLElement>("blockquote").forEach((el) => this.applyInlineStyle(el, `${styles.quote}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`));
    element.querySelectorAll<HTMLElement>("pre").forEach((el) => {
      this.applyInlineStyle(el, `${styles.code?.block || ""}; font-size: ${this.currentFontSize}px;`);
      this.hardenCodeContrast(el);
    });
    element.querySelectorAll<HTMLElement>("code:not(pre code)").forEach((el) => {
      this.applyInlineStyle(el, `${styles.code?.inline || ""}; font-size: ${this.currentFontSize}px;`);
      const color = this.getReadableCodeColor(getComputedStyle(el).backgroundColor, getComputedStyle(el).color);
      el.setCssProps({ color });
    });
    element.querySelectorAll<HTMLElement>("a").forEach((el) => this.applyInlineStyle(el, styles.link));
    element.querySelectorAll<HTMLElement>("strong").forEach((el) => this.applyInlineStyle(el, styles.emphasis?.strong));
    element.querySelectorAll<HTMLElement>("em").forEach((el) => this.applyInlineStyle(el, styles.emphasis?.em));
    element.querySelectorAll<HTMLElement>("del").forEach((el) => this.applyInlineStyle(el, styles.emphasis?.del));
    element.querySelectorAll<HTMLElement>("mark").forEach((el) => this.applyInlineStyle(el, styles.highlight || "background-color: #fff3a0; color: #1f1f1f; padding: 0.05em 0.22em; border-radius: 4px;"));
    element.querySelectorAll<HTMLElement>("table").forEach((el) => this.applyInlineStyle(el, styles.table?.container));
    element.querySelectorAll<HTMLElement>("th").forEach((el) => this.applyInlineStyle(el, `${styles.table?.header || ""}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`));
    element.querySelectorAll<HTMLElement>("td").forEach((el) => this.applyInlineStyle(el, `${styles.table?.cell || ""}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`));
    element.querySelectorAll<HTMLElement>("hr").forEach((el) => this.applyInlineStyle(el, styles.hr));
    element.querySelectorAll<HTMLElement>(".red-content-section.red-cover").forEach((el) => {
      el.style.fontSize = `${this.currentFontSize}px`;
    });
    element.querySelectorAll<HTMLElement>(".footnote-ref").forEach((el) => this.applyInlineStyle(el, styles.footnote?.ref));
    element.querySelectorAll<HTMLElement>(".footnote-backref").forEach((el) => this.applyInlineStyle(el, styles.footnote?.backref));
    element.querySelectorAll<HTMLElement>("img").forEach((el) => {
      this.applyInlineStyle(el, styles.image);
      if (el.parentElement?.tagName.toLowerCase() === "p" && el.parentElement.childNodes.length === 1) {
        el.parentElement.classList.add("red-image-container");
      }
    });
    element.querySelectorAll<HTMLElement>(".red-mermaid, .mermaid").forEach((el) => this.hardenMermaidContrast(el));
  }

  private applyInlineStyle(el: HTMLElement | null, style?: string): void {
    if (!el || !style) return;
    this.getInlineDeclarations(style).forEach((property) => {
      const [key, ...rest] = property.split(":");
      const value = rest.join(":").trim();
      const propertyName = key?.trim();
      if (propertyName && value && this.isInlinePropertyName(propertyName)) {
        el.style.setProperty(propertyName, value);
      }
    });
  }

  private resetAndApplyInlineStyle(el: HTMLElement | null, style?: string): void {
    if (!el) return;
    el.removeAttribute("style");
    this.applyInlineStyle(el, style);
  }

  private getInlineDeclarations(style: string): string[] {
    const declarations: string[] = [];
    let current = "";
    let blockDepth = 0;

    for (const char of style) {
      if (char === "{") {
        current = "";
        blockDepth += 1;
        continue;
      }
      if (char === "}") {
        blockDepth = Math.max(0, blockDepth - 1);
        current = "";
        continue;
      }
      if (blockDepth > 0) continue;
      if (char === ";") {
        const declaration = current.trim();
        if (declaration) declarations.push(declaration);
        current = "";
        continue;
      }
      current += char;
    }

    const declaration = current.trim();
    if (declaration) declarations.push(declaration);
    return declarations;
  }

  private isInlinePropertyName(propertyName: string): boolean {
    return /^--[\w-]+$/.test(propertyName) || /^-?[a-zA-Z][\w-]*$/.test(propertyName);
  }

  private parseCssColor(color?: string): number[] | null {
    if (!color) return null;
    const input = color.trim();
    const hex = input.match(/^#([0-9a-fA-F]{3,8})$/)?.[1];
    if (hex) {
      if (hex.length === 3 || hex.length === 4) {
        return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
      }
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }
    const rgb = input.match(/^rgba?\(([^)]+)\)$/);
    if (!rgb) return null;
    const parts = rgb[1].split(",").map((part) => part.trim());
    if (parts.length >= 4 && Number(parts[3]) < 0.1) return null;
    return parts.slice(0, 3).map((part) => part.endsWith("%") ? Math.round(parseFloat(part) * 2.55) : Math.round(parseFloat(part)));
  }

  private luminance(rgb: number[]): number {
    const [r, g, b] = rgb.map((value) => {
      const channel = Math.max(0, Math.min(255, value)) / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private contrast(a: number[], b: number[]): number {
    const light = Math.max(this.luminance(a), this.luminance(b));
    const dark = Math.min(this.luminance(a), this.luminance(b));
    return (light + 0.05) / (dark + 0.05);
  }

  private isThemeDark(theme: YanqiTheme): boolean {
    const bgStyle = theme.styles.imagePreview;
    if (!bgStyle) return true;

    // Matches 3, 6, or 8 digit hex colors
    const hexMatch = bgStyle.match(/#([0-9a-fA-F]{3,8})/);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      } else if (hex.length === 8) {
        hex = hex.substring(0, 6);
      }
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
      }
    }

    // Matches rgb or rgba colors
    const rgbMatch = bgStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
      }
    }

    const lower = bgStyle.toLowerCase();
    if (lower.includes("white") || lower.includes("#fff") || lower.includes("255,255,255")) {
      return false;
    }
    return true;
  }

  private getReadableCodeColor(backgroundColor: string, currentColor: string): string {
    const background = this.parseCssColor(backgroundColor);
    const current = this.parseCssColor(currentColor);
    if (!background) return currentColor || "#111827";
    if (current && this.contrast(background, current) >= 4.5) return currentColor;
    const light = [248, 250, 252];
    const dark = [17, 24, 39];
    return this.contrast(background, light) >= this.contrast(background, dark) ? "#f8fafc" : "#111827";
  }

  private hardenCodeContrast(pre: HTMLElement): void {
    const computed = getComputedStyle(pre);
    const color = this.getReadableCodeColor(computed.backgroundColor, computed.color);
    pre.addClass("red-code-contrast");
    pre.setCssProps({ "--red-code-contrast-color": color });
  }

  private hardenMermaidContrast(container: HTMLElement): void {
    const textColor = "#1f2937";
    const edgeColor = "#475569";
    const nodeFill = "#eef2ff";
    const nodeStroke = "#8b5cf6";
    const labelBackground = "#f8fafc";

    container.addClass("red-mermaid-hardened");
    container.setCssProps({
      "--red-mermaid-text": textColor,
      "--red-mermaid-edge": edgeColor,
      "--red-mermaid-node-fill": nodeFill,
      "--red-mermaid-node-stroke": nodeStroke,
      "--red-mermaid-label-background": labelBackground
    });

    container.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
      el.setAttribute("fill", textColor);
    });

    container.querySelectorAll<SVGElement>(".edgePath path, .flowchart-link, marker path").forEach((el) => {
      el.setAttribute("stroke", edgeColor);
      if (el.tagName.toLowerCase() === "path" && el.closest("marker")) {
        el.setAttribute("fill", edgeColor);
      }
    });

    container.querySelectorAll<SVGElement>(".node rect, .node circle, .node ellipse, .node polygon").forEach((el) => {
      el.setAttribute("fill", nodeFill);
      el.setAttribute("stroke", nodeStroke);
    });

    container.querySelectorAll<SVGElement>(".edgeLabel rect, .labelBkg, .label-container").forEach((el) => {
      el.setAttribute("fill", labelBackground);
    });
  }
}
