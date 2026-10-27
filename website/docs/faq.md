---
title: FAQ
description: Frequently asked questions.
section: Reference
order: 13
---

# FAQ

## Is this official?

No. It is an independent community SDK. It does not copy Nagad's confidential documents; behaviour is implemented from public information and tested against a local simulator.

## Has it been tested against the real Nagad gateway?

Not by the maintainers yet. Every feature that depends on the live gateway says so in the [feature status](../status/).

## Does it support refunds or webhooks?

No. There is no public specification to implement them against. If you need them, ask Nagad for the specification and open an issue.

## Which Node.js versions?

18, 20, 22 and 24. Node 22 and 24 use `node:crypto`; on Node 18 and 20 the SDK switches to its own decryption automatically (tested).

## Why can't it run on Cloudflare Workers or Vercel Edge?

Nagad requires RSA PKCS#1 v1.5 encryption, which WebCrypto does not provide. Use a Node.js backend.

## Can I call Nagad from the browser?

No. The calls need your private key. The browser only talks to your own routes.

## What happens if my server restarts between create and callback?

Use a persistent session store (Redis or KV). With the memory store the session is lost and the callback fails closed.

## Where do I get sandbox credentials?

From Nagad during onboarding, via your account manager.
