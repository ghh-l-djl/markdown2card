import assert from "node:assert/strict";
import test from "node:test";

import { purchaseUrl } from "../src/support";

test("purchase URL carries the plugin language", () => {
  assert.equal(purchaseUrl("zh", "https://example.com/support"), "https://example.com/support?lang=zh");
  assert.equal(purchaseUrl("en", "https://example.com/support"), "https://example.com/support?lang=en");
});
