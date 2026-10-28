# Changelog

## 0.1.1 (2026-10-29)

- Package READMEs and npm pages link to the documentation, npm and GitHub, with the developer credit.
- Documentation: `createWebHandler` is imported from `nagad-server/frameworks`; every documented import is now checked by a test.
- Website: readable release banner in light mode, npm and GitHub links, removed stale claims. The site is now indexable by search engines.
- No code changes to `nagad-server` or `nagad-client`.

## 0.1.0 (2026-10-27)

First non-alpha release of `nagad-server` and `nagad-client`. It is **not yet validated against the live Nagad gateway** (see the feature status in the documentation).

### Security and correctness
- The HTTP handler no longer forwards the browser's request body: `resolveOrder` is required, callback origins are allowlisted, unknown sessions fail closed, responses are minimal.
- `nagad-client`: a callback moves to `verifying`; success only after `confirmSuccess()`. New `pending` state.
- Node 18, 20, 22 and 24: `PureJsCryptoProvider` now implements RSA PKCS#1 v1.5 decryption with BigInt (it used to throw without an injected engine), and the client uses it automatically when `node:crypto` rejects that padding (Node 18/20).
- Adapters tested inside real Express, Fastify, Hono and Koa.

### Documentation
- New documentation site, package READMEs, generated feature-status table and error reference.

### Known gaps
- No refund or webhook support (no public specification).
- Nothing has been run against the live Nagad gateway.

## 0.1.0-alpha.1

First public alpha (deprecated; superseded by 0.1.0).
