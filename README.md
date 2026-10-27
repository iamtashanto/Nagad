# Nagad SDK Monorepo

> Alpha, zero-runtime-dependency, open-source Nagad Payment Gateway SDK for Node.js, Web, and Mobile.

[![CI](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml/badge.svg)](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml)
[![Website](https://img.shields.io/badge/docs-website-teal.svg)](https://iamtashanto.github.io/Nagad/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Disclaimer

This repository is an **unofficial**, community-driven open-source project. It is **not** affiliated with, endorsed by, or sponsored by Nagad or Third Wave Technologies Limited.

---

## Packages

| Package                                       | Description                                                                             |     Version     | Links                                                                                                     |
| :-------------------------------------------- | :-------------------------------------------------------------------------------------- | :-------------: | :-------------------------------------------------------------------------------------------------------- |
| [`nagad-server`](packages/nagad-server)       | Server SDK with zero runtime dependencies, atomic SessionStores, and framework adapters | `0.1.0-alpha.1` | [![npm](https://img.shields.io/npm/v/nagad-server/alpha.svg)](https://www.npmjs.com/package/nagad-server) |
| [`nagad-client`](packages/nagad-client)       | Headless client SDK for React, React Native, Vue, Svelte, Angular, and Vanilla JS       | `0.1.0-alpha.1` | [![npm](https://img.shields.io/npm/v/nagad-client/alpha.svg)](https://www.npmjs.com/package/nagad-client) |
| [`nagad-simulator`](packages/nagad-simulator) | Offline mock Nagad server with throwaway test RSA keys for deterministic CI             | `0.1.0-alpha.1` | Internal test package                                                                                     |

---

## Feature status

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
| React Hook (useNagadCheckout) | Beta | behaviour tests: verify-before-success contract |
| React Native WebView Integration | Experimental | callback interception tested without a device; NOT TESTED on a physical device |
| Vue 3 Composable (useNagad) | Beta | behaviour tests |
| Angular Service (NagadService) | Beta | behaviour tests |
| Local Test Simulator & Throwaway Key Generator | Experimental | used by the test-suite; not published to npm |
| Programmatic Refund API | Planned | Not implemented: no verifiable public specification. The raw() escape hatch is not provided for it. |
| Server-to-Server Webhook / IPN | Planned | Not implemented: no public specification |
| HTTP handler (create, callback) | Beta | automated tests against the local simulator: tampering, allowlist, fail-closed, error mapping |
| Forward-proxy egress (fixed IP) | Experimental | unit tests; NOT TESTED against a real proxy |
| Svelte store | Beta | behaviour tests |
<!-- status:end -->

## Quickstart

### 1. Server (`nagad-server`)

```bash
npm install nagad-server@alpha
```

```typescript
import { createNagad } from "nagad-server";

export const nagad = createNagad({
  merchantId: process.env.NAGAD_MERCHANT_ID!,
  merchantPrivateKey: process.env.NAGAD_PRIVATE_KEY!,
  pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY!,
  baseUrl: process.env.NAGAD_BASE_URL!,
});
```

### 2. Client (`nagad-client`)

```bash
npm install nagad-client@alpha
```

```tsx
import { useNagadCheckout } from "nagad-client/react";

function Checkout() {
  const { initiate, isLoading } = useNagadCheckout();
  // ...
}
```

---

## Documentation & Architecture

- **[Technical Architecture & Design (DESIGN.md)](docs/DESIGN.md)**: Deep dive into the cryptographic protocol, RSA PKCS#1 v1.5 handling, CVE-2023-46809 mitigation, and distributed state machines.
- **[Security Policy & Threat Model (SECURITY.md)](docs/SECURITY.md)**: Threat vectors, verification rules, and vulnerability reporting.
- **[Release Checklist & Hardening Gate (RELEASE_CHECKLIST.md)](docs/RELEASE_CHECKLIST.md)**: Production go/no-go audit, dogfood rollout plan, and publication commands.
- **[Interactive Documentation Website](https://iamtashanto.github.io/Nagad/)**: Guides, tokenized palettes, and compatibility matrices.

---

## Security & Verification

- **Full History Gitleaks Clean**: Scanned across all commits; zero secrets, real keys, or confidential IPs exist in git.
- **Marvin / Bleichenbacher Mitigation**: `NodeCryptoProvider.checkCapability()` validates host runtime OpenSSL implicit rejection at boot.
- **Types Resolution Modes**: 100% green on `@arethetypeswrong/cli` for `node10`, `node16`, `nodenext`, and `bundler`.
- **Deterministic Cryptographic Tests**: RSA signing and encryption are covered by golden-vector tests against the bundled local simulator. Not yet validated against the live gateway.

---

## License

MIT © [Md Tanvir Ahamed Shanto](https://github.com/iamtashanto)
