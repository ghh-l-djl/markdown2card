import { toBlob, toCanvas } from "html-to-image";
import { EXPORT_PIXEL_RATIO, EXPORT_SETTLE_MS } from "./downloadManager";

export class ClipboardManager {
  static getExportConfig() {
    return {
      quality: 1,
      pixelRatio: EXPORT_PIXEL_RATIO,
      skipFonts: false,
      filter: () => true,
      imagePlaceholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    };
  }

  static async copyImageToClipboard(element: HTMLElement): Promise<boolean> {
    try {
      const imageElement = element.querySelector<HTMLElement>(".red-image-preview");
      if (!imageElement) throw new Error("找不到预览区域");
      await new Promise((resolve) => setTimeout(resolve, EXPORT_SETTLE_MS));
      let blob = await toBlob(imageElement, this.getExportConfig());
      if (!(blob instanceof Blob)) {
        const canvas = await toCanvas(imageElement, this.getExportConfig());
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Canvas 转换为 Blob 失败")), "image/png", 1);
        });
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return true;
    } catch (error) {
      console.error("复制图片失败:", error);
      return false;
    }
  }
}
