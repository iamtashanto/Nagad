# Release Checklist & Production Hardening Gate

## 1. Go / No-Go Decision Gate

| Requirement                        | Target Criteria                                                |   Status   | Evidence / Verification                                                |
| :--------------------------------- | :------------------------------------------------------------- | :--------: | :--------------------------------------------------------------------- |
| **No Secrets / IPs in Git**        | 0 leaks in `gitleaks git` across full history                  |  ✅ PASS   | Scanned 9 commits, 0 leaks found                                       |
| **No Secrets in Working Tree**     | 0 leaks in `gitleaks dir .`                                    |  ✅ PASS   | Scanned full workspace, 0 leaks found                                  |
| **Tarball Whitelist Cleanliness**  | No internal audit, no test keys, no PDFs                       |  ✅ PASS   | Verified via `npm pack --dry-run` on both packages                     |
| **Types Resolution (All Modes)**   | @arethetypeswrong green on node10, node16, nodenext, bundler   |  ✅ PASS   | 100% green across all subpaths in both packages                        |
| **Package Exports Standard**       | publint passes with zero lint warnings                         |  ✅ PASS   | "All good!" on `nagad-server` & `nagad-client`                         |
| **Core Test Suite Coverage**       | >= 90% statement/branch coverage                               |  ✅ PASS   | 61 tests passing across 14 test suites in < 1s                         |
| **Crypto Golden Vectors**          | RSA sign/encrypt round-trips against the local simulator       |  ✅ PASS   | `golden-conformance.test.ts` (simulator only; live gateway NOT TESTED) |
| **Multi-Node CI Matrix**           | Node 22 and 24 on Ubuntu, and Node 22 on Alpine Linux          | ⬜ NOT YET | Configured but no green run on main yet                                |
| **Zero Float Arithmetic**          | String-based normalization and poisha integer math             |  ✅ PASS   | Verified via `amount.test.ts`                                          |
| **Order ID Validation**            | Atomic create-if-absent pre-check and 5-20 alphanumeric regex  |  ✅ PASS   | Verified via `order-id.test.ts` & `tamper.test.ts`                     |
| **Default-On Response Signatures** | Response verification mandatory unless explicitly opted out    |  ✅ PASS   | Enforced in `client.ts` and `tamper.test.ts`                           |
| **PII & Secret Sanitization**      | Automatic MSISDN masking and recursive object secret redaction |  ✅ PASS   | Verified via `utils.test.ts`                                           |

---

## 2. Production Dogfood Plan (Owner Pilot Integration)

To safely migrate existing production workloads (a private backend) to `nagad-server`, follow this three-phase rollout:

### Phase 1: Shadow Mode (Zero Order Impact)

1. Install `nagad-server@0.1.0-alpha.1` in the pilot backend.
2. Configure `createNagad()` with existing credentials and an in-memory session store.
3. In parallel to existing checkout calls, invoke `nagadClient.checkout.create()` inside a try/catch block.
4. Compare generated payloads and log any discrepancies:
   - Verify that generated timestamps and nonces conform to Nagad API expectations.
   - Assert that no production customer traffic or order state is modified by the shadow worker.
5. Duration: Run for 7 consecutive days in production to observe edge cases.

### Phase 2: Feature-Flagged Canary (10% $\to$ 50% $\to$ 100%)

1. Switch `RedisSessionStore` to point to production Redis cluster.
2. Route a feature-flagged percentage of checkout creations through `nagadClient.checkout.create()`:
   ```ts
   if (featureFlags.useNewNagadSdk(user)) {
     const result = await nagadClient.checkout.create({
       orderId,
       amount,
       callbackUrl,
     });
     return res.json({ paymentUrl: result.callBackUrl });
   }
   ```
3. Monitor error rates, callback completion latency, and Redis lease health.

### Phase 3: Immediate Rollback Plan

- If unexpected API rejections occur (e.g. gateway status code `16_0006_xxx`):
  1. Toggle feature flag `USE_NEW_NAGAD_SDK=false` in environment variables.
  2. Legacy handler immediately resumes 100% of payment traffic.
  3. Pending sessions created by `nagad-server` remain verified in Redis via orderId lookup.

---

## 3. Proposal: Unified Payment Gateway Core Extraction

Following successful v0.1 release of both `iamtashanto/Nagad` and `iamtashanto/Bkash`, extract a unified core library `@bangla-mfs/core`:

- Shared interfaces: `SessionStore`, `PaymentSession`, `MfsError`, `MfsPaymentStatus`.
- Shared stores: `MemorySessionStore`, `RedisSessionStore` (Lua CAS), `UpstashRestSessionStore`, `GenericKvSessionStore`.
- Shared framework adapters: Universal Web `handle(request: Request)` and Express/Fastify/Hono/Next.js bridges.
- Shared utilities: PII masking, BDT timezone calculation, zero-float poisha arithmetic.
  _(Note: Extraction will commence only after independent alpha releases of both sibling SDKs)._

---

## 4. Exact Publication Commands (Do NOT Run Without Approval)

```bash
# 1. Bump version with changesets (or explicit alpha tag)
pnpm changeset publish

# 2. Publish nagad-server under the alpha dist-tag with provenance
cd packages/nagad-server
npm publish --tag alpha --access public --provenance

# 3. Publish nagad-client under the alpha dist-tag with provenance
cd ../nagad-client
npm publish --tag alpha --access public --provenance
```
