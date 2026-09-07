import { expect, test } from "@playwright/test";

async function openMenu(page) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:opening-complete")));
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
}

test("presentation controls match the viewing device", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.locator(".room-transition-label")).toHaveText("LOADING");
    expect(await page.locator(".room-transition-label").evaluate((element) => (
        getComputedStyle(element, "::after").animationName
    ))).toBe("room-loading-dots");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:show-transition")));
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    expect(await page.locator("#room-transition").evaluate((element) => (
        getComputedStyle(element).transitionDuration
    ))).toBe("0s");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:hide-transition")));
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /maximum-scale=1, user-scalable=no/);
    expect(await page.locator("body").evaluate((element) => getComputedStyle(element).userSelect)).toBe("none");
    expect(await page.locator("#email").evaluate((element) => getComputedStyle(element).userSelect)).toBe("text");
    const contextMenuAllowed = await page.evaluate(() => document.dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true
    })));
    expect(contextMenuAllowed).toBe(testInfo.project.name !== "desktop");
    const zoomGestures = await page.evaluate(() => {
        const gestureAllowed = document.dispatchEvent(new Event("gesturestart", { bubbles: true, cancelable: true }));
        const multiTouch = new Event("touchmove", { bubbles: true, cancelable: true });
        Object.defineProperty(multiTouch, "touches", { value: [{}, {}] });
        const multiTouchAllowed = document.dispatchEvent(multiTouch);
        const singleTouch = new Event("touchmove", { bubbles: true, cancelable: true });
        Object.defineProperty(singleTouch, "touches", { value: [{}] });
        const singleTouchAllowed = document.dispatchEvent(singleTouch);
        return { gestureAllowed, multiTouchAllowed, singleTouchAllowed };
    });
    if (testInfo.project.name === "mobile") {
        expect(zoomGestures).toEqual({ gestureAllowed: false, multiTouchAllowed: false, singleTouchAllowed: true });
    } else {
        const scrollbar = await page.locator("#founder-room").evaluate((element) => ({
            color: getComputedStyle(element).scrollbarColor,
            width: getComputedStyle(element).scrollbarWidth
        }));
        expect(scrollbar.width).toBe("thin");
        expect(scrollbar.color).toContain("rgba(0, 0, 0, 0)");
    }
});

test("JOIN WAITLIST opens inside the menu and returns after signup", async ({ page }) => {
    let attempts = 0;
    await page.route("https://script.google.com/**", async (route) => {
        attempts += 1;
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ status: attempts === 1 ? "error" : "success" })
        });
    });
    await page.goto("/");
    await page.evaluate(() => {
        window.__ambienceStops = 0;
        window.addEventListener("pog:ambience-stop", () => { window.__ambienceStops += 1; });
    });
    await openMenu(page);
    await page.getByRole("menuitem", { name: "JOIN WAITLIST" }).click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-waitlist-open/);
    await expect(page.locator("#email")).toBeFocused();
    await expect(page.locator("#email")).toHaveAttribute("placeholder", "ENTER EMAIL HERE...");
    const waitlistAlignment = await page.locator("#email-form").evaluate((form) => {
        const bounds = form.getBoundingClientRect();
        return { centre: bounds.left + bounds.width / 2, viewportCentre: window.innerWidth / 2 };
    });
    expect(Math.abs(waitlistAlignment.centre - waitlistAlignment.viewportCentre)).toBeLessThanOrEqual(1);
    await page.locator("#menu-overlay").click({ position: { x: 8, y: 8 } });
    await expect(page.locator("#menu-overlay")).not.toHaveClass(/is-waitlist-open/);
    await expect(page.getByRole("menuitem", { name: "JOIN WAITLIST" })).toBeFocused();
    await page.getByRole("menuitem", { name: "JOIN WAITLIST" }).click();
    await expect(page.locator("#email")).toBeFocused();
    await page.locator("#email").fill("founder@example.com");
    await page.locator('#email-form button[type="submit"]').click();
    await expect(page.locator("#status")).toHaveText("Something went wrong.");
    await expect(page.locator("#status")).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.locator('#email-form button[type="submit"]').click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).not.toHaveClass(/is-waitlist-open/);
    await expect(page.locator(".menu-list")).toBeVisible();
    await expect(page.locator("#status")).toBeEmpty();
    expect(await page.evaluate(() => window.__ambienceStops)).toBe(0);
});

