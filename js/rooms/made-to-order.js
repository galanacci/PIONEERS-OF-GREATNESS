// Product price plus configured regional delivery, in integer minor units.
export function quoteFor(product, marketId) {
    const pricing = product.madeToOrder;
    const market = pricing?.markets?.find((entry) => entry.id === marketId);
    if (!market || !Number.isSafeInteger(pricing.basePriceMinor) || pricing.basePriceMinor <= 0 ||
        !Number.isSafeInteger(market.shippingMinor) || market.shippingMinor < 0 || !/^[A-Z]{3}$/.test(pricing.currency)) return null;
    const totalMinor = pricing.basePriceMinor + market.shippingMinor;
    if (!Number.isSafeInteger(totalMinor)) return null;
    try {
        const formatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: pricing.currency });
        const digits = formatter.resolvedOptions().maximumFractionDigits;
        const format = (minor) => formatter.format(minor / 10 ** digits);
        return { ...market, currency: pricing.currency, totalMinor, display: format(totalMinor),
            baseDisplay: format(pricing.basePriceMinor), shippingDisplay: format(market.shippingMinor) };
    } catch { return null; }
}

export function paymentReady(config, product, quote) {
    const bank = config.bank || {};
    const domestic = bank.sortCode && bank.accountNumber;
    const international = bank.iban && bank.bic;
    return Boolean(product.madeToOrder?.enabled && quote && Number.isSafeInteger(quote.totalMinor) && quote.totalMinor > 0 &&
        product.madeToOrder.leadTime && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.enquiryEmail || "") &&
        bank.accountName && bank.bankName && (quote.international ? international : domestic));
}

