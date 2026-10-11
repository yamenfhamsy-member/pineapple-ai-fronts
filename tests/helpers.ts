import { expect, test, type Page } from "@playwright/test";

// Shared helpers: fresh localStorage + Arabic RTL shell on every test.
export async function gotoFresh(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("ar");
  expect(await page.evaluate(() => document.documentElement.dir)).toBe("rtl");
}

export async function expectNoHScroll(page: Page, width: number): Promise<void> {
  const o = await page.evaluate(() => ({
    innerW: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
  }));
  expect(o.innerW).toBe(width);
  expect(o.scrollW).toBeLessThanOrEqual(width + 1);
}

export async function expectTargets44(page: Page, selector: string): Promise<void> {
  const small = await page.evaluate(
    (sel) =>
      [...document.querySelectorAll(sel)]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((el) => ({
          label: ((el as HTMLElement).getAttribute("aria-label") || el.textContent || "?").trim().slice(0, 24),
          h: Math.round(el.getBoundingClientRect().height),
        }))
        .filter((t) => t.h < 44),
    selector,
  );
  expect(small).toEqual([]);
}

export async function waitForIdleChat(page: Page): Promise<void> {
  await page.waitForFunction(() => !(document.getElementById("chat-send") as HTMLButtonElement).disabled, {
    timeout: 90000,
  });
}
