import { Notice, Plugin } from "obsidian";
import { RedConverter } from "./converter";
import { DonateManager } from "./donateManager";
import { RedSettingTab } from "./settings/SettingTab";
import { SettingsManager } from "./settings/settings";
import { ThemeManager } from "./themeManager";
import { RedView, VIEW_TYPE_RED } from "./view";

export default class YanqiPlugin extends Plugin {
  settingsManager: SettingsManager;
  themeManager: ThemeManager;

  async onload(): Promise<void> {
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();
    this.themeManager = new ThemeManager(this.app, this.settingsManager);
    this.themeManager.setCurrentTheme(this.settingsManager.getSettings().themeId);
    this.themeManager.setFont(this.settingsManager.getSettings().fontFamily);
    this.themeManager.setFontSize(this.settingsManager.getSettings().fontSize);

    RedConverter.initialize(this.app, this);
    DonateManager.initialize(this.app, this);

    this.registerView(VIEW_TYPE_RED, (leaf) => new RedView(leaf, this.themeManager, this.settingsManager));
    this.addCommand({
      id: "open-mp-preview",
      name: "打开言起 YANQI 预览",
      callback: () => this.activateView()
    });
    this.addRibbonIcon("image", "打开言起 YANQI 预览", () => this.activateView());
    this.addSettingTab(new RedSettingTab(this.app, this));
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