export function initMadeToOrder(page) {
    const panel = page.querySelector('[data-collections-panel="enquiry"]');
    const price = page.querySelector("#collections-product-price");
    const action = page.querySelector('[data-collections-action="enquiry"]');
    const sizeFields = panel.querySelector(".collections-order-size");
    panel.replaceChildren();
    const heading = document.createElement("h3");
    heading.id = "collections-order-heading";
    heading.className = "collections-panel-label";
    heading.textContent = "MADE TO ORDER";
    panel.setAttribute("aria-labelledby", heading.id);
    const marketLabel = document.createElement("label");
    marketLabel.textContent = "DELIVERY REGION";
    const select = document.createElement("select");
    select.id = "collections-order-market";
    marketLabel.htmlFor = select.id;
    const summary = document.createElement("p");
    summary.className = "collections-order-summary";
    summary.setAttribute("aria-live", "polite");
    const instructions = document.createElement("p");
    instructions.className = "collections-order-instructions";
    const bankList = document.createElement("dl");
    bankList.className = "collections-bank-details";
    const email = document.createElement("a");
    email.className = "collections-order-email";
    email.textContent = "EMAIL MADE-TO-ORDER ENQUIRY";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "COPY PAYMENT & ENQUIRY DETAILS";
    const feedback = document.createElement("p");
    feedback.setAttribute("role", "status");
    const breakdown = document.createElement("dl");
    breakdown.className = "collections-order-breakdown";
    const testBanner = document.createElement("p");
    testBanner.className = "collections-order-test-banner";
    testBanner.textContent = "TEST CHECKOUT — NO PAYMENT WILL BE TAKEN. DO NOT TRANSFER MONEY.";
    const testPreview = document.createElement("button");
    testPreview.type = "button";
    testPreview.textContent = "PREVIEW TEST ENQUIRY";
    const draft = document.createElement("textarea");
    draft.readOnly = true;
    draft.setAttribute("aria-label", "Test enquiry preview");
    draft.hidden = true;
    panel.append(testBanner, heading, sizeFields, marketLabel, select, summary, breakdown, instructions, bankList, email, testPreview, draft, copy, feedback);
    let product, config = {}, size = null, reference = "", details = "";
    let testMode = false;
    testPreview.addEventListener("click", () => {
        draft.value = details;
        draft.hidden = false;
        feedback.textContent = "Test enquiry preview only. Nothing has been sent and no payment has been taken.";
        draft.focus();
        draft.setSelectionRange(0, 0);
        draft.scrollTop = 0;
    });
    const render = () => {
        const quote = quoteFor(product, select.value);
        price.textContent = quote ? `${quote.baseDisplay} · ${quote.international ? `+ ${quote.shippingDisplay} ${quote.shippingEstimate ? "ESTIMATED " : ""}DELIVERY` : "UK DELIVERY INCLUDED"}` : product.price;
        summary.textContent = `${product.title} · ${size ? `SIZE ${size}` : "CHOOSE YOUR SIZE"}${quote ? ` · ${quote.display}` : ""}`;
        bankList.replaceChildren();
        breakdown.replaceChildren();
        const costRows = quote ? [["Jacket", quote.baseDisplay], [quote.shippingEstimate ? "Estimated delivery" : "Delivery", quote.shippingMinor === 0 ? "Included" : quote.shippingDisplay], [quote.shippingEstimate ? "Estimated total" : "Total", `${quote.display} ${quote.currency}`]] : [];
        const addRows = (list, rows) => rows.forEach(([label, value]) => {
            const term = document.createElement("dt"), definition = document.createElement("dd");
            term.textContent = label; definition.textContent = value;
            list.append(term, definition);
        });
        addRows(breakdown, costRows);
        feedback.textContent = "";
        draft.hidden = true;
        testBanner.hidden = !testMode;
        const ready = size && quote && (testMode || paymentReady(config, product, quote));
        email.hidden = !ready || testMode;
        testPreview.hidden = !ready || !testMode;
        copy.hidden = !ready;
        copy.textContent = testMode ? "COPY TEST ENQUIRY" : "COPY PAYMENT & ENQUIRY DETAILS";
        email.removeAttribute("href");
        if (!ready) {
            instructions.textContent = !product.madeToOrder?.enabled ? "This piece is a private preview. Enquiries are not open yet." : !size ? "Select your size before continuing." : "Payment details are being finalised. Orders are not open yet; please do not send payment.";
            return;
        }
        const bank = config.bank;
        const rows = testMode ? [["Bank details", "Not configured — test only"], ["Test reference", reference]] : [["Account name", bank.accountName], ["Bank", bank.bankName],
            ...(quote.international ? [["IBAN", bank.iban], ["BIC", bank.bic]] : [["Sort code", bank.sortCode], ["Account number", bank.accountNumber]]),
            ["Amount", `${quote.display} ${quote.currency}`], ["Payment reference", reference]];
        addRows(bankList, rows);
        instructions.textContent = testMode ? "Walk through the FORGE order below, then preview the enquiry. This is a simulation; bank details and production time are still to be configured. International delivery figures are general estimates." : `Production time: ${product.madeToOrder.leadTime}. Transfer the exact amount below using this reference, then email your enquiry with your name, delivery address and payment reference. Your order is confirmed by email after payment is verified.`;
        details = `${testMode ? "TEST ONLY — DO NOT TRANSFER MONEY\n" : ""}${product.title}\nSize: ${size}\nDelivery region: ${quote.label}\n${[...costRows, ...rows].map(([key, value]) => `${key}: ${value}`).join("\n")}\nProduction time: ${product.madeToOrder.leadTime || "To be confirmed"}\n\nName:\nDelivery address:\nContact email:\nPayment sent on:\n`;
        if (!testMode) email.href = `mailto:${config.enquiryEmail}?subject=${encodeURIComponent(`Made to order — ${reference}`)}&body=${encodeURIComponent(details)}`;
    };
    select.addEventListener("change", render);
    copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(details); feedback.textContent = testMode ? "Test enquiry copied. Nothing has been sent." : "Details copied. Paste them into your email."; }
        catch { feedback.textContent = "Copy unavailable. Use the email enquiry button or copy the details above."; }
    });
    return {
        product(next, settings) {
            product = next; config = settings || {}; size = null;
            testMode = product.id === "preview-piece-01" && new URLSearchParams(window.location.search).get("payment-test") === "forge";
            reference = `${testMode ? "TEST" : "POG"}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
            select.replaceChildren(...(product.madeToOrder?.markets || []).map((market) => {
                const option = document.createElement("option"); option.value = market.id; option.textContent = market.label; return option;
            }));
            select.hidden = marketLabel.hidden = select.options.length < 2;
            action.setAttribute("aria-label", "Made-to-order enquiry");
            render();
        },
        size(value) { size = value; render(); }
    };
}
