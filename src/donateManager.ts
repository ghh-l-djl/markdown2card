import type { App, Plugin } from "obsidian";

const ADONG_PROFILE_IMAGE = "community.png";

export class DonateManager {
  private static app: App;
  private static plugin: Plugin;
  private static overlay: HTMLElement | null = null;

  static initialize(app: App, plugin: Plugin): void {
    this.app = app;
    this.plugin = plugin;
  }

  static showDonateModal(container: HTMLElement): void {
    if (this.overlay) this.closeDonateModal();
    this.overlay = container.createEl("div", { cls: "mp-donate-overlay" });
    const modal = this.overlay.createEl("div", { cls: "mp-about-modal" });
    const closeButton = modal.createEl("button", { cls: "mp-donate-close", text: "×" });

    const authorSection = modal.createEl("div", { cls: "mp-about-section mp-about-intro-section" });
    authorSection.createEl("h4", { text: "关于阿东", cls: "mp-about-title" });
    const intro = authorSection.createEl("p", { cls: "mp-about-intro" });
    intro.appendText("你好，我是");
    intro.createEl("span", { cls: "mp-about-name", text: "阿东玩AI" });
    intro.appendText("，大模型算法工程师、OPC 创业者。");
    intro.createEl("span", { cls: "mp-about-identity", text: "小红书号：854178858" });

    const roles = authorSection.createEl("div", { cls: "mp-about-roles" });
    ["大厂面试官", "大模型算法 er", "企业 Agent 落地陪跑", "AI 效率实践者"].forEach((role) => {
      roles.createEl("span", { cls: "mp-about-role-chip", text: role });
    });
    authorSection.createEl("p", {
      cls: "mp-about-desc",
      text: "我会持续分享工程实践、技术总结、AI 副业和企业 Agent 落地经验。YANQI 也是这个实验室的一部分，希望它能让你的内容更容易被看见。"
    });

    const profileSection = modal.createEl("div", { cls: "mp-about-section mp-about-profile-section" });
    profileSection.createEl("h4", { text: "加入阿东的大模型实验室", cls: "mp-about-subtitle" });
    profileSection.createEl("p", { cls: "mp-about-desc", text: "长按或截图扫码，加入阿东的大模型实验室；也欢迎关注公众号：阿东玩AI。" });
    const profileCard = profileSection.createEl("div", { cls: "mp-about-profile-card" });
    const profileImageSrc = this.getProfileImageSrc();
    if (profileImageSrc) {
      profileCard.createEl("img", { attr: { src: profileImageSrc, alt: "阿东的大模型实验室二维码" } });
    } else {
      profileCard.createEl("p", { cls: "mp-about-desc", text: "二维码图片暂时加载失败，可以搜索公众号：阿东玩AI。" });
    }
    const footer = profileSection.createEl("p", { cls: "mp-about-footer" });
    footer.appendText("一起把 Obsidian 里的思考，变成能传播的内容。");
    footer.createEl("strong", { text: "欢迎来聊 AI、内容和 Agent 落地。" });

    closeButton.addEventListener("click", () => this.closeDonateModal());
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) this.closeDonateModal();
    });
  }

  static closeDonateModal(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  private static getProfileImageSrc(): string {
    try {
      const pluginDir = this.plugin.manifest.dir || ".obsidian/plugins/yanqi-obsidian";
      return this.app.vault.adapter.getResourcePath(`${pluginDir}/${ADONG_PROFILE_IMAGE}`);
    } catch {
      return "";
    }
  }
}
