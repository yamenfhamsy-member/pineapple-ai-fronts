import { expect, test } from "@playwright/test";
import { gotoFresh } from "./helpers";

test("settings keeps only temperature and system prompt, and persists", async ({ page }) => {
  await gotoFresh(page, "/settings");
  expect(await page.evaluate(() => !!document.getElementById("set-temp"))).toBe(true);
  expect(await page.evaluate(() => !!document.getElementById("set-sys"))).toBe(true);
  // Removed per user decision: base URL, stream toggle, access key.
  expect(await page.evaluate(() => !!document.getElementById("set-base"))).toBe(false);
  expect(await page.evaluate(() => !!document.getElementById("set-stream"))).toBe(false);
  expect(await page.evaluate(() => !!document.getElementById("set-key"))).toBe(false);

  await page.locator("#set-temp").fill("0.3");
  await page.locator("#set-sys").fill("كن مختصراً");
  // Saves happen on change (blur) — move focus out before asserting.
  await page.locator("#set-sys").press("Tab");
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem("pineapple:settings") || "{}").system_prompt ?? "") !== "");
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => (document.getElementById("set-temp") as HTMLInputElement).value)).toBe("0.3");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pineapple:settings") || "{}").system_prompt)).toBe(
    "كن مختصراً",
  );
});
