import { expect, test } from "@playwright/test";
import { quoteFor, paymentReady } from "../../js/rooms/made-to-order.js";

async function openForge(page, configured = false, testMode = false) {
    if (configured) await page.route("**/data/collections.json", async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        // Synthetic values stay in this browser fixture, never production data.
        data.madeToOrder = { enquiryEmail: "orders@example.com", bank: {
            accountName: "TEST ACCOUNT", bankName: "TEST BANK", sortCode: "00-00-00",
            accountNumber: "00000000", iban: "TEST-IBAN", bic: "TEST-BIC"
        }};
        data.products[0].madeToOrder.leadTime = "4–6 weeks";
        await route.fulfill({ json: data });
    });
    await page.goto(`/?preview=collections${testMode ? "&payment-test=forge" : ""}`);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:opening-complete")));
    await page.getByRole("menuitem", { name: "COLLECTIONS" }).click();
    await expect(page.locator("#collections-stage")).toHaveClass(/is-ready/, { timeout: 20000 });
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 30000 });
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:collections-open-product", { detail: { index: 0 } })));
}

test("enquiry requires one size and repeats the exact international price and reference", async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await openForge(page, true);
    const enquiry = page.getByRole("button", { name: "Made-to-order enquiry", exact: true });
    await expect(page.locator("#collections-product-price")).toContainText("£175.00");
    await enquiry.click();
    await expect(page.locator("#collections-size-feedback")).toHaveText("CHOOSE YOUR SIZE TO CONTINUE");
    await page.getByRole("button", { name: "Select size S", exact: true }).click();
    await page.getByRole("button", { name: "Select size L", exact: true }).click();
    await expect(page.locator('#collections-size-options [aria-pressed="true"]')).toHaveCount(1);
    await enquiry.click();
    await page.getByLabel("DELIVERY REGION", { exact: true }).selectOption("north-america");
    await expect(page.locator("#collections-product-price")).toContainText("£175.00 · + £30.00");
    await expect(page.locator(".collections-order-summary")).toContainText("SIZE L · £205.00");
    await expect(page.locator(".collections-bank-details")).toContainText("TEST-IBAN");
    await expect(page.locator(".collections-bank-details")).not.toContainText("00-00-00");
    const link = page.getByRole("link", { name: "EMAIL MADE-TO-ORDER ENQUIRY" });
    const href = decodeURIComponent(await link.getAttribute("href"));
    expect(href).toContain("Size: L");
    expect(href).toContain("Amount: £205.00 GBP");
    const reference = href.match(/POG-[A-F0-9]{12}/)[0];
    await expect(page.locator(".collections-bank-details")).toContainText(reference);
    await page.getByLabel("DELIVERY REGION", { exact: true }).selectOption("uk");
    await expect(page.locator(".collections-bank-details")).toContainText("£175.00 GBP");
    await expect(page.locator(".collections-bank-details")).toContainText(reference);
    await page.screenshot({ path: testInfo.outputPath("payment-preview.png") });
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Unavailable"); } } }));
    await page.getByRole("button", { name: "COPY PAYMENT & ENQUIRY DETAILS" }).click();
    await expect(page.locator('[data-collections-panel="enquiry"] [role="status"]')).toContainText("Use the email enquiry button");
    await page.keyboard.press("Escape");
    await expect(enquiry).toBeFocused();
    await expect(page.locator("#collections-product-drawer")).toHaveAttribute("inert", "");
});

test("missing payment configuration cannot invite a transfer or send a false enquiry", async ({ page }) => {
    test.setTimeout(90000);
    await openForge(page);
    await page.getByRole("button", { name: "Made-to-order enquiry", exact: true }).click();
    await page.getByRole("button", { name: "Select size M", exact: true }).click();
    await page.getByRole("button", { name: "Made-to-order enquiry", exact: true }).click();
    await expect(page.locator(".collections-order-instructions")).toContainText("please do not send payment");
    await expect(page.locator(".collections-order-email")).toBeHidden();
    await expect(page.locator(".collections-order-email")).not.toHaveAttribute("href");
    await expect(page.locator(".collections-bank-details")).toBeEmpty();
});


test("unpriced or incomplete market totals cannot enable bank transfer", () => {
    const bank = { accountName: "TEST", bankName: "TEST", sortCode: "00", accountNumber: "00" };
    const settings = { enquiryEmail: "orders@example.com", bank };
    const product = { madeToOrder: { enabled: true, leadTime: "4 weeks", basePriceMinor: 17500, currency: "GBP", markets: [
        { id: "uk", shippingMinor: null }
    ] } };
    expect(quoteFor(product, "uk")).toBeNull();
    expect(paymentReady(settings, product, quoteFor(product, "uk"))).toBe(false);
    product.madeToOrder.markets[0].shippingMinor = 0;
    const quote = quoteFor(product, "uk");
    expect(paymentReady(settings, product, quote)).toBe(true);
    product.madeToOrder.markets[0].shippingMinor = -100;
    expect(quoteFor(product, "uk")).toBeNull();
    expect(paymentReady(settings, product, { ...quote, international: true })).toBe(false);
    expect(paymentReady({ ...settings, enquiryEmail: null }, product, quote)).toBe(false);
    expect(quoteFor(product, "unlisted-destination")).toBeNull();
});


test("FORGE test checkout previews regional totals without enabling transfers or sending email", async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await openForge(page, false, true);
    await expect(page.locator("#collections-product-price")).toContainText("£175.00");
    await page.getByRole("button", { name: "Made-to-order enquiry", exact: true }).click();
    await page.getByRole("button", { name: "Select size XL", exact: true }).click();
    await page.getByRole("button", { name: "Made-to-order enquiry", exact: true }).click();
    await expect(page.locator(".collections-order-test-banner")).toContainText("NO PAYMENT WILL BE TAKEN");
    const regions = [["uk", "£175.00"], ["europe", "£195.00"], ["north-america", "£205.00"], ["asia", "£210.00"], ["oceania", "£210.00"], ["rest-of-world", "£215.00"]];
    for (const [region, total] of regions) {
        await page.getByLabel("DELIVERY REGION", { exact: true }).selectOption(region);
        await expect(page.locator(".collections-order-breakdown")).toContainText(`${total} GBP`);
    }
    await page.getByRole("button", { name: "PREVIEW TEST ENQUIRY" }).click();
    await expect(page.getByLabel("Test enquiry preview")).toHaveValue(/TEST ONLY — DO NOT TRANSFER MONEY/);
    await expect(page.getByLabel("Test enquiry preview")).toHaveValue(/Estimated total: £215.00 GBP/);
    await expect(page.locator(".collections-order-email")).not.toHaveAttribute("href");
    await expect(page.locator(".collections-bank-details").last()).toContainText("Not configured — test only");
    await page.screenshot({ path: testInfo.outputPath("forge-test-checkout.png") });
});
