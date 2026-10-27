# Changelog

## 0.1.0 (2026-10-27)

First non-alpha release of `nagad-server` and `nagad-client`. It is **not yet validated against the live Nagad gateway** (see the feature status in the documentation).

### Security and correctness
- The HTTP handler no longer forwards the browser's request body: `resolveOrder` is required, callback origins are allowlisted, unknown sessions fail closed, responses are minimal.
- `nagad-client`: a callback moves to `verifying`; success only after `confirmSuccess()`. New `pending` state.
- `nagad-server` requires Node.js 22 or newer (RSA PKCS#1 v1.5 private decryption is rejected on Node 18/20 builds).

### Documentation
- New documentation site, package READMEs, generated feature-status table and error reference.

### Known gaps
- No refund or webhook support (no public specification).
- Nothing has been run against the live Nagad gateway; the pure-JS crypto fallback is untested on Node 18/20.

## 0.1.0-alpha.1

First public alpha (deprecated; superseded by 0.1.0).
