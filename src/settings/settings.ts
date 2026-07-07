import { EventEmitter } from "events";
import type YanqiPlugin from "../main";
import { templates } from "../templates";
import type { FontOption, YanqiSettings, YanqiTheme } from "../types";

export const DEFAULT_SETTINGS: YanqiSettings = {
  templateId: "default",
  themeId: "default",
  fontFamily: 'Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, "PingFang SC"',
  fontSize: 16,
  backgroundId: "",
  coverStyle: "cover-classic",
  imageScales: {},
  tableScales: {},
  themes: [],
  customThemes: [],
  userAvatar: "",
  userName: "markdown2card",
  notesTitle: "备忘录",
  userId: "@markdown2card",
  weiboLocation: "湖北",
  showTime: true,
  showFooter: true,
  timeFormat: "zh-CN",
  footerLeftText: "多搜索、多动手、多思考",
  footerRightText: "Vibe Anything",
  customFonts: [
    {
      value: 'Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, "PingFang SC", Cambria, Cochin, Georgia, Times, "Times New Roman", serif',
      label: "默认字体",
      isPreset: true
    },
    { value: 'SimSun, "宋体", serif', label: "宋体", isPreset: true },
    { value: 'SimHei, "黑体", sans-serif', label: "黑体", isPreset: true },
    { value: 'KaiTi, "楷体", serif', label: "楷体", isPreset: true },
    { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: "雅黑", isPreset: true }
  ],
  backgroundSettings: {
    imageUrl: "",
    scale: 1,
    position: { x: 0, y: 0 }
  }
};

export class SettingsManager extends EventEmitter {
  settings: YanqiSettings = DEFAULT_SETTINGS;

  constructor(private plugin: YanqiPlugin) {
    super();
  }

  async loadSettings(): Promise<void> {
    const savedData = (await this.plugin.loadData()) || {};
    if (!savedData.themes || savedData.themes.length === 0) {
      savedData.themes = Object.values(templates).map((theme) => ({
        ...theme,
        isPreset: true,
        isVisible: theme.isVisible ?? true
      }));
    }
    if (!savedData.customThemes) savedData.customThemes = [];
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...savedData,
      backgroundSettings: {
        ...DEFAULT_SETTINGS.backgroundSettings,
        ...(savedData.backgroundSettings || {})
      }
    };
  }

  getSettings(): YanqiSettings {
    return this.settings;
  }

  async saveSettings(): Promise<void> {
    await this.plugin.saveData(this.settings);
  }

  async updateSettings(settings: Partial<YanqiSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await this.saveSettings();
  }

  getAllThemes(): YanqiTheme[] {
    return [...this.settings.themes, ...this.settings.customThemes];
  }

  getVisibleThemes(): YanqiTheme[] {
    return this.getAllThemes().filter((theme) => theme.isVisible !== false);
  }

  getTheme(themeId: string): YanqiTheme | undefined {
    return this.getAllThemes().find((theme) => theme.id === themeId);
  }

  async addCustomTheme(theme: YanqiTheme): Promise<void> {
    theme.isPreset = false;
    theme.isVisible = true;
    this.settings.customThemes.push(theme);
    await this.saveSettings();
    this.emit("theme-visibility-changed");
  }

  async updateTheme(themeId: string, updatedTheme: Partial<YanqiTheme>): Promise<boolean> {
    const presetIndex = this.settings.themes.findIndex((theme) => theme.id === themeId);
    if (presetIndex !== -1) {
      if ("isVisible" in updatedTheme) {
        this.settings.themes[presetIndex] = {
          ...this.settings.themes[presetIndex],
          isVisible: updatedTheme.isVisible
        };
        await this.saveSettings();
        this.emit("theme-visibility-changed");
        return true;
      }
      return false;
    }

    const customIndex = this.settings.customThemes.findIndex((theme) => theme.id === themeId);
    if (customIndex !== -1) {
      this.settings.customThemes[customIndex] = {
        ...this.settings.customThemes[customIndex],
        ...updatedTheme
      };
      await this.saveSettings();
      this.emit("theme-visibility-changed");
      return true;
    }
    return false;
  }

  async removeTheme(themeId: string): Promise<boolean> {
    const theme = this.getTheme(themeId);
    if (!theme || theme.isPreset) return false;
    this.settings.customThemes = this.settings.customThemes.filter((item) => item.id !== themeId);
    if (this.settings.themeId === themeId) this.settings.themeId = "default";
    await this.saveSettings();
    this.emit("theme-visibility-changed");
    return true;
  }

  getFontOptions(): FontOption[] {
    return this.settings.customFonts;
  }

  async addCustomFont(font: FontOption): Promise<void> {
    this.settings.customFonts.push({ ...font, isPreset: false });
    await this.saveSettings();
  }

  async removeFont(value: string): Promise<void> {
    const font = this.settings.customFonts.find((item) => item.value === value);
    if (font && !font.isPreset) {
      this.settings.customFonts = this.settings.customFonts.filter((item) => item.value !== value);
      await this.saveSettings();
    }
  }

  async updateFont(oldValue: string, newFont: FontOption): Promise<void> {
    const index = this.settings.customFonts.findIndex((item) => item.value === oldValue);
    if (index !== -1 && !this.settings.customFonts[index].isPreset) {
      this.settings.customFonts[index] = { ...newFont, isPreset: false };
      await this.saveSettings();
    }
  }
}
