import { expect, test } from "@playwright/test";
import { expectNoHScroll, expectTargets44, gotoFresh } from "./helpers";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

for (const path of ["/", "/chat", "/settings"] as const) {
  test(`mobile-390 ${path}: no h-scroll, 44px targets`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await gotoFresh(page, path);
    if (path === "/chat") {
      await expect(page.locator("#model-status")).toContainText(/\d+/, { timeout: 30000 });
    }
    await expectNoHScroll(page, 390);
    await expectTargets44(
      page,
      "button, select, input:not([type=checkbox]), textarea, .wrap nav a, #chat-empty button, #sidebar a",
    );
    expect(errors).toEqual([]);
  });
}
