import { zipSync, type Zippable } from "fflate";
import { toBlob, toCanvas } from "html-to-image";
import { isExportableNode } from "./imageLayout";

export const EXPORT_PIXEL_RATIO = 3;
export const EXPORT_SETTLE_MS = 80;

export interface ExportedImage {
  filename: string;
  blob: Blob;
}

export class DownloadManager {
  static getExportConfig() {
    return {
      quality: 1,
      pixelRatio: EXPORT_PIXEL_RATIO,
      skipFonts: false,
      filter: isExportableNode,
      imagePlaceholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    };
  }

  static async downloadSingleImage(element: HTMLElement): Promise<void> {
    const images = await this.renderCurrentPageImages(element, "小红书笔记");
    images.forEach((image) => this.downloadBlob(image.blob, image.filename));
  }

  static async downloadAllImages(element: HTMLElement): Promise<void> {
    const baseName = `小红书笔记_${Date.now()}`;
    const content = await this.renderAllImagesZip(element, baseName);
    this.downloadBlob(content, `${baseName}.zip`);
  }

  static async renderCurrentPageImages(element: HTMLElement, baseName: string): Promise<ExportedImage[]> {
    const imageElement = this.getImageElement(element);
    if (!imageElement) throw new Error("找不到预览区域");
    await new Promise((resolve) => window.setTimeout(resolve, EXPORT_SETTLE_MS));
    const images: ExportedImage[] = [{ filename: `${baseName}.png`, blob: await this.renderBlob(imageElement) }];
    const mermaidBlobs = await this.renderOversizedMermaidBlobs(imageElement);
    mermaidBlobs.forEach((mermaid, index) => {
      images.push({ filename: `${baseName}_第${index + 2}页.png`, blob: mermaid.blob });
    });
    return images;
  }

  static async renderAllPageImages(element: HTMLElement, baseName: string): Promise<ExportedImage[]> {
    const images: ExportedImage[] = [];
    const previewContainer = this.getPreviewContainer(element);
    if (!previewContainer) throw new Error("找不到预览容器");
    const sections = Array.from(previewContainer.querySelectorAll<HTMLElement>(".red-content-section"));
    const originalVisibility = sections.map((section) => ({
      visible: section.classList.contains("red-section-visible"),
      hidden: section.classList.contains("red-section-hidden"),
      active: section.classList.contains("red-section-active")
    }));
    const appendedMermaidBlobs: Blob[] = [];

    try {
      for (let i = 0; i < sections.length; i++) {
        sections.forEach((section) => {
          section.classList.add("red-section-hidden");
          section.classList.remove("red-section-visible", "red-section-active");
        });
        sections[i].classList.remove("red-section-hidden");
        sections[i].classList.add("red-section-visible", "red-section-active");
        await new Promise((resolve) => window.setTimeout(resolve, EXPORT_SETTLE_MS));
        const imageElement = this.getImageElement(element);
        if (!imageElement) continue;
        try {
          images.push({ filename: `${baseName}_第${i + 1}页.png`, blob: await this.renderBlob(imageElement) });
          const mermaidBlobs = await this.renderOversizedMermaidBlobs(imageElement);
          mermaidBlobs.forEach((mermaid) => {
            appendedMermaidBlobs.push(mermaid.blob);
          });
        } catch (error) {
          console.error(`第${i + 1}页导出失败`, error);
        }
      }
    } finally {
      sections.forEach((section, index) => {
        section.classList.toggle("red-section-visible", originalVisibility[index].visible);
        section.classList.toggle("red-section-hidden", originalVisibility[index].hidden);
        section.classList.toggle("red-section-active", originalVisibility[index].active);
      });
    }

    appendedMermaidBlobs.forEach((blob, index) => {
      images.push({ filename: `${baseName}_第${sections.length + index + 1}页.png`, blob });
    });
    return images;
  }

  static async renderAllImagesZip(element: HTMLElement, baseName: string): Promise<Blob> {
    return this.renderImagesZip(await this.renderAllPageImages(element, baseName));
  }

  static async renderCurrentImagesZip(element: HTMLElement, baseName: string): Promise<Blob> {
    return this.renderImagesZip(await this.renderCurrentPageImages(element, baseName));
  }

  private static async renderImagesZip(images: ExportedImage[]): Promise<Blob> {
    const files: Zippable = {};
    for (const image of images) {
      files[image.filename] = new Uint8Array(await image.blob.arrayBuffer());
    }
    const archive = zipSync(files, { level: 0 });
    return new Blob([archive], { type: "application/zip" });
  }

