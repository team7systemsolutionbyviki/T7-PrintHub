# Printing data mismatch fix

For customer/admin invoice consistency, `InvoiceComponent.getInvoiceDetails()` now:
- uses the same file-level `options.colorMode` that Admin Order Pipeline displays;
- supports Color, Black & White and Custom Split;
- derives page counts from saved file page counts, not file count;
- uses saved order-level pricing component amounts when available;
- derives the displayed historical rate from the saved component amount;
- falls back to legacy `printing`/`pricing` fields only when file-level data is unavailable.

This fixes cases where Admin shows Color but the invoice incorrectly rendered B&W.
