import { ItemView, MarkdownRenderer, MarkdownView, Modal, Notice, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import { BackgroundManager, BackgroundSettingModal } from "./backgroundManager";
import { ClipboardManager } from "./clipboardManager";
import { RedConverter } from "./converter";
import { DownloadManager } from "./downloadManager";
import { ImgTemplateManager } from "./imgTemplates";
import { MARKDOWN2CARD_ICON } from "./icons";
import type { SettingsManager } from "./settings/settings";
import type { ThemeManager } from "./themeManager";

export const VIEW_TYPE_RED = "note-to-red";

type CustomSelectOption = { value: string; label: string };

export class RedView extends ItemView {
  currentFile: TFile | null = null;
  updateTimer: number | null = null;
  isPreviewLocked = false;
  currentImageIndex = 0;
  previewEl: HTMLElement;
  copyButton: HTMLButtonElement;
  lockButton: HTMLButtonElement;
  footerToggleButton: HTMLButtonElement;
  fontSizeSelect: HTMLInputElement;
  navigationButtons: { prev: HTMLButtonElement; next: HTMLButtonElement; indicator: HTMLElement };
  customTemplateSelect: HTMLElement;
  customThemeSelect: HTMLElement;
  customCoverSelect: HTMLElement;
  customFontSelect: HTMLElement;
  imgTemplateManager: ImgTemplateManager;
  backgroundManager = new BackgroundManager();
  private syncInitialized = false;

  constructor(leaf: WorkspaceLeaf, private themeManager: ThemeManager, private settingsManager: SettingsManager) {
    super(leaf);
    this.imgTemplateManager = new ImgTemplateManager(settingsManager, this.updatePreview.bind(this), themeManager);
  }

  getViewType(): string { return VIEW_TYPE_RED; }
  getDisplayText(): string { return "markdown2card"; }
  getIcon(): string { return MARKDOWN2CARD_ICON; }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.className = "red-view-content";
    await this.initializeToolbar(container);
    this.initializePreviewArea(container);
    this.initializeBottomBar(container);
    this.initializeEventListeners();
    await this.onFileOpen(this.app.workspace.getActiveFile());
  }

  async initializeToolbar(container: HTMLElement): Promise<void> {
    const toolbar = container.createEl("div", { cls: "red-toolbar" });
    const controls = toolbar.createEl("div", { cls: "red-controls-group" });
    this.initializeLockButton(controls);
    this.customTemplateSelect = this.createCustomSelect(controls, "red-template-select", this.getTemplateOptions());
    this.customTemplateSelect.id = "template-select";
    this.onSelectChange(this.customTemplateSelect, async (value) => {
      this.imgTemplateManager.setCurrentTemplate(value);
      await this.settingsManager.updateSettings({ templateId: value });
      await this.updatePreview();
    });
    this.customThemeSelect = this.createCustomSelect(controls, "red-theme-select", this.getThemeOptions());
    this.customThemeSelect.id = "theme-select";
    this.onSelectChange(this.customThemeSelect, async (value) => {
      this.themeManager.setCurrentTheme(value);
      await this.settingsManager.updateSettings({ themeId: value });
      this.themeManager.applyTheme(this.previewEl);
      await this.restoreThemeSettings(value);
    });
    this.customCoverSelect = this.createCustomSelect(controls, "red-cover-select", this.getCoverOptions());
    this.customCoverSelect.id = "cover-select";
    this.onSelectChange(this.customCoverSelect, async (value) => {
      await this.settingsManager.updateSettings({ coverStyle: value });
      await this.updatePreview();
    });
    this.customFontSelect = this.createCustomSelect(controls, "red-font-select", this.getFontOptions());
    this.customFontSelect.id = "font-select";
    this.onSelectChange(this.customFontSelect, async (value) => {
      this.themeManager.setFont(value);
      await this.settingsManager.updateSettings({ fontFamily: value });
      this.themeManager.applyTheme(this.previewEl);
    });
    this.initializeFontSizeControls(controls);
    this.initializeThemeStrip(toolbar);
    await this.restoreSettings();
  }

  initializeLockButton(parent: HTMLElement): void {
    this.lockButton = parent.createEl("button", { cls: "red-lock-button", attr: { "aria-label": "关闭实时预览状态" } });
    setIcon(this.lockButton, "lock");
    this.lockButton.addEventListener("click", () => this.togglePreviewLock());
  }

  initializeFontSizeControls(parent: HTMLElement): void {
    const group = parent.createEl("div", { cls: "red-font-size-group" });
    const dec = group.createEl("button", { cls: "red-font-size-btn", text: "-" });
    this.fontSizeSelect = group.createEl("input", { cls: "red-font-size-input", type: "text", value: "16" });
    const inc = group.createEl("button", { cls: "red-font-size-btn", text: "+" });
    const update = async () => {
      const size = Number.parseFloat(this.fontSizeSelect.value);
      if (!Number.isFinite(size)) return;
      this.themeManager.setFontSize(size);
      await this.settingsManager.updateSettings({ fontSize: size });
      this.themeManager.applyTheme(this.previewEl);
    };
    dec.addEventListener("click", () => {
      const current = Number.parseFloat(this.fontSizeSelect.value);
      if (current > 12) {
        this.fontSizeSelect.value = String(current - 0.5);
        update();
      }
    });
    inc.addEventListener("click", () => {
      const current = Number.parseFloat(this.fontSizeSelect.value);
      if (current < 30) {
        this.fontSizeSelect.value = String(current + 0.5);
        update();
      }
    });
    this.fontSizeSelect.addEventListener("change", update);
  }

  initializeThemeStrip(parent: HTMLElement): void {
    const themes = this.settingsManager.getVisibleThemes();
    if (!themes.length) return;
    const strip = parent.createEl("div", { cls: "red-theme-strip" });
    const active = this.settingsManager.getSettings().themeId;
    themes.forEach((theme) => {
      const chip = strip.createEl("div", { cls: "red-theme-chip", attr: { title: theme.name } });
      if (theme.id === active) chip.addClass("red-theme-chip-active");
      const swatch = chip.createEl("div", { cls: "red-theme-chip-swatch" });
      swatch.style.background = this.pickColor(theme.styles.imagePreview, "#ffffff");
      swatch.createEl("div", { cls: "red-theme-chip-bar" }).style.background = this.pickColor(theme.styles.title?.h2?.content, "#222222");
      swatch.createEl("div", { cls: "red-theme-chip-dot" }).style.background = this.pickColor(theme.styles.emphasis?.strong, "#888888");
      chip.createEl("div", { cls: "red-theme-chip-name", text: theme.name });
      chip.addEventListener("click", async () => {
        strip.querySelectorAll(".red-theme-chip").forEach((el) => el.removeClass("red-theme-chip-active"));
        chip.addClass("red-theme-chip-active");
        this.themeManager.setCurrentTheme(theme.id);
        await this.settingsManager.updateSettings({ themeId: theme.id });
        this.themeManager.applyTheme(this.previewEl);
        await this.restoreThemeSettings(theme.id);
      });
    });
  }

  initializePreviewArea(container: HTMLElement): void {
    const wrapper = container.createEl("div", { cls: "red-preview-wrapper" });
    this.previewEl = wrapper.createEl("div", { cls: "red-preview-container" });
    const nav = wrapper.createEl("div", { cls: "red-nav-container" });
    const prev = nav.createEl("button", { cls: "red-nav-button", text: "←" });
    const indicator = nav.createEl("span", { cls: "red-page-indicator", text: "1/1" });
    const next = nav.createEl("button", { cls: "red-nav-button", text: "→" });
    this.navigationButtons = { prev, next, indicator };
    prev.addEventListener("click", () => this.navigateImages("prev"));
    next.addEventListener("click", () => this.navigateImages("next"));
  }

  initializeBottomBar(container: HTMLElement): void {
    const bottom = container.createEl("div", { cls: "red-bottom-bar" });
    const controls = bottom.createEl("div", { cls: "red-controls-group" });
    this.initializeHelpButton(controls);
    this.initializeBackgroundButton(controls);
    this.initializeFooterToggleButton(controls);
    controls.createEl("button", { cls: "red-overview-button", text: "全览" }).addEventListener("click", () => this.openOverviewModal());
    this.initializeExportButtons(controls);
  }

  initializeHelpButton(parent: HTMLElement): void {
    const help = parent.createEl("button", { cls: "red-help-button", attr: { "aria-label": "使用指南" } });
    setIcon(help, "help");
    parent.createEl("div", {
      cls: "red-help-tooltip",
      text: "使用指南：\n1. 内容会按卡片高度自动分页，避免长内容被截断\n2. 使用 --- 可手动强制换页\n3. 模板=骨架，主题=配色，封面=首页第1页排版\n4. 点头像/昵称/页脚文字可直接修改"
    });
  }

  initializeBackgroundButton(parent: HTMLElement): void {
    const button = parent.createEl("button", { cls: "red-background-button", attr: { "aria-label": "设置背景图片" } });
    setIcon(button, "image");
    button.addEventListener("click", () => {
      new BackgroundSettingModal(this.app, async (backgroundSettings) => {
        await this.settingsManager.updateSettings({ backgroundSettings });
        const imagePreview = this.previewEl.querySelector<HTMLElement>(".red-image-preview");
        if (imagePreview) this.backgroundManager.applyBackgroundStyles(imagePreview, backgroundSettings);
      }, this.previewEl, this.backgroundManager, this.settingsManager.getSettings().backgroundSettings).open();
    });
  }

  initializeFooterToggleButton(parent: HTMLElement): void {
    this.footerToggleButton = parent.createEl("button", { cls: "red-footer-toggle-button" });
    setIcon(this.footerToggleButton, "panel-bottom");
    this.updateFooterToggleButtonState();
    this.footerToggleButton.addEventListener("click", async () => {
      const showFooter = this.settingsManager.getSettings().showFooter === false;
      await this.settingsManager.updateSettings({ showFooter });
      this.updateFooterToggleButtonState();
      await this.updatePreview();
    });
  }

  updateFooterToggleButtonState(): void {
    if (!this.footerToggleButton) return;
    const visible = this.settingsManager.getSettings().showFooter !== false;
    this.footerToggleButton.classList.toggle("red-footer-hidden", !visible);
    this.footerToggleButton.setAttribute("aria-label", visible ? "隐藏页脚" : "显示页脚");
    this.footerToggleButton.setAttribute("title", visible ? "隐藏页脚" : "显示页脚");
  }

  initializeExportButtons(parent: HTMLElement): void {
    const single = parent.createEl("button", { cls: "red-export-button", text: "下载当前页" });
    single.addEventListener("click", async () => {
      if (!this.previewEl) return;
      await this.withButtonState(single, "导出中...", "下载当前页", () => DownloadManager.downloadSingleImage(this.previewEl));
    });
    this.copyButton = parent.createEl("button", { cls: "red-export-button red-export-primary", text: "导出全部页" });
    this.copyButton.addEventListener("click", async () => {
      if (!this.previewEl) return;
      await this.withButtonState(this.copyButton, "导出中...", "导出全部页", () => DownloadManager.downloadAllImages(this.previewEl));
    });
  }

  initializeEventListeners(): void {
    this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen.bind(this)));
    this.registerEvent(this.app.vault.on("modify", this.onFileModify.bind(this)));
    this.initializeCopyButtonListener();
    this.initializeSync();
  }

  initializeCopyButtonListener(): void {
    const handler = async (event: CustomEvent) => {
      const { copyButton } = event.detail || {};
      if (!copyButton) return;
      copyButton.addEventListener("click", async () => {
        copyButton.disabled = true;
        try {
          const ok = await ClipboardManager.copyImageToClipboard(this.previewEl);
          new Notice(ok ? "图片已复制到剪贴板" : "复制失败");
        } finally {
          window.setTimeout(() => { copyButton.disabled = false; }, 1000);
        }
      });
    };
    this.containerEl.addEventListener("copy-button-added", handler as EventListener);
    this.register(() => this.containerEl.removeEventListener("copy-button-added", handler as EventListener));
  }

  initializeSync(): void {
    if (this.syncInitialized) return;
    this.syncInitialized = true;
    this.registerDomEvent(this.previewEl, "click", (event) => {
      const target = event.target as HTMLElement;
      if (!target?.closest || target.closest(".red-img-frame, .red-img-ctrl, button, input, a, [contenteditable], .red-user-avatar, .red-select")) return;
      const section = target.closest(".red-content-section");
      if (!section) return;
      const sections = Array.from(this.previewEl.querySelectorAll(".red-content-section"));
      const index = sections.indexOf(section);
      if (index >= 0) this.jumpEditorToSection(index);
    });
    let timer: number | null = null;
    this.registerDomEvent(document, "selectionchange", () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => this.syncPreviewFromEditor(), 180);
    });
  }

  async updatePreview(): Promise<void> {
    if (!this.currentFile) return;
    this.previewEl.empty();
    const content = await this.app.vault.cachedRead(this.currentFile);
    await MarkdownRenderer.render(this.app, content, this.previewEl, this.currentFile.path, this);
    RedConverter.formatContent(this.previewEl);
    const valid = RedConverter.hasValidContent(this.previewEl);
    if (valid) {
      this.imgTemplateManager.applyTemplate(this.previewEl, this.settingsManager.getSettings());
      this.syncFooterLayout();
      await RedConverter.autoPaginate(this.previewEl);
      this.themeManager.applyTheme(this.previewEl);
      this.syncFooterLayout();
      this.setupImageZoom();
      this.setupTableResize();
      const settings = this.settingsManager.getSettings();
      if (settings.backgroundSettings.imageUrl) {
        const imagePreview = this.previewEl.querySelector<HTMLElement>(".red-image-preview");
        if (imagePreview) this.backgroundManager.applyBackgroundStyles(imagePreview, settings.backgroundSettings);
      }
    }
    this.updateControlsState(valid);
    this.updateNavigationState();
  }

  private syncFooterLayout(): void {
    const imagePreview = this.previewEl?.querySelector<HTMLElement>(".red-image-preview");
    if (!imagePreview) return;
    const footer = imagePreview.querySelector<HTMLElement>(":scope > .red-preview-footer");
    if (!footer) {
      imagePreview.classList.add("red-no-footer");
      imagePreview.style.setProperty("--red-footer-height", "0px");
      return;
    }

    imagePreview.classList.remove("red-no-footer");
    imagePreview.style.setProperty("--red-footer-height", "0px");
    const footerHeight = Math.ceil(Math.max(footer.getBoundingClientRect().height, footer.scrollHeight, 28));
    imagePreview.style.setProperty("--red-footer-height", `${footerHeight}px`);
  }

  async onFileOpen(file: TFile | null): Promise<void> {
    this.currentFile = file;
    this.currentImageIndex = 0;
    if (!file || file.extension !== "md") {
      this.previewEl?.empty();
      this.previewEl?.createEl("div", { cls: "red-empty-state", text: "只能预览 markdown 文本文档" });
      this.updateControlsState(false);
      return;
    }
    this.updateControlsState(true);
    this.isPreviewLocked = false;
    setIcon(this.lockButton, "unlock");
    await this.updatePreview();
  }

  async onFileModify(file: TFile): Promise<void> {
    if (file !== this.currentFile || this.isPreviewLocked) return;
    if (this.updateTimer) window.clearTimeout(this.updateTimer);
    this.updateTimer = window.setTimeout(() => this.updatePreview(), 500);
  }

  async togglePreviewLock(): Promise<void> {
    this.isPreviewLocked = !this.isPreviewLocked;
    setIcon(this.lockButton, this.isPreviewLocked ? "lock" : "unlock");
    this.lockButton.setAttribute("aria-label", this.isPreviewLocked ? "开启实时预览状态" : "关闭实时预览状态");
    if (!this.isPreviewLocked) await this.updatePreview();
  }

  updateNavigationState(): void {
    const sections = Array.from(this.previewEl?.querySelectorAll<HTMLElement>(".red-content-section") || []);
    if (!sections.length || !this.navigationButtons) return;
    this.currentImageIndex = Math.max(0, Math.min(this.currentImageIndex, sections.length - 1));
    sections.forEach((section, index) => section.classList.toggle("red-section-active", index === this.currentImageIndex));
    this.navigationButtons.prev.classList.toggle("red-nav-hidden", this.currentImageIndex === 0);
    this.navigationButtons.next.classList.toggle("red-nav-hidden", this.currentImageIndex === sections.length - 1);
    this.navigationButtons.indicator.textContent = `${this.currentImageIndex + 1}/${sections.length}`;
  }

  navigateImages(direction: "prev" | "next"): void {
    const sections = this.previewEl.querySelectorAll(".red-content-section");
    if (direction === "prev" && this.currentImageIndex > 0) this.currentImageIndex--;
    if (direction === "next" && this.currentImageIndex < sections.length - 1) this.currentImageIndex++;
    this.updateNavigationState();
  }

  openOverviewModal(): void {
    const preview = this.previewEl?.querySelector<HTMLElement>(".red-image-preview");
    if (!preview) { new Notice("请先生成预览"); return; }
    const sections = Array.from(preview.querySelectorAll<HTMLElement>(".red-content-section"));
    if (!sections.length) { new Notice("没有可预览的页面"); return; }
    const modal = new Modal(this.app);
    modal.modalEl.addClass("red-overview-modal");
    modal.titleEl.setText(`全览 · 全部 ${sections.length} 页`);
    const grid = modal.contentEl.createEl("div", { cls: "red-overview-grid" });
    sections.forEach((_, index) => {
      const cell = grid.createEl("div", { cls: "red-overview-cell" });
      const clone = preview.cloneNode(true) as HTMLElement;
      clone.querySelectorAll<HTMLElement>(".red-content-section").forEach((section, sectionIndex) => {
        const active = sectionIndex === index;
        section.classList.toggle("red-section-active", active);
        section.style.display = active ? "block" : "none";
      });
      cell.appendChild(clone);
      cell.createEl("div", { cls: "red-overview-num", text: String(index + 1) });
    });
    modal.open();
  }

  setupTableResize(): void {
    const settings = this.settingsManager.getSettings();
    const store = settings.tableScales || {};
    const base = this.themeManager.currentFontSize || settings.fontSize || 16;
    let timer: number | null = null;
    const persist = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => this.settingsManager.updateSettings({ tableScales: store }), 400);
    };
    this.previewEl.querySelectorAll<HTMLTableElement>(".red-content-section table").forEach((table) => {
      if (table.dataset.redTableInit === "1" || !table.parentElement) return;
      const key = this.tableKey(table);
      const st = store[key] || { s: 1 };
      store[key] = st;
      const wrap = document.createElement("div");
      wrap.className = "red-table-wrap";
      table.parentElement.insertBefore(wrap, table);
      wrap.appendChild(table);
      table.dataset.redTableInit = "1";
      const apply = () => wrap.querySelectorAll<HTMLElement>("th, td").forEach((cell) => { cell.style.fontSize = `${(base * st.s).toFixed(2)}px`; });
      apply();
      const ctrl = wrap.createEl("div", { cls: "red-table-ctrl" });
      const mk = (text: string, fn: () => void) => ctrl.createEl("button", { cls: "red-table-btn", text }).addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation(); fn(); apply(); persist();
      });
      mk("−", () => { st.s = Math.max(0.5, +(st.s - 0.05).toFixed(2)); });
      mk("+", () => { st.s = Math.min(1.6, +(st.s + 0.05).toFixed(2)); });
      mk("↺", () => { st.s = 1; });
      const handle = wrap.createEl("div", { cls: "red-table-resize", attr: { title: "拖拽缩放表格" } });
      let resizing = false, start = 0, s0 = 1;
      handle.addEventListener("pointerdown", (event) => { resizing = true; start = event.clientX + event.clientY; s0 = st.s; handle.setPointerCapture(event.pointerId); event.preventDefault(); event.stopPropagation(); });
      handle.addEventListener("pointermove", (event) => { if (!resizing) return; st.s = Math.max(0.5, Math.min(1.6, +(s0 + (event.clientX + event.clientY - start) / 300).toFixed(2))); apply(); });
      const end = (event: PointerEvent) => { if (!resizing) return; resizing = false; persist(); try { handle.releasePointerCapture(event.pointerId); } catch {} };
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    });
  }

  setupImageZoom(): void {
    const settings = this.settingsManager.getSettings();
    const store = settings.imageScales || {};
    let timer: number | null = null;
    const persist = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => this.settingsManager.updateSettings({ imageScales: store }), 400);
    };
    this.previewEl.querySelectorAll<HTMLImageElement>(".red-content-section img").forEach((img) => {
      if (img.dataset.redCrop === "1" || !img.parentElement) return;
      const key = this.imgKey(img.getAttribute("src") || img.src || "");
      const st = store[key] || { s: 1, x: 0, y: 0 };
      store[key] = st;
      const cs = getComputedStyle(img);
      const defaultMaxH = cs.maxHeight && cs.maxHeight !== "none" ? cs.maxHeight : "";
      const frame = document.createElement("div");
      frame.className = "red-img-frame";
      if (defaultMaxH) frame.style.maxHeight = defaultMaxH;
      if (cs.boxShadow !== "none") frame.style.boxShadow = cs.boxShadow;
      if (cs.borderRadius !== "0px") frame.style.borderRadius = cs.borderRadius;
      img.parentElement.insertBefore(frame, img);
      frame.appendChild(img);
      img.dataset.redCrop = "1";
      img.classList.add("red-img-crop");
      img.draggable = false;
      img.title = "拖动图片调整位置；四角拖拽改大小；右上角 +/- 缩放";
      const applyT = () => { img.style.transform = `translate(${st.x}px, ${st.y}px) scale(${st.s})`; };
      const applyH = () => {
        frame.style.width = typeof st.w === "number" ? `${st.w}px` : "";
        frame.style.height = typeof st.h === "number" ? `${st.h}px` : "";
        frame.style.maxHeight = typeof st.h === "number" ? "none" : defaultMaxH;
      };
      applyT(); applyH();
      const ctrl = frame.createEl("div", { cls: "red-img-ctrl" });
      const mk = (text: string, fn: () => void) => ctrl.createEl("button", { cls: "red-img-btn", text }).addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation(); fn(); applyT(); applyH(); persist();
      });
      mk("−", () => { st.s = Math.max(0.5, +(st.s - 0.1).toFixed(2)); });
      mk("+", () => { st.s = Math.min(3, +(st.s + 0.1).toFixed(2)); });
      mk("↺", () => { st.s = 1; st.x = 0; st.y = 0; st.h = undefined; st.w = undefined; });
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
      img.addEventListener("pointerdown", (event) => { dragging = true; sx = event.clientX; sy = event.clientY; ox = st.x; oy = st.y; img.setPointerCapture(event.pointerId); event.preventDefault(); });
      img.addEventListener("pointermove", (event) => { if (!dragging) return; st.x = ox + event.clientX - sx; st.y = oy + event.clientY - sy; applyT(); });
      const end = (event: PointerEvent) => { if (!dragging) return; dragging = false; persist(); try { img.releasePointerCapture(event.pointerId); } catch {} };
      img.addEventListener("pointerup", end);
      img.addEventListener("pointercancel", end);
      [
        ["red-img-corner red-img-corner-nw", -1, -1],
        ["red-img-corner red-img-corner-ne", 1, -1],
        ["red-img-corner red-img-corner-sw", -1, 1],
        ["red-img-corner red-img-corner-se", 1, 1]
      ].forEach(([cls, hx, vy]: any[]) => {
        const handle = frame.createEl("div", { cls, attr: { title: "拖拽改变图片大小" } });
        let resizing = false, rsx = 0, rsy = 0, rw0 = 0, rh0 = 0, maxW = 9999;
        handle.addEventListener("pointerdown", (event) => { resizing = true; rsx = event.clientX; rsy = event.clientY; rw0 = st.w || frame.offsetWidth; rh0 = st.h || frame.offsetHeight; maxW = frame.parentElement?.clientWidth || 9999; handle.setPointerCapture(event.pointerId); event.preventDefault(); event.stopPropagation(); });
        handle.addEventListener("pointermove", (event) => { if (!resizing) return; st.w = Math.round(Math.max(60, Math.min(maxW, rw0 + hx * (event.clientX - rsx) * 2))); st.h = Math.round(Math.max(60, Math.min(1200, rh0 + vy * (event.clientY - rsy)))); applyH(); });
        const finish = (event: PointerEvent) => { if (!resizing) return; resizing = false; persist(); try { handle.releasePointerCapture(event.pointerId); } catch {} };
        handle.addEventListener("pointerup", finish);
        handle.addEventListener("pointercancel", finish);
      });
    });
  }

  updateControlsState(enabled: boolean): void {
    if (this.lockButton) this.lockButton.disabled = !enabled;
    [this.customTemplateSelect, this.customThemeSelect, this.customFontSelect, this.customCoverSelect].forEach((container) => {
      const select = container?.querySelector<HTMLElement>(".red-select");
      if (!select) return;
      select.classList.toggle("disabled", !enabled);
      select.style.pointerEvents = enabled ? "auto" : "none";
    });
    if (this.fontSizeSelect) this.fontSizeSelect.disabled = !enabled;
    if (this.footerToggleButton) this.footerToggleButton.disabled = !enabled;
    this.containerEl.querySelectorAll<HTMLButtonElement>(".red-font-size-btn").forEach((button) => button.disabled = !enabled);
    if (this.copyButton) this.copyButton.disabled = !enabled;
    this.containerEl.querySelectorAll<HTMLButtonElement>(".red-export-button").forEach((button) => button.disabled = !enabled);
  }

  async restoreSettings(): Promise<void> {
    const settings = this.settingsManager.getSettings();
    this.themeManager.setCurrentTheme(settings.themeId);
    this.themeManager.setFont(settings.fontFamily);
    this.themeManager.setFontSize(settings.fontSize);
    this.imgTemplateManager.setCurrentTemplate(settings.templateId);
    if (this.fontSizeSelect) this.fontSizeSelect.value = String(settings.fontSize);
    await this.restoreTemplateSettings(settings.templateId);
    await this.restoreThemeSettings(settings.themeId);
    await this.restoreSelect(this.customFontSelect, settings.fontFamily, this.getFontOptions());
    await this.restoreSelect(this.customCoverSelect, settings.coverStyle, this.getCoverOptions());
  }

  async restoreTemplateSettings(value: string): Promise<void> { await this.restoreSelect(this.customTemplateSelect, value, this.getTemplateOptions()); }
  async restoreThemeSettings(value: string): Promise<void> { await this.restoreSelect(this.customThemeSelect, value, this.getThemeOptions()); }

  async restoreSelect(container: HTMLElement, value: string, options: CustomSelectOption[]): Promise<void> {
    const selected = options.find((option) => option.value === value);
    if (!selected || !container) return;
    container.querySelector<HTMLElement>(".red-select-text")!.textContent = selected.label;
    const select = container.querySelector<HTMLElement>(".red-select");
    if (select) select.dataset.value = selected.value;
    container.querySelectorAll<HTMLElement>(".red-select-item").forEach((item) => item.classList.toggle("red-selected", item.dataset.value === value));
  }

  createCustomSelect(parent: HTMLElement, className: string, options: CustomSelectOption[]): HTMLElement {
    const container = parent.createEl("div", { cls: `red-select-container ${className}` });
    const select = container.createEl("div", { cls: "red-select" });
    const selectedText = select.createEl("span", { cls: "red-select-text" });
    select.createEl("span", { cls: "red-select-arrow", text: "▾" });
    const dropdown = container.createEl("div", { cls: "red-select-dropdown" });
    options.forEach((option) => {
      const item = dropdown.createEl("div", { cls: "red-select-item", text: option.label });
      item.dataset.value = option.value;
      item.addEventListener("click", () => {
        dropdown.querySelectorAll(".red-select-item").forEach((el) => el.removeClass("red-selected"));
        item.addClass("red-selected");
        selectedText.textContent = option.label;
        select.dataset.value = option.value;
        dropdown.removeClass("red-show");
        select.dispatchEvent(new CustomEvent("change", { detail: { value: option.value } }));
      });
    });
    if (options.length) {
      selectedText.textContent = options[0].label;
      select.dataset.value = options[0].value;
      dropdown.querySelector(".red-select-item")?.addClass("red-selected");
    }
    select.addEventListener("click", (event) => { event.stopPropagation(); dropdown.toggleClass("red-show", !dropdown.hasClass("red-show")); });
    document.addEventListener("click", () => dropdown.removeClass("red-show"));
    return container;
  }

  onSelectChange(container: HTMLElement, callback: (value: string) => void | Promise<void>): void {
    container.querySelector(".red-select")?.addEventListener("change", (event: CustomEvent) => callback(event.detail.value));
  }

  getThemeOptions(): CustomSelectOption[] {
    const themes = this.settingsManager.getVisibleThemes();
    return themes.length ? themes.map((theme) => ({ value: theme.id, label: theme.name })) : [{ value: "default", label: "默认主题" }];
  }

  getTemplateOptions(): CustomSelectOption[] { return this.imgTemplateManager.getImgTemplateOptions(); }
  getFontOptions(): CustomSelectOption[] { return this.settingsManager.getFontOptions().map((font) => ({ value: font.value, label: font.label })); }
  getCoverOptions(): CustomSelectOption[] {
    return [
      { value: "cover-classic", label: "经典居中" },
      { value: "cover-bold", label: "大字报" },
      { value: "cover-mag", label: "杂志" },
      { value: "cover-number", label: "编号" },
      { value: "cover-min", label: "极简" }
    ];
  }

  private buildLineMap(): number[] {
    const map: number[] = [];
    if (!this.currentFile || !this.previewEl) return map;
    const cache = this.app.metadataCache.getFileCache(this.currentFile);
    const sections = cache?.sections || [];
    const domCount = this.previewEl.querySelectorAll(".red-content-section").length;
    if (!domCount) return map;
    const firstLine = sections.find((section) => section.type !== "thematicBreak")?.position.start.line ?? 0;
    map.push(firstLine);
    let nextPageStartsAt = 0;
    sections.forEach((section) => {
      if (section.type === "thematicBreak") {
        nextPageStartsAt = section.position.end.line + 1;
        return;
      }
      if (nextPageStartsAt > 0) {
        map.push(section.position.start.line);
        nextPageStartsAt = 0;
      }
    });
    while (map.length < domCount) map.push(map.length ? map[map.length - 1] : 0);
    return map.slice(0, domCount);
  }

  private getFileEditorLeaf(): { leaf: WorkspaceLeaf; editor: any } | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view as MarkdownView;
      if (view?.file === this.currentFile && view.editor) return { leaf, editor: view.editor };
    }
    return null;
  }

  private jumpEditorToSection(index: number): void {
    const target = this.getFileEditorLeaf();
    if (!target) return;
    const line = this.buildLineMap()[index] || 0;
    this.app.workspace.revealLeaf(target.leaf);
    target.editor.focus();
    target.editor.setCursor({ line, ch: 0 });
    try { target.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true); } catch {}
  }

  private syncPreviewFromEditor(): void {
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!active || active.file !== this.currentFile || !active.editor) return;
    const focused = document.activeElement as HTMLElement;
    if (!focused?.closest?.(".cm-editor")) return;
    const line = active.editor.getCursor().line;
    const map = this.buildLineMap();
    if (!map.length) return;
    let best = -1, index = 0;
    map.forEach((start, i) => { if (start <= line && start > best) { best = start; index = i; } });
    if (index !== this.currentImageIndex) {
      this.currentImageIndex = index;
      this.updateNavigationState();
      this.previewEl.querySelector(".red-content-section.red-section-active")?.scrollIntoView({ block: "nearest" });
    }
  }

  private async withButtonState(button: HTMLButtonElement, loading: string, normal: string, action: () => Promise<void>): Promise<void> {
    button.disabled = true;
    button.setText(loading);
    try {
      await action();
      button.setText("导出成功");
    } catch (error) {
      console.error(error);
      button.setText("导出失败");
    } finally {
      window.setTimeout(() => {
        button.disabled = false;
        button.setText(normal);
      }, 2000);
    }
  }

  private imgKey(src: string): string {
    let hash = 0;
    for (let i = 0; i < src.length; i++) hash = (hash * 31 + src.charCodeAt(i)) | 0;
    return `i${hash >>> 0}`;
  }

  private tableKey(table: HTMLElement): string {
    const text = (table.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200);
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
    return `t${hash >>> 0}`;
  }

  private pickColor(style: string, fallback: string): string {
    return (style || "").match(/#[0-9a-fA-F]{3,8}/)?.[0] || fallback;
  }
}