  private static getPreviewContainer(element: HTMLElement): HTMLElement | null {
    return element.matches(".red-preview-container") ? element : element.querySelector<HTMLElement>(".red-preview-container");
  }

  private static getImageElement(element: HTMLElement): HTMLElement | null {
    return element.matches(".red-image-preview") ? element : element.querySelector<HTMLElement>(".red-image-preview");
  }

  private static async renderBlob(imageElement: HTMLElement): Promise<Blob> {
    return this.renderBlobWithConfig(imageElement);
  }

  private static async renderOversizedMermaidBlobs(imageElement: HTMLElement): Promise<Array<{ blob: Blob }>> {
    const blocks = this.findActiveOversizedMermaidBlocks(imageElement);
    const results: Array<{ blob: Blob }> = [];

    for (const block of blocks) {
      const exportNode = this.createOriginalSizeMermaidExportNode(block);
      if (!exportNode) continue;
      document.body.appendChild(exportNode.wrapper);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      try {
        results.push({ blob: await this.renderBlobWithConfig(exportNode.target, {
          width: exportNode.width,
          height: exportNode.height
        }) });
      } catch (error) {
        console.error("Mermaid 原比例导出失败", error);
      } finally {
        exportNode.wrapper.remove();
      }
    }

    return results;
  }

  private static findActiveOversizedMermaidBlocks(imageElement: HTMLElement): HTMLElement[] {
    const activeSections = Array.from(imageElement.querySelectorAll<HTMLElement>(
      ".red-content-section.red-section-active, .red-content-section.red-section-visible"
    )).filter((section) => !section.classList.contains("red-section-hidden"));
    const scopes = activeSections.length ? activeSections : [imageElement];
    const seen = new Set<HTMLElement>();
    const blocks: HTMLElement[] = [];

    scopes.forEach((scope) => {
      scope.querySelectorAll<HTMLElement>(".red-mermaid.red-mermaid-scaled, .mermaid.red-mermaid-scaled").forEach((block) => {
        if (seen.has(block)) return;
        seen.add(block);
        blocks.push(block);
      });
    });

    return blocks;
  }

  private static createOriginalSizeMermaidExportNode(block: HTMLElement): {
    wrapper: HTMLElement;
    target: HTMLElement;
    width: number;
    height: number;
  } | null {
    const sourceSvg = block.querySelector<SVGSVGElement>("svg");
    if (!sourceSvg) return null;
    const sourceSize = this.getMermaidOriginalSize(block, sourceSvg);
    if (!sourceSize) return null;

    const wrapper = createDiv();
    wrapper.className = "red-content-section red-mermaid-export-root";

    const clone = block.cloneNode(true) as HTMLElement;
    const cloneSvg = clone.querySelector<SVGSVGElement>("svg");
    if (!cloneSvg) return null;

    clone.classList.remove("red-mermaid-scaled");
    clone.classList.add("red-mermaid-export-clone");
    clone.style.removeProperty("--red-mermaid-scale");
    clone.style.removeProperty("--red-mermaid-width");
    clone.style.removeProperty("--red-mermaid-height");
    clone.style.width = `${sourceSize.width + 30}px`;

    cloneSvg.classList.add("red-mermaid-export-svg");
    cloneSvg.style.width = `${sourceSize.width}px`;
    cloneSvg.style.height = `${sourceSize.height}px`;
    if (!cloneSvg.getAttribute("viewBox")) cloneSvg.setAttribute("viewBox", `0 0 ${sourceSize.width} ${sourceSize.height}`);

    wrapper.appendChild(clone);
    return {
      wrapper,
      target: clone,
      width: sourceSize.width + 30,
      height: sourceSize.height + 30
    };
  }

  private static getMermaidOriginalSize(block: HTMLElement, svg: SVGSVGElement): { width: number; height: number } | null {
    const width = Number(block.dataset.redMermaidOriginalWidth) || svg.viewBox.baseVal.width || svg.getBoundingClientRect().width;
    const height = Number(block.dataset.redMermaidOriginalHeight) || svg.viewBox.baseVal.height || svg.getBoundingClientRect().height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }

  private static async renderBlobWithConfig(imageElement: HTMLElement, dimensions?: { width: number; height: number }): Promise<Blob> {
    const config = {
      ...this.getExportConfig(),
      ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {})
    };
    try {
      const blob = await toBlob(imageElement, config);
      if (blob instanceof Blob) return blob;
      throw new Error("Blob 对象为空");
    } catch (error) {
      console.warn("导出失败，尝试备用方法", error);
      const canvas = await toCanvas(imageElement, config);
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas 转换为 Blob 失败")), "image/png", 1);
      });
    }
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = createEl("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
