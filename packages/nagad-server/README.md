# nagad-server

> Alpha, zero-runtime-dependency Nagad Payment Gateway SDK for Node.js, TypeScript, and modern JavaScript runtimes.

[![CI](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml/badge.svg)](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/nagad-server/alpha.svg)](https://www.npmjs.com/package/nagad-server)

---

## Disclaimer

This package is an **unofficial**, community-driven open-source library. It is **not** affiliated with, endorsed by, or sponsored by Nagad or Third Wave Technologies Limited.

---

## Features

- **Zero Runtime Dependencies**: Built entirely on standard web APIs (`fetch`, `Request`, `Response`) and runtime native cryptography.
- **CVE-2023-46809 Protection**: Startup capability check (`checkCapability()`) validates OpenSSL implicit rejection for RSA PKCS#1 v1.5 decryption.
- **Deterministic Financial Safety**: Zero float comparison. Amounts are validated as strict decimal strings and integer poisha.
- **Replay & Race Protection**: Atomic lease claims via CAS and configurable 7-day replay prevention tombstones.
- **Pluggable Session Persistence**:
  - `MemorySessionStore` (local dev)
  - `RedisSessionStore` (distributed Redis via atomic Lua scripts)
  - `UpstashRestSessionStore` (REST-based KV for edge/serverless without TCP)
  - `GenericKvSessionStore` (Cloudflare Workers KV, Vercel KV)
- **Universal Framework Adapters**: Native Web Standard handler plus Express, Fastify, Hono, Next.js App Router, NestJS, Koa, Nitro/Nuxt, SvelteKit, Remix, and Astro.
- **Automatic PII Masking**: Customer MSISDNs masked (`017****5678`) and secrets redacted from logs recursively.

---

## Runtime requirements

- **Node.js >= 22 is required for the default crypto provider.** Nagad uses RSA PKCS#1 v1.5 encryption; Node builds on OpenSSL 3.0 (observed: Node 18.20 and 20.20) refuse PKCS#1 v1.5 private decryption, and `checkCapability()` throws `NagadCryptoCapabilityError`. Tested on Node 22 and 24.
- Node 18/20: pass `cryptoProvider: new PureJsCryptoProvider()` (**NOT TESTED**). Cloudflare Workers / Vercel Edge: **NOT TESTED**.

---

## Installation

```bash
npm install nagad-server@alpha
# or
pnpm add nagad-server@alpha
```

---

## Quickstart (Under 10 Lines)

```typescript
import { createNagad } from "nagad-server";

const nagad = createNagad({
  merchantId: process.env.NAGAD_MERCHANT_ID!,
  merchantPrivateKey: process.env.NAGAD_PRIVATE_KEY!,
  pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY!,
  baseUrl: process.env.NAGAD_BASE_URL!, // e.g. from your onboarding details
});

// 1. Create Checkout
const { callBackUrl, paymentReferenceId } = await nagad.checkout.create({
  amount: "500.00",
  callbackUrl: "https://example.com/payment/callback",
});

// 2. Verify on Callback
const result = await nagad.checkout.verify({
  paymentRefId: callbackParams.payment_ref_id,
  expectedAmount: "500.00",
});
```

---

## Framework Integration (Next.js App Router)

```typescript
// app/api/nagad/[...route]/route.ts
import { createNextRouteHandler } from "nagad-server/frameworks";
import { nagad } from "@/lib/nagad";

export const { GET, POST } = createNextRouteHandler(nagad, {
  basePath: "/api/nagad",
  // Required: decide the amount on the server. Client-sent amounts are rejected.
  resolveOrder: async (req) => ({ amount: await lookupCartTotal(req) }),
  // Client-sent callbackUrl is ignored unless its origin is listed here.
  allowedCallbackOrigins: ["https://example.com"],
  onSuccess: async (result) => {
    console.log("Payment verified successfully:", result.orderId);
  },
});
```

---

## License

MIT © [Md Tanvir Ahamed Shanto](https://github.com/iamtashanto)
