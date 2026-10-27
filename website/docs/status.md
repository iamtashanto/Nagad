---
title: Feature status
description: What is stable, beta, experimental or planned, with evidence.
section: Reference
order: 15
---

# Feature status

Generated from the same data as the website and the READMEs. **Stable** would mean verified against the live gateway and tested; nothing here has that evidence yet.

{{STATUS_TABLE}}

## Compatibility

| Runtime / tool | Status |
| --- | --- |
| Node.js 20, 22, 24 (CI, Ubuntu) | Tested |
| Node.js 22 on Alpine (musl) | Tested |
| Node.js 18 | Smoke-tested (full create and verify) by script; vitest itself needs Node 20+ |
| Node.js 18, 20 crypto | Automatic pure-JS decryption fallback, tested |
| macOS, Windows | Not in CI |
| Cloudflare Workers, Vercel Edge | Not supported |
| Live Nagad sandbox or production | Not run by the maintainers |
