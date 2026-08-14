# T7PrintHub AWB + WhatsApp Click-to-Chat Setup

## No WhatsApp API required

This version does NOT use:

- WhatsApp Cloud API
- WhatsApp API access tokens
- Meta API keys
- Firebase Functions for WhatsApp
- WhatsApp Web automation

The system uses the official WhatsApp click-to-chat URL (`wa.me`).

## Workflow

1. Admin opens the order.
2. Admin uploads/scans the AWB slip.
3. OCR suggests the AWB number.
4. Admin verifies/edits the AWB.
5. Admin clicks **Save & Open WhatsApp**.
6. T7PrintHub prepares the message.
7. WhatsApp opens for the customer's number.
8. The complete message is already filled in.
9. Admin presses **Send**.

## Message contains

- Customer name
- Order number
- ST Courier
- AWB number
- Invoice/order link
- Official ST Courier tracking page

## Important limitation

Without the WhatsApp API, the browser cannot silently send the message.

The admin must press **Send** inside WhatsApp.

The system also cannot automatically attach the AWB image or invoice PDF through a `wa.me` link. It can send links to them. Automatic media sending requires the official WhatsApp Business API.

## ST Courier tracking

Official tracking page:

https://www.stcourier.com/track/shipment

The AWB number is included separately in the WhatsApp message.

## Invoice

The message uses the existing T7PrintHub customer order/invoice page:

`#track?id=ORDER_ID`

This avoids inventing an invoice PDF URL.
