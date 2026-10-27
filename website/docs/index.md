---
title: Introduction
description: What nagad-server and nagad-client are, what they are not, and where to start.
section: Start here
order: 1
---

# nagad-server and nagad-client

TypeScript SDKs for accepting [Nagad](https://nagad.com.bd) payments through the Nagad online payment gateway: `nagad-server` for any Node.js backend and `nagad-client` for web and mobile front ends.

> **Unofficial.** A community project. Not affiliated with, endorsed by, or sponsored by Nagad or Third Wave Technologies Ltd. No Nagad logos are used.

## What you get

- The three calls every Nagad checkout needs, with the RSA signing and encryption handled for you: initialize, complete (get the hosted payment URL) and verify.
- **Server-decided orders.** The HTTP handler never takes an amount from the browser.
- **Verification that cannot be skipped by accident:** the amount and order you expected are compared with what Nagad reports, and Nagad's response signature is checked by default.
- Protection against double verification (race and replay) through a session store: memory, Redis, Upstash or any key-value store.
- A startup capability check for the RSA PKCS#1 v1.5 requirement, and an egress helper for platforms that need a fixed IP address.
- Headless client bindings for React, React Native, Vue, Svelte and Angular. **A callback is never treated as a paid order until your server confirms it.**

## What it is not

- Not production-proven yet. See the [feature status](../status/): nothing has been run against the live Nagad gateway by the maintainers.
- No refund and no webhook/IPN support: there is no public specification to implement them against.
- No sandbox or production host is built in. You pass the `baseUrl` that Nagad gave you during onboarding.

## Where to start

1. [Getting started](../getting-started/)
2. [Key setup](../key-setup/): generating keys and registering them with Nagad.
3. [Runtime compatibility](../runtime-compatibility/): **Node.js 22 or newer** for the default crypto provider.
4. [Security and production checklist](../security/)
