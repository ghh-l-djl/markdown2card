import { App, Modal, PluginSettingTab, Setting, setIcon } from "obsidian";
import type YanqiPlugin from "../main";
import type { FontOption, YanqiTheme } from "../types";

class ConfirmModal extends Modal {
  private confirmed = false;

  constructor(app: App, title: string, private message: string, private onConfirm: () => void | Promise<void>) {
    super(app);
    this.titleEl.setText(title);
  }

  onOpen(): void {
    this.contentEl.createEl("p", { text: this.message });
    const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
    buttons.createEl("button", { text: "取消" }).addEventListener("click", () => this.close());
    buttons.createEl("button", { cls: "mod-cta", text: "确认" }).addEventListener("click", () => {
      this.confirmed = true;
      this.close();
    });
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
    if (this.confirmed) await this.onConfirm();
  }
}

class CreateFontModal extends Modal {
  private font: FontOption;

  constructor(app: App, private onSubmit: (font: FontOption) => void | Promise<void>, existingFont?: FontOption) {
    super(app);
    this.font = existingFont ? { ...existingFont } : { value: "", label: "" };
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("red-font-modal");
    this.contentEl.createEl("h3", { text: this.font.label ? "编辑字体" : "添加字体" });
    new Setting(this.contentEl).setName("字体名称").setDesc("显示在下拉菜单中的名称").addText((text) => text.setValue(this.font.label).onChange((value) => this.font.label = value));
    new Setting(this.contentEl).setName("字体值").setDesc("CSS font-family 的值").addText((text) => text.setValue(this.font.value).onChange((value) => this.font.value = value));
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("确定").setCta().onClick(async () => {
        if (!this.font.label || !this.font.value) return;
        await this.onSubmit(this.font);
        this.close();
      }))
      .addButton((button) => button.setButtonText("取消").onClick(() => this.close()));
  }
}

class ThemePreviewModal extends Modal {
  constructor(app: App, private plugin: YanqiPlugin, private theme: YanqiTheme) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("theme-preview-modal");
    this.contentEl.createEl("h2", { text: `主题预览: ${this.theme.name}`, cls: "red-theme-title" });
    const container = this.contentEl.createDiv("tp-red-preview-container");
    const preview = container.createDiv("red-image-preview");
    const header = preview.createDiv("red-preview-header");
    const settings = this.plugin.settingsManager.getSettings();
    const userInfo = header.createEl("div", { cls: "red-user-info" });
    const userLeft = userInfo.createEl("div", { cls: "red-user-left" });
    userLeft.createEl("div", { cls: "red-user-avatar" }).createEl("div", { cls: "red-avatar-placeholder" }).createEl("span", { cls: "red-avatar-upload-icon", text: "📷" });
    const meta = userLeft.createEl("div", { cls: "red-user-meta" });
    const name = meta.createEl("div", { cls: "red-user-name-container" });
    name.createEl("div", { cls: "red-user-name", text: settings.userName });
    meta.createEl("div", { cls: "red-user-id", text: settings.userId });
    userInfo.createEl("div", { cls: "red-user-right" }).createEl("div", { cls: "red-post-time", text: "2025/4/20" });
    const content = preview.createDiv("red-preview-content");
    content.createEl("h2", { text: "探索 markdown2card 的无限可能" });
    const p = content.createEl("p");
    p.appendText("插件提供多种");
    p.createEl("strong", { text: "优雅的操作，" });
    p.appendText("助你轻松发布笔记。");
    const list = content.createEl("ul");
    list.createEl("li", { text: "轻松定制主题样式" });
    list.createEl("li", { text: "实时预览主题效果" });
    content.createEl("blockquote").createEl("p", { text: "让笔记发帖变得如此简单。" });
    preview.createDiv("red-preview-footer").createEl("div", { cls: "red-footer-text", text: settings.footerLeftText });
    this.plugin.themeManager.applyTheme(container, this.theme);
  }
}

class CreateThemeModal extends Modal {
  private name = "";
  private description = "";
  private raw = "";

  constructor(app: App, private plugin: YanqiPlugin, private onSubmit: (theme: YanqiTheme) => void | Promise<void>, private existingTheme?: YanqiTheme) {
    super(app);
    if (existingTheme) {
      this.name = existingTheme.name;
      this.description = existingTheme.description || "";
      this.raw = JSON.stringify(existingTheme.styles, null, 2);
    } else {
      const base = plugin.settingsManager.getTheme(plugin.settingsManager.getSettings().themeId) || plugin.settingsManager.getTheme("default");
      this.raw = JSON.stringify(base?.styles || {}, null, 2);
    }
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("red-theme-modal");
    this.contentEl.createEl("h2", { text: this.existingTheme ? "编辑主题" : "新建主题" });
    new Setting(this.contentEl).setName("主题名称").addText((text) => text.setValue(this.name).onChange((value) => this.name = value.trim()));
    new Setting(this.contentEl).setName("主题描述").addText((text) => text.setValue(this.description).onChange((value) => this.description = value.trim()));
    new Setting(this.contentEl).setName("样式 JSON").setDesc("与内置主题 styles 结构一致").addTextArea((area) => {
      area.setValue(this.raw).onChange((value) => this.raw = value);
      area.inputEl.addClass("custom-css-input");
      area.inputEl.rows = 18;
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("预览").onClick(() => {
        const theme = this.buildTheme();
        if (theme) new ThemePreviewModal(this.app, this.plugin, theme).open();
      }))
      .addButton((button) => button.setButtonText("取消").onClick(() => this.close()))
      .addButton((button) => button.setButtonText("保存").setCta().onClick(async () => {
        const theme = this.buildTheme();
        if (!theme) return;
        await this.onSubmit(theme);
        this.close();
      }));
  }

  private buildTheme(): YanqiTheme | null {
    if (!this.name) return null;
    try {
      return {
        id: this.existingTheme?.id || this.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") || `theme-${Date.now()}`,
        name: this.name,
        description: this.description,
        styles: JSON.parse(this.raw),
        isPreset: false,
        isVisible: true
      };
    } catch {
      return null;
    }
  }
}

export class RedSettingTab extends PluginSettingTab {
  private expandedSections = new Set<string>();

