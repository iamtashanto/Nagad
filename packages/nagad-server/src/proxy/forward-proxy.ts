import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

export interface ForwardProxyOptions {
  /** Forward proxy URL, e.g. "http://proxy.internal:8080" */
  proxyUrl: string;
  /** Optional proxy authentication header */
  proxyAuth?: string;
}

/**
 * Creates a fetch implementation that tunnels outbound requests through a forward proxy.
 * Crucial for serverless environments (AWS Lambda, Vercel, Render) where outbound traffic
 * must originate from a fixed, whitelisted static IP address.
 */
export function createForwardProxyFetch(
  options: ForwardProxyOptions | string,
): typeof globalThis.fetch {
  const proxyUrlStr = typeof options === "string" ? options : options.proxyUrl;
  const proxyUrl = new URL(proxyUrlStr);
  const proxyAuth = typeof options === "object" ? options.proxyAuth : undefined;

  return async function proxiedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const targetUrl = new URL(input.toString());

    if (init?.signal?.aborted) {
      return Promise.reject(
        new DOMException("The operation was aborted", "AbortError"),
      );
    }

    return new Promise((resolve, reject) => {
      let aborted = false;
      const onAbort = () => {
        aborted = true;
        connectReq.destroy();
        reject(new DOMException("The operation was aborted", "AbortError"));
      };

      if (init?.signal) {
        init.signal.addEventListener("abort", onAbort, { once: true });
      }

      // Establish HTTP CONNECT tunnel through the forward proxy
      const connectReq = http.request({
        host: proxyUrl.hostname,
        port: Number(proxyUrl.port) || 80,
        method: "CONNECT",
        path: `${targetUrl.hostname}:${targetUrl.port || 443}`,
        headers: {
          Host: `${targetUrl.hostname}:${targetUrl.port || 443}`,
          ...(proxyAuth ? { "Proxy-Authorization": proxyAuth } : {}),
        },
      });

      connectReq.on("connect", (res, socket) => {
        if (aborted) {
          socket.destroy();
          return;
        }

        if (res.statusCode !== 200) {
          socket.destroy();
          return reject(
            new Error(
              `Proxy CONNECT failed with status code ${res.statusCode}`,
            ),
          );
        }

        const agent = new https.Agent({ socket });
        const headers: Record<string, string> = {};

        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => {
              headers[k] = v;
            });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([k, v]) => {
              headers[k] = v;
            });
          } else {
            Object.assign(headers, init.headers);
          }
        }

        const requestOptions: https.RequestOptions = {
          hostname: targetUrl.hostname,
          port: Number(targetUrl.port) || 443,
          path: `${targetUrl.pathname}${targetUrl.search}`,
          method: init?.method || "GET",
          headers,
          agent,
        };

        const req = https.request(requestOptions, (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            const bodyBuffer = Buffer.concat(chunks);
            const resHeaders = new Headers();
            for (const [key, value] of Object.entries(response.headers)) {
              if (value) {
                if (Array.isArray(value)) {
                  value.forEach((v) => resHeaders.append(key, v));
                } else {
                  resHeaders.set(key, String(value));
                }
              }
            }

            const webResponse = new Response(bodyBuffer, {
              status: response.statusCode || 200,
              statusText: response.statusMessage || "",
              headers: resHeaders,
            });

            resolve(webResponse);
          });
          response.on("error", reject);
        });

        req.on("error", reject);

        if (init?.body) {
          if (typeof init.body === "string" || Buffer.isBuffer(init.body)) {
            req.write(init.body);
          } else {
            req.write(JSON.stringify(init.body));
          }
        }
        req.end();
      });

      connectReq.on("error", reject);
      connectReq.end();
    });
  };
}
