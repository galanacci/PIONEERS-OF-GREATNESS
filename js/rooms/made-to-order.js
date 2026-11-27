// Explicit market prices only: never infer an exchange rate or payment details.
export function quoteFor(product, marketId) {
    const market = product.madeToOrder?.markets?.find((entry) => entry.id === marketId);
    if (!market || !Number.isSafeInteger(market.totalMinor) || market.totalMinor <= 0 || !/^[A-Z]{3}$/.test(market.currency)) return null;
    try {
        const formatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: market.currency });
        const digits = formatter.resolvedOptions().maximumFractionDigits;
        return { ...market, display: formatter.format(market.totalMinor / 10 ** digits) };
    } catch { return null; }
}

export function paymentReady(config, product, quote) {
    const bank = config.bank || {};
    const domestic = bank.sortCode && bank.accountNumber;
    const international = bank.iban && bank.bic;
    return Boolean(product.madeToOrder?.enabled && quote && quote.deliveryIncluded === true &&
        product.madeToOrder.leadTime && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.enquiryEmail || "") &&
        bank.accountName && bank.bankName && (quote.international ? international : domestic));
}

export function initMadeToOrder(page) {
    const panel = page.querySelector('[data-collections-panel="enquiry"]');
    const price = page.querySelector("#collections-product-price");
    const action = page.querySelector('[data-collections-action="enquiry"]');
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
    panel.append(heading, marketLabel, select, summary, instructions, bankList, email, copy, feedback);
    let product, config = {}, size = null, reference = "", details = "";
    const render = () => {
        const quote = quoteFor(product, select.value);
        price.textContent = quote ? `${quote.display} · ${quote.label}${quote.deliveryIncluded === true ? " · DELIVERY INCLUDED" : ""}` : product.price;
        summary.textContent = `${product.title} · ${size ? `SIZE ${size}` : "CHOOSE YOUR SIZE"}${quote ? ` · ${quote.display}` : ""}`;
        bankList.replaceChildren();
        feedback.textContent = "";
        const ready = size && paymentReady(config, product, quote);
        email.hidden = copy.hidden = !ready;
        email.removeAttribute("href");
        if (!ready) {
            instructions.textContent = !product.madeToOrder?.enabled ? "This piece is a private preview. Enquiries are not open yet." : !size ? "Select your size before continuing." : "Payment details are being finalised. Orders are not open yet; please do not send payment.";
            return;
        }
        const bank = config.bank;
        const rows = [["Account name", bank.accountName], ["Bank", bank.bankName],
            ...(quote.international ? [["IBAN", bank.iban], ["BIC", bank.bic]] : [["Sort code", bank.sortCode], ["Account number", bank.accountNumber]]),
            ["Amount", `${quote.display} ${quote.currency}`], ["Payment reference", reference]];
        rows.forEach(([label, value]) => {
            const term = document.createElement("dt"), definition = document.createElement("dd");
            term.textContent = label; definition.textContent = value;
            bankList.append(term, definition);
        });
        instructions.textContent = `Production time: ${product.madeToOrder.leadTime}. Transfer the exact amount below using this reference, then email your enquiry with your name, delivery address and payment reference. Your order is confirmed by email after payment is verified.`;
        details = `${product.title}\nSize: ${size}\nDelivery region: ${quote.label}\n${rows.map(([key, value]) => `${key}: ${value}`).join("\n")}\nProduction time: ${product.madeToOrder.leadTime}\n\nName:\nDelivery address:\nContact email:\nPayment sent on:\n`;
        email.href = `mailto:${config.enquiryEmail}?subject=${encodeURIComponent(`Made to order — ${reference}`)}&body=${encodeURIComponent(details)}`;
    };
    select.addEventListener("change", render);
    copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(details); feedback.textContent = "Details copied. Paste them into your email."; }
        catch { feedback.textContent = "Copy unavailable. Use the email enquiry button or copy the details above."; }
    });
    return {
        product(next, settings) {
            product = next; config = settings || {}; size = null;
            reference = `POG-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
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
