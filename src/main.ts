import { addIcon, Notice, Plugin, requestUrl } from "obsidian";
import { claimCheckoutActivation } from "./checkoutActivation";
import { RedConverter } from "./converter";
import { MARKDOWN2CARD_ICON, MARKDOWN2CARD_ICON_SVG } from "./icons";
import { RedSettingTab } from "./settings/SettingTab";
import { SettingsManager } from "./settings/settings";
import { ThemeManager } from "./themeManager";
import { RedView, VIEW_TYPE_RED } from "./view";

declare const MARKDOWN2CARD_CLAIM_URL: string;

export default class YanqiPlugin extends Plugin {
  settingsManager: SettingsManager;
  themeManager: ThemeManager;

  async onload(): Promise<void> {
    addIcon(MARKDOWN2CARD_ICON, MARKDOWN2CARD_ICON_SVG);
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();
    this.themeManager = new ThemeManager(this.app, this.settingsManager);
    this.themeManager.setCurrentTheme(this.settingsManager.getSettings().themeId);
    this.themeManager.setFont(this.settingsManager.getSettings().fontFamily);
    this.themeManager.setFontSize(this.settingsManager.getSettings().fontSize);
    RedConverter.initialize(this.app, this);
    this.registerView(VIEW_TYPE_RED, (leaf) => new RedView(leaf, this.themeManager, this.settingsManager));
    this.addCommand({
      id: "open-mp-preview",
      name: "open markdown2card preview",
      callback: () => this.activateView()
    });
    this.addRibbonIcon(MARKDOWN2CARD_ICON, "打开 markdown2card 预览", () => this.activateView());
    this.addSettingTab(new RedSettingTab(this.app, this));
    this.registerObsidianProtocolHandler("markdown2card-activate", async (params) => {
      const result = await claimCheckoutActivation(params.session_id || "", {
        endpoint: MARKDOWN2CARD_CLAIM_URL,
        request: async (options) => requestUrl(options)
      });
      if (result.status !== "valid" || !result.activationCode) {
        new Notice(result.status === "invalid"
          ? "Markdown2Card payment session is invalid or expired."
          : "Unable to activate Markdown2Card right now. Please use the copied activation code.");
        return;
      }
      await this.settingsManager.updateSettings({
        activationCode: result.activationCode,
        activationValidationStatus: "valid",
        activationLastCheckedAt: new Date().toISOString()
      });
      new Notice("Markdown2Card activated successfully.");
    });
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
