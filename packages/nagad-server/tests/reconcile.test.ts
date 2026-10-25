import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createNagad, NagadClient } from '../src/index.js';
import { generateSimulatorKeys, createNagadSimulator, NagadSimulator } from 'nagad-simulator';

describe('Reconcile & Sweeper Tests', () => {
  let simulator: NagadSimulator;
  let simulatorUrl: string;
  let client: NagadClient;
  const keys = generateSimulatorKeys();

  beforeAll(async () => {
    simulator = createNagadSimulator(keys);
    const serverInfo = await simulator.start(0);
    simulatorUrl = serverInfo.url;

    client = createNagad({
      merchantId: 'MERC12345678901',
      merchantPrivateKey: keys.merchant.privateKey,
      pgPublicKey: keys.pg.publicKey,
      baseUrl: simulatorUrl,
      verifySignature: true,
    });
  });

  afterAll(async () => {
    await simulator.stop();
  });

  it('reconciles an interrupted or stuck session seamlessly', async () => {
    // 1. Create a session
    const checkout = await client.checkout.create({
      amount: '750.00',
      callbackUrl: 'https://merchant.example.com/callback',
    });

    // 2. Reconcile returns the verified result
    const reconciled = await client.reconcile(checkout.paymentReferenceId);
    expect(reconciled).not.toBeNull();
    expect(reconciled?.success).toBe(true);
    expect(reconciled?.orderId).toBe(checkout.orderId);
    expect(reconciled?.amount).toBe('750.00');

    // 3. Reconciling again returns the already verified session
    const secondReconcile = await client.reconcile(checkout.paymentReferenceId);
    expect(secondReconcile?.success).toBe(true);
    expect(secondReconcile?.rawResponse.reconciled).toBe(true);
  });

  it('returns null when reconciling an unknown paymentRefId', async () => {
    const res = await client.reconcile('PAY_UNKNOWN_NONEXISTENT');
    expect(res).toBeNull();
  });
});
