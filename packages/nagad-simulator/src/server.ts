import http from "node:http";
import crypto from "node:crypto";
import type { SimulatorKeys } from "./keys.js";
import { rsaDecryptPkcs1v15 } from "./rsa.js";

export interface ChaosOptions {
  tamperAmount?: string;
  tamperOrderId?: string;
  tamperMerchantId?: string;
  invalidSignature?: boolean;
  simulateStatus?: "Success" | "Failed" | "Aborted" | "Cancelled";
  simulateStatusCode?: string;
  simulateHttpError?: number;
  dropConnection?: boolean;
}

export interface SimulatorSession {
  merchantId: string;
  orderId: string;
  paymentReferenceId: string;
  serverChallenge: string;
  clientChallenge: string;
  amount?: string;
  currencyCode?: string;
  callbackUrl?: string;
  status: string;
  createdAt: number;
}

export class NagadSimulator {
  private server?: http.Server;
  private keys: SimulatorKeys;
  private sessions = new Map<string, SimulatorSession>();
  private orderIdSet = new Set<string>();
  private chaos: ChaosOptions = {};

  constructor(keys: SimulatorKeys) {
    this.keys = keys;
  }

  setChaos(options: ChaosOptions): void {
    this.chaos = { ...this.chaos, ...options };
  }

  resetChaos(): void {
    this.chaos = {};
  }

  reset(): void {
    this.sessions.clear();
    this.orderIdSet.clear();
    this.chaos = {};
  }

  getSession(paymentRefId: string): SimulatorSession | undefined {
    return this.sessions.get(paymentRefId);
  }

