import { execFile } from "child_process";
import { Notice, normalizePath, TFile, type App } from "obsidian";
import type YanqiPlugin from "./main";

export class AiManager {
  constructor(private app: App, private plugin: YanqiPlugin) {}

  async summarizeActiveFile(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new Notice("请先打开一个 Markdown 文件");
      return;
    }

    const content = await this.app.vault.read(file);
    if (!content.trim()) {
      new Notice("当前文件没有可总结的内容");
      return;
    }

    new Notice("正在调用 AI 总结当前文件...");
    const summary = await this.runSummary(content, file);
    const outputFile = await this.createSummaryFile(file, summary);
    await this.app.workspace.getLeaf(false).openFile(outputFile);
    await this.plugin.activateView();
    new Notice("AI 总结已生成");
  }

  private async runSummary(content: string, file: TFile): Promise<string> {
    const settings = this.plugin.settingsManager.getSettings();
    const prompt = settings.aiSummaryPrompt
      .split("{{title}}").join(file.basename)
      .split("{{path}}").join(file.path)
      .split("{{content}}").join(content);
    const args = this.parseArgs(settings.aiCliArgs);
    args.push(prompt);
    return this.execCli(settings.aiCliPath || "agy", args);
  }

  private execCli(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(command, args, {
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 10
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        const output = stdout.trim();
        if (!output) {
          reject(new Error(stderr.trim() || "AI CLI 没有返回内容"));
          return;
        }
        resolve(output);
      });
    });
  }

  private async createSummaryFile(source: TFile, summary: string): Promise<TFile> {
    const settings = this.plugin.settingsManager.getSettings();
    const folder = normalizePath(settings.aiOutputFolder || "AI Summaries");
    await this.ensureFolder(folder);

    const baseName = this.sanitizeFileName(`${source.basename} AI 总结`);
    const path = await this.nextAvailablePath(folder, baseName);
    const body = `# ${source.basename} AI 总结

> 来源：[[${source.basename}]]

${summary}
`;
    return this.app.vault.create(path, body);
  }

  private async ensureFolder(folder: string): Promise<void> {
    const parts = normalizePath(folder).split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  private async nextAvailablePath(folder: string, baseName: string): Promise<string> {
    let index = 0;
    while (true) {
      const suffix = index === 0 ? "" : ` ${index + 1}`;
      const path = normalizePath(`${folder}/${baseName}${suffix}.md`);
      if (!(await this.app.vault.adapter.exists(path))) return path;
      index++;
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|#^[\]]/g, " ").replace(/\s+/g, " ").trim() || "AI 总结";
  }

  private parseArgs(raw: string): string[] {
    const args: string[] = [];
    const pattern = /"([^"]*)"|'([^']*)'|[^\s]+/g;
    for (const match of raw.matchAll(pattern)) {
      args.push(match[1] ?? match[2] ?? match[0]);
    }
    return args;
  }
}
