import { expect, test } from "@playwright/test";
import { gotoFresh } from "./helpers";

test("empty message shows the literal 400 string", async ({ page }) => {
  await gotoFresh(page, "/chat");
  await page.locator("#chat-send").click();
  await expect(page.locator("#chat-log")).toContainText("اكتب رسالتك أولاً.");
});

test("offline shows the literal offline string", async ({ page, context }) => {
  await gotoFresh(page, "/chat");
  await context.setOffline(true);
  await page.locator("#chat-input").fill("hello");
  await page.locator("#chat-send").click();
  await expect(page.locator("#chat-log")).toContainText("لا يوجد اتصال بالإنترنت.");
  await context.setOffline(false);
});
