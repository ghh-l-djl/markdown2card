import { Notice, Plugin } from "obsidian";
import { AiManager } from "./aiManager";
import { RedConverter } from "./converter";
import { MARKDOWN2CARD_ICON } from "./icons";
import { RedSettingTab } from "./settings/SettingTab";
import { SettingsManager } from "./settings/settings";
import { ThemeManager } from "./themeManager";
import { RedView, VIEW_TYPE_RED } from "./view";

export default class YanqiPlugin extends Plugin {
  settingsManager: SettingsManager;
  themeManager: ThemeManager;
  aiManager: AiManager;

  async onload(): Promise<void> {
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();
    this.themeManager = new ThemeManager(this.app, this.settingsManager);
    this.themeManager.setCurrentTheme(this.settingsManager.getSettings().themeId);
    this.themeManager.setFont(this.settingsManager.getSettings().fontFamily);
    this.themeManager.setFontSize(this.settingsManager.getSettings().fontSize);
    this.aiManager = new AiManager(this.app, this);
    RedConverter.initialize(this.app, this);
    this.registerView(VIEW_TYPE_RED, (leaf) => new RedView(leaf, this.themeManager, this.settingsManager));
    this.addCommand({
      id: "open-mp-preview",
      name: "open markdown2card preview",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "ai-summarize-current-note",
      name: "AI 总结当前文件为卡片草稿",
      callback: () => this.summarizeActiveFile()
    });
    this.addRibbonIcon(MARKDOWN2CARD_ICON, "打开 markdown2card 预览", () => this.activateView());
    this.addRibbonIcon("sparkles", "AI 总结当前文件为卡片草稿", () => this.summarizeActiveFile());
    this.addSettingTab(new RedSettingTab(this.app, this));
  }

  async summarizeActiveFile(): Promise<void> {
    try {
      await this.aiManager.summarizeActiveFile();
    } catch (error) {
      console.error("AI 总结失败:", error);
      new Notice(`AI 总结失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async activateView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RED);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
      return;
    }
    const rightLeaf = this.app.workspace.getRightLeaf(false);
    if (!rightLeaf) {
      new Notice("无法创建视图面板");
      return;
    }
    await rightLeaf.setViewState({ type: VIEW_TYPE_RED, active: true });
  }
}
