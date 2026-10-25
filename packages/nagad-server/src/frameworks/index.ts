import type { NagadClient } from "../client.js";
import { NagadHttpHandler, type NagadHandlerOptions } from "../http/handler.js";

/**
 * Universal Node.js req/res to Web Standard Request converter.
 */
export async function nodeToWebRequest(req: any): Promise<Request> {
  const protocol =
    req.headers["x-forwarded-proto"] ||
    (req.socket?.encrypted ? "https" : "http");
  const host =
    req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, String(value));
      }
    }
  }

  const method = req.method || "GET";
  let body: any = null;

  if (method !== "GET" && method !== "HEAD") {
    if (req.body) {
      body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      if (chunks.length > 0) {
        body = Buffer.concat(chunks);
      }
    }
  }

  return new Request(url, {
    method,
    headers,
    body,
  });
}

/**
 * Pipes a Web Standard Response to a Node.js ServerResponse.
 */
export async function sendWebResponseToNode(
  webRes: Response,
  res: any,
): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((val, key) => {
    res.setHeader(key, val);
  });
  const arrayBuffer = await webRes.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}

/**
 * Express middleware adapter.
 */
export function createExpressMiddleware(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  return async (req: any, res: any, next: (err?: any) => void) => {
    try {
      const webReq = await nodeToWebRequest(req);
      const webRes = await handler.handle(webReq);
      if (webRes.status === 404) {
        return next();
      }
      await sendWebResponseToNode(webRes, res);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Fastify route/plugin adapter.
 */
export function createFastifyPlugin(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  return async (fastify: any) => {
    fastify.all("/*", async (request: any, reply: any) => {
      const webReq = await nodeToWebRequest(request.raw);
      const webRes = await handler.handle(webReq);
      reply.status(webRes.status);
      webRes.headers.forEach((val, key) => {
        reply.header(key, val);
      });
      const data = await webRes.text();
      return reply.send(data);
    });
  };
}

/**
 * Hono route handler adapter.
 */
export function createHonoHandler(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  return async (c: any) => {
    return handler.handle(c.req.raw);
  };
}

/**
 * Next.js App Router Route Handler (GET, POST).
 */
export function createNextRouteHandler(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  const handle = async (request: Request) => handler.handle(request);
  return {
    GET: handle,
    POST: handle,
  };
}

/**
 * NestJS Middleware adapter.
 */
export function createNestMiddleware(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const expressMiddleware = createExpressMiddleware(client, options);
  return {
    use(req: any, res: any, next: (err?: any) => void) {
      return expressMiddleware(req, res, next);
    },
  };
}

/**
 * Koa middleware adapter.
 */
export function createKoaMiddleware(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  return async (ctx: any, next: () => Promise<any>) => {
    const webReq = await nodeToWebRequest(ctx.req);
    const webRes = await handler.handle(webReq);
    if (webRes.status === 404) {
      return next();
    }
    ctx.status = webRes.status;
    webRes.headers.forEach((val, key) => {
      ctx.set(key, val);
    });
    ctx.body = await webRes.text();
  };
}

/**
 * Nuxt / Nitro event handler.
 */
export function createNitroHandler(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  return async (event: any) => {
    const webReq = await nodeToWebRequest(event.node.req);
    const webRes = await handler.handle(webReq);
    await sendWebResponseToNode(webRes, event.node.res);
  };
}

/**
 * SvelteKit RequestHandler adapter (+server.ts).
 */
export function createSvelteKitHandler(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  return async ({ request }: { request: Request }) => {
    return handler.handle(request);
  };
}

/**
 * Remix / React Router action and loader adapter.
 */
export function createRemixAction(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  return async ({ request }: { request: Request }) => {
    return handler.handle(request);
  };
}

/**
 * Astro endpoint handler.
 */
export function createAstroHandler(
  client: NagadClient,
  options?: NagadHandlerOptions,
) {
  const handler = new NagadHttpHandler(client, options);
  return async ({ request }: { request: Request }) => {
    return handler.handle(request);
  };
}
