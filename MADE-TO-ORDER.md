# Made-to-order setup

The existing Collections private preview (`/?preview=collections`) contains the FORGE size → enquiry → bank-transfer flow. Public access remains locked. The other collection studies cannot take payment.

Set the real values in `data/collections.json` before opening orders:

- Root `madeToOrder.enquiryEmail`: the inbox that receives customer enquiries.
- Root `madeToOrder.bank`: account name, bank name, sort code/account number, and IBAN/BIC for international payments.
- FORGE `madeToOrder.leadTime`: customer-facing production estimate.
- FORGE `madeToOrder.basePriceMinor`: £175 (17500 pence), with `currency: "GBP"`. Each market adds `shippingMinor` in pence. UK shipping is included (0). International markets require `international: true` and IBAN/BIC. All totals are charged in GBP; no exchange conversion is performed. Jacket price, shipping and total are repeated in the enquiry.
- Initial international delivery estimates: Europe £20; USA/Canada £30; Asia £35; Australia/New Zealand £35; rest of world £40. These are general planning estimates, not carrier quotes. `shippingEstimate: true` labels them accordingly. Review actual packed weight, destination, cover and import charges before taking real orders. Reference: https://www.royalmail.com/sending/international/international-tracked (reviewed 27 November 2026).

Nulls deliberately prevent payment instructions from opening. No sample bank details or prices are shipped. The selected regional price appears in the product view, payment summary and email. Prices must include applicable delivery and charges payable to the brand; restrict region labels to destinations actually supported.

Customers select one size, view the bank instructions immediately, transfer using the generated reference, then open an email enquiry containing that same reference and amount. They add their name, delivery address and payment date. Copy details is an alternative when no mail client is configured. Opening email does not send anything. This static website does not verify payment, store customer details, reserve inventory or automatically confirm an order; staff verify payment and reply to confirm production.

Review the configured preview and payment instructions before making Collections public. Use the repository's normal dev → main release process.


## FORGE walkthrough

Open `/?preview=collections&payment-test=forge&entry=galanacci`, enter Collections and select FORGE. The clearly marked test checkout uses the real £175 product price and configured regional delivery estimates. It lets you preview/copy the enquiry with a TEST reference without exposing payment instructions, opening a mail draft or claiming anything was paid/sent. It supplies no sample bank account. Production time remains “to be confirmed” in this simulation. Other products cannot enter test checkout. Remove `payment-test=forge` to return to the regular, configuration-gated flow.
