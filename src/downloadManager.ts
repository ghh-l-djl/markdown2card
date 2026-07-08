import JSZip from "jszip";
import { toBlob, toCanvas } from "html-to-image";

export const EXPORT_PIXEL_RATIO = 3;
export const EXPORT_SETTLE_MS = 80;

export class DownloadManager {
  static getExportConfig() {
    return {
      quality: 1,
      pixelRatio: EXPORT_PIXEL_RATIO,
      skipFonts: false,
      filter: () => true,
      imagePlaceholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    };
  }

  static async downloadSingleImage(element: HTMLElement): Promise<void> {
    const imageElement = element.querySelector<HTMLElement>(".red-image-preview");
    if (!imageElement) throw new Error("找不到预览区域");
    await new Promise((resolve) => setTimeout(resolve, EXPORT_SETTLE_MS));
    const blob = await this.renderBlob(imageElement);
    this.downloadBlob(blob, `小红书笔记_${Date.now()}.png`);
    const mermaidBlobs = await this.renderOversizedMermaidBlobs(imageElement);
    mermaidBlobs.forEach((mermaid, index) => {
      this.downloadBlob(mermaid.blob, `小红书笔记_第${index + 2}页.png`);
    });
  }

  static async downloadAllImages(element: HTMLElement): Promise<void> {
    const zip = new JSZip();
    const previewContainer = element.querySelector<HTMLElement>(".red-preview-container");
    if (!previewContainer) throw new Error("找不到预览容器");
    const sections = Array.from(previewContainer.querySelectorAll<HTMLElement>(".red-content-section"));
    const originalVisibility = sections.map((section) => ({
      visible: section.classList.contains("red-section-visible"),
      hidden: section.classList.contains("red-section-hidden"),
      active: section.classList.contains("red-section-active")
    }));
    const appendedMermaidBlobs: Blob[] = [];

    for (let i = 0; i < sections.length; i++) {
      sections.forEach((section) => {
        section.classList.add("red-section-hidden");
        section.classList.remove("red-section-visible", "red-section-active");
      });
      sections[i].classList.remove("red-section-hidden");
      sections[i].classList.add("red-section-visible", "red-section-active");
      await new Promise((resolve) => setTimeout(resolve, EXPORT_SETTLE_MS));
      const imageElement = element.querySelector<HTMLElement>(".red-image-preview");
      if (!imageElement) continue;
      try {
        zip.file(`小红书笔记_第${i + 1}页.png`, await this.renderBlob(imageElement));
        const mermaidBlobs = await this.renderOversizedMermaidBlobs(imageElement);
        mermaidBlobs.forEach((mermaid) => {
          appendedMermaidBlobs.push(mermaid.blob);
        });
      } catch (error) {
        console.error(`第${i + 1}页导出失败`, error);
      }
    }

    appendedMermaidBlobs.forEach((blob, index) => {
      zip.file(`小红书笔记_第${sections.length + index + 1}页.png`, blob);
    });

    sections.forEach((section, index) => {
      section.classList.toggle("red-section-visible", originalVisibility[index].visible);
      section.classList.toggle("red-section-hidden", originalVisibility[index].hidden);
      section.classList.toggle("red-section-active", originalVisibility[index].active);
    });

    const content = await zip.generateAsync({ type: "blob", compression: "STORE" });
    this.downloadBlob(content, `小红书笔记_${Date.now()}.zip`);
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

    const wrapper = document.createElement("div");
    wrapper.className = "red-content-section red-mermaid-export-root";
    wrapper.style.position = "fixed";
    wrapper.style.left = "-100000px";
    wrapper.style.top = "0";
    wrapper.style.visibility = "visible";
    wrapper.style.pointerEvents = "none";
    wrapper.style.zIndex = "-1";

    const clone = block.cloneNode(true) as HTMLElement;
    const cloneSvg = clone.querySelector<SVGSVGElement>("svg");
    if (!cloneSvg) return null;

    clone.classList.remove("red-mermaid-scaled");
    clone.style.removeProperty("--red-mermaid-scale");
    clone.style.removeProperty("--red-mermaid-width");
    clone.style.removeProperty("--red-mermaid-height");
    clone.style.width = `${sourceSize.width + 30}px`;
    clone.style.maxWidth = "none";
    clone.style.display = "block";

    cloneSvg.style.width = `${sourceSize.width}px`;
    cloneSvg.style.height = `${sourceSize.height}px`;
    cloneSvg.style.maxWidth = "none";
    cloneSvg.style.display = "block";
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
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
