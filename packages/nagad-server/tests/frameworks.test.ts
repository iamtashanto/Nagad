import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createNagad, NagadClient } from "../src/index.js";
import { createWebHandler } from "../src/http/handler.js";
import {
  createExpressMiddleware,
  createHonoHandler,
  createNextRouteHandler,
} from "../src/frameworks/index.js";
import {
  generateSimulatorKeys,
  createNagadSimulator,
  NagadSimulator,
} from "nagad-simulator";

describe("Framework Handlers & Adapters", () => {
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

  it("createWebHandler handles POST /create successfully", async () => {
    const webHandler = createWebHandler(client);

    const req = new Request("http://localhost:3000/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: "150.00",
        callbackUrl: "http://localhost:3000/callback",
      }),
    });

    const res = await webHandler(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      success: boolean;
      paymentReferenceId: string;
      callBackUrl: string;
    };
    expect(body.success).toBe(true);
    expect(body.paymentReferenceId).toBeDefined();
    expect(body.callBackUrl).toContain(body.paymentReferenceId);
  });

  it("createWebHandler handles GET /callback successfully", async () => {
    const webHandler = createWebHandler(client);

    // 1. Create checkout
    const checkout = await client.checkout.create({
      amount: "200.00",
      callbackUrl: "http://localhost:3000/callback",
    });

    // 2. Call callback endpoint
    const callbackUrl = `http://localhost:3000/callback?payment_ref_id=${checkout.paymentReferenceId}&status=Success`;
    const req = new Request(callbackUrl, { method: "GET" });

    const res = await webHandler(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      success: boolean;
      orderId: string;
      amount: string;
    };
    expect(body.success).toBe(true);
    expect(body.orderId).toBe(checkout.orderId);
    expect(body.amount).toBe("200.00");
  });

  it("createNextRouteHandler exposes GET and POST methods", async () => {
    const routeHandler = createNextRouteHandler(client, {
      basePath: "/api/nagad",
    });
    expect(typeof routeHandler.GET).toBe("function");
    expect(typeof routeHandler.POST).toBe("function");

    const req = new Request("http://localhost:3000/api/nagad/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: "300.00",
        callbackUrl: "http://localhost:3000/callback",
      }),
    });

    const res = await routeHandler.POST(req);
    expect(res.status).toBe(200);
  });

  it("createHonoHandler adapts context to web handler", async () => {
    const honoHandler = createHonoHandler(client);

    const mockContext = {
      req: {
        raw: new Request("http://localhost:3000/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: "400.00",
            callbackUrl: "http://localhost:3000/callback",
          }),
        }),
      },
    };

    const res = await honoHandler(mockContext);
    expect(res.status).toBe(200);
  });

  it("createExpressMiddleware bridges request and response", async () => {
    const middleware = createExpressMiddleware(client);

    const mockReq: any = {
      method: "POST",
      url: "/create",
      headers: { host: "localhost:3000" },
      body: {
        amount: "500.00",
        callbackUrl: "http://localhost:3000/callback",
      },
    };

    let statusCode = 0;
    const sentHeaders: Record<string, string> = {};
    let responseBody = "";

    const mockRes: any = {
      set statusCode(val: number) {
        statusCode = val;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader(key: string, val: string) {
        sentHeaders[key] = val;
      },
      end(buffer: Buffer) {
        responseBody = buffer.toString("utf-8");
      },
    };

    await middleware(mockReq, mockRes, () => {});

    expect(statusCode).toBe(200);
    const parsed = JSON.parse(responseBody);
    expect(parsed.success).toBe(true);
    expect(parsed.callBackUrl).toBeDefined();
  });
});
