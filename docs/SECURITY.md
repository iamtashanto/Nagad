# Security Policy & Threat Model: Nagad SDK

## 1. Security Overview & Threat Model

The `nagad-server` and `nagad-client` packages handle sensitive financial transactions. This document details the threat model, cryptographic attack vectors, architectural mitigations, and vulnerability reporting procedures.

---

### 1.1 Threat Matrix & Mitigations

| Threat Vector                                       | Attack Scenario                                                                                                                       | Architectural Mitigation                                                                                                                                                                                        |
| :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Callback Spoofing / Tampering**                   | Attacker intercepts browser redirect and alters `?status=Success` or `?order_id=...` to trick merchant into fulfilling unpaid orders. | **Never Trust Callbacks**: Callbacks are untrusted pointers. The merchant backend issues an atomic server-to-server inquiry to Nagad's verification API.                                                        |
| **Amount / Currency Tampering**                     | Attacker initiates order of 1,000 BDT, pays 1.00 BDT at Nagad gateway, returns with valid paymentRefId.                               | **Zero-Float Verification**: Amounts are normalized to strict strings (`^\d+(\.\d{1,2})?$`) and integer poisha. Verification checks `returnedAmount === expectedAmount` before transitioning state.             |
| **Callback Replay Attack**                          | Attacker replays valid callback URL multiple times to trigger duplicate inventory fulfillment or credit.                              | **Idempotent State Machine & Replay Tombstones**: `SessionStore` transitions through `verified` $\to$ `fulfilled` with `markFulfilled(orderId)`. Redis store enforces 7-day tombstones preventing replay.       |
| **Concurrent Race Conditions**                      | Attacker sends multiple simultaneous callback requests to race merchant fulfillment logic.                                            | **Atomic Lease CAS Claims**: `SessionStore.claimSession()` acquires an exclusive 30-second atomic lease. Concurrent requests throw `NagadConcurrentVerificationError`.                                          |
| **Marvin / Bleichenbacher Attack (CVE-2023-46809)** | Side-channel timing oracle against RSA PKCS#1 v1.5 private-key decryption.                                                            | **Startup Capability Canary & Uniform Errors**: `NodeCryptoProvider.checkCapability()` validates host runtime OpenSSL implicit rejection at boot. All decryption errors return an identical, non-leaking error. |
| **Client Key / Secret Theft**                       | Merchant private keys or PG public keys embedded in client bundle.                                                                    | **Zero Client Secrets**: Front-end packages (`nagad-client`) contain zero cryptographic keys. All handshakes occur exclusively on the merchant server.                                                          |
| **Server Egress IP Spoofing**                       | Gateway impersonation or unauthorized server initiating requests.                                                                     | **Nagad Whitelist Requirement**: Nagad firewalls reject requests not originating from the merchant's registered static IPv4 address.                                                                            |
| **PII & Credential Leakage in Logs**                | Customer phone numbers, session secrets, or private keys printed to stdout / APM.                                                     | **Automated Redaction**: `maskMsisdn` masks phone numbers (`017****5678`), and `redactSecrets` recursively strips keys, signatures, and challenges.                                                             |

---

## 2. Cryptographic Security Standards

1. **Digital Signatures**: Handshakes use `RSA-SHA256` (RSASSA-PKCS1-v1_5) with 2048-bit keys. Signature verification of Nagad gateway responses is **default-on** and enforced on all responses.
2. **Payload Encryption**: Outbound payloads are encrypted using Nagad's 2048-bit PG public key with `RSA_PKCS1_PADDING`. Decryption is performed exclusively on the merchant backend.
3. **Randomness**: All nonces and challenges are generated via `crypto.randomBytes(16)` (32 hex characters) using OS-level cryptographically secure pseudo-random number generators (CSPRNG).
4. **Time & Skew**: BDT timestamps (`yyyyMMddHHmmss`) are computed strictly via UTC millisecond offsets (`+06:00`), completely immune to `process.env.TZ` host mutations.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability in this project:

1. **Do NOT report it via public GitHub issues, discussions, or social media.**
2. Send a detailed report via email to: `mdtanvirahamdsanto987@gmail.com`
3. Include:
   - Package name and version (`nagad-server` / `nagad-client`)
   - Type of vulnerability (e.g. signature bypass, timing leak, replay attack)
   - Step-by-step reproduction instructions or proof-of-concept script
4. We acknowledge receipt within **24 hours** and aim to release a patched version within **72 hours** for confirmed critical vulnerabilities.
