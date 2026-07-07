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
      } catch (error) {
        console.error(`第${i + 1}页导出失败`, error);
      }
    }

    sections.forEach((section, index) => {
      section.classList.toggle("red-section-visible", originalVisibility[index].visible);
      section.classList.toggle("red-section-hidden", originalVisibility[index].hidden);
      section.classList.toggle("red-section-active", originalVisibility[index].active);
    });

    const content = await zip.generateAsync({ type: "blob", compression: "STORE" });
    this.downloadBlob(content, `小红书笔记_${Date.now()}.zip`);
  }

  private static async renderBlob(imageElement: HTMLElement): Promise<Blob> {
    try {
      const blob = await toBlob(imageElement, this.getExportConfig());
      if (blob instanceof Blob) return blob;
      throw new Error("Blob 对象为空");
    } catch (error) {
      console.warn("导出失败，尝试备用方法", error);
      const canvas = await toCanvas(imageElement, this.getExportConfig());
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
