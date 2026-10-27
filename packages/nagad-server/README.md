# nagad-server

Server SDK for accepting [Nagad](https://nagad.com.bd) payments from Node.js: signed and encrypted checkout, verified callbacks, safe retries.

[![CI](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml/badge.svg)](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/nagad-server)](https://www.npmjs.com/package/nagad-server)
[![license](https://img.shields.io/npm/l/nagad-server)](https://github.com/iamtashanto/Nagad/blob/main/LICENSE)

> **Unofficial.** Not affiliated with, endorsed by, or sponsored by Nagad or Third Wave Technologies Ltd.
> **Pre-release:** nothing has been run against the live Nagad gateway by the maintainers yet. See the status table below.

**Documentation:** <https://iamtashanto.github.io/Nagad/docs/> · **Issues:** <https://github.com/iamtashanto/Nagad/issues> · **Releases:** <https://github.com/iamtashanto/Nagad/releases>

## Why

- **The server decides the price.** The HTTP handler ignores the browser's amount, order id and callback URL.
- **Verified payments.** Nagad's response signature is checked by default, and the amount and order you expected are compared with what Nagad reports.
- **Safe retries.** A session store prevents duplicate order ids, double verification and replayed callbacks; an unknown outcome is reported as unknown, never as failed.
- **Zero runtime dependencies**, ESM and CommonJS, full types.
- **Honest compatibility.** RSA PKCS#1 v1.5 needs **Node.js 22 or newer**; older Node builds fail a startup capability check instead of failing mid-payment.

## Install

```bash
npm install nagad-server
```

Requires **Node.js >= 22**. Cloudflare Workers and Vercel Edge are not supported (no RSA PKCS#1 v1.5 in WebCrypto).

## Quickstart

```ts
import { createNagad } from 'nagad-server';

const nagad = createNagad({
  merchantId: process.env.NAGAD_MERCHANT_ID!,
  merchantPrivateKey: process.env.NAGAD_PRIVATE_KEY!,
  pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY!,
  baseUrl: process.env.NAGAD_BASE_URL!, // from your Nagad onboarding details
});

// 1. Create a checkout and redirect the customer to callBackUrl
const { callBackUrl, paymentReferenceId } = await nagad.checkout.create({
  amount: '500.00',
  callbackUrl: 'https://shop.example/api/nagad/callback',
});

// 2. On the callback, verify on the server. Never trust the query string.
const result = await nagad.checkout.verify({ paymentRefId, expectedAmount: '500.00' });
```

Or mount the ready-made handler: `createExpressMiddleware(nagad, { resolveOrder, allowedCallbackOrigins })` from `nagad-server/frameworks`.

Pair it with [`nagad-client`](https://www.npmjs.com/package/nagad-client) on the front end.

## What is supported

<!-- status:start -->
<!-- Generated from website/src/data/status.json. Do not edit by hand. -->
| Feature | Status | Evidence |
| --- | --- | --- |
| Session Initialization (/check-out/initialize) | Experimental | automated tests against the local simulator; NOT TESTED against the live gateway (sandbox access needs onboarding credentials) |
| Order Placement & Complete (/check-out/complete) | Experimental | automated tests against the local simulator; NOT TESTED against the live gateway |
| Payment Verification (/verify/payment) | Experimental | automated tests against the local simulator incl. tampered amount, order id and merchant id; NOT TESTED against the live gateway |
| Payment Status Check | Experimental | automated tests against the local simulator |
| Native Node.js Crypto Provider (OpenSSL 3) | Beta | golden-vector tests; passes on Node 22 and 24, fails on Node 18/20 (OpenSSL 3.0 rejects RSA PKCS#1 v1.5 decryption) |
| Legacy SHA1withRSA Signature Support | Experimental | unit tests only; not validated with a real SHA-1 account |
| Pure-JS PKCS#1 v1.5 Fallback Provider | Experimental | NOT TESTED on Node 18/20 |
| Edge / Serverless Runtimes (Cloudflare Workers, Vercel Edge) | Planned | Not supported: WebCrypto has no RSAES-PKCS1-v1_5 |
| Memory Session Store (Dev-Only) | Beta | automated tests against the local simulator (race and replay tests) |
| Redis Session Store (Distributed Lua CAS) | Beta | automated tests against the local simulator with a real Redis service in CI |
| Upstash / Generic KV Session Store | Experimental | unit tests with a fake KV |
| Express Adapter | Beta | automated tests against the local simulator |
| Next.js App Router Adapter | Experimental | automated tests against the local simulator (smoke) |
| Hono Adapter | Experimental | automated tests against the local simulator (smoke) |
| Programmatic Refund API | Planned | Not implemented: no verifiable public specification. The raw() escape hatch is not provided for it. |
| Server-to-Server Webhook / IPN | Planned | Not implemented: no public specification |
| HTTP handler (create, callback) | Beta | automated tests against the local simulator: tampering, allowlist, fail-closed, error mapping |
| Forward-proxy egress (fixed IP) | Experimental | unit tests; NOT TESTED against a real proxy |
<!-- status:end -->

Refund and webhook/IPN are **not implemented** (no public specification).

## Entry points

| Import | Contents |
| --- | --- |
| `nagad-server` | `createNagad`, errors, memory and Redis session stores, crypto providers, utilities |
| `nagad-server/frameworks` | Express, Fastify, Hono, Koa, Nest, Next.js, Nitro, Remix, SvelteKit, Astro adapters |
| `nagad-server/redis`, `/upstash`, `/kv` | Session stores |
| `nagad-server/proxy` | `createForwardProxyFetch` for a fixed egress IP |

## Security

Read the [security guide and production checklist](https://iamtashanto.github.io/Nagad/docs/security/). Report vulnerabilities privately through GitHub's "Report a vulnerability" form.

## License

MIT
