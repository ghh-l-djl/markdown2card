import { requestUrl } from "obsidian";
import { YanqiSettings } from "./types";

export class AiManager {
  static async rewriteContent(content: string, settings: YanqiSettings): Promise<string> {
    const { geminiApiKey, geminiModel, aiPromptTemplate } = settings;
    const isZh = settings.uiLanguage === "zh";

    if (!geminiApiKey) {
      throw new Error(isZh ? "请在插件设置中配置 Gemini API Key" : "Please configure Gemini API Key in plugin settings");
    }

    const prompt = aiPromptTemplate.replaceAll("${content}", content);

    let baseUrl = (settings.geminiApiUrl || "https://generativelanguage.googleapis.com").trim();
    baseUrl = baseUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

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
      throw new Error(errMsg);
    }
  }
}
