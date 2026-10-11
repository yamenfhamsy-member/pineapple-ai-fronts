import { expect, test } from "@playwright/test";
import { gotoFresh, waitForIdleChat } from "./helpers";

test("chat layout: LTR header, sidebar, suggestions, bottom bar", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await gotoFresh(page, "/chat");

  // LTR positions: menu far left, name centered, new-pill far right.
  const pos = await page.evaluate(() => {
    const vw = window.innerWidth;
    const m = document.getElementById("menu-btn")!.getBoundingClientRect();
    const n = document.querySelector(".app-name")!.getBoundingClientRect();
    const p = document.getElementById("chat-new")!.getBoundingClientRect();
    return { menuLeft: m.left, nameC: n.left + n.width / 2, vw, pillRight: vw - p.right };
  });
  expect(pos.menuLeft).toBeLessThan(120);
  expect(Math.abs(pos.nameC - pos.vw / 2)).toBeLessThan(60);
  expect(pos.pillRight).toBeLessThan(120);

  // Models live OFF the main screen (sidebar only).
  expect(await page.evaluate(() => !!document.querySelector("#chat-main #model-select"))).toBe(false);
  expect(await page.evaluate(() => !!document.querySelector("#sidebar #model-select"))).toBe(true);
  expect(await page.evaluate(() => document.getElementById("sidebar")!.classList.contains("open"))).toBe(false);

  // Empty-state suggestions, input row order (plus < input < send).
  expect(await page.evaluate(() => !document.getElementById("chat-empty")!.hidden)).toBe(true);
  expect(await page.evaluate(() => document.querySelectorAll("#chat-empty button").length)).toBe(3);
  const row = await page.evaluate(() => {
    const x = (id: string): number => document.getElementById(id)!.getBoundingClientRect().left;
    return { plus: x("chat-plus"), input: x("chat-input"), send: x("chat-send") };
  });
  expect(row.plus).toBeLessThan(row.input);
  expect(row.input).toBeLessThan(row.send);
  expect(errors).toEqual([]);
});

test("model picker loads live and header pill follows it", async ({ page }) => {
  await gotoFresh(page, "/chat");
  await page.locator("#menu-btn").click();
  await expect(page.locator("#model-status")).toContainText(/\d+/, { timeout: 30000 });
  const count = await page.evaluate(() => document.getElementById("model-select")!.options.length);
  expect(count).toBeGreaterThan(5);
  // Default model selected.
  expect(await page.evaluate(() => JSON.parse((document.getElementById("model-select") as HTMLSelectElement).value).model)).toBe(
    "qwen3-8b",
  );
  // Pill shows the live name; switching mid-chat updates pill + storage.
  await expect(page.locator("#model-pill")).toContainText("Qwen 3 8B");
  const sel = page.locator("#model-select");
  await sel.selectOption({ index: 1 });
  const second = await page.evaluate(
    () => (JSON.parse((document.getElementById("model-select") as HTMLSelectElement).value) as { display: string }).display,
  );
  await expect(page.locator("#model-pill")).toContainText(second);
});

test("sending a message streams a real answer", async ({ page }) => {
  await gotoFresh(page, "/chat");
  await page.locator("#chat-input").fill("Reply with exactly: e2eok");
  await page.locator("#chat-send").click();
  await expect(page.locator("#chat-log")).toContainText("e2eok", { timeout: 90000 });
  await waitForIdleChat(page);
});

test("abort stays silent and resets controls", async ({ page }) => {
  await gotoFresh(page, "/chat");
  await page.evaluate(() => {
    (document.getElementById("chat-input") as HTMLInputElement).value = "قل شيئا طويلا";
    (document.getElementById("chat-form") as HTMLFormElement).requestSubmit();
    document.getElementById("chat-stop")!.click();
  });
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => document.querySelectorAll("#chat-log .msg-err").length)).toBe(0);
  expect(await page.evaluate(() => (document.getElementById("chat-send") as HTMLButtonElement).disabled)).toBe(false);
  expect(await page.evaluate(() => (document.getElementById("chat-stop") as HTMLButtonElement).hidden)).toBe(true);
});

test("suggestion tap sends it as a message", async ({ page }) => {
  await gotoFresh(page, "/chat");
  await page.locator("#chat-empty button").first().click();
  await expect(page.locator("#chat-log")).toContainText("أنشئ صورة", { timeout: 10000 });
  expect(await page.evaluate(() => document.getElementById("chat-empty")!.hidden)).toBe(true);
});

test("new chat archives history; sidebar loads and deletes it", async ({ page }) => {
  await gotoFresh(page, "/chat");
  await page.locator("#chat-input").fill("Reply with exactly: archiveme");
  await page.locator("#chat-send").click();
  await expect(page.locator("#chat-log")).toContainText("archiveme", { timeout: 90000 });
  await waitForIdleChat(page);

  await page.locator("#chat-new").click();
  expect(await page.evaluate(() => document.getElementById("chat-log")!.children.length)).toBe(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("pineapple:chats") || "[]").length);
  expect(saved).toBe(1);

  // History lives in the sidebar — open it like a real user would.
  await page.locator("#menu-btn").click();
  await page.locator("#chat-history .history-open").click();
  expect(await page.evaluate(() => document.getElementById("chat-log")!.children.length)).toBeGreaterThan(0);
  await page.locator("#menu-btn").click();
  await page.locator("#chat-history .history-del").click();
  const left = await page.evaluate(() => JSON.parse(localStorage.getItem("pineapple:chats") || "[]").length);
  expect(left).toBe(0);
});
