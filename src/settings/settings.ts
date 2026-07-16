import { EventEmitter } from "events";
import type YanqiPlugin from "../main";
import { DEFAULT_AVATAR } from "../assets/defaultAvatar";
import { templates } from "../templates";
import type { FontOption, YanqiSettings, YanqiTheme } from "../types";

export const DEFAULT_PROMPT_EN = `You are an expert copywriter specializing in creating viral Xiaohongshu (RED) posts. Read the following article content and rewrite it into an engaging, viral Xiaohongshu-style post.

Requirements:
1. Catchy Title: Design an attention-grabbing, viral title with emotional value.
2. Clear Structure: Format with paragraphs, subheadings, or emojis to make the text easy to read and breathe.
3. Engaging Tone: Use a lively, practical, and sincere tone, adopting natural Xiaohongshu style elements.
4. Word Count: Keep the post concise, around 400-800 words.
5. Tags: Provide 3-5 relevant high-traffic tags (starting with #) at the very end of the output.
6. Language: You must output the rewritten post and tags in the same language as the input content (e.g., write in Chinese if the input is Chinese, in English if the input is English).
7. Formatting: Output as plain text only. Do not use Markdown formatting such as headers (e.g., #, ##) or bold styling (e.g., **bold**). Emojis and symbols are allowed but must not be abused.

Here is the original article:
\${content}`;

export const DEFAULT_PROMPT_ZH = `你是一个资深的小红书爆款文案专家。请阅读以下文章正文，并将其重写为一篇符合小红书风格的吸引人的爆款笔记正文。

要求：
1. 吸引人的标题：设计一个带有情绪价值、吸引眼球的爆款标题。
2. 结构清晰：使用段落、小标题或 Emoji 表情进行合理排版，让文字有呼吸感。
3. 语气生动：使用活泼、充满干货、真诚分享的语气，善用小红书常用语。
4. 字数控制：字数在 400-800 字左右，保持精炼。
5. 包含 Tag：在结尾加上 3-5 个高热度的小红书相关话题标签（如 #干货分享 #学习打卡 等）。
6. 输出语言：你必须以与输入内容相同的语言输出重写后的笔记和标签（例如，如果输入是中文则用中文写，如果输入是英文则用英文写）。
7. 排版格式：仅输出纯文本。请勿使用 Markdown 格式（如标题 #、## 或加粗 ** 等）。可以使用表情符号和符号，但不可滥用。

以下是文章原文：
\${content}`;

export const LEGACY_PROMPT_ZH = `你是一个资深的小红书爆款文案专家。请阅读以下文章正文，并将其重写为一篇符合小红书风格的吸引人的爆款笔记正文。

要求：
1. 吸引人的标题：设计一个带有情绪价值、吸引眼球的爆款标题。
2. 结构清晰：使用段落、小标题或 Emoji 表情进行合理排版，让文字有呼吸感。
3. 语气生动：使用活泼、充满干货、真诚分享的语气，善用小红书常用语。
4. 字数控制：字数在 400-800 字左右，保持精炼。
5. 包含 Tag：在结尾加上 3-5 个高热度的小红书相关话题标签（如 #干货分享 #学习打卡 等）。
6. 输出语言：你必须以与输入内容相同的语言输出重写后的笔记和标签（例如，如果输入是中文则用中文写，如果输入是英文则用英文写）。
7. 排版格式：仅输出纯文本。请勿使用 Markdown 格式（如标题 #、## 或加粗 ** 等）。可以使用表情符号和符号，但不可滥用。


以下是文章原文：
\${content}`;

