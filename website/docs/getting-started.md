---
title: Getting started
description: Install, configure, and create and verify your first checkout.
section: Start here
order: 2
---

# Getting started

## Requirements

- **Node.js 18 or newer.** Node 22+ uses `node:crypto`; Node 18/20 use the automatic fallback (see [Runtime compatibility](../runtime-compatibility/)).
- A Nagad merchant account with: your **merchant ID**, **Nagad's public key**, a **merchant key pair** whose public half you uploaded in the merchant portal, and the **API base URL** for your environment. Nagad provides these during onboarding. See [Key setup](../key-setup/).

## Install

```bash
npm install nagad-server nagad-client
```

## Configure

```ts
import { createNagad } from 'nagad-server';

export const nagad = createNagad({
  merchantId: process.env.NAGAD_MERCHANT_ID!,
  merchantPrivateKey: process.env.NAGAD_PRIVATE_KEY!, // PEM or base64 body
  pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY!,
  baseUrl: process.env.NAGAD_BASE_URL!, // from your onboarding details
});
```

## Create a checkout and verify it

```ts
// 1. Create: you decide the amount. Redirect the customer to callBackUrl.
const { callBackUrl, paymentReferenceId, orderId } = await nagad.checkout.create({
  amount: '500.00',
  callbackUrl: 'https://shop.example/api/nagad/callback',
});

// 2. On the callback: verify on the server. Never trust the query string.
const result = await nagad.checkout.verify({
  paymentRefId: req.query.payment_ref_id,
  expectedAmount: '500.00',
});
if (result.success) fulfil(result.orderId);
```

## The ready-made handler (Express)

```ts
import express from 'express';
import { createExpressMiddleware } from 'nagad-server/frameworks';

const app = express();
app.use('/api/nagad', createExpressMiddleware(nagad, {
  basePath: '/api/nagad',
  resolveOrder: async (req) => ({ amount: await cartTotal(req) }),
  allowedCallbackOrigins: ['https://shop.example'],
}));
```

This serves `POST /create` and `GET|POST /callback`. See the [server guide](../server-guide/).

## Test without Nagad

The repository contains `nagad-simulator`, a local imitation of the gateway with throwaway keys, used by the SDK's own tests. It is **not published to npm** yet. See [Testing](../testing/).