test("menu emits game-like feedback for pointer, touch, keyboard and locked choices", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    await page.evaluate(() => {
        window.__menuSoundLog = [];
        window.addEventListener("pog:menu-sound", (event) => window.__menuSoundLog.push(event.detail.name));
    });
    const continueButton = page.getByRole("button", { name: "Continue experience" });
    await continueButton.dispatchEvent("pointerover", { pointerType: "mouse" });
    await continueButton.click();
    const entrySounds = await page.evaluate(() => window.__menuSoundLog.slice());
    expect(entrySounds.filter((sound) => sound === "select")).toHaveLength(1);
    expect(entrySounds.filter((sound) => sound === "confirm")).toHaveLength(1);
    await expect(page.locator("#founder-introduction-enter")).toBeVisible();
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await page.locator("#founder-introduction-enter").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await page.getByRole("menuitem", { name: "FOUNDER" }).dispatchEvent("pointerover", { pointerType: "mouse" });
    await page.getByRole("menuitem", { name: "FIELD NOTES" }).dispatchEvent("pointerdown", { pointerType: "touch" });
    await page.getByRole("menuitem", { name: "COLLECTIONS" }).dispatchEvent("click");
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await page.keyboard.press("ArrowUp");
    const soundLog = await page.evaluate(() => window.__menuSoundLog);
    expect(soundLog).toContain("confirm");
    expect(soundLog).toContain("select");
    expect(soundLog).toContain("locked");
});

test("game-like feedback extends to room controls without duplicating the main menu", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
        window.__siteSoundLog = [];
        window.addEventListener("pog:menu-sound", (event) => window.__siteSoundLog.push(event.detail.name));
        window.dispatchEvent(new CustomEvent("pog:open-room", {
            detail: { roomId: "founder-room", skipTransition: true }
        }));
    });
    await expect(page.locator(".founder-hub-item")).toHaveCount(5);
    const origin = page.locator('[data-founder-section="origin"]');
    await origin.dispatchEvent("pointerover", { pointerType: "mouse" });
    await origin.click();
    await page.locator("#founder-room .room-return").click();
    const journey = page.locator('[data-founder-section="journey"]');
    await journey.dispatchEvent("pointerdown", { pointerType: "touch" });
    await page.keyboard.press("ArrowDown");
    const unavailable = page.locator('[data-founder-section="code"]');
    await expect(unavailable).toHaveAttribute("aria-disabled", "true");
    await unavailable.dispatchEvent("click");
    const sounds = await page.evaluate(() => window.__siteSoundLog);
    expect(sounds).toContain("select");
    expect(sounds).toContain("confirm");
    expect(sounds).toContain("locked");
});

