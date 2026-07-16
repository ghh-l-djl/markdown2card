import { App, Modal, PluginSettingTab, Setting, setIcon } from "obsidian";
import type YanqiPlugin from "../main";
import { resolveSavedPaidEntitlementStatus } from "../paidEntitlement";
import { purchaseUrl, THEME_CUSTOMIZATION_URL } from "../support";
import { checkPaidEntitlementManually } from "../paidEntitlementClient";
import type { FontOption, YanqiTheme } from "../types";
import { settingsText, type SettingsLanguage } from "./settingsI18n";

class ConfirmModal extends Modal {
  private confirmed = false;

  constructor(app: App, title: string, private message: string, private onConfirm: () => void | Promise<void>, private language: SettingsLanguage) {
    super(app);
    this.titleEl.setText(title);
  }

  onOpen(): void {
    this.contentEl.createEl("p", { text: this.message });
    const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
    buttons.createEl("button", { text: settingsText(this.language, "Cancel") }).addEventListener("click", () => this.close());
    buttons.createEl("button", { cls: "mod-cta", text: settingsText(this.language, "Confirm") }).addEventListener("click", () => {
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

  constructor(app: App, private onSubmit: (font: FontOption) => void | Promise<void>, private language: SettingsLanguage, existingFont?: FontOption) {
    super(app);
    this.font = existingFont ? { ...existingFont } : { value: "", label: "" };
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("red-font-modal");
    this.contentEl.createEl("h3", { text: settingsText(this.language, this.font.label ? "Edit font" : "Add font") });
    new Setting(this.contentEl).setName(settingsText(this.language, "Font name")).setDesc(settingsText(this.language, "The label shown in the font menu.")).addText((text) => text.setValue(this.font.label).onChange((value) => this.font.label = value));
    new Setting(this.contentEl).setName(settingsText(this.language, "Font family")).setDesc(settingsText(this.language, "CSS font-family value.")).addText((text) => text.setValue(this.font.value).onChange((value) => this.font.value = value));
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(settingsText(this.language, "Save")).setCta().onClick(async () => {
        if (!this.font.label || !this.font.value) return;
        await this.onSubmit(this.font);
        this.close();
      }))
      .addButton((button) => button.setButtonText(settingsText(this.language, "Cancel")).onClick(() => this.close()));
  }
}

class ThemePreviewModal extends Modal {
  constructor(app: App, private plugin: YanqiPlugin, private theme: YanqiTheme, private language: SettingsLanguage) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("theme-preview-modal");
    this.contentEl.createEl("h2", { text: `${settingsText(this.language, "Preview")}: ${this.theme.name}`, cls: "red-theme-title" });
    const container = this.contentEl.createDiv("tp-red-preview-container");
    const preview = container.createDiv("red-image-preview");
    const header = preview.createDiv("red-preview-header");
    const settings = this.plugin.settingsManager.getSettings();
    const userInfo = header.createEl("div", { cls: "red-user-info" });
    const userLeft = userInfo.createEl("div", { cls: "red-user-left" });
    const avatar = userLeft.createEl("div", { cls: "red-user-avatar" });
    avatar.createEl("img", { attr: { src: settings.userAvatar, alt: "用户头像" } });
    const meta = userLeft.createEl("div", { cls: "red-user-meta" });
    const name = meta.createEl("div", { cls: "red-user-name-container" });
    name.createEl("div", { cls: "red-user-name", text: settings.userName });
    meta.createEl("div", { cls: "red-user-id", text: settings.userId });
    userInfo.createEl("div", { cls: "red-user-right" }).createEl("div", { cls: "red-post-time", text: "2025/4/20" });
    const content = preview.createDiv("red-preview-content markdown-preview-view markdown-rendered");
    content.createEl("h2", { text: "Explore markdown2card" });
    const p = content.createEl("p");
    p.appendText("Create polished");
    p.createEl("strong", { text: " social cards " });
    p.appendText("from your notes.");
    const list = content.createEl("ul");
    list.createEl("li", { text: "Customize card themes" });
    list.createEl("li", { text: "Preview changes instantly" });
    content.createEl("blockquote").createEl("p", { text: "Turn notes into publishable images." });
    preview.createDiv("red-preview-footer").createEl("div", { cls: "red-footer-text", text: settings.footerLeftText });
    this.plugin.themeManager.applyTheme(container, this.theme);
  }
}

class CreateThemeModal extends Modal {
  private name = "";
  private description = "";
  private raw = "";

