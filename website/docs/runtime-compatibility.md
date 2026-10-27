---
title: Runtime compatibility
description: RSA PKCS#1 v1.5 support in Node.js and OpenSSL, the capability check, and the pure-JS fallback.
section: Guides
order: 5
---

# Runtime compatibility

## Why this matters

Nagad's protocol uses RSA encryption with PKCS#1 v1.5 padding. Since the fix for CVE-2023-46809 (the Marvin attack), OpenSSL 3.0 builds used by some Node.js versions **refuse** PKCS#1 v1.5 private-key decryption.

## What we observed

| Node.js | OpenSSL | RSA PKCS#1 v1.5 private decryption |
| --- | --- | --- |
| 18.20.8 | 3.0.16 | Rejected (`ERR_INVALID_ARG_VALUE`) |
| 20.20.2 | 3.0.19 | Rejected |
| 22.23.4 | 3.5.9 | Works |
| 24.14.0 | 3.5.5 | Works |

`nagad-server` declares `engines.node >= 18`. On Node 22 and 24 it uses `node:crypto`. On Node 18 and 20 it **switches automatically** to a BigInt implementation of the decryption step (see below). CI runs the full suite on Node 20, 22 and 24; Node 18 is covered by a full create-and-verify smoke run.

## The capability check

```ts
await nagad.init(); // runs checkCapability() on first use
```

With the default provider on an unsupported runtime, the client switches to the pure-JS decryption. If you passed your own `cryptoProvider` and it fails the check, `NagadCryptoCapabilityError` is thrown with the Node and OpenSSL versions instead of failing in the middle of a payment.

## Options on older Node.js

1. **Upgrade to Node.js 22 or 24** (recommended; uses the native provider).
2. Do nothing. When you do not set `cryptoProvider`, `nagad.init()` (called automatically before the first request) detects the restriction, logs a warning and switches to the pure-JavaScript decryption. You can also choose it explicitly:

   ```ts
   import { createNagad, PureJsCryptoProvider } from 'nagad-server';
   createNagad({ /* … */, cryptoProvider: new PureJsCryptoProvider() });
   ```

3. The pure-JS decryption is not constant-time. It decrypts responses that come from Nagad over TLS; it is not meant for an endpoint that accepts attacker-chosen ciphertexts. Only the decryption is pure JavaScript; signing, verifying and encryption still use `node:crypto`.
4. Running Node with `--security-revert=CVE-2023-46809` re-enables the old behaviour. It reintroduces the timing weakness the fix addressed; we do not recommend it.

## Edge runtimes

Cloudflare Workers and Vercel Edge use WebCrypto, which has no RSAES-PKCS1-v1_5. They are **not supported**. Call a Node.js backend, or use a forward proxy for the egress IP only while keeping signing on Node.
