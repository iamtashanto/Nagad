import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import Fastify from "fastify";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import Koa from "koa";
import { createNagad, NagadClient } from "../src/index.js";
import {
  createExpressMiddleware,
  createFastifyPlugin,
  createHonoHandler,
  createKoaMiddleware,
  createNextRouteHandler,
  createRemixAction,
  createSvelteKitHandler,
  createAstroHandler,
} from "../src/frameworks/index.js";
import {
  generateSimulatorKeys,
  createNagadSimulator,
  NagadSimulator,
} from "nagad-simulator";

const options = {
  basePath: "/api/nagad",
  resolveOrder: async () => ({ amount: "150.00" }),
};

describe("adapters inside the real frameworks", () => {
  let simulator: NagadSimulator;
  let client: NagadClient;
  const keys = generateSimulatorKeys();
  const closers: Array<() => Promise<void>> = [];
  const urls: Record<string, string> = {};

  const listen = (server: http.Server) =>
    new Promise<string>((resolve) =>
      server.listen(0, "127.0.0.1", () =>
        resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`),
      ),
    );

  beforeAll(async () => {
    simulator = createNagadSimulator(keys);
    const { url } = await simulator.start(0);
    client = createNagad({
      merchantId: "MERC12345678901",
      merchantPrivateKey: keys.merchant.privateKey,
      pgPublicKey: keys.pg.publicKey,
      baseUrl: url,
    });

    const ex = express();
    ex.use(
      "/api/nagad",
      express.json(),
      createExpressMiddleware(client, options),
    );
    const exServer = http.createServer(ex);
    urls.express = await listen(exServer);
    closers.push(() => new Promise((r) => exServer.close(() => r())));

    const exRaw = express();
    exRaw.use("/api/nagad", createExpressMiddleware(client, options));
    const exRawServer = http.createServer(exRaw);
    urls.expressNoParser = await listen(exRawServer);
    closers.push(() => new Promise((r) => exRawServer.close(() => r())));

    const fy = Fastify();
    await fy.register(createFastifyPlugin(client, options), {
      prefix: "/api/nagad",
    });
    await fy.listen({ port: 0, host: "127.0.0.1" });
    urls.fastify = `http://127.0.0.1:${(fy.server.address() as AddressInfo).port}`;
    closers.push(() => fy.close());

    const hono = new Hono();
    hono.all("/api/nagad/*", createHonoHandler(client, options));
    const honoServer = serve({
      fetch: hono.fetch,
      port: 0,
      hostname: "127.0.0.1",
    });
    await new Promise((r) => setTimeout(r, 50));
    urls.hono = `http://127.0.0.1:${(honoServer.address() as AddressInfo).port}`;
    closers.push(() => new Promise((r) => honoServer.close(() => r())));

    const koa = new Koa();
    koa.use(createKoaMiddleware(client, options));
    const koaServer = http.createServer(koa.callback());
    urls.koa = await listen(koaServer);
    closers.push(() => new Promise((r) => koaServer.close(() => r())));
  });

  afterAll(async () => {
    for (const c of closers) await c();
    await simulator.stop();
  });

  for (const name of ["express", "expressNoParser", "fastify", "hono", "koa"]) {
    it(`${name}: create then verify uses the server price and ignores the browser body`, async () => {
      const created = await fetch(`${urls[name]}/api/nagad/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: "1.00",
          callbackUrl: "https://evil.test/x",
        }),
      });
      expect(created.status).toBe(200);
      const body = (await created.json()) as {
        success: boolean;
        paymentReferenceId: string;
      };
      expect(body.success).toBe(true);

      const verified = await fetch(
        `${urls[name]}/api/nagad/callback?payment_ref_id=${body.paymentReferenceId}`,
      );
      expect(verified.status).toBe(200);
      const v = (await verified.json()) as {
        success: boolean;
        amount: string;
        rawResponse?: unknown;
      };
      expect(v.success).toBe(true);
      expect(v.amount).toBe("150.00");
      expect(v.rawResponse).toBeUndefined();
    });

    it(`${name}: a callback for an unknown reference fails closed`, async () => {
      const res = await fetch(
        `${urls[name]}/api/nagad/callback?payment_ref_id=UNKNOWNREF999`,
      );
      expect(res.status).toBe(404);
    });
  }

  it("web-standard adapters (Next, Remix, SvelteKit, Astro) answer the same request", async () => {
    const req = () =>
      new Request("https://shop.example/api/nagad/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: "1.00" }),
      });
    const next = createNextRouteHandler(client, options);
    const results = await Promise.all([
      next.POST(req()),
      createRemixAction(client, options)({ request: req() }),
      createSvelteKitHandler(client, options)({ request: req() }),
      createAstroHandler(client, options)({ request: req() }),
    ]);
    for (const r of results) expect(r.status).toBe(200);
  });
});
