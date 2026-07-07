import { Notice } from "obsidian";
import type { ImgTemplate, YanqiSettings } from "../types";
import type { SettingsManager } from "../settings/settings";
import type { ThemeManager } from "../themeManager";

const VERIFIED_ICON = `<svg viewBox="0 0 22 22"><g><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path></g></svg>`;

export class DefaultTemplate implements ImgTemplate {
  id = "default";
  name = "默认模板";
  sections = { header: true, content: true, footer: true };

  constructor(protected settingsManager: SettingsManager, protected onSettingsUpdate: () => Promise<void> | void) {}

  render(element: HTMLElement): void {
    const header = element.querySelector<HTMLElement>(".red-preview-header");
    const footer = element.querySelector<HTMLElement>(".red-preview-footer");
    if (this.sections.header && header) this.createHeaderContent(header);
    if (this.sections.footer && footer) {
      if (this.settingsManager.getSettings().showFooter !== false) this.createFooterContent(footer);
      else footer.remove();
    }
  }

  createHeaderContent(headerArea: HTMLElement): void {
    headerArea.empty();
    const settings = this.settingsManager.getSettings();
    const userInfo = headerArea.createEl("div", { cls: "red-user-info" });
    const userLeft = userInfo.createEl("div", { cls: "red-user-left" });
    this.createAvatarSection(userLeft, settings);
    this.createUserMetaSection(userLeft, settings);
    if (settings.showTime) {
      const userRight = userInfo.createEl("div", { cls: "red-user-right" });
      userRight.createEl("div", { cls: "red-post-time", text: new Date().toLocaleDateString(settings.timeFormat) });
    }
  }

  createFooterContent(footerArea: HTMLElement): void {
    footerArea.empty();
    const settings = this.settingsManager.getSettings();
    const left = footerArea.createEl("div", { cls: "red-footer-text", text: settings.footerLeftText, attr: { title: "点击编辑文本" } });
    footerArea.createEl("div", { cls: "red-footer-separator", text: "|" });
    const right = footerArea.createEl("div", { cls: "red-footer-text", text: settings.footerRightText, attr: { title: "点击编辑文本" } });
    left.addEventListener("click", () => this.handleFooterTextEdit(left, "left"));
    right.addEventListener("click", () => this.handleFooterTextEdit(right, "right"));
  }

  private createAvatarSection(parent: HTMLElement, settings: YanqiSettings): void {
    const avatar = parent.createEl("div", { cls: "red-user-avatar", attr: { title: "点击上传头像" } });
    if (settings.userAvatar) {
      avatar.createEl("img", { attr: { src: settings.userAvatar, alt: "用户头像" } });
    } else {
      avatar.createEl("div", { cls: "red-avatar-placeholder" }).createEl("span", { cls: "red-avatar-upload-icon", text: "📷" });
    }
    avatar.addEventListener("click", () => this.handleAvatarClick());
  }

  private createUserMetaSection(parent: HTMLElement, settings: YanqiSettings): void {
    const userMeta = parent.createEl("div", { cls: "red-user-meta" });
    const userNameContainer = userMeta.createEl("div", { cls: "red-user-name-container" });
    const userName = userNameContainer.createEl("div", { cls: "red-user-name", text: settings.userName, attr: { title: "点击编辑用户名" } });
    userNameContainer.createEl("span", { cls: "red-verified-icon", attr: { role: "img" } }).innerHTML = VERIFIED_ICON;
    const userId = userMeta.createEl("div", { cls: "red-user-id", text: settings.userId, attr: { title: "点击编辑用户ID" } });
    userName.addEventListener("click", () => this.handleUserNameEdit(userName));
    userId.addEventListener("click", () => this.handleUserIdEdit(userId));
  }

  async handleAvatarClick(): Promise<void> {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        await this.settingsManager.updateSettings({ userAvatar: String(event.target?.result || "") });
        await this.onSettingsUpdate();
      };
      reader.onerror = () => new Notice("头像更新失败");
      reader.readAsDataURL(file);
    });
    input.click();
  }

  async handleUserNameEdit(element: HTMLElement): Promise<void> {
    await this.editText(element, "请输入用户名", async (value) => {
      await this.settingsManager.updateSettings({ userName: value || "markdown2card" });
    });
  }

  async handleUserIdEdit(element: HTMLElement): Promise<void> {
    await this.editText(element, "请输入用户ID", async (value) => {
      await this.settingsManager.updateSettings({ userId: value || "@markdown2card" });
    });
  }

  async handleFooterTextEdit(element: HTMLElement, position: "left" | "right"): Promise<void> {
    await this.editText(element, "请输入页脚文本", async (value) => {
      await this.settingsManager.updateSettings(position === "left"
        ? { footerLeftText: value || "多搜索、多动手、多思考" }
        : { footerRightText: value || "Vibe Anything" });
    }, "red-footer-edit-input");
  }

  protected async editText(element: HTMLElement, placeholder: string, save: (value: string) => Promise<void>, className = "red-user-edit-input"): Promise<void> {
    const input = document.createElement("input");
    input.value = element.textContent || "";
    input.className = className;
    input.placeholder = placeholder;
    element.replaceWith(input);
    input.focus();
    const commit = async () => {
      await save(input.value.trim());
      await this.onSettingsUpdate();
    };
    input.addEventListener("blur", commit, { once: true });
    input.addEventListener("keypress", (event) => {
      if (event.key === "Enter") input.blur();
    });
  }
}

