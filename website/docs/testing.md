---
title: Testing
description: Test your integration with the local simulator and with Nagad's sandbox.
section: Guides
order: 10
---

# Testing

## Nagad's sandbox

Nagad gives sandbox details (merchant ID, keys, base URL, and a test wallet registered by your account manager) during onboarding. There are no public sandbox credentials, so this documentation cannot supply any. Test at least:

| Scenario | Expected |
| --- | --- |
| Pay successfully | `verify` returns `success`; order fulfilled once. |
| Cancel on the Nagad page | Callback with a non-success status; nothing fulfilled. |
| Open the callback URL by hand with `status=Success` | Nothing fulfilled (no stored session, or Nagad says not paid). |
| Change the amount in dev tools | The server price is used. |
| Reload the callback page | Second verify returns the stored result; fulfilment does not repeat. |

## The simulator

`nagad-simulator` (in this repository, **not published to npm**) imitates the gateway: it generates throwaway key pairs, performs the signing and encryption steps like Nagad, and can inject failures (`ChaosOptions`). The SDK's tests use it.

```ts
import { createNagad } from 'nagad-server';
import { createNagadSimulator, generateSimulatorKeys } from 'nagad-simulator';

const keys = generateSimulatorKeys();
const simulator = createNagadSimulator(keys);
const { url } = await simulator.start(0);

const nagad = createNagad({
  merchantId: 'MERCHANT_TEST',
  merchantPrivateKey: keys.merchant.privateKey,
  pgPublicKey: keys.pg.publicKey,
  baseUrl: url,
});
```

A simulator proves you follow the documented flow; it does not prove the live gateway agrees. Run the sandbox scenarios too.

## Unit tests without either

Pass your own `fetch` to `createNagad` and return canned responses, or inject a `clock` to test time-dependent behaviour.
