# Add AI-powered Xiaohongshu Marketing Rewriter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the Obsidian-to-Card plugin's post-export actions to call the Gemini API and rewrite the exported note's body into a highly engaging Xiaohongshu (XHS) marketing style.

**Architecture:** Use Obsidian's native `requestUrl` to communicate directly with the Gemini API. Add configurations for API key, model selection, and prompt customization in Settings. Intercept the post-export handler to perform AI rewriting asynchronously.

**Tech Stack:** TypeScript, Obsidian API (`requestUrl`), Google Gemini API (`gemini-1.5-pro` / `gemini-1.5-flash`).

## Global Constraints
- Use TypeScript with two-space indentation.
- Do not add external NPM dependencies to avoid bundle bloat. Use native `requestUrl`.
- Ensure all user facing strings support multilingual environments if applicable, otherwise keep in line with the project style.

---

### Task 1: Extend Settings Type and Defaults

**Files:**
- Modify: `src/types.ts`
- Modify: `src/settings/settings.ts`

**Interfaces:**
- Consumes: Existing `YanqiSettings` interface
- Produces: Updated `YanqiSettings` fields: `enableAiSummary`, `geminiApiKey`, `geminiModel`, `aiPromptTemplate`

- [ ] **Step 1: Modify `src/types.ts` to add AI configuration types**

Add fields to the `YanqiSettings` interface:
```typescript
export interface YanqiSettings {
  // ... existing settings ...
  enableAiSummary: boolean;
  geminiApiKey: string;
  geminiModel: string;
  aiPromptTemplate: string;
}
```

- [ ] **Step 2: Add defaults to `src/settings/settings.ts`**

Update `DEFAULT_SETTINGS` in `src/settings/settings.ts`:
```typescript
const DEFAULT_SETTINGS: YanqiSettings = {
  // ... existing defaults ...
  enablePostExportActions: false,
  enableAiSummary: false,
  geminiApiKey: "",
  geminiModel: "gemini-1.5-flash",
  aiPromptTemplate: `你是一个资深的小红书爆款文案专家。请阅读以下文章正文，并将其重写为一篇符合小红书风格的吸引人的爆款笔记正文。

要求：
1. 吸引人的标题：设计一个带有情绪价值、吸引眼球的爆款标题。
2. 结构清晰：使用段落、小标题或 Emoji 表情进行合理排版，让文字有呼吸感。
3. 语气生动：使用活泼、充满干货、真诚分享的语气，善用小红书常用语，如“姐妹们”、“干货预警”、“绝绝子”等，但要自然。
4. 包含 Tag：在结尾加上 3-5 个高热度的小红书相关话题标签（如 #干货分享 #学习打卡 等）。
5. 字数控制：字数在 400-800 字左右，保持精炼。

以下是文章原文：
\${content}`
};
```

- [ ] **Step 3: Build to verify compile success**

Run: `npm run build`
Expected: Compile succeeds with no errors.

- [ ] **Step 4: Commit settings configuration changes**

Run:
```bash
git add src/types.ts src/settings/settings.ts
git commit -m "feat: add AI settings configuration and defaults"
```

---

### Task 2: Create Settings User Interface

**Files:**
- Modify: `src/settings/SettingTab.ts`

**Interfaces:**
- Consumes: `YanqiSettings` types and UI elements
- Produces: Visual fields in Obsidian Settings Tab for Gemini configuration

- [ ] **Step 1: Add setting controls to `src/settings/SettingTab.ts`**

Locate the `display()` function. Insert the setting fields after the `enablePostExportActions` section:
```typescript
    // Existing Post Export Actions toggle
    new Setting(containerEl)
      .setName("启用导出后置操作")
      .setDesc("导出后自动在源文件同目录下生成一个发布版MD文件")
      .addToggle((toggle) =>
        toggle
          .setValue(settings.enablePostExportActions)
          .onChange((value) => {
            this.plugin.settingsManager.updateSettings({ enablePostExportActions: value });
            this.display(); // Refresh to show/hide AI settings dynamically
          })
      );

    if (settings.enablePostExportActions) {
      containerEl.createEl("h3", { text: "AI 总结与重写设置" });

      new Setting(containerEl)
        .setName("启用 AI 智能重写")
        .setDesc("使用 Gemini 自动将导出文件的正文重写为小红书等营销风格文案")
        .addToggle((toggle) =>
          toggle
            .setValue(settings.enableAiSummary)
            .onChange((value) => {
              this.plugin.settingsManager.updateSettings({ enableAiSummary: value });
              this.display();
            })
        );

      if (settings.enableAiSummary) {
        new Setting(containerEl)
          .setName("Gemini API Key")
          .setDesc("输入您的 Gemini API 密钥 (从 Google AI Studio 获取)")
          .addText((text) =>
            text
              .setPlaceholder("AIzaSy...")
              .setValue(settings.geminiApiKey)
              .onChange((value) => {
                this.plugin.settingsManager.updateSettings({ geminiApiKey: value.trim() });
              })
          );

        new Setting(containerEl)
          .setName("Gemini 模型")
          .setDesc("选择重写使用的 Gemini 模型")
          .addDropdown((dropdown) =>
            dropdown
              .addOption("gemini-1.5-flash", "Gemini 1.5 Flash (快速/经济)")
              .addOption("gemini-1.5-pro", "Gemini 1.5 Pro (高质量/高推理能力)")
              .setValue(settings.geminiModel)
              .onChange((value) => {
                this.plugin.settingsManager.updateSettings({ geminiModel: value });
              })
          );

        new Setting(containerEl)
          .setName("AI 提示词模板 (Prompt)")
          .setDesc("自定义重写提示词。使用 ${content} 代表文章原文。")
          .addTextArea((textArea) =>
            textArea
              .setPlaceholder("输入 AI Prompt...")
              .setValue(settings.aiPromptTemplate)
              .onChange((value) => {
                this.plugin.settingsManager.updateSettings({ aiPromptTemplate: value });
              })
          );
      }
    }
```

