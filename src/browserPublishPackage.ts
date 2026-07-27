import { readdir, readFile, stat } from "fs/promises";
import { basename, extname, join } from "path";
import { fileURLToPath } from "url";

export type BrowserPublishMode = "card-image" | "article";

export interface BrowserPublishAsset {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  base64: string;
  source: { kind: "markdown2card-export"; originalSrc: string };
}

export interface BrowserPublishPackage {
  mode: BrowserPublishMode;
  title: string;
  body: string;
  tags: string[];
  markdown: string;
  content: string;
  cover: string;
  assets: BrowserPublishAsset[];
}

export interface FrontmatterLike {
  title?: unknown;
  assets?: unknown;
  publish_social_tags?: unknown;
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const UNSUPPORTED_IMAGE_EXTENSIONS = new Set([".svg", ".gif", ".heic", ".heif", ".bmp", ".tiff", ".tif", ".avif"]);
const MAX_CARD_IMAGE_ASSETS = 18;
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

export function stripYamlFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  return match ? content.slice(match[0].length) : content;
}

export function validatePublishFrontmatter(frontmatter: FrontmatterLike, body: string): string[] {
  const errors: string[] = [];
  if (typeof frontmatter.title !== "string" || !frontmatter.title.trim()) errors.push("缺少 YAML title");
  if (typeof frontmatter.assets !== "string" || !frontmatter.assets.trim()) errors.push("缺少 YAML assets");
  if (!body.trim()) errors.push("正文为空");
  return errors;
}

export async function buildCardImagePublishPackage(content: string, frontmatter: FrontmatterLike): Promise<BrowserPublishPackage> {
  const body = stripYamlFrontmatter(content);
  const errors = validatePublishFrontmatter(frontmatter, body);
  if (errors.length) throw new Error(errors.join("\n"));

  const title = String(frontmatter.title);
  const tags = normalizeTags(frontmatter.publish_social_tags);
  const assetRoot = resolveFileUrl(String(frontmatter.assets));
  const imagePaths = (await listPublishImages(assetRoot)).slice(0, MAX_CARD_IMAGE_ASSETS);
  const assets = await Promise.all(imagePaths.map(async (path, index) => {
    const buffer = await readFile(path);
    const ext = extname(path).toLowerCase();
    return {
      id: `image-${index + 1}`,
      filename: basename(path),
      mimeType: MIME_TYPES[ext] || "application/octet-stream",
      size: buffer.byteLength,
      base64: buffer.toString("base64"),
      source: { kind: "markdown2card-export" as const, originalSrc: path }
    };
  }));
  const markdown = [
    ...assets.map((asset) => `![${asset.filename}](asset://${asset.id})`),
    body.trim()
  ].filter(Boolean).join("\n\n");

  return {
    mode: "card-image",
    title,
    body,
    tags,
    markdown,
    content: body,
    cover: assets[0] ? `asset://${assets[0].id}` : "",
    assets
  };
}

export async function buildArticlePublishPackage(content: string, frontmatter: FrontmatterLike, fallbackTitle: string): Promise<BrowserPublishPackage> {
  const body = stripYamlFrontmatter(content);
  const title = typeof frontmatter.title === "string" && frontmatter.title.trim() ? frontmatter.title : fallbackTitle;
  if (!body.trim()) throw new Error("正文为空");
  return {
    mode: "article",
    title,
    body,
    tags: normalizeTags(frontmatter.publish_social_tags),
    markdown: body,
    content: body,
    cover: "",
    assets: []
  };
}

export async function listPublishImages(assetRoot: string): Promise<string[]> {
  const outputPath = join(assetRoot, "output");
  const hasOutput = await pathIsDirectory(outputPath);
  const imageRoot = hasOutput ? outputPath : assetRoot;
  const entries = await readdir(imageRoot, { withFileTypes: true });
  const unsupported = entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith(".") && UNSUPPORTED_IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);
  const supported = entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith(".") && SUPPORTED_IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => join(imageRoot, entry.name))
    .sort(naturalCompare);

  if (unsupported.length) throw new Error(`包含不支持的图片格式：${unsupported.join(", ")}`);
  if (!supported.length) throw new Error(`${hasOutput ? "output 文件夹" : "assets 文件夹"}没有可发布图片`);
  return supported;
}

function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const seen = new Set<string>();
  return raw
    .map((item) => String(item).trim().replace(/^#+/, ""))
    .filter((item) => item && !seen.has(item) && seen.add(item));
}

function resolveFileUrl(value: string): string {
  if (value.startsWith("file://")) return fileURLToPath(value);
  return value;
}

async function pathIsDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function naturalCompare(a: string, b: string): number {
  return basename(a).localeCompare(basename(b), undefined, { numeric: true, sensitivity: "base" });
}
