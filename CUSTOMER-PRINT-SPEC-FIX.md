# Customer Print Specification Fix

The customer tracking page now uses `InvoiceComponent.getInvoiceDetails(order)` as its single source of truth.

It no longer displays:
- file count as page count
- first-file `Custom Split` as the complete print type
- stale first-file paper/specification values

It displays:
- paper size
- GSM
- print type
- sides
- binding
- lamination
- actual pages
- copies
- color/B&W pages, copies, total prints, rate and amount
- total prints
- grand total

This keeps the customer summary consistent with the Admin Printing Invoice.