class NotesTemplate extends DefaultTemplate {
  id = "notes";
  name = "备忘录";
  sections = { header: true, content: true, footer: false };

  render(element: HTMLElement): void {
    const header = element.querySelector<HTMLElement>(".red-preview-header");
    if (header) {
      header.empty();
      header.addClass("red-notes-header");
      const bar = header.createEl("div", { cls: "red-notes-bar" });
      const title = bar.createEl("div", { cls: "red-notes-title", text: this.settingsManager.getSettings().notesTitle || "备忘录", attr: { title: "点击编辑标题" } });
      title.addEventListener("click", () => this.editText(title, "请输入标题", async (value) => {
        await this.settingsManager.updateSettings({ notesTitle: value || "备忘录" });
      }, "red-notes-edit-input"));
      const cycles = bar.createEl("div", { cls: "red-notes-cycle-buttons" });
      cycles.createEl("div", { cls: "red-notes-cycle-left" });
      cycles.createEl("div", { cls: "red-notes-cycle-right" });
      bar.createEl("div", { cls: "red-notes-actions" });
    }
    const footer = element.querySelector<HTMLElement>(".red-preview-footer");
    if (footer) {
      footer.empty();
      footer.removeAttribute("class");
    }
  }
}

class MagazineTemplate extends DefaultTemplate {
  id = "magazine";
  name = "杂志刊头";
  render(element: HTMLElement, settings?: YanqiSettings): void {
    super.render(element);
    applyRoot(element, "red-tpl-mag");
  }
}

class MinimalCoverTemplate extends DefaultTemplate {
  id = "minimal-cover";
  name = "极简无头";
  render(element: HTMLElement, settings?: YanqiSettings): void {
    super.render(element);
    applyRoot(element, "red-tpl-min");
  }
}

class RedTemplateBase extends DefaultTemplate {
  constructor(settingsManager: SettingsManager, onSettingsUpdate: () => Promise<void> | void, public id: string, public name: string, private rootClass: string) {
    super(settingsManager, onSettingsUpdate);
  }

  render(element: HTMLElement): void {
    const header = element.querySelector<HTMLElement>(".red-preview-header");
    const footer = element.querySelector<HTMLElement>(".red-preview-footer");
    const settings = this.settingsManager.getSettings();
    if (header) {
      header.empty();
      header.removeAttribute("class");
      header.addClass("red-preview-header");
      this.buildHeader(header, settings);
    }
    if (footer) {
      footer.empty();
      footer.removeAttribute("class");
      footer.addClass("red-preview-footer");
      if (settings.showFooter !== false) this.buildFooter(footer, settings);
    }
    applyRoot(element, this.rootClass);
  }

  buildHeader(header: HTMLElement, settings: YanqiSettings): void {
    this.createHeaderContent(header);
  }

  buildFooter(footer: HTMLElement, settings: YanqiSettings): void {
    this.createFooterContent(footer);
  }

  editableName(parent: HTMLElement, settings: YanqiSettings, cls = ""): HTMLElement {
    const el = parent.createEl("div", { cls: `red-user-name ${cls}`, text: settings.userName, attr: { title: "点击编辑" } });
    el.addEventListener("click", () => this.handleUserNameEdit(el));
    return el;
  }
}

class XhsTemplate extends RedTemplateBase {
  constructor(sm: SettingsManager, cb: () => Promise<void> | void) { super(sm, cb, "xhs", "小红书笔记", "red-tpl-xhs"); }
  buildFooter(footer: HTMLElement): void {
    [["♡", "点赞"], ["☆", "收藏"], ["○", "评论"]].forEach(([icon, text]) => {
      const item = footer.createEl("div", { cls: "red-xhs-act" });
      item.createEl("span", { cls: "red-xhs-ico", text: icon });
      item.createSpan({ text });
    });
  }
}

class WeiboTemplate extends RedTemplateBase {
  constructor(sm: SettingsManager, cb: () => Promise<void> | void) { super(sm, cb, "weibo", "微博卡", "red-tpl-weibo"); }
  buildFooter(footer: HTMLElement): void {
    [["↻", "转发"], ["○", "评论"], ["♡", "赞"]].forEach(([icon, text]) => {
      const item = footer.createEl("div", { cls: "red-xhs-act" });
      item.createEl("span", { cls: "red-xhs-ico", text: icon });
      item.createSpan({ text });
    });
  }
}

class WechatTemplate extends RedTemplateBase {
  constructor(sm: SettingsManager, cb: () => Promise<void> | void) { super(sm, cb, "wechat", "公众号卡", "red-tpl-wechat"); }
  buildFooter(footer: HTMLElement): void {
    footer.createSpan({ text: "阅读原文" });
    footer.createEl("span", { cls: "red-wechat-arrow", text: "›" });
  }
}