export const DEFAULT_SETTINGS: YanqiSettings = {
  templateId: "default",
  themeId: "default",
  fontFamily: 'Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, "PingFang SC"',
  fontSize: 16,
  backgroundId: "",
  coverStyle: "cover-classic",
  imageLayouts: {},
  tableScales: {},
  themes: [],
  customThemes: [],
  userAvatar: DEFAULT_AVATAR,
  userName: "markdown2card",
  notesTitle: "备忘录",
  userId: "@hazel",
  weiboLocation: "湖北",
  showTime: true,
  showFooter: true,
  timeFormat: "zh-CN",
  footerLeftText: "follow me on xhs(5083974065)",
  footerRightText: "ai-vibe.cn",
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
  },
  exportPath: "markdown2card-exports",
  exportFormat: "zip",
  exportCount: 0,
  lastSupportReminderExportCount: 0,
  activationCode: "",
  activationValidationStatus: "unchecked",
  activationLastCheckedAt: "",
  enablePostExportActions: false,
  uiLanguage: "en",
  enableAiSummary: false,
  aiProvider: "gemini",
  agyCommandPath: "agy",
  agyProxyUrl: "",
  agyNoProxy: "localhost,127.0.0.1,::1",
  geminiApiKey: "",
  geminiApiUrl: "https://generativelanguage.googleapis.com",
  geminiModel: "gemini-3.5-flash",
  aiPromptTemplate: DEFAULT_PROMPT_EN,
  aiRewriteThreshold: 800
};

export class SettingsManager extends EventEmitter {
  settings: YanqiSettings = DEFAULT_SETTINGS;

  constructor(private plugin: YanqiPlugin) {
    super();
  }

  async loadSettings(): Promise<void> {
    const loaded: unknown = await this.plugin.loadData();
    const savedData = (this.isRecord(loaded) ? loaded : {}) as Partial<YanqiSettings>;
    if (!savedData.themes || savedData.themes.length === 0) {
      savedData.themes = Object.values(templates).map((theme) => ({
        ...theme,
        isPreset: true,
        isVisible: theme.isVisible ?? true
      }));
    }
    if (!savedData.customThemes) savedData.customThemes = [];

    const uiLang = savedData.uiLanguage || DEFAULT_SETTINGS.uiLanguage || "en";
    let prompt = savedData.aiPromptTemplate;
    if (!prompt || prompt === LEGACY_PROMPT_ZH || prompt === DEFAULT_PROMPT_ZH || prompt === DEFAULT_PROMPT_EN) {
      prompt = uiLang === "zh" ? DEFAULT_PROMPT_ZH : DEFAULT_PROMPT_EN;
    }

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...savedData,
      userAvatar: savedData.userAvatar || DEFAULT_SETTINGS.userAvatar,
      aiPromptTemplate: prompt,
      backgroundSettings: {
        ...DEFAULT_SETTINGS.backgroundSettings,
        ...(savedData.backgroundSettings || {})
      }
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  getSettings(): YanqiSettings {
    return this.settings;
  }

  async saveSettings(): Promise<void> {
    await this.plugin.saveData(this.settings);
  }

  async updateSettings(settings: Partial<YanqiSettings>): Promise<void> {
    const languageChanged = settings.uiLanguage && settings.uiLanguage !== this.settings.uiLanguage;
    const wasEntitled = this.settings.activationValidationStatus === "valid";
    const oldLang = this.settings.uiLanguage;
    this.settings = { ...this.settings, ...settings };

    if (languageChanged) {
      const currentPrompt = this.settings.aiPromptTemplate;
      const oldDefault = oldLang === "zh" ? DEFAULT_PROMPT_ZH : DEFAULT_PROMPT_EN;
      if (!currentPrompt || currentPrompt === oldDefault || currentPrompt === LEGACY_PROMPT_ZH) {
        this.settings.aiPromptTemplate = this.settings.uiLanguage === "zh" ? DEFAULT_PROMPT_ZH : DEFAULT_PROMPT_EN;
      }
    }

    await this.saveSettings();
    if (languageChanged) this.emit("language-changed");
    if (wasEntitled !== (this.settings.activationValidationStatus === "valid")) this.emit("entitlement-changed");
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
