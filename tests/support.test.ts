import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { FUNDING_URL, purchaseUrl, SUPPORT_CONTACT_COPY } from "../src/support";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("purchase URL carries the plugin language", () => {
  assert.equal(purchaseUrl("zh", "https://example.com/support"), "https://example.com/support?lang=zh");
  assert.equal(purchaseUrl("en", "https://example.com/support"), "https://example.com/support?lang=en");
});

test("Chinese fallback-support copy matches the requested wording exactly", () => {
  assert.equal(
    `${SUPPORT_CONTACT_COPY.zh.before}${FUNDING_URL}${SUPPORT_CONTACT_COPY.zh.after}`,
    "已经支持过了?无法打开赞助页面?通过https://ghh-l-djl.github.io/支持, 通过小红书或者邮箱联系开发者"
  );
});

test("support contact image preserves its original aspect ratio", () => {
  assert.match(styles, /\.red-support-contact img\s*\{[^}]*width:\s*auto;[^}]*height:\s*auto;[^}]*max-width:\s*100%;[^}]*object-fit:\s*contain;/s);
});

test("validated-user gold borders cover standalone buttons in the plugin view", () => {
  assert.match(styles, /\.red-view-content\.red-paid-entitled button:not\(\.red-font-size-btn\)\s*,/);
});

test("validated-user font sizing control uses one continuous gold outline", () => {
  assert.match(
    styles,
    /\.red-view-content\.red-paid-entitled \.red-font-size-group\s*\{[^}]*border:\s*1px solid #d4af37 !important;/s
  );
});
