import { test, expect } from "@playwright/test";

test("GALANACCI entry boots PoG straight to the main menu", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.removeItem("pog:founder-introduction:v2");
    });

    await page.goto("/?entry=galanacci");

    await expect(page.locator("html")).toHaveClass(/external-entry/);
    await expect(page.locator("#pog-desktop")).toHaveCSS("visibility", "hidden");
    await expect(page.locator("#pog-launch-loading")).toBeVisible({ timeout: 2500 });
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 5000 });
    await expect(page.locator("#founder-introduction")).not.toHaveClass(/is-open/);
    await expect(page.locator("#pog-launch-loading")).toBeHidden({ timeout: 2500 });
});

test("EXIT returns a GALANACCI-launched PoG session to galanacci.com", async ({ page }) => {
    await page.route("https://galanacci.com/**", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: "<!doctype html><title>GALANACCI</title>"
        });
    });

    await page.goto("/?entry=galanacci");
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 5000 });

    await Promise.all([
        page.waitForURL("https://galanacci.com/?entry=pog"),
        page.getByRole("menuitem", { name: "EXIT" }).click()
    ]);

    expect(page.url()).toBe("https://galanacci.com/?entry=pog");
});

test("direct PoG sessions still EXIT back to the PoG desktop", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("pog:opening-complete"));
    });

    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await page.getByRole("menuitem", { name: "EXIT" }).click();

    await expect(page.locator("#menu-overlay")).not.toHaveClass(/is-open/);
    await expect(page.locator("#pog-desktop")).toHaveCSS("visibility", "visible");
});
