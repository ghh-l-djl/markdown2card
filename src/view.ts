import { mkdir, writeFile } from "fs/promises";
import { dirname as nodeDirname, join as nodeJoin, normalize as nodeNormalize, posix, win32 } from "path";
import { ItemView, MarkdownRenderer, MarkdownView, Modal, Notice, TAbstractFile, TFile, WorkspaceLeaf, normalizePath, setIcon } from "obsidian";
import { BackgroundManager, BackgroundSettingModal } from "./backgroundManager";
import { ClipboardManager } from "./clipboardManager";
import { RedConverter } from "./converter";
import { DownloadManager } from "./downloadManager";
import { ImgTemplateManager } from "./imgTemplates";
import { MARKDOWN2CARD_ICON } from "./icons";
import type { SettingsManager } from "./settings/settings";
import type { ThemeManager } from "./themeManager";
import { AiManager } from "./aiManager";

export const VIEW_TYPE_RED = "note-to-red";

type CustomSelectOption = { value: string; label: string };
type UiLanguage = "en" | "zh";

const UI_TEXT: Record<UiLanguage, Record<string, string>> = {
  en: {
    templateLabel: "Template",
    coverLabel: "Cover style",
    fontLabel: "Font",
    overview: "Overview",
    downloadCurrent: "Download current",
    exportAll: "Export all",
    exporting: "Exporting...",
    exportSuccess: "Exported",
    exportFailed: "Export failed",
    guide: "Guide",
    guideText: "Guide:\n1. Content is paginated automatically to fit each card\n2. Use --- to force a page break\n3. Template controls layout, theme controls colors, cover controls the first page\n4. Click avatar, name, or footer text to edit",
    background: "Set background image",
    hideFooter: "Hide footer",
    showFooter: "Show footer",
    realtimeOff: "Disable live preview",
    realtimeOn: "Enable live preview",
    markdownOnly: "Only markdown files can be previewed",
    copied: "Image copied to clipboard",
    copyFailed: "Copy failed",
    previewFirst: "Generate a preview first",
    noPages: "No pages to preview",
    overviewTitle: "Overview · {count} pages",
    defaultTheme: "Default theme",
    defaultTemplate: "Default template",
    notes: "Notes",
    xhs: "Xiaohongshu note",
    weibo: "Weibo card",
    wechat: "WeChat article",
    magazine: "Magazine masthead",
    newspaper: "Newspaper masthead",
    quote: "Quote card",
    terminal: "Terminal window",
    github: "GitHub card",
    minimalCover: "Minimal headerless",
    signature: "Signature",
    coverClassic: "Classic centered",
    coverBold: "Poster",
    coverMag: "Magazine",
    coverNumber: "Numbered",
    coverMin: "Minimal",
    defaultFont: "Default font",
    simsun: "Songti",
    simhei: "Heiti",
    kaiti: "Kaiti",
    yahei: "Microsoft YaHei",
    aiRewriting: "Calling Gemini to rewrite Xiaohongshu marketing copy...",
    aiRewriteSuccess: "AI marketing copy generated successfully!",
    aiRewriteFailed: "AI rewriting failed. Exporting using original text."
  },
  zh: {
    templateLabel: "骨架模板",
    coverLabel: "封面风格",
    fontLabel: "字体",
    overview: "全览",
    downloadCurrent: "下载当前页",
    exportAll: "导出全部页",
    exporting: "导出中...",
    exportSuccess: "导出成功",
    exportFailed: "导出失败",
    guide: "使用指南",
    guideText: "使用指南：\n1. 内容会按卡片高度自动分页，避免长内容被截断\n2. 使用 --- 可手动强制换页\n3. 模板=骨架，主题=配色，封面=首页第1页排版\n4. 点头像/昵称/页脚文字可直接修改",
    background: "设置背景图片",
    hideFooter: "隐藏页脚",
    showFooter: "显示页脚",
    realtimeOff: "关闭实时预览状态",
    realtimeOn: "开启实时预览状态",
    markdownOnly: "只能预览 markdown 文本文档",
    copied: "图片已复制到剪贴板",
    copyFailed: "复制失败",
    previewFirst: "请先生成预览",
    noPages: "没有可预览的页面",
    overviewTitle: "全览 · 共{count} 页",
    defaultTheme: "默认主题",
    defaultTemplate: "默认模板",
    notes: "备忘录",
    xhs: "小红书笔记",
    weibo: "微博卡",
    wechat: "公众号卡",
    magazine: "杂志刊头",
    newspaper: "报纸报头",
    quote: "语录卡",
    terminal: "终端窗口",
    github: "GitHub 卡",
    minimalCover: "极简无头",
    signature: "纯署名",
    coverClassic: "经典居中",
    coverBold: "大字报",
    coverMag: "杂志",
    coverNumber: "编号",
    coverMin: "极简",
    defaultFont: "默认字体",
    simsun: "宋体",
    simhei: "黑体",
    kaiti: "楷体",
    yahei: "雅黑",
    aiRewriting: "正在调用 Gemini 重写小红书营销文案...",
    aiRewriteSuccess: "AI 营销文案生成成功！",
    aiRewriteFailed: "AI 重写失败，将使用文章原文作为正文导出。"
  }
};