  constructor(app: App, public plugin: YanqiPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("red-settings");
    containerEl.createEl("h2", { text: "markdown2card 设置" });
    this.createSection(containerEl, "基本设置", (el) => this.renderBasicSettings(el));
    this.createSection(containerEl, "主题设置", (el) => this.renderThemeSettings(el));
  }

  private createSection(containerEl: HTMLElement, title: string, render: (el: HTMLElement) => void): void {
    const section = containerEl.createDiv("settings-section");
    const header = section.createDiv("settings-section-header");
    const toggle = header.createSpan("settings-section-toggle");
    setIcon(toggle, "chevron-right");
    header.createEl("h4", { text: title });
    const content = section.createDiv("settings-section-content");
    render(content);
    header.addEventListener("click", () => {
      const expanded = !section.hasClass("is-expanded");
      section.toggleClass("is-expanded", expanded);
      setIcon(toggle, expanded ? "chevron-down" : "chevron-right");
      expanded ? this.expandedSections.add(title) : this.expandedSections.delete(title);
    });
    if (!containerEl.querySelector(".settings-section") || this.expandedSections.has(title)) {
      section.addClass("is-expanded");
      setIcon(toggle, "chevron-down");
      this.expandedSections.add(title);
    }
  }

  private renderBasicSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h4", { text: "字体管理" });
    this.plugin.settingsManager.getFontOptions().forEach((font) => {
      const setting = new Setting(containerEl).setName(font.label).setDesc(font.value);
      if (!font.isPreset) {
        setting
          .addExtraButton((button) => button.setIcon("pencil").setTooltip("编辑").onClick(() => {
            new CreateFontModal(this.app, async (updated) => {
              await this.plugin.settingsManager.updateFont(font.value, updated);
              this.display();
            }, font).open();
          }))
          .addExtraButton((button) => button.setIcon("trash").setTooltip("删除").onClick(() => {
            new ConfirmModal(this.app, "确认删除字体", `确定要删除「${font.label}」字体配置吗？`, async () => {
              await this.plugin.settingsManager.removeFont(font.value);
              this.display();
            }).open();
          }));
      }
    });
    new Setting(containerEl).addButton((button) => button.setButtonText("+ 添加字体").setCta().onClick(() => {
      new CreateFontModal(this.app, async (font) => {
        await this.plugin.settingsManager.addCustomFont(font);
        this.display();
      }).open();
    }));
  }

  private renderThemeSettings(containerEl: HTMLElement): void {
    const settings = this.plugin.settingsManager.getSettings();
    new Setting(containerEl).setName("是否显示时间").addToggle((toggle) => toggle.setValue(settings.showTime !== false).onChange((value) => this.plugin.settingsManager.updateSettings({ showTime: value })));
    new Setting(containerEl).setName("是否显示页脚").addToggle((toggle) => toggle.setValue(settings.showFooter !== false).onChange((value) => this.plugin.settingsManager.updateSettings({ showFooter: value })));

    containerEl.createEl("h4", { text: "主题显示" });
    this.plugin.settingsManager.getAllThemes().forEach((theme) => {
      new Setting(containerEl)
        .setName(theme.name)
        .setDesc(theme.description || (theme.isPreset ? "内置主题" : "自定义主题"))
        .addToggle((toggle) => toggle.setValue(theme.isVisible !== false).onChange(async (value) => {
          await this.plugin.settingsManager.updateTheme(theme.id, { isVisible: value });
          this.display();
        }))
        .addExtraButton((button) => button.setIcon("eye").setTooltip("预览").onClick(() => new ThemePreviewModal(this.app, this.plugin, theme).open()));
    });

    containerEl.createEl("h4", { text: "自定义主题" });
    this.plugin.settingsManager.getAllThemes().filter((theme) => !theme.isPreset).forEach((theme) => {
      new Setting(containerEl)
        .setName(theme.name)
        .setDesc(theme.description || "")
        .addExtraButton((button) => button.setIcon("pencil").setTooltip("编辑").onClick(() => {
          new CreateThemeModal(this.app, this.plugin, async (updated) => {
            await this.plugin.settingsManager.updateTheme(theme.id, updated);
            this.display();
          }, theme).open();
        }))
        .addExtraButton((button) => button.setIcon("trash").setTooltip("删除").onClick(() => {
          new ConfirmModal(this.app, "确认删除主题", `确定要删除「${theme.name}」主题吗？此操作不可恢复。`, async () => {
            await this.plugin.settingsManager.removeTheme(theme.id);
            this.display();
          }).open();
        }));
    });
    new Setting(containerEl).addButton((button) => button.setButtonText("+ 新建主题").setCta().onClick(() => {
      new CreateThemeModal(this.app, this.plugin, async (theme) => {
        await this.plugin.settingsManager.addCustomTheme(theme);
        this.display();
      }).open();
    }));
  }
}
