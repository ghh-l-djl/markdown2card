declare const MARKDOWN2CARD_PURCHASE_URL: string;

export const FUNDING_URL = "https://ghh-l-djl.github.io/";
export const GITHUB_URL = "https://github.com/ghh-l-djl/markdown2card";
export const THEME_CUSTOMIZATION_URL = "mailto:3340649257@qq.com?subject=markdown2card%20theme%20customization";

export function purchaseUrl(language: "zh" | "en", baseUrl = MARKDOWN2CARD_PURCHASE_URL): string {
  const url = new URL(baseUrl);
  url.searchParams.set("lang", language);
  return url.toString();
}