test("ENTER fades in randomized ambience and page or menu exits fade it out", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    await page.evaluate(() => {
        Math.random = () => 0.5;
        window.__ambienceVolumes = [];
        document.getElementById("site-ambience").addEventListener("volumechange", (event) => {
            window.__ambienceVolumes.push(event.currentTarget.volume);
        });
    });
    await page.getByRole("button", { name: "Continue experience" }).click();
    const beforeEnter = await page.locator("#site-ambience").evaluate((audio) => ({
        paused: audio.paused,
        volume: audio.volume
    }));
    expect(beforeEnter).toEqual({ paused: true, volume: 0 });
    expect(await page.locator(".background-video").evaluate((video) => video.muted && video.defaultMuted)).toBe(true);
    await expect(page.locator("#founder-introduction-enter")).toBeVisible();
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await page.locator("#founder-introduction-enter").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.paused)).toBe(false);
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.volume), { timeout: 3000 }).toBeGreaterThan(0.085);
    const audioState = await page.locator("#site-ambience").evaluate((audio) => ({
        currentTime: audio.currentTime,
        duration: audio.duration,
        volume: audio.volume
    }));
    expect(audioState.currentTime).toBeGreaterThan(audioState.duration * 0.45);
    expect(audioState.volume).toBeCloseTo(0.09);
    expect(await page.evaluate(() => window.__ambienceVolumes.some((volume) => volume > 0.005 && volume < 0.085))).toBe(true);
    await expect(page.locator(".audio-toggle")).toHaveAttribute("aria-pressed", "true");
    const timeBeforeMute = await page.locator("#site-ambience").evaluate((audio) => audio.currentTime);
    await page.locator(".audio-toggle").click();
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.muted), { timeout: 3000 }).toBe(true);
    const mutedState = await page.locator("#site-ambience").evaluate((audio) => ({
        muted: audio.muted,
        paused: audio.paused,
        currentTime: audio.currentTime,
        volume: audio.volume
    }));
    expect(mutedState.muted).toBe(true);
    expect(mutedState.paused).toBe(false);
    expect(mutedState.currentTime).toBeGreaterThan(timeBeforeMute);
    expect(mutedState.volume).toBe(0);
    expect(await page.locator(".background-video").evaluate((video) => video.muted)).toBe(true);
    await page.locator(".audio-toggle").click();
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.volume), { timeout: 3000 }).toBeGreaterThan(0.085);
    const restoredState = await page.locator("#site-ambience").evaluate((audio) => ({
        muted: audio.muted,
        paused: audio.paused,
        currentTime: audio.currentTime
    }));
    expect(restoredState.muted).toBe(false);
    expect(restoredState.paused).toBe(false);
    expect(restoredState.currentTime).toBeGreaterThanOrEqual(mutedState.currentTime);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.paused), { timeout: 3000 }).toBe(true);
    const suspendedTime = await page.locator("#site-ambience").evaluate((audio) => audio.currentTime);
    expect(await page.locator("#site-ambience").evaluate((audio) => audio.volume)).toBe(0);
    await page.waitForTimeout(150);
    expect(await page.locator("#site-ambience").evaluate((audio) => audio.currentTime)).toBeCloseTo(suspendedTime, 1);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.paused)).toBe(false);
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.volume), { timeout: 3000 }).toBeGreaterThan(0.085);
    expect(await page.locator("#site-ambience").evaluate((audio) => audio.currentTime)).toBeGreaterThanOrEqual(suspendedTime);
    await page.getByRole("menuitem", { name: "FOUNDER" }).click();
    expect(await page.locator("#site-ambience").evaluate((audio) => audio.paused)).toBe(false);
    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await page.getByRole("menuitem", { name: "EXIT" }).click();
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.paused), { timeout: 3000 }).toBe(true);
    expect(await page.locator("#site-ambience").evaluate((audio) => ({ volume: audio.volume, currentTime: audio.currentTime }))).toEqual({
        volume: 0,
        currentTime: 0
    });
});

test("Founder mission film leads its statement", async ({ page }) => {
    await page.goto("/");
    const filmLeads = await page.locator(".founder-mission-film").evaluate((section) => (
        section.firstElementChild?.classList.contains("founder-mission-player")
        && section.lastElementChild?.classList.contains("founder-mission-film-intro")
    ));
    expect(filmLeads).toBe(true);
});

