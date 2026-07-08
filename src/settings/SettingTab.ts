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
    buttons.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    buttons.createEl("button", { cls: "mod-cta", text: "Confirm" }).addEventListener("click", () => {
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
    this.contentEl.createEl("h3", { text: this.font.label ? "Edit font" : "Add font" });
    new Setting(this.contentEl).setName("Font name").setDesc("The label shown in the font menu.").addText((text) => text.setValue(this.font.label).onChange((value) => this.font.label = value));
    new Setting(this.contentEl).setName("Font family").setDesc("CSS font-family value.").addText((text) => text.setValue(this.font.value).onChange((value) => this.font.value = value));
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Save").setCta().onClick(async () => {
        if (!this.font.label || !this.font.value) return;
        await this.onSubmit(this.font);
        this.close();
      }))
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }
}

class ThemePreviewModal extends Modal {
  constructor(app: App, private plugin: YanqiPlugin, private theme: YanqiTheme) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("theme-preview-modal");
    this.contentEl.createEl("h2", { text: `Theme preview: ${this.theme.name}`, cls: "red-theme-title" });
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
    this.contentEl.createEl("h2", { text: this.existingTheme ? "Edit theme" : "Create theme" });
    new Setting(this.contentEl).setName("Theme name").addText((text) => text.setValue(this.name).onChange((value) => this.name = value.trim()));
    new Setting(this.contentEl).setName("Theme description").addText((text) => text.setValue(this.description).onChange((value) => this.description = value.trim()));
    new Setting(this.contentEl).setName("Styles JSON").setDesc("Use the same styles structure as built-in themes.").addTextArea((area) => {
      area.setValue(this.raw).onChange((value) => this.raw = value);
      area.inputEl.addClass("custom-css-input");
      area.inputEl.rows = 18;
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Preview").onClick(() => {
        const theme = this.buildTheme();
        if (theme) new ThemePreviewModal(this.app, this.plugin, theme).open();
      }))
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) => button.setButtonText("Save").setCta().onClick(async () => {
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
    containerEl.createEl("h2", { text: "markdown2card Settings" });
    this.renderCommunitySettings(containerEl);
    this.createSection(containerEl, "General", (el) => this.renderBasicSettings(el));
    this.createSection(containerEl, "AI", (el) => this.renderAiSettings(el));
    this.createSection(containerEl, "Export", (el) => this.renderExportSettings(el));
    this.createSection(containerEl, "Themes", (el) => this.renderThemeSettings(el));
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
    const settings = this.plugin.settingsManager.getSettings();
    new Setting(containerEl)
      .setName("Interface language")
      .setDesc("Choose the language used by the preview controls.")
      .addDropdown((dropdown) => dropdown
        .addOption("en", "English")
        .addOption("zh", "中文")
        .setValue(settings.uiLanguage || "en")
        .onChange(async (value) => {
          await this.plugin.settingsManager.updateSettings({ uiLanguage: value as "en" | "zh" });
          this.display();
        }));
    new Setting(containerEl).setName("Show time").addToggle((toggle) => toggle.setValue(settings.showTime !== false).onChange((value) => this.plugin.settingsManager.updateSettings({ showTime: value })));
    new Setting(containerEl).setName("Show footer").addToggle((toggle) => toggle.setValue(settings.showFooter !== false).onChange((value) => this.plugin.settingsManager.updateSettings({ showFooter: value })));

    containerEl.createEl("h4", { text: "Fonts" });
    this.plugin.settingsManager.getFontOptions().forEach((font) => {
      const setting = new Setting(containerEl).setName(font.label).setDesc(font.value);
      if (!font.isPreset) {
        setting
          .addExtraButton((button) => button.setIcon("pencil").setTooltip("Edit").onClick(() => {
            new CreateFontModal(this.app, async (updated) => {
              await this.plugin.settingsManager.updateFont(font.value, updated);
              this.display();
            }, font).open();
          }))
          .addExtraButton((button) => button.setIcon("trash").setTooltip("Delete").onClick(() => {
            new ConfirmModal(this.app, "Delete font", `Delete the "${font.label}" font configuration?`, async () => {
              await this.plugin.settingsManager.removeFont(font.value);
              this.display();
            }).open();
          }));
      }
    });
    new Setting(containerEl).addButton((button) => button.setButtonText("+ Add font").setCta().onClick(() => {
      new CreateFontModal(this.app, async (font) => {
        await this.plugin.settingsManager.addCustomFont(font);
        this.display();
      }).open();
    }));
  }

  private renderExportSettings(containerEl: HTMLElement): void {
    const settings = this.plugin.settingsManager.getSettings();
    new Setting(containerEl)
      .setName("Export path")
      .setDesc("Relative paths are written inside the vault. Absolute paths such as /Users/name/Exports, C:\\Exports, or \\\\server\\share\\Exports are written to the file system.")
      .addText((text) => text
        .setPlaceholder("markdown2card-exports")
        .setValue(settings.exportPath)
        .onChange((value) => this.plugin.settingsManager.updateSettings({ exportPath: value.trim() || "markdown2card-exports" })));

    new Setting(containerEl)
      .setName("Export format")
      .setDesc("Zip writes one archive. PNG folder writes each page image into a folder named after the current note.")
      .addDropdown((dropdown) => dropdown
        .addOption("zip", "Zip archive")
        .addOption("png-folder", "PNG folder")
        .setValue(settings.exportFormat)
        .onChange((value) => this.plugin.settingsManager.updateSettings({ exportFormat: value as "zip" | "png-folder" })));

    new Setting(containerEl)
      .setName("Post-export actions")
      .setDesc("After export, mark the source note as source material, create a publish-ready note, and link the exported assets.")
      .addToggle((toggle) => toggle
        .setValue(settings.enablePostExportActions)
        .onChange((value) => this.plugin.settingsManager.updateSettings({ enablePostExportActions: value })));
  }

  private renderAiSettings(containerEl: HTMLElement): void {
    const settings = this.plugin.settingsManager.getSettings();
    new Setting(containerEl)
      .setName("AI CLI path")
      .setDesc("Defaults to agy. If Obsidian cannot find the command, enter the full path.")
      .addText((text) => text
        .setPlaceholder("agy")
        .setValue(settings.aiCliPath)
        .onChange((value) => this.plugin.settingsManager.updateSettings({ aiCliPath: value.trim() || "agy" })));

    new Setting(containerEl)
      .setName("AI CLI arguments")
      .setDesc("The prompt is appended to the end of these arguments. The default is for agy --print.")
      .addText((text) => text
        .setPlaceholder("--print")
        .setValue(settings.aiCliArgs)
        .onChange((value) => this.plugin.settingsManager.updateSettings({ aiCliArgs: value })));

    new Setting(containerEl)
      .setName("Summary output folder")
      .setDesc("Vault-relative folder for generated summary drafts.")
      .addText((text) => text
        .setPlaceholder("AI Summaries")
        .setValue(settings.aiOutputFolder)
        .onChange((value) => this.plugin.settingsManager.updateSettings({ aiOutputFolder: value.trim() || "AI Summaries" })));

    new Setting(containerEl)
      .setName("Summary prompt")
      .setDesc("Supports {{title}}, {{path}}, and {{content}} placeholders.")
      .addTextArea((area) => {
        area.setValue(settings.aiSummaryPrompt).onChange((value) => this.plugin.settingsManager.updateSettings({ aiSummaryPrompt: value }));
        area.inputEl.rows = 12;
        area.inputEl.addClass("custom-css-input");
      });
  }

  private renderThemeSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h4", { text: "Visible themes" });
    this.plugin.settingsManager.getAllThemes().forEach((theme) => {
      new Setting(containerEl)
        .setName(theme.name)
        .setDesc(theme.description || (theme.isPreset ? "Built-in theme" : "Custom theme"))
        .addToggle((toggle) => toggle.setValue(theme.isVisible !== false).onChange(async (value) => {
          await this.plugin.settingsManager.updateTheme(theme.id, { isVisible: value });
          this.display();
        }))
        .addExtraButton((button) => button.setIcon("eye").setTooltip("Preview").onClick(() => new ThemePreviewModal(this.app, this.plugin, theme).open()));
    });

    containerEl.createEl("h4", { text: "Custom themes" });
    this.plugin.settingsManager.getAllThemes().filter((theme) => !theme.isPreset).forEach((theme) => {
      new Setting(containerEl)
        .setName(theme.name)
        .setDesc(theme.description || "")
        .addExtraButton((button) => button.setIcon("pencil").setTooltip("Edit").onClick(() => {
          new CreateThemeModal(this.app, this.plugin, async (updated) => {
            await this.plugin.settingsManager.updateTheme(theme.id, updated);
            this.display();
          }, theme).open();
        }))
        .addExtraButton((button) => button.setIcon("trash").setTooltip("Delete").onClick(() => {
          new ConfirmModal(this.app, "Delete theme", `Delete the "${theme.name}" theme? This cannot be undone.`, async () => {
            await this.plugin.settingsManager.removeTheme(theme.id);
            this.display();
          }).open();
        }));
    });
    new Setting(containerEl).addButton((button) => button.setButtonText("+ Create theme").setCta().onClick(() => {
      new CreateThemeModal(this.app, this.plugin, async (theme) => {
        await this.plugin.settingsManager.addCustomTheme(theme);
        this.display();
      }).open();
    }));
  }

  private renderCommunitySettings(containerEl: HTMLElement): void {
    const section = containerEl.createDiv("red-community-section");
    section.createEl("h4", { text: "Community" });
    section.createEl("p", {
      cls: "red-settings-note",
      text: "markdown2card grows through community themes. Please submit a pull request with new theme styles to help enrich the ecosystem."
    });
    new Setting(section)
      .setName("Donate")
      .setDesc("Support ongoing development and theme maintenance.")
      .addButton((button) => button
        .setButtonText("Donate")
        .setCta()
        .onClick(() => window.open("https://ghh-l-djl.github.io/", "_blank")));
  }
}
