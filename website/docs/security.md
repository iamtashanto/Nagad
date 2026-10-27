---
title: Security and production checklist
description: What the SDK enforces, what stays your job, and a checklist before going live.
section: Guides
order: 9
---

# Security and production checklist

## What the SDK enforces

| Risk | Control |
| --- | --- |
| The customer changes the price | `POST /create` needs `resolveOrder`; the browser's amount and order id are ignored. |
| A forged callback marks an order paid | The server always verifies with Nagad. `nagad-client` shows `verifying` until your server confirms. |
| Forged or tampered gateway responses | Nagad's response signature is verified by default; the amount, order id and merchant id are compared with your expectations. |
| Open redirect or phishing callback | A browser `callbackUrl` is ignored unless its origin is allowlisted; the React Native handler can block other hosts. |
| Double verification and replay | A lease in the session store, and a seven-day tombstone for finished payments. |
| Duplicate order ids | Checked in the store before calling Nagad. |
| Floating-point money errors | Decimal strings and integer poisha only. |
| Secrets and PII in logs/responses | Keys and wallet numbers are redacted; callback responses are minimal. |

## What stays your responsibility

- **Keep the merchant private key server-side** and rotate it if exposed.
- **Authenticate your own routes.** `resolveOrder` should read the order from the signed-in user's cart or database.
- **Idempotent fulfilment.** Make `onSuccess` safe to run twice (key it on `orderId`).
- **Fixed egress IP** registered with Nagad.
- **HTTPS everywhere**, including the callback URL.
- **No refunds through the SDK.** If you refund through the merchant portal, reconcile your records.

## Production checklist

- [ ] Node.js 18 or newer, and `await nagad.init()` runs at startup (a warning is logged if the pure-JS fallback is in use).
- [ ] Production keys, merchant ID and `baseUrl` come from your secret manager.
- [ ] Your public key and callback URL are registered with Nagad; your egress IP is whitelisted.
- [ ] `sessionStore` is Redis (or Upstash/KV), not memory, if you run more than one process.
- [ ] `resolveOrder` reads the price from your database; `allowClientAmount` is not set.
- [ ] `dangerouslySkipSignatureVerification` is not set.
- [ ] `allowedCallbackOrigins` or `callbackUrl` is set to your own domain.
- [ ] Fulfilment happens only after `verify` succeeds, and is idempotent.
- [ ] A job calls `reconcile()` for payments that stay `unknown`.
- [ ] The UI shows "pending, do not pay again" for `pending`.
- [ ] You completed the flow in Nagad's sandbox with your own onboarding credentials.
- [ ] You made one small real payment before announcing.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private "Report a vulnerability" form on the repository.
