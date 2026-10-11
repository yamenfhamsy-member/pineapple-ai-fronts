import { expect, test } from "@playwright/test";
import { gotoFresh } from "./helpers";

test("image page validates empty prompt", async ({ page }) => {
  await gotoFresh(page, "/image");
  await page.locator("#image-send").click();
  await expect(page.locator("#image-out")).toContainText("اكتب رسالتك أولاً.");
});

test("chat image intent answers with a picture", { timeout: 420000 }, async ({ page }) => {
  await gotoFresh(page, "/chat");
  await page.locator("#chat-input").fill("ارسم قطة صغيرة");
  await page.locator("#chat-send").click();
  await expect(page.locator("#chat-log .msg-image img")).toBeVisible({ timeout: 400000 });
  const src = await page.evaluate(() => (document.querySelector("#chat-log .msg-image img") as HTMLImageElement).src);
  // Chat path stores b64 so saved chats survive R2 URL expiry.
  expect(src.startsWith("data:image")).toBe(true);
});

test("image page generates a real image", { timeout: 420000 }, async ({ page }) => {
  await gotoFresh(page, "/image");
  await page.locator("#image-prompt").fill("a red apple on a table");
  await page.locator("#image-send").click();
  await expect(page.locator("#image-result")).toBeVisible({ timeout: 400000 });
  const src = await page.evaluate(() => (document.getElementById("image-result") as HTMLImageElement).src);
  expect(src).toContain("r2.cloudflarestorage.com");
  const w = await page.evaluate(() => (document.getElementById("image-result") as HTMLImageElement).naturalWidth);
  expect(w).toBeGreaterThan(0);
});
