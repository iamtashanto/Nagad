---
title: Server guide
description: Configuration, session stores, every client method, and the HTTP handler.
section: Guides
order: 6
---

# Server guide

## Configuration

| Option | Default | Notes |
| --- | --- | --- |
| `merchantId` | required | Your Nagad merchant ID. |
| `merchantPrivateKey` | required | Your private key. Server only. |
| `pgPublicKey` | required | Nagad's gateway public key. |
| `baseUrl` | required | The API base URL from your onboarding details. **No host is built in.** |
| `serverIp` | none | Sent as `X-KM-IP-V4`. Set it to your whitelisted egress IP. |
| `signatureAlgorithm` | `SHA256` | `SHA1` for accounts configured that way. |
| `sessionStore` | memory | Use Redis, Upstash or a KV store in production. |
| `cryptoProvider` | Node | See [Runtime compatibility](../runtime-compatibility/). |
| `fetch` | global | Custom transport, for example a [forward proxy](../egress-and-proxy/). |
| `hooks`, `logger` | none | Auditing hooks; logs redact secrets and wallet numbers. |

## Methods

| Method | Purpose |
| --- | --- |
| `nagad.checkout.create(params)` | Initialize and complete. Returns `{ callBackUrl, paymentReferenceId, orderId }`. |
| `nagad.checkout.verify({ paymentRefId, expectedAmount, expectedOrderId? })` | Verify with Nagad, check the signature, compare amount and order, record the result. |
| `nagad.payment.getStatus(paymentRefId)` | Raw status lookup. **Not signature-checked and not compared with your order. Do not fulfil on it.** Use `verify`. |
| `nagad.reconcile(paymentRefId)` | Re-verify a stored session that was interrupted; returns `null` if it cannot be confirmed. |
| `nagad.init()` | Runs the crypto capability check at startup. |
| `nagad.raw.post(path, body)` | Escape hatch for calls the SDK does not wrap. Unsigned; you own correctness. |

Refund and webhook are **not implemented**.

### create

```ts
const { callBackUrl, paymentReferenceId, orderId } = await nagad.checkout.create({
  amount: '1250.00',        // string or integer poisha
  callbackUrl: 'https://shop.example/api/nagad/callback',
  orderId: undefined,       // optional; generated when omitted
  clientType: 'PC_WEB',     // PC_WEB | MOBILE_WEB | MOBILE_APP | WALLET_WEB_VIEW
});
```

### verify

`verify` throws `NagadVerificationMismatchError` if the amount, order id or merchant differ, `NagadSignatureVerificationError` if the response signature is wrong, `NagadReplayAttackError` for a replayed callback and `NagadConcurrentVerificationError` if another worker is verifying the same payment. A repeated verify of an already-verified payment returns the stored result without calling Nagad again.

## Session stores

The store remembers each order between create and verify, rejects duplicate order ids, and prevents double verification.

```ts
import Redis from 'ioredis';
import { RedisSessionStore } from 'nagad-server/redis';
const sessionStore = new RedisSessionStore({ redis: new Redis(process.env.REDIS_URL!) });
```

Also available: `nagad-server/upstash` (`UpstashRestSessionStore`) and `nagad-server/kv` (`GenericKvSessionStore`, for Cloudflare KV or Vercel KV style stores). The memory store is for development only.

## HTTP handler

```ts
import { createWebHandler } from 'nagad-server/frameworks';
const handle = createWebHandler(nagad, {
  basePath: '/api/nagad',
  resolveOrder: async (req, body) => ({ amount, orderId }),
  callbackUrl: 'https://shop.example/api/nagad/callback',
  allowedCallbackOrigins: ['https://shop.example'],
  resolveExpectedAmount: async ({ paymentRefId, orderId }) => amount, // optional
  onSuccess: async (result) => { await markPaid(result); },
});
```

| Route | Behaviour |
| --- | --- |
| `POST /create` | Requires `resolveOrder` (or the unsafe `allowClientAmount: true`). `amount`, `orderId`, `clientIp`, `clientType` and TTL from the browser are ignored. A browser `callbackUrl` is used only if its origin is on `allowedCallbackOrigins`. |
| `GET\|POST /callback` | Verifies server-side. With no stored session and no `resolveExpectedAmount` it answers `404 unknown_session`. The public response contains only `success`, `orderId`, `paymentRefId`, `amount`, `status`, `statusCode`, `issuerPaymentDateTime`. |

Errors map to minimal responses: timeout → `202 unknown`, session missing → `404`, mismatch → `409`, other SDK errors → `400` with `code`, anything else → `500` without internals.

## Framework adapters

```ts
import {
  createExpressMiddleware, createFastifyPlugin, createHonoHandler, createKoaMiddleware,
  createNestMiddleware, createNextRouteHandler, createNitroHandler, createRemixAction,
  createSvelteKitHandler, createAstroHandler,
} from 'nagad-server/frameworks';
```

```ts
// Next.js App Router: app/api/nagad/[...route]/route.ts
export const { GET, POST } = createNextRouteHandler(nagad, { basePath: '/api/nagad', resolveOrder });
```

Express, Next.js and Hono are exercised by tests; the others are thin wrappers and are marked experimental in the [feature status](../status/).
