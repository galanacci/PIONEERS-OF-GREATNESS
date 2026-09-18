import { expect, test } from "@playwright/test";

test("The 13 Laws remain a thirteen-page manifesto with a floating source image", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    await expect(page.locator('[data-founder-section="code"] .founder-hub-item-label')).toHaveText("THE 13 LAWS");
    await page.locator('[data-founder-section="code"]').click();
    await expect(page.locator(".founder-code-entry")).toBeVisible();
    await expect(page.locator("#founder-code-title")).toHaveText("THE 13 LAWS");
    await expect(page.locator(".founder-code-count")).toHaveCount(0);
    await expect(page.locator(".founder-code-law")).toHaveText("BELIEVE IN YOURSELF. BACK IT UP.");
    await expect(page.locator(".founder-code-stage")).toBeFocused();
    expect(await page.locator(".founder-code-law").evaluate((element) => getComputedStyle(element).textAlign)).toBe("left");
    await expect(page.locator(".founder-code-numeral")).toHaveCount(0);
    await expect(page.locator(".founder-code-law-number")).toHaveText("01");
    await expect(page.locator(".founder-code-law-number")).toHaveCSS("color", "rgb(155, 112, 223)");
    const typeScale = await page.locator(".founder-code-statement").evaluate((element) => ({
        law: Number.parseFloat(getComputedStyle(element.querySelector(".founder-code-law")).fontSize),
        number: Number.parseFloat(getComputedStyle(element.querySelector(".founder-code-law-number")).fontSize),
        menu: Number.parseFloat(getComputedStyle(document.querySelector(".page-controls-center button")).fontSize)
    }));
    expect(typeScale.number).toBeGreaterThanOrEqual(11);
    expect(typeScale.number).toBeLessThanOrEqual(typeScale.menu);
    expect(typeScale.law).toBeLessThanOrEqual(29);
    expect(typeScale.law / typeScale.number).toBeGreaterThanOrEqual(1.75);
    await expect(page.locator(".founder-code-statement")).toHaveCSS("animation-name", "founder-code-enter");
    await expect(page.locator(".founder-code-law")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".founder-code-stage")).not.toHaveClass(/is-archive/);
    const decoration = await page.locator(".founder-code-stage").evaluate((element) => ({
        before: getComputedStyle(element, "::before").content,
        after: getComputedStyle(element, "::after").content
    }));
    expect(decoration).toEqual({ before: "none", after: "none" });

    const source = page.locator(".founder-code-source");
    await expect(source).toBeVisible();
    await expect(source.locator(".founder-code-archive-image")).toHaveAttribute("src", "src/founder/13-laws-cropped.jpg");
    const startingTransform = await source.evaluate((element) => element.style.transform);
    await expect.poll(() => source.evaluate((element) => element.style.transform)).not.toBe(startingTransform);
    const smallWidth = (await source.boundingBox()).width;
    await source.dispatchEvent("click");
    await expect(source).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".founder-code-stage")).toHaveClass(/is-source-focused/);
    await expect.poll(async () => (await source.boundingBox()).width).toBeGreaterThan(smallWidth * 2);
    await source.dispatchEvent("click");
    await expect(source).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".founder-code-stage")).not.toHaveClass(/is-source-focused/);

    await source.evaluate((element) => { element.dataset.persistenceMarker = "same-artefact"; });
    const beforeNavigation = await source.evaluate((element) => element.style.transform);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-code-law-number")).toHaveText("02");
    await expect(page.locator(".founder-code-law")).toContainText("MEDIOCRITY NEVER INSPIRED ANYONE");
    await expect(page.locator(".founder-code-stage")).toBeFocused();
    await expect(source).toHaveAttribute("data-persistence-marker", "same-artefact");
    const afterNavigation = await source.evaluate((element) => element.style.transform);
    const coordinates = (transform) => transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/)?.slice(1).map(Number);
    const beforePosition = coordinates(beforeNavigation);
    const afterPosition = coordinates(afterNavigation);
    expect(Math.hypot(afterPosition[0] - beforePosition[0], afterPosition[1] - beforePosition[1])).toBeLessThan(12);
    await expect.poll(() => source.evaluate((element) => element.style.transform)).not.toBe(afterNavigation);
    expect(await page.getByRole("button", { name: "MENU" }).evaluate((element) => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");

    for (let index = 0; index < 11; index += 1) await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-code-law")).toHaveText("WITHOUT PURPOSE, YOU HAVE NO DIRECTION.");
    await expect(page.locator("#founder-experience .page-controls .is-next")).toBeDisabled();

    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".founder-code-law")).toContainText("STOP LEARNING");

    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#founder-hub")).toBeVisible();
});
