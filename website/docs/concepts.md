---
title: Core concepts
description: The checkout flow, payment states, and why a callback is not proof of payment.
section: Concepts
order: 3
---

# Core concepts

## The flow

1. **Initialize and complete.** Your server asks Nagad for a hosted checkout. Internally this is two signed, encrypted calls. The result is a `callBackUrl` (the Nagad page to send the customer to) and a `paymentReferenceId`.
2. **Redirect.** The customer approves the payment on Nagad's page.
3. **Callback.** Nagad redirects the browser to **your** callback URL with query parameters such as `payment_ref_id`, `order_id` and a status.
4. **Verify.** Your server asks Nagad for the payment by `paymentRefId`, checks Nagad's signature, and compares order and amount with what you expected.
5. **Fulfil** only if verification succeeded.

## A created checkout is not a paid order

Creating a checkout only reserves a reference. The customer may never pay. Mark an order paid only after `checkout.verify` returns `success`.

## The callback is not proof of payment

The callback is a browser redirect; anyone can type `…/callback?status=Success&payment_ref_id=X`. The SDK therefore:

- ignores the status in the query string on the server and always asks Nagad;
- fails closed when the reference is unknown;
- in `nagad-client`, moves to `verifying` on a callback, **not** `success`. You call `confirmSuccess()` only after your server verified.

## Order identifiers

An order id is 5 to 20 alphanumeric characters and must be unique per day. `generateOrderId()` creates a safe one; the SDK checks uniqueness through the session store before calling Nagad.

## Amounts

Amounts are decimal strings (`"1250.00"`) or integer poisha; floating-point arithmetic is never used. Currency is BDT (`050`).

## Server and client states

| Client state | Meaning |
| --- | --- |
| `idle` | Nothing started. |
| `redirecting` | The customer is being sent to Nagad. |
| `verifying` | The customer returned; your server is verifying. |
| `success` | Your server confirmed payment (`confirmSuccess()`). |
| `pending` | Your server could not tell (`confirmPending()`). Show "pending, do not pay again". |
| `error` | The callback reported a non-success status. |

**Unknown is not failed.** If verification times out, the HTTP handler answers `202` with `status: "unknown"`; verify again later (`nagad.reconcile(paymentRefId)`) instead of asking the customer to pay again.

## Idempotency and races

Verification is guarded by a short lease in the session store. Two simultaneous callbacks for one payment cannot both verify, and a finished payment is remembered for seven days so a replayed callback is rejected.
