---
title: Changelog
description: Release notes.
section: Reference
order: 16
---

# Changelog

Release notes are published on [GitHub Releases](https://github.com/iamtashanto/Nagad/releases).

## 0.1.1 (2026-10-29)

- Package READMEs and npm pages link to the documentation, npm and GitHub, with the developer credit.
- Documentation: `createWebHandler` is imported from `nagad-server/frameworks`; every documented import is now checked by a test.
- Website: readable release banner in light mode, npm and GitHub links, removed stale claims. The site is now indexable by search engines.
- No code changes to `nagad-server` or `nagad-client`.

## 0.1.0 (2026-10-27)

- **Security:** the HTTP handler no longer forwards the browser's request body. `resolveOrder` is required; callback origins are allowlisted; unknown sessions fail closed; responses are minimal.
- **Correctness:** `nagad-client` treats a callback as `verifying` and succeeds only after `confirmSuccess()`. A `pending` state was added.
- **Runtime:** Node 18, 20, 22 and 24 work. A real pure-JS RSA decryption replaces the previous empty `PureJsCryptoProvider`, and the client switches to it automatically when `node:crypto` rejects RSA PKCS#1 v1.5 (Node 18/20).
- **Adapters:** tested inside real Express, Fastify, Hono and Koa.
- **Honesty:** removed unproven "production-grade" and vendor-conformance claims; refund and webhook are documented as not implemented.
- **Docs:** this documentation site, generated status table, and error reference.

## 0.1.0-alpha.1

First public alpha (deprecated; superseded by 0.1.0).
