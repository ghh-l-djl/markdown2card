import { requestUrl } from "obsidian";
import { runAgyCommand } from "./agyManager";
import { YanqiSettings } from "./types";

export class AiManager {
  static async rewriteContent(content: string, settings: YanqiSettings): Promise<string> {
    const { geminiApiKey, geminiModel, aiPromptTemplate } = settings;
    const isZh = settings.uiLanguage === "zh";
    const prompt = aiPromptTemplate.split("${content}").join(content);

    if (settings.aiProvider === "agy") {
      return runAgyCommand(settings.agyCommandPath || "agy", prompt, {
        proxyUrl: settings.agyProxyUrl,
        noProxy: settings.agyNoProxy
      });
    }

    if (!geminiApiKey) {
      throw new Error(isZh ? "请在插件设置中配置 Gemini API Key" : "Please configure Gemini API Key in plugin settings");
    }

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

      const json: unknown = response.json;
      const generatedText = this.extractGeneratedText(json);

      if (!generatedText) {
        throw new Error("Gemini API returned an empty response structure");
      }

      return generatedText.trim();
    } catch (error: unknown) {
      throw new Error(this.describeError(error));
    }
  }

  private static extractGeneratedText(value: unknown): string | null {
    if (!this.isRecord(value) || !Array.isArray(value.candidates)) return null;
    const candidate: unknown = value.candidates[0];
    if (!this.isRecord(candidate) || !this.isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) return null;
    const part: unknown = candidate.content.parts[0];
    return this.isRecord(part) && typeof part.text === "string" ? part.text.trim() : null;
  }

  private static describeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (!this.isRecord(error)) return typeof error === "string" ? error : "Gemini request failed";
    const status = typeof error.status === "number" ? String(error.status) : "";
    const text = typeof error.text === "string" ? error.text : "";
    const message = typeof error.message === "string" ? error.message : "";
    return status ? `Status ${status}: ${text || message}` : message || text || "Gemini request failed";
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}
