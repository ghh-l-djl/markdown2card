import { requestUrl, Notice } from "obsidian";
import { YanqiSettings } from "./types";
import { SettingsManager } from "./settings/settings";

export class AiManager {
  constructor(private settingsManager: SettingsManager) {}

  async generateSummary(content: string): Promise<string> {
    return AiManager.rewriteContent(content, this.settingsManager.getSettings());
  }

  static async rewriteContent(content: string, settings: YanqiSettings): Promise<string> {
    const { geminiApiKey, geminiModel, aiPromptTemplate } = settings;
    const isZh = settings.uiLanguage === "zh";

    if (!geminiApiKey) {
      new Notice(isZh ? "请在插件设置中配置 Gemini API Key" : "Please configure Gemini API Key in plugin settings");
      throw new Error("Missing Gemini API Key");
    }

    const prompt = aiPromptTemplate.replaceAll("${content}", content);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    try {
      const response = await requestUrl({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      if (response.status !== 200) {
        throw new Error(`Gemini API returned status ${response.status}: ${response.text}`);
      }

      const json = response.json;
      const generatedText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("Gemini API returned an empty response structure");
      }

      return generatedText.trim();
    } catch (error: any) {
      console.error("Gemini request failed:", error);
      const errMsg = (error.status !== undefined || error.text !== undefined)
        ? `Status ${error.status}: ${error.text || error.message || ""}`
        : (error.message || String(error));
      
      const noticePrefix = isZh ? "AI 重写失败: " : "AI rewrite failed: ";
      new Notice(`${noticePrefix}${errMsg}`);
      throw error;
    }
  }
}
