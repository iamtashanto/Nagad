---
title: Changelog
description: Release notes.
section: Reference
order: 16
---

# Changelog

Release notes are published on [GitHub Releases](https://github.com/iamtashanto/Nagad/releases).

## 0.1.0 (2026-10-27)

- **Security:** the HTTP handler no longer forwards the browser's request body. `resolveOrder` is required; callback origins are allowlisted; unknown sessions fail closed; responses are minimal.
- **Correctness:** `nagad-client` treats a callback as `verifying` and succeeds only after `confirmSuccess()`. A `pending` state was added.
- **Runtime:** `nagad-server` requires Node.js 22 or newer.
- **Honesty:** removed unproven "production-grade" and vendor-conformance claims; refund and webhook are documented as not implemented.
- **Docs:** this documentation site, generated status table, and error reference.

## 0.1.0-alpha.1

First public alpha (deprecated; superseded by 0.1.0).
