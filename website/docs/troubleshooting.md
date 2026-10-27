---
title: Troubleshooting
description: Common problems and fixes.
section: Reference
order: 12
---

# Troubleshooting

## `NagadCryptoCapabilityError` at startup

Your Node.js build rejects RSA PKCS#1 v1.5 decryption. Use Node 22 or 24. See [Runtime compatibility](../runtime-compatibility/).

## `NagadSignatureVerificationError`

Wrong `pgPublicKey` (for example the sandbox key against the production URL), or a different `signatureAlgorithm` than your account uses. Make sure the key, the `baseUrl` and the environment belong together.

## `16_0006_076` / clock errors

Your server clock is off. Enable NTP. The SDK sends Bangladesh time (UTC+6) and Nagad allows a small window.

## Calls fail only in production

The server's egress IP is not whitelisted. See [Fixed egress and proxy](../egress-and-proxy/).

## `Client-supplied amounts are disabled`

`POST /create` requires `resolveOrder` on purpose. See [Security](../security/).

## Callback returns `404 unknown_session`

The handler has no stored session for that `payment_ref_id`. The store may be per-process (memory) while the callback hit another instance. Use Redis. Or the reference is fake.

## `duplicate order id`

Order ids must be unique per day. Generate a new one per attempt.

## The callback is not reachable

It must be public HTTPS and match the callback URL registered in the merchant portal. On localhost, use an HTTPS tunnel.

## Key parse errors

A PEM in an environment variable needs real line breaks (`value.replace(/\\n/g, '\n')`), or use the single-line base64 body.