test("the poem plays once before CONTINUE opens its completed image state", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");
    await expect(page.locator(".menu-toggle")).toHaveText("BEGIN");
    await page.getByRole("button", { name: "Begin experience" }).click();
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    await expect(page.locator("#founder-introduction")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#founder-introduction-copy")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#founder-introduction-skip")).toBeHidden();

    await page.reload();
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    await expect(page.locator(".menu-toggle")).toHaveText("CONTINUE");
    const landingType = await page.evaluate(() => {
        const styles = (selector) => {
            const computed = getComputedStyle(document.querySelector(selector));
            return {
                fontFamily: computed.fontFamily,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                letterSpacing: computed.letterSpacing
            };
        };
        return {
            entry: styles(".menu-toggle"),
            prompt: styles("#animated-placeholder"),
            email: styles('#email-form input[type="email"]')
        };
    });
    expect(landingType.prompt).toEqual(landingType.entry);
    expect(landingType.email).toEqual(landingType.entry);
    if (page.viewportSize()?.width < 560) {
        const buttonBounds = await page.locator(".menu-toggle").evaluate((button) => {
            const bounds = button.getBoundingClientRect();
            const styles = getComputedStyle(button);
            return {
                left: bounds.left,
                right: bounds.right,
                viewportWidth: window.innerWidth,
                rightBorder: styles.borderRightWidth
            };
        });
        expect(buttonBounds.left).toBeGreaterThanOrEqual(0);
        expect(buttonBounds.right).toBeLessThanOrEqual(buttonBounds.viewportWidth);
        expect(buttonBounds.rightBorder).toBe("1px");
    }
    await page.getByRole("button", { name: "Continue experience" }).click();
    await expect(page.locator("#founder-introduction")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#founder-introduction-copy")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator("#founder-poem-reveal")).toBeVisible();
    await expect(page.locator("#founder-introduction-skip")).toBeHidden();
    await expect(page.locator("#founder-introduction-enter")).toBeVisible();
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    const revealPosition = await page.locator("#founder-poem-reveal img").evaluate((image) => {
        const bounds = image.getBoundingClientRect();
        return { centre: bounds.top + bounds.height / 2, viewport: window.innerHeight / 2 };
    });
    expect(Math.abs(revealPosition.centre - revealPosition.viewport)).toBeLessThan(2);
    await page.getByRole("button", { name: "Replay the animated GREATNESS POEM" }).click();
    await expect(page.locator("#founder-introduction-copy")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#founder-introduction-skip")).toBeVisible();
    await page.locator("#founder-introduction-skip").click();
    await expect(page.locator("#founder-poem-reveal")).toBeVisible();
    await expect(page.locator("#founder-introduction-enter")).toBeVisible();
    await page.locator("#founder-introduction-enter").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect(page.locator("#founder-room")).not.toHaveClass(/is-open/);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/);
    await page.getByRole("menuitem", { name: "FOUNDER" }).click();
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
    await expect(page.locator("#founder-introduction")).not.toHaveClass(/is-open/);
});

test("Founder opens into the interactive five-chapter hub", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
    await expect(page.locator(".founder-hub-item")).toHaveCount(5);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await expect(page.locator(".founder-legacy")).toBeHidden();
    if (page.viewportSize()?.width < 560) {
        const hubFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
        expect(hubFits).toBe(true);
    }
    await expect(page.locator(".founder-hub-item").first()).toHaveClass(/is-selected/);
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(".founder-hub-item").nth(1)).toHaveClass(/is-selected/);
    await page.keyboard.press("Enter");
    await expect(page.locator("#founder-journey-menu-title")).toHaveText("THE JOURNEY");
    await expect(page.locator("#founder-room .room-return")).toHaveText("← RETURN TO FOUNDER");
    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#founder-hub")).toBeVisible();
    await expect(page.locator("#founder-room .room-return")).toHaveText("← RETURN TO MENU");
    await page.keyboard.press("Escape");
    await expect(page.locator("#founder-room")).not.toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
});

