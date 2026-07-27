import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBrowserPublishPlatformIds, normalizeBrowserPublishPlatforms } from "../src/browserPublishSettings";

test("browser publish settings tolerate malformed persisted values", () => {
  assert.deepEqual(normalizeBrowserPublishPlatformIds({ xiaohongshu: true }), []);
  assert.deepEqual(normalizeBrowserPublishPlatformIds(["yuque", "", 1, "weibo"]), ["yuque", "weibo"]);

  assert.deepEqual(normalizeBrowserPublishPlatforms({ id: "xiaohongshu", name: "小红书" }), []);
  assert.deepEqual(normalizeBrowserPublishPlatforms([
    { id: "xiaohongshu", name: "小红书", isAuthenticated: true },
    { id: "broken" },
    null
  ]), [{ id: "xiaohongshu", name: "小红书", isAuthenticated: true }]);
});
