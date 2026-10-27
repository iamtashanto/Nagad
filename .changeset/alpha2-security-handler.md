---
"nagad-server": patch
"nagad-client": patch
---

0.1.0-alpha.2 (apply with `changeset pre enter alpha` so the version becomes 0.1.0-alpha.2).

Breaking, security: the HTTP handler no longer forwards the client request body to `checkout.create`. `POST /create` now requires `resolveOrder(req, body)` (or the explicit `allowClientAmount: true` opt-in); amount and orderId come from the server, `clientIp`/`clientType`/session TTL are never read from the client, and a client `callbackUrl` is only used when its origin is in `allowedCallbackOrigins` (otherwise `callbackUrl` option or `<origin><basePath>/callback`).

Callbacks with no stored session now fail closed (404 `unknown_session`) instead of verifying against `0.00`. Timeouts return 202 `status: "unknown"`; raw internal error messages are no longer returned.

`nagad-server` now declares `engines.node >=22`: the default crypto provider's RSA PKCS#1 v1.5 private decryption is rejected on Node 18.20/20.20 (OpenSSL 3.0). The PureJs fallback is NOT TESTED. Removed unproven "production-grade" and "byte-identical vs vendor reference" claims.
