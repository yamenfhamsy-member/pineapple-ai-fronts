import { expect, test } from "@playwright/test";
import { gotoFresh } from "./helpers";

test("image page validates empty prompt", async ({ page }) => {
  await gotoFresh(page, "/image");
  await page.locator("#image-send").click();
  await expect(page.locator("#image-out")).toContainText("اكتب رسالتك أولاً.");
});

test("image page generates a real image", async ({ page }) => {
  await gotoFresh(page, "/image");
  await page.locator("#image-prompt").fill("a red apple on a table");
  await page.locator("#image-send").click();
  await expect(page.locator("#image-result")).toBeVisible({ timeout: 240000 });
  const src = await page.evaluate(() => (document.getElementById("image-result") as HTMLImageElement).src);
  expect(src).toContain("image.pollinations.ai/prompt/");
  const w = await page.evaluate(() => (document.getElementById("image-result") as HTMLImageElement).naturalWidth);
  expect(w).toBeGreaterThan(0);
});