- [ ] **Step 2: Build project**

Run: `npm run build`
Expected: Compilation completes without errors.

- [ ] **Step 3: Commit UI changes**

Run:
```bash
git add src/settings/SettingTab.ts
git commit -m "feat: add AI configurations to settings UI"
```

---

### Task 3: Implement Gemini AI Service Manager

**Files:**
- Create: `src/aiManager.ts`

**Interfaces:**
- Consumes: `YanqiSettings` via `this.settingsManager`
- Produces: `AiManager` class with static/instance method `generateSummary(content: string): Promise<string>`

- [ ] **Step 1: Create `src/aiManager.ts` with HTTP request logic**

Write the AI request implementation using Obsidian's `requestUrl`:
```typescript
import { requestUrl, Notice } from "obsidian";
import { YanqiSettings } from "./types";

export class AiManager {
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
```

- [ ] **Step 2: Build project**

Run: `npm run build`
Expected: Compilation completes without errors.

- [ ] **Step 3: Commit AI Manager implementation**

Run:
```bash
git add src/aiManager.ts
git commit -m "feat: implement AiManager using Obsidian requestUrl"
```

---

### Task 4: Integrate AI Summary into Post-Export Pipeline

**Files:**
- Modify: `src/view.ts`

**Interfaces:**
- Consumes: `AiManager.rewriteContent`
- Produces: Asynchronous AI summarization before file writing in `applyPostExportActions`

- [ ] **Step 1: Import `AiManager` in `src/view.ts`**

Add the import line at the top of `src/view.ts`:
```typescript
import { AiManager } from "./aiManager";
```

- [ ] **Step 2: Modify `applyPostExportActions` and `buildPublishMarkdown` to handle AI summary**

Update `applyPostExportActions` in `src/view.ts`:
```typescript
  private async applyPostExportActions(assetPath: string, assetPathIsAbsolute: boolean): Promise<void> {
    if (!this.currentFile) return;
    const sourceFile = this.currentFile;
    const sourceContent = await this.app.vault.cachedRead(sourceFile);
    const publishPath = this.getPublishPath(sourceFile);
    const absoluteAssetPath = assetPathIsAbsolute ? assetPath : this.getAdapterFullPath(assetPath);
    const settings = this.settingsManager.getSettings();

    let body = this.stripFrontMatter(sourceContent);

    if (settings.enableAiSummary) {
      new Notice("正在调用 Gemini 重写小红书营销文案...");
      try {
        body = await AiManager.rewriteContent(body, settings);
        new Notice("AI 营销文案生成成功！");
      } catch (error) {
        new Notice("生成失败，将使用文章原文作为正文导出。");
      }
    }

    const publishContent = this.buildPublishMarkdownWithBody(body, sourceFile.path, absoluteAssetPath);
    const existingPublishFile = this.app.vault.getAbstractFileByPath(publishPath);

    if (existingPublishFile instanceof TFile) {
      await this.app.vault.modify(existingPublishFile, publishContent);
    } else {
      await this.ensureFolder(this.dirname(publishPath));
      await this.app.vault.create(publishPath, publishContent);
    }

    await this.app.fileManager.processFrontMatter(sourceFile, (frontmatter) => {
      if (frontmatter.content_role !== "source_material") {
        frontmatter.content_role = "source_material";
      }
      const current = Array.isArray(frontmatter.derived_to)
        ? frontmatter.derived_to
        : frontmatter.derived_to
          ? [frontmatter.derived_to]
          : [];
      if (!current.includes(publishPath)) current.push(publishPath);
      frontmatter.derived_to = current;
    });
  }
```

AndUpdate `buildPublishMarkdown` or replace it with `buildPublishMarkdownWithBody`:
```typescript
  private buildPublishMarkdownWithBody(body: string, sourcePath: string, absoluteAssetPath: string): string {
    return [
      "---",
      "content_role: publish_package",
      "publish_status: ready",
      "publish_platform: xhs",
      "publish_medium: screenshot",
      "publish_variant: xhs_screenshot",
      "derived_from:",
      `  - ${this.yamlQuote(`[[${sourcePath}]]`)}`,
      `assets: ${this.yamlQuote(`files://${absoluteAssetPath}`)}`,
      "---",
      body
    ].join("\n");
  }
```

- [ ] **Step 3: Clean up old `buildPublishMarkdown` if unused**

Verify no references to `buildPublishMarkdown` remain and clean it up.

- [ ] **Step 4: Build project**

Run: `npm run build`
Expected: Compilation completes without errors.

- [ ] **Step 5: Commit post-export integrations**

Run:
```bash
git add src/view.ts
git commit -m "feat: integrate AiManager summary into post-export pipeline"
```