  async start(
    port: number = 0,
  ): Promise<{ port: number; url: string; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              reason: "SIMULATOR_INTERNAL_ERROR",
              message: String(error),
            }),
          );
        }
      });

      this.server.listen(port, "127.0.0.1", () => {
        const address = this.server?.address();
        if (address && typeof address === "object") {
          const assignedPort = address.port;
          const url = `http://127.0.0.1:${assignedPort}/api/dfs`;
          resolve({
            port: assignedPort,
            url,
            close: () => this.stop(),
          });
        } else {
          reject(new Error("Failed to bind simulator server"));
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = undefined;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async parseJsonBody(
    req: http.IncomingMessage,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on("error", reject);
    });
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const pathname = url.pathname;

    if (this.chaos.simulateHttpError) {
      res.writeHead(this.chaos.simulateHttpError, {
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          reason: "SIMULATED_HTTP_ERROR",
          message: "Simulated HTTP Error",
        }),
      );
      return;
    }

    if (this.chaos.dropConnection) {
      req.socket.destroy();
      return;
    }

    // 1. Initialize Route: /api/dfs/check-out/initialize/:merchantId/:orderId
    const initMatch = pathname.match(
      /\/check-out\/initialize\/([^/]+)\/([^/]+)/,
    );
    if (req.method === "POST" && initMatch) {
      const [, merchantId, orderId] = initMatch;
      const body = await this.parseJsonBody(req);

      const sensitiveDataEnc = String(body.sensitiveData || "");
      const clientSignature = String(body.signature || "");

      // Decrypt client sensitive data with Nagad PG Private Key
      const decryptedClientJson = rsaDecryptPkcs1v15(
        sensitiveDataEnc,
        this.keys.pg.privateKey,
      ).toString("utf-8");

      // Verify client signature with Merchant Public Key
      const isSigValid = crypto
        .createVerify("RSA-SHA256")
        .update(decryptedClientJson)
        .verify(
          this.keys.merchant.publicKey,
          Buffer.from(clientSignature, "base64"),
        );

      if (!isSigValid) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            reason: "INVALID_SIGNATURE",
            message: "Client digital signature verification failed",
          }),
        );
        return;
      }

      const clientData = JSON.parse(decryptedClientJson);

      const paymentReferenceId = `PAY_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const serverChallenge = crypto.randomBytes(16).toString("hex");

      const session: SimulatorSession = {
        merchantId,
        orderId,
        paymentReferenceId,
        serverChallenge,
        clientChallenge: clientData.challenge,
        status: "initialized",
        createdAt: Date.now(),
      };

      this.sessions.set(paymentReferenceId, session);
      this.orderIdSet.add(orderId);

      const responseSensitiveData = JSON.stringify({
        paymentReferenceId,
        challenge: serverChallenge,
        acceptDateTime: new Date().toISOString(),
      });

      // Encrypt response with Merchant Public Key
      const encryptedResponse = crypto
        .publicEncrypt(
          {
            key: this.keys.merchant.publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING,
          },
          Buffer.from(responseSensitiveData, "utf-8"),
        )
        .toString("base64");

      // Sign response with PG Private Key
      let responseSignature = crypto
        .createSign("RSA-SHA256")
        .update(responseSensitiveData)
        .sign(this.keys.pg.privateKey)
        .toString("base64");

      if (this.chaos.invalidSignature) {
        responseSignature = Buffer.from("tampered-invalid-signature").toString(
          "base64",
        );
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          sensitiveData: encryptedResponse,
          signature: responseSignature,
        }),
      );
      return;
    }

    // 2. Complete Route: /api/dfs/check-out/complete/:paymentRefId
    const completeMatch = pathname.match(/\/check-out\/complete\/([^/]+)/);
    if (req.method === "POST" && completeMatch) {
      const [, paymentRefId] = completeMatch;
      const session = this.sessions.get(paymentRefId);

      if (!session) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            reason: "SESSION_NOT_FOUND",
            message: "Unknown paymentReferenceId",
          }),
        );
        return;
      }

      const body = await this.parseJsonBody(req);
      const sensitiveDataEnc = String(body.sensitiveData || "");

      // Decrypt complete payload
      const decryptedCompleteJson = rsaDecryptPkcs1v15(
        sensitiveDataEnc,
        this.keys.pg.privateKey,
      ).toString("utf-8");

      const completeData = JSON.parse(decryptedCompleteJson);
      session.amount = String(completeData.amount);
      session.currencyCode = String(completeData.currencyCode || "050");
      session.callbackUrl = String(body.merchantCallbackURL || "");
      session.status = "redirected";

      const hostedCheckoutUrl = `https://simulator.nagad.com.bd/checkout?paymentRefId=${paymentRefId}`;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "Success",
          statusCode: "00_000_000",
          callBackUrl: hostedCheckoutUrl,
          message: "Checkout initialized successfully",
        }),
      );
      return;
    }

    // 3. Verify Route: /api/dfs/verify/payment/:paymentRefId
    const verifyMatch = pathname.match(/\/verify\/payment\/([^/]+)/);
    if (req.method === "GET" && verifyMatch) {
      const [, paymentRefId] = verifyMatch;
      const session = this.sessions.get(paymentRefId);

      if (!session) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            reason: "TRANSACTION_NOT_FOUND",
            message: "Transaction not found",
          }),
        );
        return;
      }

      const status = this.chaos.simulateStatus || "Success";
      const statusCode =
        this.chaos.simulateStatusCode ||
        (status === "Success" ? "000_0000_000" : "16_0006_083");

      const verifyData = {
        merchantId: this.chaos.tamperMerchantId || session.merchantId,
        orderId: this.chaos.tamperOrderId || session.orderId,
        paymentRefId: paymentRefId,
        amount: this.chaos.tamperAmount || session.amount || "100.00",
        clientMobileNo: "01711000000",
        merchantMobileNo: "01811000000",
        orderDateTime: "20261025211000",
        issuerPaymentDateTime: "20261025211005",
        issuerPaymentRefNo:
          "TXN_SIM_" + crypto.randomBytes(4).toString("hex").toUpperCase(),
        status: status,
        statusCode: statusCode,
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(verifyData));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ reason: "NOT_FOUND", message: "Route not found" }),
    );
  }
}

export function createNagadSimulator(keys: SimulatorKeys): NagadSimulator {
  return new NagadSimulator(keys);
}
