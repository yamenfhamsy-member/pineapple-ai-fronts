import { expect, test } from "@playwright/test";
import { gotoFresh, waitForIdleChat } from "./helpers";

test("prompts library applies a preset and jumps to chat", async ({ page }) => {
  await gotoFresh(page, "/prompts");
  expect(await page.evaluate(() => document.querySelectorAll(".card").length)).toBe(6);
  await page.locator('button[data-preset="translate"]').click();
  await expect(page).toHaveURL(/\/chat\/?$/);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("pineapple:settings") || "{}").system_prompt as string),
  ).toContain("مترجم");
});

test("answer actions, export, and history search", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await gotoFresh(page, "/chat");
  await page.locator("#chat-input").fill("Reply with exactly: toolok");
  await page.locator("#chat-send").click();
  await expect(page.locator("#chat-log")).toContainText("toolok", { timeout: 90000 });
  await waitForIdleChat(page);

  // Copy + regenerate buttons under the answer.
  await page.locator(".msg-actions button", { hasText: "نسخ" }).first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("toolok");

  // Export current chat as Markdown download.
  await page.locator("#menu-btn").click();
  const dl = page.waitForEvent("download", { timeout: 15000 });
  await page.locator("#export-md").click();
  const download = await dl;
  expect(download.suggestedFilename()).toMatch(/\.md$/);

  // Regenerate re-runs the turn (second answer completes).
  await page.evaluate(() => (document.getElementById("side-backdrop") as HTMLElement).click());
  await page.locator(".msg-actions button", { hasText: "إعادة" }).first().click();
  await waitForIdleChat(page);
  expect(await page.evaluate(() => (document.getElementById("chat-send") as HTMLButtonElement).disabled)).toBe(false);
});

test("history search filters saved chats (seeded, no network)", async ({ page }) => {
  await gotoFresh(page, "/chat");
  await page.evaluate(() => {
    localStorage.setItem(
      "pineapple:chats",
      JSON.stringify([
        { id: "c1", title: "رحلة إلى دمشق", messages: [{ role: "user", content: "hi" }], updated: Date.now() },
        { id: "c2", title: "وصفة كيك", messages: [{ role: "user", content: "hi" }], updated: Date.now() },
      ]),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#menu-btn").click();
  expect(await page.evaluate(() => document.querySelectorAll("#chat-history .history-row").length)).toBe(2);
  await page.locator("#history-search").fill("دمشق");
  expect(await page.evaluate(() => document.querySelectorAll("#chat-history .history-row").length)).toBe(1);
  expect(await page.evaluate(() => document.querySelector("#chat-history .history-open")!.textContent)).toContain("دمشق");
});
