import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createNagad, NagadClient } from "../src/index.js";
import { createWebHandler } from "../src/http/handler.js";
import {
  generateSimulatorKeys,
  createNagadSimulator,
  NagadSimulator,
} from "nagad-simulator";

const post = (path: string, body: unknown) =>
  new Request(`https://shop.example${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("HTTP handler security (regression)", () => {
  let simulator: NagadSimulator;
  let client: NagadClient;
  const keys = generateSimulatorKeys();

  beforeAll(async () => {
    simulator = createNagadSimulator(keys);
    const { url } = await simulator.start(0);
    client = createNagad({
      merchantId: "MERC12345678901",
      merchantPrivateKey: keys.merchant.privateKey,
      pgPublicKey: keys.pg.publicKey,
      baseUrl: url,
    });
  });

  afterAll(async () => {
    await simulator.stop();
  });

  it("rejects client-supplied amount by default", async () => {
    const handle = createWebHandler(client);
    const res = await handle(
      post("/create", {
        amount: "1.00",
        callbackUrl: "https://shop.example/cb",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("uses the server-resolved amount and ignores client amount/orderId", async () => {
    const handle = createWebHandler(client, {
      resolveOrder: async () => ({ amount: "1550.00", orderId: "SRVORDER123" }),
    });
    const res = await handle(
      post("/create", { amount: "1.00", orderId: "CLIENTORDER9" }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      orderId: string;
      paymentReferenceId: string;
    };
    expect(body.orderId).toBe("SRVORDER123");
    const session = await client.sessionStore.getSession(
      body.paymentReferenceId,
    );
    expect(String(session?.amount)).toBe("1550.00");
  });

  it("rejects a client callbackUrl outside the allowlist", async () => {
    const handle = createWebHandler(client, {
      resolveOrder: async () => ({ amount: "10.00" }),
      allowedCallbackOrigins: ["https://shop.example"],
    });
    const bad = await handle(
      post("/create", { callbackUrl: "https://evil.test/x" }),
    );
    expect(bad.status).toBe(400);
    const good = await handle(
      post("/create", { callbackUrl: "https://shop.example/cb" }),
    );
    expect(good.status).toBe(200);
  });

  it("ignores a client callbackUrl when no allowlist is configured", async () => {
    const handle = createWebHandler(client, {
      resolveOrder: async () => ({ amount: "10.00" }),
      callbackUrl: "https://shop.example/api/nagad/callback",
    });
    const res = await handle(
      post("/create", { callbackUrl: "https://evil.test/x" }),
    );
    expect(res.status).toBe(200);
  });

  it("fails closed on callback with no stored session and no resolver", async () => {
    const handle = createWebHandler(client);
    const res = await handle(
      new Request(
        "https://shop.example/callback?payment_ref_id=UNKNOWNREF123",
        { method: "GET" },
      ),
    );
    expect(res.status).not.toBe(200);
    const body = (await res.json()) as { success?: boolean };
    expect(body.success).toBe(false);
  });

  it("does not leak raw internal error messages", async () => {
    const handle = createWebHandler(client, {
      resolveOrder: async () => {
        throw new Error("db password=hunter2 at 10.0.0.5");
      },
    });
    const res = await handle(post("/create", {}));
    const text = await res.text();
    expect(text).not.toContain("hunter2");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
