import { expect, test } from "@playwright/test";
import { expectNoHScroll, expectTargets44, gotoFresh } from "./helpers";

test("welcome shows Pineapple hero, tool cards, zero JS", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await gotoFresh(page, "/");

  await expect(page).toHaveTitle(/Pineapple AI/);
  await expect(page.locator("#hero-title")).toHaveText("Pineapple AI");
  const cards = await page.evaluate(() => [...document.querySelectorAll(".card a")].map((a) => a.getAttribute("href")));
  expect(cards).toEqual(["/chat", "/image", "/prompts", "/settings"]);
  // Zero-JS landing: no scripts at all.
  expect(await page.evaluate(() => document.querySelectorAll("script").length)).toBe(0);
  expect(errors).toEqual([]);
});

test("welcome has no h-scroll and 44px targets at 1280", async ({ page }) => {
  await gotoFresh(page, "/");
  await expectNoHScroll(page, 1280);
  await expectTargets44(page, "button, .wrap nav a, .card a");
});

test("main nav links the three pages", async ({ page }) => {
  await gotoFresh(page, "/");
  for (const [label, path] of [["المحادثة", "/chat"], ["الإعدادات", "/settings"]] as const) {
    await page.getByRole("navigation").getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}/?$`));
    await page.goBack();
  }
});
