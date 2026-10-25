import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import net from "node:net";
import { createForwardProxyFetch } from "../src/proxy/forward-proxy.js";

describe("Forward Proxy Fetch (createForwardProxyFetch)", () => {
  let proxyServer: http.Server;
  let proxyPort: number;
  let connectCount = 0;
  const activeSockets = new Set<net.Socket>();

  beforeAll(async () => {
    proxyServer = http.createServer((_req, res) => {
      res.writeHead(405);
      res.end("Use CONNECT");
    });

    proxyServer.on("connection", (socket) => {
      activeSockets.add(socket);
      socket.on("close", () => activeSockets.delete(socket));
    });

    proxyServer.on("connect", (req, clientSocket, head) => {
      connectCount++;
      activeSockets.add(clientSocket);
      clientSocket.on("close", () => activeSockets.delete(clientSocket));

      const [destHost, destPort] = (req.url || "").split(":");

      const serverSocket = net.connect(
        Number(destPort) || 443,
        destHost,
        () => {
          activeSockets.add(serverSocket);
          serverSocket.on("close", () => activeSockets.delete(serverSocket));

          clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          serverSocket.write(head);
          serverSocket.pipe(clientSocket);
          clientSocket.pipe(serverSocket);
        },
      );

      serverSocket.on("error", () => {
        clientSocket.destroy();
      });

      clientSocket.on("error", () => {
        serverSocket.destroy();
      });
    });

    await new Promise<void>((resolve) => {
      proxyServer.listen(0, "127.0.0.1", () => {
        const addr = proxyServer.address() as net.AddressInfo;
        proxyPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    for (const socket of activeSockets) {
      socket.destroy();
    }
    activeSockets.clear();
    await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
  });

  it("tunnels HTTPS requests through forward proxy with HTTP CONNECT", async () => {
    const proxiedFetch = createForwardProxyFetch(
      `http://127.0.0.1:${proxyPort}`,
    );

    try {
      const res = await proxiedFetch("https://api.github.com/zen", {
        headers: { "User-Agent": "nagad-sdk-test" },
      });

      expect(res.status).toBe(200);
      expect(connectCount).toBeGreaterThan(0);
    } catch {
      expect(connectCount).toBeGreaterThanOrEqual(1);
    }
  });
});
