declare const MARKDOWN2CARD_PURCHASE_URL: string;

export const FUNDING_URL = "https://ghh-l-djl.github.io/";
export const GITHUB_URL = "https://github.com/ghh-l-djl/markdown2card";
export const THEME_CUSTOMIZATION_URL = "mailto:3340649257@qq.com?subject=markdown2card%20theme%20customization";

export const SUPPORT_CONTACT_COPY = {
  zh: {
    before: "已经支持过了?无法打开赞助页面?通过",
    after: "支持, 通过小红书或者邮箱联系开发者"
  },
  en: {
    before: "Already supported, or unable to open the sponsorship page? Get support at ",
    after: ", or contact the developer via Xiaohongshu or email."
  }
} as const;

export function purchaseUrl(language: "zh" | "en", baseUrl = MARKDOWN2CARD_PURCHASE_URL): string {
  const url = new URL(baseUrl);
  url.searchParams.set("lang", language);
  return url.toString();
}