  constructor(app: App, private plugin: YanqiPlugin, private onSubmit: (theme: YanqiTheme) => void | Promise<void>, private language: SettingsLanguage, private existingTheme?: YanqiTheme) {
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
    this.contentEl.createEl("h2", { text: settingsText(this.language, this.existingTheme ? "Edit theme" : "Create theme") });
    new Setting(this.contentEl).setName(settingsText(this.language, "Theme name")).addText((text) => text.setValue(this.name).onChange((value) => this.name = value.trim()));
    new Setting(this.contentEl).setName(settingsText(this.language, "Theme description")).addText((text) => text.setValue(this.description).onChange((value) => this.description = value.trim()));
    new Setting(this.contentEl).setName(settingsText(this.language, "Styles JSON")).setDesc(settingsText(this.language, "Use the same styles structure as built-in themes.")).addTextArea((area) => {
      area.setValue(this.raw).onChange((value) => this.raw = value);
      area.inputEl.addClass("custom-css-input");
      area.inputEl.rows = 18;
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(settingsText(this.language, "Preview")).onClick(() => {
        const theme = this.buildTheme();
        if (theme) new ThemePreviewModal(this.app, this.plugin, theme, this.language).open();
      }))
      .addButton((button) => button.setButtonText(settingsText(this.language, "Cancel")).onClick(() => this.close()))
      .addButton((button) => button.setButtonText(settingsText(this.language, "Save")).setCta().onClick(async () => {
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
    containerEl.toggleClass("red-paid-entitled", this.plugin.settingsManager.getSettings().activationValidationStatus === "valid");
    containerEl.createEl("h2", { text: this.t("markdown2card Settings") });
    this.renderCommunitySettings(containerEl);
    this.createSection(containerEl, "general", this.t("General"), (el) => this.renderBasicSettings(el));
    this.createSection(containerEl, "export", this.t("Export"), (el) => this.renderExportSettings(el));
    this.createSection(containerEl, "themes", this.t("Themes"), (el) => this.renderThemeSettings(el));
  }

  private get language(): SettingsLanguage {
    return this.plugin.settingsManager.getSettings().uiLanguage === "zh" ? "zh" : "en";
  }

  private t(english: string): string {
    return settingsText(this.language, english);
  }

  private createSection(containerEl: HTMLElement, id: string, title: string, render: (el: HTMLElement) => void): void {
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
      expanded ? this.expandedSections.add(id) : this.expandedSections.delete(id);
    });
    if (!containerEl.querySelector(".settings-section") || this.expandedSections.has(id)) {
      section.addClass("is-expanded");
      setIcon(toggle, "chevron-down");
      this.expandedSections.add(id);
    }
  }

  private renderBasicSettings(containerEl: HTMLElement): void {
    const settings = this.plugin.settingsManager.getSettings();
    new Setting(containerEl)
      .setName(this.t("Interface language"))
      .setDesc(this.t("Choose the language used by the plugin interface and settings."))
      .addDropdown((dropdown) => dropdown
        .addOption("en", "English")
        .addOption("zh", "中文")
        .setValue(settings.uiLanguage || "en")
        .onChange(async (value) => {
          await this.plugin.settingsManager.updateSettings({ uiLanguage: value as "en" | "zh" });
          this.display();
        }));
    new Setting(containerEl).setName(this.t("Show time")).addToggle((toggle) => toggle.setValue(settings.showTime !== false).onChange((value) => this.plugin.settingsManager.updateSettings({ showTime: value })));
    new Setting(containerEl).setName(this.t("Show footer")).addToggle((toggle) => toggle.setValue(settings.showFooter !== false).onChange((value) => this.plugin.settingsManager.updateSettings({ showFooter: value })));

    containerEl.createEl("h4", { text: this.t("Fonts") });
    this.plugin.settingsManager.getFontOptions().forEach((font) => {
      const setting = new Setting(containerEl).setName(font.label).setDesc(font.value);
      if (!font.isPreset) {
        setting
          .addExtraButton((button) => button.setIcon("pencil").setTooltip(this.t("Edit")).onClick(() => {
            new CreateFontModal(this.app, async (updated) => {
              await this.plugin.settingsManager.updateFont(font.value, updated);
              this.display();
            }, this.language, font).open();
          }))
          .addExtraButton((button) => button.setIcon("trash").setTooltip(this.t("Delete")).onClick(() => {
            new ConfirmModal(this.app, this.t("Delete font"), this.language === "zh" ? `删除字体“${font.label}”的配置？` : `Delete the "${font.label}" font configuration?`, async () => {
              await this.plugin.settingsManager.removeFont(font.value);
              this.display();
            }, this.language).open();
          }));
      }
    });
    new Setting(containerEl).addButton((button) => button.setButtonText(this.t("+ Add font")).setCta().onClick(() => {
      new CreateFontModal(this.app, async (font) => {
        await this.plugin.settingsManager.addCustomFont(font);
        this.display();
      }, this.language).open();
    }));
  }

  private renderExportSettings(containerEl: HTMLElement): void {
    const settings = this.plugin.settingsManager.getSettings();
    new Setting(containerEl)
      .setName(this.t("Export path"))
      .setDesc(this.t("Relative paths are written inside the vault. Absolute paths such as /Users/name/Exports, C:\\Exports, or \\\\server\\share\\Exports are written to the file system."))
      .addText((text) => text
        .setPlaceholder("markdown2card-exports")
        .setValue(settings.exportPath)
        .onChange((value) => this.plugin.settingsManager.updateSettings({ exportPath: value.trim() || "markdown2card-exports" })));

    new Setting(containerEl)
      .setName(this.t("Export format"))
      .setDesc(this.t("Zip writes one archive. PNG folder writes each page image into a folder named after the current note."))
      .addDropdown((dropdown) => dropdown
        .addOption("zip", this.t("Zip archive"))
        .addOption("png-folder", this.t("PNG folder"))
        .setValue(settings.exportFormat)
        .onChange((value) => this.plugin.settingsManager.updateSettings({ exportFormat: value as "zip" | "png-folder" })));

    const isZh = settings.uiLanguage === "zh";

    new Setting(containerEl)
      .setName(isZh ? "启用导出后置操作" : "Post-export actions")
      .setDesc(isZh 
        ? "导出后自动在源文件同目录下生成一个发布版MD文件"
        : "After export, mark the source note as source material, create a publish-ready note, and link the exported assets."
      )
      .addToggle((toggle) => toggle
        .setValue(settings.enablePostExportActions)
        .onChange((value) => {
          this.plugin.settingsManager.updateSettings({ enablePostExportActions: value });
          this.display(); // Refresh to show/hide AI settings dynamically
        }));

    if (settings.enablePostExportActions) {
      containerEl.createEl("h3", { text: isZh ? "AI 总结与重写设置" : "AI Summary & Rewrite Settings" });

      new Setting(containerEl)
        .setName(isZh ? "启用 AI 智能重写" : "Enable AI Rewrite")
        .setDesc(isZh 
          ? "使用 Gemini API 或本地 agy 命令自动重写导出文件的正文"
          : "Use the Gemini API or local agy command to rewrite the exported note body"
        )
        .addToggle((toggle) => toggle
          .setValue(settings.enableAiSummary)
          .onChange((value) => {
            this.plugin.settingsManager.updateSettings({ enableAiSummary: value });
            this.display();
          }));

      if (settings.enableAiSummary) {
        new Setting(containerEl)
          .setName(isZh ? "AI 调用方式" : "AI Provider")
          .setDesc(isZh ? "选择 Gemini API 或本地终端 agy -p" : "Choose the Gemini API or local agy -p command")
          .addDropdown((dropdown) => dropdown
            .addOption("gemini", "Gemini API")
            .addOption("agy", isZh ? "本地 agy 命令" : "Local agy command")
            .setValue(settings.aiProvider || "gemini")
            .onChange(async (value) => {
              await this.plugin.settingsManager.updateSettings({ aiProvider: value as "gemini" | "agy" });
              this.display();
            }));

        if (settings.aiProvider === "agy") {
          new Setting(containerEl)
            .setName(isZh ? "agy 命令路径" : "agy executable path")
            .setDesc(isZh
              ? "agy 可执行文件的路径或命令名；插件将以“agy -p 提示词”方式调用"
              : "Executable path or command name; the plugin invokes it as agy -p prompt")
            .addText((text) => text
              .setPlaceholder("agy")
              .setValue(settings.agyCommandPath || "agy")
              .onChange((value) => {
                this.plugin.settingsManager.updateSettings({ agyCommandPath: value.trim() || "agy" });
              }));

          new Setting(containerEl)
            .setName(isZh ? "agy 代理地址" : "agy proxy URL")
            .setDesc(isZh
              ? "可选。调用 agy 时同时设置 HTTP_PROXY、HTTPS_PROXY 和 ALL_PROXY，例如 http://127.0.0.1:7890"
              : "Optional. Sets HTTP_PROXY, HTTPS_PROXY, and ALL_PROXY for agy, for example http://127.0.0.1:7890")
            .addText((text) => text
              .setPlaceholder("http://127.0.0.1:7890")
              .setValue(settings.agyProxyUrl || "")
              .onChange((value) => {
                this.plugin.settingsManager.updateSettings({ agyProxyUrl: value.trim() });
              }));

          new Setting(containerEl)
            .setName(isZh ? "agy 不代理地址" : "agy NO_PROXY")
            .setDesc(isZh
              ? "可选。无需代理的主机列表，以逗号分隔"
              : "Optional. Comma-separated hosts that should bypass the proxy")
            .addText((text) => text
              .setPlaceholder("localhost,127.0.0.1,::1")
              .setValue(settings.agyNoProxy || "")
              .onChange((value) => {
                this.plugin.settingsManager.updateSettings({ agyNoProxy: value.trim() });
              }));
        }

        if (settings.aiProvider !== "agy") {
          new Setting(containerEl)
            .setName("Gemini API Key")
            .setDesc(isZh
              ? "输入您的 Gemini API 密钥 (从 Google AI Studio 获取)"
              : "Enter your Gemini API key (obtained from Google AI Studio)"
            )
            .addText((text) => {
              text.inputEl.type = "password";
              text.setPlaceholder("AIzaSy...")
                .setValue(settings.geminiApiKey)
                .onChange((value) => {
                  this.plugin.settingsManager.updateSettings({ geminiApiKey: value.trim() });
                });
            });

          new Setting(containerEl)
            .setName(isZh ? "Gemini API 地址" : "API Proxy / Base URL")
            .setDesc(isZh
              ? "自定义 Gemini API 的基础请求地址或反代地址"
              : "Custom Gemini API base URL or proxy endpoint URL"
            )
            .addText((text) => text
              .setPlaceholder("https://generativelanguage.googleapis.com")
              .setValue(settings.geminiApiUrl || "")
              .onChange((value) => {
                this.plugin.settingsManager.updateSettings({ geminiApiUrl: value.trim() });
              }));

          new Setting(containerEl)
            .setName(isZh ? "Gemini 模型" : "Gemini Model")
            .setDesc(isZh
              ? "输入重写使用的 Gemini 模型名称 (例如: gemini-3.5-flash)"
              : "Enter the Gemini model name to use for rewriting (e.g. gemini-3.5-flash)"
            )
            .addText((text) => text
              .setPlaceholder("gemini-3.5-flash")
              .setValue(settings.geminiModel)
              .onChange((value) => {
                this.plugin.settingsManager.updateSettings({ geminiModel: value.trim() });
              }));
        }

        new Setting(containerEl)
          .setName(isZh ? "AI 重写字数阈值" : "AI Rewrite Character Threshold")
          .setDesc(isZh 
            ? "正文字数少于此阈值时将不进行重写 (单位: 字符)" 
            : "No rewrite will be performed if the body length is less than or equal to this threshold."
          )
          .addText((text) => text
            .setPlaceholder("800")
            .setValue(String(settings.aiRewriteThreshold ?? 800))
            .onChange(async (value) => {
              const num = parseInt(value, 10);
              await this.plugin.settingsManager.updateSettings({ aiRewriteThreshold: isNaN(num) ? 800 : num });
            }));

        new Setting(containerEl)
          .setName(isZh ? "AI 提示词模板 (Prompt)" : "AI Prompt Template")
          .setDesc(isZh 
            ? "自定义重写提示词。使用 ${content} 代表文章原文。"
            : "Customize the rewrite prompt. Use ${content} to represent the source article text."
          )
          .addTextArea((textArea) => textArea
            .setPlaceholder(isZh ? "输入 AI Prompt..." : "Enter AI Prompt...")
            .setValue(settings.aiPromptTemplate)
            .onChange((value) => {
              this.plugin.settingsManager.updateSettings({ aiPromptTemplate: value });
            }));
      }
    }
  }

  private renderThemeSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h4", { text: this.t("Visible themes") });
    this.plugin.settingsManager.getAllThemes().forEach((theme) => {
      new Setting(containerEl)
        .setName(theme.name)
        .setDesc(theme.description || this.t(theme.isPreset ? "Built-in theme" : "Custom theme"))
        .addToggle((toggle) => toggle.setValue(theme.isVisible !== false).onChange(async (value) => {
          await this.plugin.settingsManager.updateTheme(theme.id, { isVisible: value });
          this.display();
        }))
        .addExtraButton((button) => button.setIcon("eye").setTooltip(this.t("Preview")).onClick(() => new ThemePreviewModal(this.app, this.plugin, theme, this.language).open()));
    });

    containerEl.createEl("h4", { text: this.t("Custom themes") });
    this.plugin.settingsManager.getAllThemes().filter((theme) => !theme.isPreset).forEach((theme) => {
      new Setting(containerEl)
        .setName(theme.name)
        .setDesc(theme.description || "")
        .addExtraButton((button) => button.setIcon("pencil").setTooltip(this.t("Edit")).onClick(() => {
          new CreateThemeModal(this.app, this.plugin, async (updated) => {
            await this.plugin.settingsManager.updateTheme(theme.id, updated);
            this.display();
          }, this.language, theme).open();
        }))
        .addExtraButton((button) => button.setIcon("trash").setTooltip(this.t("Delete")).onClick(() => {
          new ConfirmModal(this.app, this.language === "zh" ? "删除主题" : "Delete theme", this.language === "zh" ? `删除主题“${theme.name}”？此操作无法撤销。` : `Delete the "${theme.name}" theme? This cannot be undone.`, async () => {
            await this.plugin.settingsManager.removeTheme(theme.id);
            this.display();
          }, this.language).open();
        }));
    });
    new Setting(containerEl).addButton((button) => button.setButtonText(this.t("+ Create theme")).setCta().onClick(() => {
      new CreateThemeModal(this.app, this.plugin, async (theme) => {
        await this.plugin.settingsManager.addCustomTheme(theme);
        this.display();
      }, this.language).open();
    }));
  }

  private renderCommunitySettings(containerEl: HTMLElement): void {
    const section = containerEl.createDiv("red-community-section");
    section.createEl("h4", { text: this.t("Community") });
    section.createEl("p", {
      cls: "red-settings-note",
      text: this.t("markdown2card grows through community themes. Please submit a pull request with new theme styles to help enrich the ecosystem.")
    });
    const settings = this.plugin.settingsManager.getSettings();
    const activationSetting = new Setting(section)
      .setName(this.t("Activation code"))
      .setDesc(this.activationStatusDescription());
    activationSetting.addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("M2C-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX");
      text.setValue(settings.activationCode);
      text.onChange(async (value) => {
        await this.plugin.settingsManager.updateSettings({
          activationCode: value,
          activationValidationStatus: "unchecked",
          activationLastCheckedAt: ""
        });
      });
      activationSetting.addExtraButton((button) => button
        .setIcon("eye")
        .setTooltip(this.t("Show or hide activation code"))
        .onClick(() => {
          text.inputEl.type = text.inputEl.type === "password" ? "text" : "password";
          button.setIcon(text.inputEl.type === "password" ? "eye" : "eye-off");
        }));
    });
    activationSetting
      .addButton((button) => button.setButtonText(this.t("Validate")).onClick(async () => {
        const currentSettings = this.plugin.settingsManager.getSettings();
        const current = currentSettings.activationCode;
        const status = current.trim() ? await checkPaidEntitlementManually(current) : "invalid";
        const preserveLastSuccessfulCheck = status === "unavailable"
          && currentSettings.activationValidationStatus === "valid";
        await this.plugin.settingsManager.updateSettings({
          activationValidationStatus: resolveSavedPaidEntitlementStatus(
            status,
            currentSettings.activationValidationStatus
          ),
          activationLastCheckedAt: preserveLastSuccessfulCheck
            ? currentSettings.activationLastCheckedAt
            : new Date().toISOString()
        });
        this.display();
      }))
      .addButton((button) => button.setButtonText(this.t("Clear")).onClick(async () => {
        await this.plugin.settingsManager.updateSettings({
          activationCode: "",
          activationValidationStatus: "unchecked",
          activationLastCheckedAt: ""
        });
        this.display();
      }));
    new Setting(section)
      .setName(this.t("Donate"))
      .setDesc(this.t("Support ongoing development and theme maintenance."))
      .addButton((button) => button
        .setButtonText(this.language === "zh" ? "打赏" : "Donate")
        .setCta()
        .onClick(() => window.open(purchaseUrl(settings.uiLanguage || "en"), "_blank")));
    new Setting(section)
      .setName(this.t("Custom theme service"))
      .setDesc(this.t("Contact the development team for a branded card theme."))
      .addButton((button) => button
        .setButtonText(this.t("Contact"))
        .onClick(() => window.open(THEME_CUSTOMIZATION_URL, "_blank")));
  }

  private activationStatusDescription(): string {
    const settings = this.plugin.settingsManager.getSettings();
    const checkedAt = settings.activationLastCheckedAt
      ? ` ${this.t("Last checked")}: ${new Date(settings.activationLastCheckedAt).toLocaleString(this.language === "zh" ? "zh-CN" : "en-US")}.`
      : "";
    if (settings.activationValidationStatus === "valid") return `${this.t("Activation code is valid.")}${checkedAt}`;
    if (settings.activationValidationStatus === "invalid") return `${this.t("Activation code is invalid or inactive.")}${checkedAt}`;
    if (settings.activationValidationStatus === "unavailable") return `${this.t("Unable to validate right now. Try again later.")}${checkedAt}`;
    return this.t("Enter the code received after supporting markdown2card.");
  }
}