test("Founder Origin moves through three finite cinematic frames", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await page.locator('[data-founder-section="origin"]').click();
    await expect(page.locator("#founder-hub")).toBeHidden();
    await expect(page.locator("#founder-experience")).toBeVisible();
    await expect(page.locator(".founder-origin-frame-count")).toHaveText("FRAME 01 / 03");
    await expect(page.locator("#founder-origin-frame-title")).toHaveText("THE SHARED BEDROOM, WHERE IT STARTED");
    await expect(page.locator(".founder-origin-frame-date")).toHaveText("24 NOVEMBER 2021");
    await expect(page.locator(".founder-origin-media img")).toHaveAttribute("src", "src/founder/the-beginning-room.webp");
    await expect(page.locator(".founder-origin-copy")).toHaveCount(0);
    await expect(page.locator(".founder-origin-control.is-previous")).toBeDisabled();
    let frameFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
    expect(frameFits).toBe(true);
    await page.locator(".founder-origin-control.is-next").click();
    await expect(page.locator(".founder-origin-frame-count")).toHaveText("FRAME 02 / 03");
    await expect(page.locator("#founder-origin-frame-title")).toHaveText("THE POEM BEFORE THE BRAND");
    await expect(page.locator(".founder-origin-frame-date")).toHaveText("27 JUNE 2021");
    await expect(page.locator(".founder-origin-media img")).toHaveAttribute("src", "src/founder/greatness-poem-original.webp");
    await expect(page.locator(".founder-origin-copy")).toHaveCount(0);
    frameFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
    expect(frameFits).toBe(true);
    await expect(page.getByRole("button", { name: "Replay the animated GREATNESS POEM" })).toHaveCount(0);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-origin-frame-count")).toHaveText("FRAME 03 / 03");
    await expect(page.locator("#founder-origin-frame-title")).toHaveText("THE FIRST PHYSICAL EXPRESSION");
    await expect(page.locator(".founder-origin-frame-date")).toHaveText("13 OCTOBER 2021");
    await expect(page.locator(".founder-origin-media img")).toHaveAttribute("src", "src/founder/greatness-tee.webp");
    await expect(page.locator(".founder-origin-video")).toHaveCount(0);
    await expect(page.locator(".founder-origin-copy")).toHaveCount(0);
    await expect(page.locator(".founder-origin-control.is-next")).toBeDisabled();
    if (page.viewportSize()?.width >= 560) {
        const composition = await page.locator(".founder-origin-frame").evaluate((frame) => {
            const media = frame.querySelector(".founder-origin-media")?.getBoundingClientRect();
            const header = frame.querySelector(".founder-origin-frame-header")?.getBoundingClientRect();
            const menu = document.querySelector("#founder-room .room-return")?.getBoundingClientRect();
            return {
                mediaTop: media?.top ?? Infinity,
                mediaHeight: media?.height ?? 0,
                headerTop: header?.top ?? Infinity,
                headerRight: header?.right ?? 0,
                menuTop: menu?.top ?? -Infinity,
                viewportHeight: window.innerHeight,
                viewportWidth: window.innerWidth
            };
        });
        expect(composition.mediaTop).toBeLessThan(composition.viewportHeight * 0.3);
        expect(composition.mediaHeight).toBeGreaterThan(composition.viewportHeight * 0.5);
        expect(Math.abs(composition.headerTop - composition.menuTop)).toBeLessThanOrEqual(1);
        expect(composition.viewportWidth - composition.headerRight).toBe(40);
    }
    frameFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
    expect(frameFits).toBe(true);
    await expect(page.locator(".founder-origin-return")).toHaveText("RETURN TO MENU");
    await page.locator(".founder-origin-return").click();
    await expect(page.locator("#founder-room")).not.toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
});