class NewspaperTemplate extends RedTemplateBase {
  constructor(sm: SettingsManager, cb: () => Promise<void> | void) { super(sm, cb, "newspaper", "报纸报头", "red-tpl-news"); }
  buildHeader(header: HTMLElement, settings: YanqiSettings): void {
    const bar = header.createEl("div", { cls: "red-news-masthead" });
    this.editableName(bar, settings, "red-news-name");
    const meta = bar.createEl("div", { cls: "red-news-meta" });
    meta.createSpan({ text: settings.userId || "" });
    if (settings.showTime) meta.createSpan({ text: new Date().toLocaleDateString(settings.timeFormat) });
  }
  buildFooter(footer: HTMLElement, settings: YanqiSettings): void {
    footer.createSpan({ text: `—— ${settings.userName || ""} ——` });
  }
}

class QuoteTemplate extends RedTemplateBase {
  constructor(sm: SettingsManager, cb: () => Promise<void> | void) { super(sm, cb, "quote", "语录卡", "red-tpl-quote"); }
  buildHeader(header: HTMLElement): void { header.createEl("div", { cls: "red-quote-mark", text: "❝" }); }
  buildFooter(footer: HTMLElement, settings: YanqiSettings): void { this.editableName(footer, settings, "red-quote-sign"); }
}

class TerminalTemplate extends RedTemplateBase {
  constructor(sm: SettingsManager, cb: () => Promise<void> | void) { super(sm, cb, "terminal", "终端窗口", "red-tpl-term"); }
  buildHeader(header: HTMLElement, settings: YanqiSettings): void {
    const bar = header.createEl("div", { cls: "red-term-bar" });
    ["red", "yellow", "green"].forEach((c) => bar.createEl("span", { cls: `red-code-dot red-code-dot-${c}` }));
    this.editableName(bar, settings, "red-term-path");
  }
  buildFooter(footer: HTMLElement): void {
    footer.createEl("span", { text: "$ " });
    footer.createEl("span", { cls: "red-term-cursor", text: "█" });
  }
}

class GithubTemplate extends RedTemplateBase {
  constructor(sm: SettingsManager, cb: () => Promise<void> | void) { super(sm, cb, "github", "GitHub 卡", "red-tpl-github"); }
  buildHeader(header: HTMLElement, settings: YanqiSettings): void {
    const top = header.createEl("div", { cls: "red-gh-head" });
    top.createEl("span", { cls: "red-gh-oct", text: "GitHub" });
    this.editableName(top, settings, "red-gh-repo");
  }
  buildFooter(footer: HTMLElement): void {
    footer.createSpan({ text: "● Markdown" });
    footer.createSpan({ text: "★ Star" });
  }
}

class SignatureTemplate extends RedTemplateBase {
  constructor(sm: SettingsManager, cb: () => Promise<void> | void) { super(sm, cb, "signature", "纯署名", "red-tpl-sign"); }
  buildHeader(): void {}
  buildFooter(footer: HTMLElement, settings: YanqiSettings): void { this.editableName(footer, settings, "red-sign-name"); }
}

function applyRoot(element: HTMLElement, rootClass: string): void {
  const preview = element.querySelector<HTMLElement>(".red-image-preview");
  if (!preview) return;
  ["red-tpl-mag", "red-tpl-min", "red-tpl-xhs", "red-tpl-weibo", "red-tpl-wechat", "red-tpl-news", "red-tpl-term", "red-tpl-github", "red-tpl-sign", "red-tpl-quote"].forEach((cls) => preview.classList.remove(cls));
  if (rootClass) preview.classList.add(rootClass);
}

export class ImgTemplateManager {
  templates: ImgTemplate[] = [];
  currentTemplate: ImgTemplate | null = null;

  constructor(private settingsManager: SettingsManager, private onSettingsUpdate: () => Promise<void> | void, private themeManager: ThemeManager) {
    this.initializeTemplates();
  }

  initializeTemplates(): void {
    this.registerTemplate(new DefaultTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new NotesTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new XhsTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new WeiboTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new WechatTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new MagazineTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new NewspaperTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new QuoteTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new TerminalTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new GithubTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new MinimalCoverTemplate(this.settingsManager, this.onSettingsUpdate));
    this.registerTemplate(new SignatureTemplate(this.settingsManager, this.onSettingsUpdate));
  }

  registerTemplate(template: ImgTemplate): void {
    this.templates.push(template);
  }

  getImgTemplateOptions(): Array<{ value: string; label: string }> {
    return this.templates.map((template) => ({ value: template.id, label: template.name }));
  }

  setCurrentTemplate(id: string): void {
    const template = this.templates.find((item) => item.id === id);
    if (template) this.currentTemplate = template;
  }

  applyTemplate(previewEl: HTMLElement, settings: YanqiSettings): void {
    if (!this.currentTemplate) this.currentTemplate = this.templates[0];
    this.currentTemplate?.render(previewEl, settings);
    this.themeManager.applyTheme(previewEl);
  }
}