const TEMPLATE_LABEL_KEYS: Record<string, string> = {
  default: "defaultTemplate",
  notes: "notes",
  xhs: "xhs",
  weibo: "weibo",
  wechat: "wechat",
  magazine: "magazine",
  newspaper: "newspaper",
  quote: "quote",
  terminal: "terminal",
  github: "github",
  "minimal-cover": "minimalCover",
  signature: "signature"
};

const EN_THEME_LABELS: Record<string, string> = {
  default: "Default theme",
  elegant: "Elegant dark",
  cyber: "Cyberpunk",
  yueling: "Warm brown",
  starry: "Starry dream",
  ocean: "Deep ocean",
  warm: "Warm literary",
  forest: "Forest morning",
  metal: "Metal tech",
  minimal: "Minimal theme",
  sakura: "Sakura"
};

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
  customCoverSelect: HTMLElement;
  customFontSelect: HTMLElement;
  imgTemplateManager: ImgTemplateManager;
  backgroundManager = new BackgroundManager();
  private syncInitialized = false;
  private previewRenderId = 0;

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
    await this.waitForWorkspaceLayout();
    await this.onFileOpen(this.app.workspace.getActiveFile());
  }

  async initializeToolbar(container: HTMLElement): Promise<void> {
    const toolbar = container.createEl("div", { cls: "red-toolbar" });
    const controls = toolbar.createEl("div", { cls: "red-controls-group" });
    this.initializeLockButton(controls);
    this.customTemplateSelect = this.createCustomSelect(controls, "red-template-select", this.getTemplateOptions());
    this.customTemplateSelect.id = "template-select";
    this.customTemplateSelect.dataset.label = this.t("templateLabel");
    this.onSelectChange(this.customTemplateSelect, async (value) => {
      this.imgTemplateManager.setCurrentTemplate(value);
      await this.settingsManager.updateSettings({ templateId: value });
      await this.updatePreview();
    });
    this.customCoverSelect = this.createCustomSelect(controls, "red-cover-select", this.getCoverOptions());
    this.customCoverSelect.id = "cover-select";
    this.customCoverSelect.dataset.label = this.t("coverLabel");
    this.onSelectChange(this.customCoverSelect, async (value) => {
      await this.settingsManager.updateSettings({ coverStyle: value });
      await this.updatePreview();
    });
    this.customFontSelect = this.createCustomSelect(controls, "red-font-select", this.getFontOptions());
    this.customFontSelect.id = "font-select";
    this.customFontSelect.dataset.label = this.t("fontLabel");
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
    this.lockButton = parent.createEl("button", { cls: "red-lock-button", attr: { "aria-label": this.t("realtimeOff") } });
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
      chip.dataset.themeId = theme.id;
      if (theme.id === active) chip.addClass("red-theme-chip-active");
      const swatch = chip.createEl("div", { cls: "red-theme-chip-swatch" });
      swatch.style.background = this.pickColor(theme.styles.imagePreview, "#ffffff");
      swatch.createEl("div", { cls: "red-theme-chip-bar" }).style.background = this.pickColor(theme.styles.title?.h2?.content, "#222222");
      swatch.createEl("div", { cls: "red-theme-chip-dot" }).style.background = this.pickColor(theme.styles.emphasis?.strong, "#888888");
      chip.createEl("div", { cls: "red-theme-chip-name", text: this.translateThemeName(theme.id, theme.name) });
      chip.addEventListener("click", async () => {
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
    controls.createEl("button", { cls: "red-overview-button", text: this.t("overview") }).addEventListener("click", () => this.openOverviewModal());
    this.initializeExportButtons(controls);
  }

  initializeHelpButton(parent: HTMLElement): void {
    const help = parent.createEl("button", { cls: "red-help-button", attr: { "aria-label": this.t("guide") } });
    setIcon(help, "help");
    parent.createEl("div", {
      cls: "red-help-tooltip",
      text: this.t("guideText")
    });
  }

  initializeBackgroundButton(parent: HTMLElement): void {
    const button = parent.createEl("button", { cls: "red-background-button", attr: { "aria-label": this.t("background") } });
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
    this.footerToggleButton.setAttribute("aria-label", visible ? this.t("hideFooter") : this.t("showFooter"));
    this.footerToggleButton.setAttribute("title", visible ? this.t("hideFooter") : this.t("showFooter"));
  }

  initializeExportButtons(parent: HTMLElement): void {
    const single = parent.createEl("button", { cls: "red-export-button", text: this.t("downloadCurrent") });
    single.addEventListener("click", async () => {
      if (!this.previewEl) return;
      await this.withButtonState(single, this.t("exporting"), this.t("downloadCurrent"), () => this.exportToVault(false));
    });
    this.copyButton = parent.createEl("button", { cls: "red-export-button red-export-primary", text: this.t("exportAll") });
    this.copyButton.addEventListener("click", async () => {
      if (!this.previewEl) return;
      await this.withButtonState(this.copyButton, this.t("exporting"), this.t("exportAll"), () => this.exportToVault(true));
    });
  }

  initializeEventListeners(): void {
    this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen.bind(this)));
    this.registerEvent(this.app.vault.on("modify", this.onFileModify.bind(this)));
    const onLanguageChanged = () => this.refreshLanguageLabels();
    this.settingsManager.on("language-changed", onLanguageChanged);
    this.register(() => this.settingsManager.off("language-changed", onLanguageChanged));
    this.initializeCopyButtonListener();
    this.initializeSync();
  }

  initializeCopyButtonListener(): void {
    const handler: EventListener = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { copyButton } = customEvent.detail || {};
      if (!copyButton) return;
      copyButton.addEventListener("click", async () => {
        copyButton.disabled = true;
        try {
          const ok = await ClipboardManager.copyImageToClipboard(this.previewEl);
          new Notice(ok ? this.t("copied") : this.t("copyFailed"));
        } finally {
          window.setTimeout(() => { copyButton.disabled = false; }, 1000);
        }
      });
    };
    this.containerEl.addEventListener("copy-button-added", handler);
    this.register(() => this.containerEl.removeEventListener("copy-button-added", handler));
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

  async updatePreview(options: { settleRetry?: boolean } = {}): Promise<void> {
    if (!this.currentFile) return;
    const renderId = ++this.previewRenderId;
    this.previewEl.empty();
    const content = await this.app.vault.cachedRead(this.currentFile);
    if (renderId !== this.previewRenderId) return;
    await MarkdownRenderer.render(this.app, content, this.previewEl, this.currentFile.path, this);
    if (renderId !== this.previewRenderId) return;
    await RedConverter.renderMermaidCodeBlocks(this.previewEl, content);
    if (renderId !== this.previewRenderId) return;
    RedConverter.formatContent(this.previewEl);
    const valid = RedConverter.hasValidContent(this.previewEl);
    if (valid) {
      this.imgTemplateManager.applyTemplate(this.previewEl, this.settingsManager.getSettings());
      this.themeManager.applyTheme(this.previewEl);
      this.syncFooterLayout();
      await this.waitForPreviewLayout();
      if (renderId !== this.previewRenderId) return;
      await RedConverter.autoPaginate(this.previewEl);
      if (renderId !== this.previewRenderId) return;
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
    if (valid && !options.settleRetry) this.scheduleSettledRetry(renderId);
  }

  private async waitForPreviewLayout(): Promise<void> {
    await this.waitForWorkspaceLayout();
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) await fonts.ready.catch(() => undefined);
    await this.waitForPreviewStyles();
    await this.waitForContentBox();
  }

  private async waitForWorkspaceLayout(): Promise<void> {
    await new Promise<void>((resolve) => this.app.workspace.onLayoutReady(resolve));
  }

  private async waitForContentBox(): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 1200) {
      const contentContainer = this.previewEl?.querySelector<HTMLElement>(".red-content-container");
      if (!contentContainer) return;
      const rect = contentContainer.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 20 && contentContainer.clientWidth > 20 && contentContainer.clientHeight > 20) return;
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
  }

  private async waitForPreviewStyles(): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 1200) {
      const imagePreview = this.previewEl?.querySelector<HTMLElement>(".red-image-preview");
      const contentContainer = this.previewEl?.querySelector<HTMLElement>(".red-content-container");
      if (!imagePreview || !contentContainer) return;
      const imageStyles = getComputedStyle(imagePreview);
      const contentStyles = getComputedStyle(contentContainer);
      if (imageStyles.display === "flex" && contentStyles.position === "relative") return;
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
  }

  private scheduleSettledRetry(renderId: number): void {
    window.setTimeout(async () => {
      if (renderId !== this.previewRenderId || !this.currentFile) return;
      const issue = this.detectSettledRenderIssue();
      if (issue.needsRerender) await this.updatePreview({ settleRetry: true });
    }, 900);
  }

  private detectSettledRenderIssue(): { needsRerender: boolean; reason: string; rawMermaidCount: number; sectionCount: number; activeOverflow: boolean } {
    const rawMermaidCount = this.previewEl.querySelectorAll(
      "pre > code.language-mermaid, pre > code[class*='language-mermaid'], pre.language-mermaid > code"
    ).length;
    const sections = Array.from(this.previewEl.querySelectorAll<HTMLElement>(".red-content-section"));
    const active = sections.find((section) => section.classList.contains("red-section-active")) || sections[0];
    const activeOverflow = Boolean(active && active.scrollHeight > active.clientHeight + 2);
    const needsRerender = rawMermaidCount > 0 || (sections.length === 1 && activeOverflow);
    const reason = rawMermaidCount > 0 ? "raw-mermaid" : sections.length === 1 && activeOverflow ? "single-page-overflow" : "none";
    return { needsRerender, reason, rawMermaidCount, sectionCount: sections.length, activeOverflow };
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
      this.previewEl?.createEl("div", { cls: "red-empty-state", text: this.t("markdownOnly") });
      this.updateControlsState(false);
      return;
    }
    this.updateControlsState(true);
    this.isPreviewLocked = false;
    setIcon(this.lockButton, "unlock");
    await this.updatePreview();
  }

  async onFileModify(file: TAbstractFile): Promise<void> {
    if (file !== this.currentFile || this.isPreviewLocked) return;
    if (this.updateTimer) window.clearTimeout(this.updateTimer);
    this.updateTimer = window.setTimeout(() => this.updatePreview(), 500);
  }

  async togglePreviewLock(): Promise<void> {
    this.isPreviewLocked = !this.isPreviewLocked;
    setIcon(this.lockButton, this.isPreviewLocked ? "lock" : "unlock");
    this.lockButton.setAttribute("aria-label", this.isPreviewLocked ? this.t("realtimeOn") : this.t("realtimeOff"));
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
    if (!preview) { new Notice(this.t("previewFirst")); return; }
    const sections = Array.from(preview.querySelectorAll<HTMLElement>(".red-content-section"));
    if (!sections.length) { new Notice(this.t("noPages")); return; }
    const modal = new Modal(this.app);
    modal.modalEl.addClass("red-overview-modal");
    modal.titleEl.setText(this.t("overviewTitle").replace("{count}", String(sections.length)));
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
    [this.customTemplateSelect, this.customFontSelect, this.customCoverSelect].forEach((container) => {
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
  async restoreThemeSettings(value: string): Promise<void> {
    this.containerEl.querySelectorAll<HTMLElement>(".red-theme-chip").forEach((chip) => {
      chip.classList.toggle("red-theme-chip-active", chip.dataset.themeId === value);
    });
  }

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
    container.querySelector(".red-select")?.addEventListener("change", (event: Event) => {
      const customEvent = event as CustomEvent<{ value: string }>;
      return callback(customEvent.detail.value);
    });
  }

  private refreshLanguageLabels(): void {
    if (this.customTemplateSelect) {
      this.customTemplateSelect.dataset.label = this.t("templateLabel");
      this.refreshSelectLabels(this.customTemplateSelect, this.getTemplateOptions());
    }
    if (this.customCoverSelect) {
      this.customCoverSelect.dataset.label = this.t("coverLabel");
      this.refreshSelectLabels(this.customCoverSelect, this.getCoverOptions());
    }
    if (this.customFontSelect) {
      this.customFontSelect.dataset.label = this.t("fontLabel");
      this.refreshSelectLabels(this.customFontSelect, this.getFontOptions());
    }
    this.containerEl.querySelectorAll<HTMLElement>(".red-theme-chip").forEach((chip) => {
      const theme = this.settingsManager.getTheme(chip.dataset.themeId || "");
      const name = chip.querySelector<HTMLElement>(".red-theme-chip-name");
      if (theme && name) name.setText(this.translateThemeName(theme.id, theme.name));
    });
    this.containerEl.querySelector<HTMLButtonElement>(".red-overview-button")?.setText(this.t("overview"));
    this.containerEl.querySelector<HTMLButtonElement>(".red-export-button:not(.red-export-primary)")?.setText(this.t("downloadCurrent"));
    this.containerEl.querySelector<HTMLButtonElement>(".red-export-primary")?.setText(this.t("exportAll"));
    this.containerEl.querySelector<HTMLElement>(".red-help-button")?.setAttribute("aria-label", this.t("guide"));
    const tooltip = this.containerEl.querySelector<HTMLElement>(".red-help-tooltip");
    if (tooltip) tooltip.setText(this.t("guideText"));
    this.containerEl.querySelector<HTMLElement>(".red-background-button")?.setAttribute("aria-label", this.t("background"));
    if (this.lockButton) this.lockButton.setAttribute("aria-label", this.isPreviewLocked ? this.t("realtimeOn") : this.t("realtimeOff"));
    this.updateFooterToggleButtonState();
  }

  private refreshSelectLabels(container: HTMLElement, options: CustomSelectOption[]): void {
    const select = container.querySelector<HTMLElement>(".red-select");
    const value = select?.dataset.value;
    const selected = options.find((option) => option.value === value);
    if (selected) container.querySelector<HTMLElement>(".red-select-text")?.setText(selected.label);
    container.querySelectorAll<HTMLElement>(".red-select-item").forEach((item) => {
      const option = options.find((candidate) => candidate.value === item.dataset.value);
      if (option) item.setText(option.label);
    });
  }

  getThemeOptions(): CustomSelectOption[] {
    const themes = this.settingsManager.getVisibleThemes();
    return themes.length
      ? themes.map((theme) => ({ value: theme.id, label: this.translateThemeName(theme.id, theme.name) }))
      : [{ value: "default", label: this.t("defaultTheme") }];
  }

  getTemplateOptions(): CustomSelectOption[] {
    return this.imgTemplateManager.getImgTemplateOptions().map((template) => ({
      value: template.value,
      label: this.translateTemplateName(template.value, template.label)
    }));
  }

  getFontOptions(): CustomSelectOption[] {
    return this.settingsManager.getFontOptions().map((font) => ({
      value: font.value,
      label: this.translateFontName(font.label)
    }));
  }

  getCoverOptions(): CustomSelectOption[] {
    return [
      { value: "cover-classic", label: this.t("coverClassic") },
      { value: "cover-bold", label: this.t("coverBold") },
      { value: "cover-mag", label: this.t("coverMag") },
      { value: "cover-number", label: this.t("coverNumber") },
      { value: "cover-min", label: this.t("coverMin") }
    ];
  }

  private getLanguage(): UiLanguage {
    return this.settingsManager.getSettings().uiLanguage || "en";
  }

  private t(key: string): string {
    return UI_TEXT[this.getLanguage()][key] || UI_TEXT.en[key] || key;
  }

  private translateTemplateName(id: string, fallback: string): string {
    const key = TEMPLATE_LABEL_KEYS[id];
    return key ? this.t(key) : fallback;
  }

  private translateThemeName(id: string, fallback: string): string {
    if (this.getLanguage() === "en" && EN_THEME_LABELS[id]) return EN_THEME_LABELS[id];
    if (id === "default") return this.t("defaultTheme");
    return fallback;
  }

  private translateFontName(label: string): string {
    const map: Record<string, string> = {
      "默认字体": this.t("defaultFont"),
      "宋体": this.t("simsun"),
      "黑体": this.t("simhei"),
      "楷体": this.t("kaiti"),
      "雅黑": this.t("yahei")
    };
    return map[label] || label;
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

  private async exportToVault(allPages: boolean): Promise<void> {
    if (!this.currentFile) throw new Error("No active markdown file");
    const settings = this.settingsManager.getSettings();
    const baseName = this.safeFileName(this.currentFile.basename);
    const exportRoot = this.resolveExportRoot(settings.exportPath || "markdown2card-exports");
    await this.ensureExportFolder(exportRoot.path, exportRoot.isAbsolute);

    let assetPath: string;
    if (settings.exportFormat === "png-folder") {
      const folderPath = this.joinExportPath(exportRoot, baseName);
      await this.ensureExportFolder(folderPath, exportRoot.isAbsolute);
      const images = allPages
        ? await DownloadManager.renderAllPageImages(this.previewEl, baseName)
        : await DownloadManager.renderCurrentPageImages(this.previewEl, baseName);
      for (const image of images) {
        await this.writeExportBlob(this.joinExportPath({ ...exportRoot, path: folderPath }, image.filename), image.blob, exportRoot.isAbsolute);
      }
      assetPath = folderPath;
    } else {
      const zipPath = this.joinExportPath(exportRoot, `${baseName}.zip`);
      const zipBlob = allPages
        ? await DownloadManager.renderAllImagesZip(this.previewEl, baseName)
        : await DownloadManager.renderCurrentImagesZip(this.previewEl, baseName);
      await this.writeExportBlob(zipPath, zipBlob, exportRoot.isAbsolute);
      assetPath = zipPath;
    }

    if (settings.enablePostExportActions) {
      await this.applyPostExportActions(assetPath, exportRoot.isAbsolute);
    }

    new Notice(`Exported to ${assetPath}`);
  }

  private resolveExportRoot(rawPath: string): { path: string; isAbsolute: boolean } {
    const value = rawPath.trim() || "markdown2card-exports";
    const isAbsolute = this.isAbsoluteExportPath(value);
    return {
      path: isAbsolute ? nodeNormalize(value) : normalizePath(value),
      isAbsolute
    };
  }

  private isAbsoluteExportPath(path: string): boolean {
    return posix.isAbsolute(path) || win32.isAbsolute(path);
  }

  private joinExportPath(root: { path: string; isAbsolute: boolean }, child: string): string {
    return root.isAbsolute ? nodeJoin(root.path, child) : normalizePath(`${root.path}/${child}`);
  }

  private async writeExportBlob(path: string, blob: Blob, isAbsolute: boolean): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer();
    if (isAbsolute) {
      await mkdir(nodeDirname(path), { recursive: true });
      await writeFile(path, Buffer.from(arrayBuffer));
      return;
    }
    await this.app.vault.adapter.writeBinary(path, arrayBuffer);
  }

  private async ensureExportFolder(path: string, isAbsolute: boolean): Promise<void> {
    if (isAbsolute) {
      await mkdir(path, { recursive: true });
      return;
    }
    await this.ensureFolder(path);
  }

  private async ensureFolder(path: string): Promise<void> {
    const normalized = normalizePath(path);
    if (!normalized || normalized === "/") return;
    const parts = normalized.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  private async applyPostExportActions(assetPath: string, assetPathIsAbsolute: boolean): Promise<void> {
    if (!this.currentFile) return;
    const sourceFile = this.currentFile;
    const sourceContent = await this.app.vault.cachedRead(sourceFile);
    const publishPath = this.getPublishPath(sourceFile);
    const absoluteAssetPath = assetPathIsAbsolute ? assetPath : this.getAdapterFullPath(assetPath);
    const settings = this.settingsManager.getSettings();

    let body = this.stripFrontMatter(sourceContent);

    const bodyLength = body.trim().length;
    const threshold = settings.aiRewriteThreshold ?? 800;

    if (settings.enableAiSummary && body.trim() && bodyLength > threshold) {
      new Notice(this.t("aiRewriting"));
      try {
        body = await AiManager.rewriteContent(body, settings);
        new Notice(this.t("aiRewriteSuccess"));
      } catch (error: any) {
        new Notice(`${this.t("aiRewriteFailed")} (${error.message || String(error)})`);
      }
    }

    const { cleanText, tags } = this.extractAndRemoveTags(body);

    const publishContent = this.buildPublishMarkdownWithBody(cleanText, sourceFile.path, absoluteAssetPath, tags);
    const existingPublishFile = this.app.vault.getAbstractFileByPath(publishPath);

    if (existingPublishFile instanceof TFile) {
      await this.app.vault.modify(existingPublishFile, publishContent);
    } else {
      await this.ensureFolder(this.dirname(publishPath));
      await this.app.vault.create(publishPath, publishContent);
    }

    await this.app.fileManager.processFrontMatter(sourceFile, (frontmatter) => {
      if (frontmatter.content_role !== "source_material") {
        frontmatter.content_role = "source_material";
      }
      const current = Array.isArray(frontmatter.derived_to)
        ? frontmatter.derived_to
        : frontmatter.derived_to
          ? [frontmatter.derived_to]
          : [];
      if (!current.includes(publishPath)) current.push(publishPath);
      frontmatter.derived_to = current;
    });
  }

  private getAdapterFullPath(path: string): string {
    const adapter = this.app.vault.adapter as typeof this.app.vault.adapter & { getFullPath?: (path: string) => string };
    return adapter.getFullPath ? adapter.getFullPath(path) : path;
  }

  private buildPublishMarkdownWithBody(body: string, sourcePath: string, absoluteAssetPath: string, tags: string[]): string {
    const lines = [
      "---",
      "content_role: publish_package",
      "publish_status: ready",
      "publish_platform: xhs",
      "publish_medium: screenshot",
      "publish_variant: xhs_screenshot",
      "derived_from:",
      `  - ${this.yamlQuote(`[[${sourcePath}]]`)}`,
      `assets: ${this.yamlQuote(`file://${absoluteAssetPath}`)}`,
    ];

    if (tags && tags.length > 0) {
      lines.push("publish_social_tags:");
      for (const tag of tags) {
        lines.push(`  - ${this.yamlQuote(tag)}`);
      }
    }

    lines.push("---");
    lines.push(body);

    return lines.join("\n");
  }

  private extractAndRemoveTags(text: string): { cleanText: string; tags: string[] } {
    const tags: string[] = [];
    const seen = new Set<string>();
    const regex = /#([^\s#.,;:!?"'()\[\]{}+=~`|<>\\\/]+)/g;
    
    const cleanText = text.replace(regex, (match, tag) => {
      const trimmedTag = tag.trim();
      if (trimmedTag && !/^\d+$/.test(trimmedTag)) {
        if (!seen.has(trimmedTag)) {
          tags.push(trimmedTag);
          seen.add(trimmedTag);
        }
        return "";
      }
      return match;
    });
    
    const formattedText = cleanText
      .replace(/[ \t]{2,}/g, " ")
      .replace(/ ([.,;:!?])/g, "$1")
      .split("\n")
      .map(line => line.trimEnd())
      .join("\n")
      .replace(/\s+$/, "");

    return { cleanText: formattedText, tags };
  }

  private stripFrontMatter(content: string): string {
    if (!content.startsWith("---")) return content;
    const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
    return match ? content.slice(match[0].length) : content;
  }

  private getPublishPath(file: TFile): string {
    const folder = this.dirname(file.path);
    return normalizePath(folder ? `${folder}/${file.basename}_发布版.md` : `${file.basename}_发布版.md`);
  }

  private dirname(path: string): string {
    const index = path.lastIndexOf("/");
    return index === -1 ? "" : path.slice(0, index);
  }

  private safeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "markdown2card";
  }

  private yamlQuote(value: string): string {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
  }

  private async withButtonState(button: HTMLButtonElement, loading: string, normal: string, action: () => Promise<void>): Promise<void> {
    button.disabled = true;
    button.setText(loading);
    try {
      await action();
      button.setText(this.t("exportSuccess"));
    } catch (error) {
      console.error(error);
      button.setText(this.t("exportFailed"));
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
