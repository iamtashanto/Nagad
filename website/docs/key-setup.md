---
title: Key setup
description: Generate your keys, register them with Nagad, and whitelist your server IP.
section: Guides
order: 4
---

# Key setup

Nagad uses two RSA key pairs: yours (the merchant pair) and Nagad's gateway pair. Requests are signed with **your private key** and encrypted with **Nagad's public key**; responses are signed by Nagad and checked with Nagad's public key.

## 1. Generate your merchant key pair

```bash
openssl genrsa -out merchant_private.pem 2048
openssl rsa -in merchant_private.pem -pubout -out merchant_public.pem
```

Some merchant portals generate the pair for you; use whichever your onboarding instructions say. Keep the private key secret: it belongs in a secret manager or an environment variable, never in the repository.

## 2. Register with Nagad

In the Nagad merchant portal:

1. Enter your **callback URL** (public HTTPS).
2. Upload the **merchant public key**.
3. Ask Nagad for, or copy from your onboarding details, **Nagad's gateway public key**, your **merchant ID** and the **API base URL** for the environment.

## 3. Whitelist your server's IP

Production access is limited to whitelisted server IP addresses. Give Nagad the **public egress IP** of the server that calls the API. If your platform has no fixed egress IP (serverless, autoscaling), use a [fixed-egress proxy](../egress-and-proxy/).

## 4. Configure the SDK

`merchantPrivateKey` and `pgPublicKey` accept a PEM string, a single-line base64 body, a `Buffer`, or a `file://` path. A PEM stored in an environment variable often has literal `\n` sequences instead of line breaks; convert them yourself with `value.replace(/\\n/g, '\n')`, or store the single-line base64 body, which needs no conversion.

```ts
createNagad({
  merchantId, merchantPrivateKey, pgPublicKey, baseUrl,
  serverIp: process.env.NAGAD_EGRESS_IP, // sent as the X-KM-IP-V4 header
});
```

## Signature algorithm

The default is SHA-256. Accounts that Nagad configured for SHA-1 can set `signatureAlgorithm: 'SHA1'`. Neither has been verified against the live gateway by the maintainers; if responses fail verification with `NagadSignatureVerificationError`, try the other algorithm and tell us.

## Never disable verification

`dangerouslySkipSignatureVerification: true` exists for debugging against a mock. It disables the check that makes forged responses detectable. Do not set it in production.
