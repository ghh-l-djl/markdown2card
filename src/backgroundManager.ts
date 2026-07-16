import { App, Modal, Setting } from "obsidian";
import type { BackgroundSettings } from "./types";
import { builtinBackgrounds } from "./assets/backgrounds";

export class BackgroundManager {
  applyBackgroundStyles(element: HTMLElement, settings: BackgroundSettings): void {
    element.addClass("red-custom-background");
    element.style.backgroundImage = `url(${settings.imageUrl})`;
    element.style.backgroundSize = `${settings.scale * 100}%`;
    element.style.backgroundPosition = `${settings.position.x}px ${settings.position.y}px`;
  }

  clearBackgroundStyles(element: HTMLElement): void {
    element.removeClass("red-custom-background");
    ["background-image", "background-size", "background-position"].forEach((property) => {
      element.style.removeProperty(property);
    });
  }
}

export class BackgroundSettingModal extends Modal {
  private imageUrl = "";
  private scale = 1;
  private position = { x: 0, y: 0 };
  private previewImage: HTMLElement | null = null;
  private cleanup: (() => void) | null = null;

  constructor(
    app: App,
    private onSubmit: (settings: BackgroundSettings) => void | Promise<void>,
    private targetPreviewEl: HTMLElement,
    private backgroundManager: BackgroundManager,
    private initialSettings: BackgroundSettings
  ) {
    super(app);
    if (initialSettings) {
      this.imageUrl = initialSettings.imageUrl;
      this.scale = initialSettings.scale;
      this.position = { ...initialSettings.position };
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    const container = contentEl.createDiv({ cls: "red-background-container" });
    container.createEl("h3", { text: "背景图片", cls: "red-background-title" });
    const builtins = container.createDiv({ cls: "red-background-builtins" });
    builtinBackgrounds.forEach((src) => {
      const thumb = builtins.createEl("img", { cls: "red-bg-thumb", attr: { src } });
      if (src === this.imageUrl) thumb.addClass("selected");
      thumb.addEventListener("click", () => {
        builtins.querySelectorAll(".red-bg-thumb").forEach((el) => el.removeClass("selected"));
        thumb.addClass("selected");
        this.imageUrl = src;
        this.scale = 1;
        this.position = { x: 0, y: 0 };
        this.applyPreview();
        this.initDrag();
      });
    });
    const previewArea = container.createDiv({ cls: "red-background-preview" });
    this.previewImage = previewArea.createDiv({ cls: "red-background-preview-image" });
    if (this.imageUrl) {
      this.backgroundManager.applyBackgroundStyles(this.previewImage, this.getSettings());
      this.initDrag();
    }
    const controls = container.createDiv({ cls: "red-background-controls" });
    new Setting(controls)
      .addButton((button) => button.setButtonText("选择图片").onClick(() => this.handleImageUpload()))
      .addButton((button) => button.setButtonText("清除图片").onClick(() => this.handleClearImage()));
    new Setting(controls).setName("缩放").addSlider((slider) => {
      slider.setLimits(0.1, 2, 0.01).setValue(this.scale).onChange((value) => {
        this.scale = value;
        this.applyPreview();
      });
    });
    new Setting(controls)
      .addButton((button) => button.setButtonText("确认").setCta().onClick(async () => {
        await this.onSubmit(this.getSettings());
        this.close();
      }))
      .addButton((button) => button.setButtonText("取消").onClick(() => this.close()));
  }

  private getSettings(): BackgroundSettings {
    return { imageUrl: this.imageUrl, scale: this.scale, position: this.position };
  }

  private handleImageUpload(): void {
    const input = createEl("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        this.imageUrl = typeof result === "string" ? result : "";
        this.scale = 1;
        this.position = { x: 0, y: 0 };
        this.applyPreview();
        this.initDrag();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  private handleClearImage(): void {
    this.imageUrl = "";
    this.scale = 1;
    this.position = { x: 0, y: 0 };
    if (this.previewImage) this.backgroundManager.clearBackgroundStyles(this.previewImage);
    const target = this.targetPreviewEl.querySelector<HTMLElement>(".red-image-preview");
    if (target) this.backgroundManager.clearBackgroundStyles(target);
    void this.onSubmit(this.getSettings());
  }

  private applyPreview(): void {
    if (this.previewImage && this.imageUrl) {
      this.backgroundManager.applyBackgroundStyles(this.previewImage, this.getSettings());
    }
    const target = this.targetPreviewEl.querySelector<HTMLElement>(".red-image-preview");
    if (target && this.imageUrl) {
      this.backgroundManager.applyBackgroundStyles(target, this.getSettings());
    }
  }

  private initDrag(): void {
    if (!this.previewImage || this.cleanup) return;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    const down = (event: MouseEvent) => {
      dragging = true;
      startX = event.clientX - this.position.x;
      startY = event.clientY - this.position.y;
      this.previewImage?.addClass("dragging");
    };
    const move = (event: MouseEvent) => {
      if (!dragging) return;
      this.position.x = event.clientX - startX;
      this.position.y = event.clientY - startY;
      this.applyPreview();
    };
    const up = () => {
      dragging = false;
      this.previewImage?.removeClass("dragging");
    };
    this.previewImage.addEventListener("mousedown", down);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    this.cleanup = () => {
      this.previewImage?.removeEventListener("mousedown", down);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }

  onClose(): void {
    this.cleanup?.();
    this.cleanup = null;
    this.contentEl.empty();
  }
}
