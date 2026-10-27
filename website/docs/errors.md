---
title: Error reference
description: SDK error classes and the Nagad error codes the SDK maps.
section: Reference
order: 11
---

# Error reference

All errors extend `NagadError` and carry a stable `code`.

## SDK errors

| Class | Cause | What to do |
| --- | --- | --- |
| `NagadApiError` (and subclasses below) | Nagad answered with an error. `rawCode`, `httpStatus` and `rawResponse` are available. | Look up the code below. |
| `NagadCryptoCapabilityError` | A custom crypto provider cannot do RSA PKCS#1 v1.5 decryption. | You configured your own provider that cannot decrypt. Use the default provider (it falls back automatically), see [Runtime compatibility](../runtime-compatibility/). |
| `NagadCryptoError` | Signing, encryption or key parsing failed. | Check the keys. |
| `NagadSignatureVerificationError` | Nagad's response signature did not verify. | Check `pgPublicKey` and `signatureAlgorithm`. Treat the response as untrusted. |
| `NagadVerificationMismatchError` | Amount, order id or merchant differ from what you expected. | Do not fulfil. Investigate. |
| `NagadTimeoutError` | The call timed out. | The outcome is **unknown**. Re-verify with `reconcile()`; do not ask the customer to pay again. |
| `NagadSessionNotFoundError` | No stored session for the reference. | The callback is unexpected or the store lost data. |
| `NagadReplayAttackError` | A finished payment's callback was replayed. | Ignore; already processed. |
| `NagadConcurrentVerificationError` | Another worker is verifying this payment. | Retry shortly. |
| `NagadDuplicateOrderIdError` | The order id was already used. | Use a new order id. |

## Nagad codes mapped by the SDK

Nagad publishes its full code list to merchants during onboarding. These are the codes `mapNagadApiError` turns into specific classes; any other code becomes a plain `NagadApiError` with Nagad's message. This table is checked against the code by a test.

{{ERROR_TABLE}}
