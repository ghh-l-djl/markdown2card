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

    if (!geminiApiKey) {
      new Notice("请在插件设置中配置 Gemini API Key");
      throw new Error("Missing Gemini API Key");
    }

    const prompt = aiPromptTemplate.replace("${content}", content);

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
    } catch (error) {
      console.error("Gemini request failed:", error);
      new Notice(`AI 重写失败: ${error.message || error}`);
      throw error;
    }
  }
}
