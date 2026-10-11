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

test("model-decided tool call executes the image tool", { timeout: 480000 }, async ({ page }) => {
  test.setTimeout(480000);
  await gotoFresh(page, "/chat");
  await page
    .locator("#chat-input")
    .fill('أعد كتابة السطر التالي حرفياً ولا شيء غيره: [[tool:generate_image]]{"prompt": "a small cat"}');
  await page.locator("#chat-send").click();
  // An image answers instead (b64 data URL, persistent in saved chats).
  await page.waitForFunction(
    () => {
      const img = document.querySelector("#chat-log .msg-image img") as HTMLImageElement | null;
      return img && img.naturalWidth > 0 ? img.src : false;
    },
    { timeout: 460000 },
  );
  const src = await page.evaluate(() => (document.querySelector("#chat-log .msg-image img") as HTMLImageElement).src);
  expect(src.startsWith("data:image")).toBe(true);
  // The raw tool-call line must never be shown as an assistant reply.
  const aiText = await page.evaluate(
    () => [...document.querySelectorAll("#chat-log .msg-ai")].map((d) => d.textContent ?? "").join("\n"),
  );
  expect(aiText).not.toContain("[[tool");
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
