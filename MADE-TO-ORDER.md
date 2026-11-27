# Made-to-order setup

The existing Collections private preview (`/?preview=collections`) contains the FORGE size → enquiry → bank-transfer flow. Public access remains locked. The other collection studies cannot take payment.

Set the real values in `data/collections.json` before opening orders:

- Root `madeToOrder.enquiryEmail`: the inbox that receives customer enquiries.
- Root `madeToOrder.bank`: account name, bank name, sort code/account number, and IBAN/BIC for international payments.
- FORGE `madeToOrder.leadTime`: customer-facing production estimate.
- FORGE `madeToOrder.markets`: one explicit final price per supported delivery region. `totalMinor` is the total in the currency's minor units (e.g. pence for GBP). `deliveryIncluded` must be `true` to enable payment. International markets require `international: true` and IBAN/BIC. Set the actual international currency and price; no exchange conversion is performed.

Nulls deliberately prevent payment instructions from opening. No sample bank details or prices are shipped. The selected regional price appears in the product view, payment summary and email. Prices must include applicable delivery and charges payable to the brand; restrict region labels to destinations actually supported.

Customers select one size, view the bank instructions immediately, transfer using the generated reference, then open an email enquiry containing that same reference and amount. They add their name, delivery address and payment date. Copy details is an alternative when no mail client is configured. Opening email does not send anything. This static website does not verify payment, store customer details, reserve inventory or automatically confirm an order; staff verify payment and reply to confirm production.

Review the configured preview and payment instructions before making Collections public. Use the repository's normal dev → main release process.