test("Founder Journey behaves like an eight-slot save history", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await page.locator('[data-founder-section="journey"]').click();
    await expect(page.locator("#founder-journey-menu-title")).toHaveText("THE JOURNEY");
    await expect(page.locator(".founder-journey-item")).toHaveCount(8);
    await expect(page.locator(".founder-journey-item").first()).toHaveClass(/is-selected/);
    expect(await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

    await page.keyboard.press("ArrowDown");
    await expect(page.locator('.founder-journey-item[data-journey-entry="the-pivot"]')).toHaveClass(/is-selected/);
    await page.keyboard.press("Enter");
    await expect(page.locator(".founder-journey-count")).toHaveText("02 / 08");
    await expect(page.locator("#founder-journey-entry-title")).toHaveText("THE PIVOT");
    await expect(page.locator("#founder-room .room-return")).toHaveText("← RETURN TO JOURNEY");
    await expect(page.locator(".founder-media-placeholder")).toContainText("THE PIVOT");
    if (page.viewportSize()?.width >= 560) {
        const alignment = await page.locator(".founder-journey-entry-header").evaluate((header) => {
            const headerRect = header.getBoundingClientRect();
            const menuRect = document.querySelector("#founder-room .room-return")?.getBoundingClientRect();
            return {
                headerTop: headerRect.top,
                headerRight: headerRect.right,
                menuTop: menuRect?.top ?? -Infinity,
                viewportWidth: window.innerWidth
            };
        });
        expect(Math.abs(alignment.headerTop - alignment.menuTop)).toBeLessThanOrEqual(1);
        expect(alignment.viewportWidth - alignment.headerRight).toBe(40);
    }
    expect(await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-journey-count")).toHaveText("03 / 08");
    await expect(page.locator("#founder-journey-entry-title")).toHaveText("GALANACCI");
    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#founder-journey-menu-title")).toBeVisible();
    await expect(page.locator("#founder-room .room-return")).toHaveText("← RETURN TO FOUNDER");
    await page.locator('[data-journey-entry="greatness"]').click();
    await expect(page.locator(".founder-journey-media img")).toHaveAttribute("src", "src/founder/greatness-poem-original.webp");
    await expect(page.locator(".founder-journey-return")).toHaveText("RETURN TO MENU");
    await page.locator("#founder-room .room-return").click();
    await page.locator('[data-journey-entry="the-first-piece"]').click();
    await expect(page.locator(".founder-journey-media img")).toHaveAttribute("src", "src/founder/greatness-tee.webp");
    await page.locator(".founder-journey-return").click();
    await expect(page.locator("#founder-room")).not.toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
});

test("Field Notes waits for entry and renders one year chapter", async ({ page }, testInfo) => {
    let requests = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/data/field-notes.json")) requests += 1;
    });
    await page.goto("/");
    expect(requests).toBe(0);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "FIELD NOTES" }).click();
    await expect(page.locator("#field-notes-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator(".field-notes-year-trigger")).toBeVisible();
    await expect(page.locator(".field-notes-year-trigger")).toHaveText("2026");
    const returnBox = await page.locator("#field-notes-room [data-room-close]").boundingBox();
    const yearBox = await page.locator(".field-notes-year-trigger").boundingBox();
    expect(returnBox.x + returnBox.width).toBeLessThan(yearBox.x);
    const viewport = page.viewportSize();
    const expectedEdge = testInfo.project.name === "mobile" ? 24 : 40;
    expect(Math.abs(viewport.width - yearBox.x - yearBox.width - expectedEdge)).toBeLessThanOrEqual(1);
    expect(Math.abs(returnBox.y - yearBox.y)).toBeLessThanOrEqual(4);
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe("0px");
    await page.locator(".field-notes-year-trigger").hover();
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe("0px");
    await page.locator(".field-notes-year-trigger").click();
    expect(await page.locator(".field-notes-years").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 60, 175)");
    await expect(page.locator(".field-notes-year-options")).toBeVisible();
    expect(await page.locator(".field-notes-year-options").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.locator(".field-notes-year-option.is-selected").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 60, 175)");
    const unselectedYear = page.locator(".field-notes-year-option:not(.is-selected)").first();
    expect(await unselectedYear.evaluate((element) => getComputedStyle(element).color)).toBe("rgba(255, 255, 255, 0.45)");
    await unselectedYear.hover();
    expect(await unselectedYear.evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe("0px");
    await page.keyboard.press("Escape");
    if (testInfo.project.name === "desktop") {
        await page.setViewportSize({ width: 625, height: 900 });
        const mediumReturnBox = await page.locator("#field-notes-room [data-room-close]").boundingBox();
        const mediumYearBox = await page.locator(".field-notes-year-trigger").boundingBox();
        expect(Math.abs(mediumReturnBox.y - mediumYearBox.y)).toBeLessThanOrEqual(4);
    }
    await expect(page.locator(".field-notes-chapter .field-note").first()).toBeVisible();
    expect(requests).toBe(1);
});

test("Documentary waits for entry and removes playback on exit", async ({ page }) => {
    let requests = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/data/documentary.json")) requests += 1;
    });
    await page.goto("/");
    expect(requests).toBe(0);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "DOCUMENTARY" }).click();
    await expect(page.locator("#documentary-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(1);
    await page.locator("#documentary-room [data-room-close]").first().click();
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(0);
    expect(requests).toBe(1);
});
