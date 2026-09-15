import { expect, test } from "@playwright/test";

test("K2G back emblems align with the page edge and rotate on interaction", async ({ page }) => {
    await page.goto("/");

    const arrows = await page.locator(".world-room > .world-room-content > .room-return").evaluateAll((buttons) => buttons.map((button) => {
        const buttonBounds = button.getBoundingClientRect();
        const buttonStyle = getComputedStyle(button);
        const emblemStyle = getComputedStyle(button, "::before");
        return {
            left: buttonBounds.left,
            justifyItems: buttonStyle.justifyItems,
            emblemWidth: emblemStyle.width,
            emblemHeight: emblemStyle.height,
            emblemMask: emblemStyle.maskImage || emblemStyle.webkitMaskImage
        };
    }));
    const expectedEdge = Math.min(40, Math.max(18, page.viewportSize().width * 0.03));

    expect(arrows).toHaveLength(3);
    arrows.forEach((arrow) => {
        expect(Math.abs(arrow.left - expectedEdge)).toBeLessThanOrEqual(1);
        expect(arrow.justifyItems).toBe("start");
        expect(arrow.emblemWidth).toBe("18px");
        expect(arrow.emblemHeight).toBe("28px");
        expect(arrow.emblemMask).toContain("k2g-emblem-filled.svg");
    });

    const founderBack = page.locator("#founder-room .room-return");
    await founderBack.dispatchEvent("pointerdown", { pointerType: "touch" });
    await expect(founderBack).toHaveClass(/is-emblem-pressed/);
    const pressedTransform = await founderBack.evaluate((button) => getComputedStyle(button, "::before").transform);
    expect(pressedTransform).not.toBe("none");
});

test("Founder Hub contains four distinct chapters without Founder Notes", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    const chapters = page.locator(".founder-hub-item");
    await expect(chapters).toHaveCount(4);
    await expect(page.locator(".founder-hub-header .room-kicker")).toHaveText("GALANACCI THE CREATOR");
    await expect(page.locator("#founder-title")).toHaveText("FOUNDER");
    await expect(page.locator(".founder-hub-identity")).toHaveCount(0);
    await expect(page.locator('[data-founder-section="notes"]')).toHaveCount(0);
    await expect(page.locator('[data-founder-section="origin"]')).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.locator('[data-founder-section="journey"]')).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.locator('[data-founder-section="code"]')).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.locator('[data-founder-section="mission"]')).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.locator('[data-founder-section="mission"] .founder-hub-item-number')).toHaveText("04");
});

test("Journey entries right-align their identity and justify their description", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    await page.locator('[data-founder-section="journey"]').click();
    await page.locator('.journey-object[data-journey-entry="architecture"]').dispatchEvent("click");
    await expect(page.locator("#founder-journey-entry-title")).toHaveText("ARCHITECTURE");
    await expect(page.locator(".founder-journey-count")).toHaveCSS("text-align", "right");
    await expect(page.locator(".founder-journey-entry-header h2")).toHaveCSS("text-align", "right");
    await expect(page.locator(".founder-journey-copy p").first()).toHaveCSS("text-align", "justify");
});

test("NOW–2026 plays a muted looping background video behind the Journey viewer", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    await page.locator('[data-founder-section="journey"]').click();
    const now = page.locator('.journey-object[data-journey-entry="now-2026"]');
    await now.dispatchEvent("click");
    await now.dispatchEvent("click");

    await expect(page.locator("#founder-journey-entry-title")).toHaveText("NOW — 2026");
    const background = page.locator(".founder-journey-background-video");
    await expect(background).toHaveAttribute("src", "src/founder/journey/08-now-2026-background.mp4");
    await expect(background).toHaveAttribute("muted", "");
    await expect(background).toHaveJSProperty("muted", true);
    await expect(background).toHaveJSProperty("loop", true);
    await expect(background).toHaveJSProperty("autoplay", true);
    await expect(page.locator(".founder-journey-background-shade")).toBeVisible();
    if (page.viewportSize()?.width >= 560) {
        const alignment = await page.locator(".founder-journey-entry-header").evaluate((header) => {
            const headerRect = header.getBoundingClientRect();
            const backRect = document.querySelector("#founder-room .room-return")?.getBoundingClientRect();
            return {
                topDifference: Math.abs(headerRect.top - backRect.top),
                rightEdge: window.innerWidth - headerRect.right
            };
        });
        expect(alignment.topDifference).toBeLessThanOrEqual(1);
        expect(Math.abs(alignment.rightEdge - 40)).toBeLessThanOrEqual(2);
    }
    const fullBleed = await background.evaluate((video) => {
        const bounds = video.getBoundingClientRect();
        return {
            left: bounds.left,
            top: bounds.top,
            right: window.innerWidth - bounds.right,
            bottom: window.innerHeight - bounds.bottom
        };
    });
    expect(fullBleed).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    await expect.poll(() => background.evaluate((video) => video.duration)).toBeCloseTo(19, 0);

    await page.locator(".founder-journey-control.is-previous").click();
    await expect(page.locator("#founder-journey-entry-title")).toHaveText("THE FIRST SALE");
    await expect(page.locator(".founder-journey-background-video")).toHaveCount(0);
});
