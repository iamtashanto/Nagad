import crypto from "node:crypto";
import type {
  NagadConfig,
  CreateCheckoutParams,
  CreateCheckoutResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  NagadVerifyResponse,
  NagadLogger,
} from "./types.js";
import type { CryptoProvider } from "./crypto/provider.js";
import { NodeCryptoProvider } from "./crypto/node-provider.js";
import type { SessionStore } from "./session/store.js";
import { MemorySessionStore } from "./session/memory-store.js";
import {
  NagadError,
  NagadApiError,
  NagadDuplicateOrderIdError,
  NagadSignatureVerificationError,
  NagadVerificationMismatchError,
  NagadTimeoutError,
  NagadSessionNotFoundError,
  NagadConcurrentVerificationError,
  mapNagadApiError,
} from "./errors/index.js";
import { validateOrderId, generateOrderId } from "./utils/order-id.js";
import { normalizeAmount } from "./utils/amount.js";
import { formatBdtDateTime } from "./utils/date.js";
import { normalizeKey } from "./utils/keys.js";
import { maskMsisdn, redactSecrets } from "./utils/pii.js";

export class NagadClient {
  public readonly config: Readonly<NagadConfig>;
  private readonly privateKeyPem: string;
  private readonly pgPublicKeyPem: string;
  private readonly crypto: CryptoProvider;
  private readonly sessionStore: SessionStore;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly logger?: NagadLogger;

  constructor(config: NagadConfig) {
    if (!config.merchantId) {
      throw new NagadError(
        "config.merchantId is required",
        "NAGAD_CONFIG_ERROR",
      );
    }
    if (!config.baseUrl) {
      throw new NagadError("config.baseUrl is required", "NAGAD_CONFIG_ERROR");
    }

    this.config = Object.freeze({ ...config });
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.privateKeyPem = normalizeKey(config.merchantPrivateKey, "PRIVATE");
    this.pgPublicKeyPem = normalizeKey(config.pgPublicKey, "PUBLIC");
    this.crypto = config.cryptoProvider || new NodeCryptoProvider();
    this.sessionStore = config.sessionStore || new MemorySessionStore();
    this.fetchFn = config.fetch || globalThis.fetch.bind(globalThis);
    this.logger = config.logger;
  }

  /**
   * Initializes startup capability checks.
   */
  async init(): Promise<void> {
    await this.crypto.checkCapability();
  }

  public readonly checkout = {
    create: async (
      params: CreateCheckoutParams,
    ): Promise<CreateCheckoutResult> => {
      await this.init();

      const orderId = params.orderId
        ? params.orderId.trim()
        : generateOrderId();
      validateOrderId(orderId);

      // Check if session already exists for this orderId before calling Nagad
      const existingSession =
        await this.sessionStore.getSessionByOrderId(orderId);
      if (existingSession) {
        throw new NagadDuplicateOrderIdError(
          `Session already exists for orderId '${orderId}'. Duplicate order IDs are rejected before calling Nagad.`,
        );
      }

      const amount = normalizeAmount(params.amount);
      const currency = params.currency || "050";
      const clientIp = params.clientIp || this.config.serverIp || "127.0.0.1";
      const clientType = params.clientType || "PC_WEB";
      const sessionTtl = params.sessionTtlSeconds || 900;

      // 1. Generate client random challenge and BDT timestamp
      const clientChallenge = crypto.randomBytes(16).toString("hex");
      const dateTime = formatBdtDateTime(this.config.clock);

      const sensitiveInitData = {
        merchantId: this.config.merchantId,
        datetime: dateTime,
        orderId: orderId,
        challenge: clientChallenge,
      };

      const sensitiveInitJson = JSON.stringify(sensitiveInitData);

      // 2. Encrypt & Sign
      const sensitiveDataEncrypted = await this.crypto.encryptWithPublicKey(
        sensitiveInitJson,
        this.pgPublicKeyPem,
      );
      const signature = await this.crypto.signWithPrivateKey(
        sensitiveInitJson,
        this.privateKeyPem,
        this.config.signatureAlgorithm || "SHA256",
      );

      const initPayload = {
        dateTime: dateTime,
        sensitiveData: sensitiveDataEncrypted,
        signature: signature,
      };

      const initHeaders: Record<string, string> = {
        "X-KM-IP-V4": clientIp,
        "X-KM-Client-Type": clientType,
        "X-KM-Api-Version": "v-0.2.0",
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const initUrl = `${this.baseUrl}/check-out/initialize/${this.config.merchantId}/${orderId}`;
      this.logger?.debug("Initiating checkout initialize call", {
        url: initUrl,
        orderId,
      });

      await this.config.hooks?.beforeRequest?.(initUrl, {
        method: "POST",
        headers: initHeaders,
        body: JSON.stringify(initPayload),
      });

      let initResponse: Response;
      try {
        initResponse = await this.fetchFn(initUrl, {
          method: "POST",
          headers: initHeaders,
          body: JSON.stringify(initPayload),
        });
      } catch (err) {
        throw new NagadTimeoutError(
          `Network error during checkout initialization: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      await this.config.hooks?.afterResponse?.(initUrl, initResponse);

      const initResJson = (await initResponse.json()) as Record<
        string,
        unknown
      >;

      if (!initResponse.ok || initResJson.reason || initResJson.message) {
        throw mapNagadApiError(
          String(initResJson.reason || ""),
          String(
            initResJson.message ||
              `HTTP ${initResponse.status} during initialize`,
          ),
          initResponse.status,
          initResJson,
        );
      }

      if (!initResJson.sensitiveData || !initResJson.signature) {
        throw new NagadApiError(
          "Invalid response from Nagad initialize API: missing sensitiveData or signature",
          undefined,
          initResponse.status,
          initResJson,
        );
      }

      // 3. Decrypt server sensitive data and verify signature
      const decryptedInitStr = await this.crypto.decryptWithPrivateKey(
        String(initResJson.sensitiveData),
        this.privateKeyPem,
      );

      let decryptedInitData: {
        paymentReferenceId?: string;
        challenge?: string;
        acceptDateTime?: string;
      };
      try {
        decryptedInitData = JSON.parse(decryptedInitStr);
      } catch {
        throw new NagadError(
          "Failed to parse decrypted initialize payload from Nagad",
          "NAGAD_CRYPTO_ERROR",
        );
      }

      if (this.config.verifySignature !== false) {
        const isSignatureValid = await this.crypto.verifyWithPublicKey(
          decryptedInitStr,
          String(initResJson.signature),
          this.pgPublicKeyPem,
          this.config.signatureAlgorithm || "SHA256",
        );
        if (!isSignatureValid) {
          throw new NagadSignatureVerificationError(
            "Nagad initialize response signature verification failed",
          );
        }
      }

      const paymentReferenceId = decryptedInitData.paymentReferenceId;
      const serverChallenge = decryptedInitData.challenge;

      if (!paymentReferenceId || !serverChallenge) {
        throw new NagadApiError(
          "Nagad initialize sensitive data is missing paymentReferenceId or server challenge",
          undefined,
          initResponse.status,
          decryptedInitData,
        );
      }

      // 4. Create Session atomically before calling Complete
      await this.sessionStore.createSession(
        {
          orderId,
          paymentReferenceId,
          amount,
          currency,
          status: "initialized",
          clientIp,
          metadata: params.metadata,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        sessionTtl,
      );

      // 5. Complete Step (Place Order)
      const completeSensitiveData = {
        merchantId: this.config.merchantId,
        orderId: orderId,
        currencyCode: currency,
        amount: amount,
        challenge: serverChallenge,
      };

      const completeSensitiveJson = JSON.stringify(completeSensitiveData);
      const completeEncrypted = await this.crypto.encryptWithPublicKey(
        completeSensitiveJson,
        this.pgPublicKeyPem,
      );
      const completeSignature = await this.crypto.signWithPrivateKey(
        completeSensitiveJson,
        this.privateKeyPem,
        this.config.signatureAlgorithm || "SHA256",
      );

      const completePayload = {
        sensitiveData: completeEncrypted,
        signature: completeSignature,
        merchantCallbackURL: params.callbackUrl,
        additionalMerchantInfo: params.metadata || {},
      };

      const completeUrl = `${this.baseUrl}/check-out/complete/${paymentReferenceId}`;
      this.logger?.debug("Completing checkout session", {
        url: completeUrl,
        paymentReferenceId,
      });

      await this.config.hooks?.beforeRequest?.(completeUrl, {
        method: "POST",
        headers: initHeaders,
        body: JSON.stringify(completePayload),
      });

      let completeResponse: Response;
      try {
        completeResponse = await this.fetchFn(completeUrl, {
          method: "POST",
          headers: initHeaders,
          body: JSON.stringify(completePayload),
        });
      } catch (err) {
        throw new NagadTimeoutError(
          `Network error during checkout completion: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      await this.config.hooks?.afterResponse?.(completeUrl, completeResponse);

      const completeResJson = (await completeResponse.json()) as Record<
        string,
        unknown
      >;

      if (
        !completeResponse.ok ||
        completeResJson.status !== "Success" ||
        !completeResJson.callBackUrl
      ) {
        throw mapNagadApiError(
          String(completeResJson.reason || completeResJson.statusCode || ""),
          String(
            completeResJson.message ||
              `Payment complete failed: status ${completeResJson.status}`,
          ),
          completeResponse.status,
          completeResJson,
        );
      }

      const callBackUrl = String(completeResJson.callBackUrl);

      // 6. Update session to 'redirected'
      await this.sessionStore.updateSessionStatus(
        paymentReferenceId,
        "redirected",
      );

      return {
        callBackUrl,
        paymentReferenceId,
        orderId,
      };
    },

    verify: async (
      params: VerifyPaymentParams,
    ): Promise<VerifyPaymentResult> => {
      await this.init();

      if (!params.paymentRefId) {
        throw new NagadError(
          "params.paymentRefId is required for verification",
          "NAGAD_VALIDATION_ERROR",
        );
      }

      const paymentRefId = params.paymentRefId.trim();
      const expectedAmount = normalizeAmount(params.expectedAmount);
      const clientIp = params.clientIp || this.config.serverIp || "127.0.0.1";

      // 1. Resolve session by paymentReferenceId ONLY
      const session = await this.sessionStore.getSession(paymentRefId);
      if (!session) {
        throw new NagadSessionNotFoundError(paymentRefId);
      }

      // 2. Idempotency check: if already completed, return verified result directly
      if (session.status === "verified" || session.status === "fulfilled") {
        this.logger?.info("Payment already verified (idempotent return)", {
          paymentRefId,
          orderId: session.orderId,
        });
        return {
          success: true,
          orderId: session.orderId,
          paymentRefId: session.paymentReferenceId,
          amount: session.amount,
          status: "Success",
          statusCode: "00_000_000",
          rawResponse: { idempotent: true, session },
        };
      }

      // 3. Acquire atomic CAS lease claim (30s)
      const claimed = await this.sessionStore.claimSession(
        paymentRefId,
        30_000,
      );
      if (!claimed) {
        throw new NagadConcurrentVerificationError();
      }

      // 4. Issue Nagad verification call
      const verifyUrl = `${this.baseUrl}/verify/payment/${paymentRefId}`;
      const verifyHeaders: Record<string, string> = {
        "X-KM-IP-V4": clientIp,
        "X-KM-Client-Type": "PC_WEB",
        "X-KM-Api-Version": "v-0.2.0",
        Accept: "application/json",
      };

      await this.config.hooks?.beforeRequest?.(verifyUrl, {
        method: "GET",
        headers: verifyHeaders,
      });

      let verifyResponse: Response;
      try {
        verifyResponse = await this.fetchFn(verifyUrl, {
          method: "GET",
          headers: verifyHeaders,
        });
      } catch (err) {
        // Rollback lease claim on transport error so it can be retried
        await this.sessionStore.releaseClaim(paymentRefId);
        throw new NagadTimeoutError(
          `Verification network error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      await this.config.hooks?.afterResponse?.(verifyUrl, verifyResponse);

      const verifyData = (await verifyResponse.json()) as NagadVerifyResponse;

      if (!verifyResponse.ok || verifyData.status !== "Success") {
        const terminalStatus =
          verifyData.status === "Cancelled" ? "cancelled" : "failed";
        await this.sessionStore.updateSessionStatus(
          paymentRefId,
          terminalStatus,
        );
        throw mapNagadApiError(
          String(verifyData.statusCode || verifyData.reason || ""),
          String(
            verifyData.message ||
              `Payment verification failed with status: ${verifyData.status}`,
          ),
          verifyResponse.status,
          verifyData,
        );
      }

      // 5. Financial Mismatch Checks (Zero Float Comparison)
      const returnedAmount = normalizeAmount(String(verifyData.amount));
      if (returnedAmount !== expectedAmount) {
        await this.sessionStore.updateSessionStatus(paymentRefId, "failed");
        throw new NagadVerificationMismatchError(
          "amount",
          expectedAmount,
          returnedAmount,
        );
      }

      if (params.expectedOrderId) {
        const expectedOrder = params.expectedOrderId.trim();
        if (
          verifyData.orderId !== expectedOrder ||
          session.orderId !== expectedOrder
        ) {
          await this.sessionStore.updateSessionStatus(paymentRefId, "failed");
          throw new NagadVerificationMismatchError(
            "orderId",
            expectedOrder,
            String(verifyData.orderId),
          );
        }
      }

      if (
        verifyData.merchantId &&
        verifyData.merchantId !== this.config.merchantId
      ) {
        await this.sessionStore.updateSessionStatus(paymentRefId, "failed");
        throw new NagadVerificationMismatchError(
          "merchantId",
          this.config.merchantId,
          String(verifyData.merchantId),
        );
      }

      // 6. Transition state to 'verified'
      await this.sessionStore.updateSessionStatus(paymentRefId, "verified", {
        verifiedAt: Date.now(),
      });

      const result: VerifyPaymentResult = {
        success: true,
        orderId: session.orderId,
        paymentRefId: session.paymentReferenceId,
        amount: returnedAmount,
        clientMobileNo: maskMsisdn(verifyData.clientMobileNo),
        merchantMobileNo: maskMsisdn(verifyData.merchantMobileNo),
        issuerPaymentDateTime: verifyData.issuerPaymentDateTime,
        issuerPaymentRefNo: verifyData.issuerPaymentRefNo,
        status: "Success",
        statusCode: String(verifyData.statusCode || "00_000_000"),
        rawResponse: redactSecrets(verifyData),
      };

      await this.config.hooks?.onPaymentVerified?.(session, result);
      return result;
    },

    markFulfilled: async (orderId: string): Promise<void> => {
      await this.sessionStore.markFulfilled(orderId);
      const session = await this.sessionStore.getSessionByOrderId(orderId);
      if (session) {
        await this.config.hooks?.onPaymentFulfilled?.(session);
      }
    },
  };

  public readonly payment = {
    getStatus: async (
      paymentRefId: string,
      clientIp?: string,
    ): Promise<NagadVerifyResponse> => {
      await this.init();
      const verifyUrl = `${this.baseUrl}/verify/payment/${paymentRefId}`;
      const headers = {
        "X-KM-IP-V4": clientIp || this.config.serverIp || "127.0.0.1",
        "X-KM-Client-Type": "PC_WEB",
        "X-KM-Api-Version": "v-0.2.0",
        Accept: "application/json",
      };

      const res = await this.fetchFn(verifyUrl, { method: "GET", headers });
      const data = (await res.json()) as NagadVerifyResponse;
      return redactSecrets(data);
    },
  };

  /**
   * Reconciles orphaned sessions or sessions interrupted during verification.
   */
  async reconcile(paymentRefId: string): Promise<VerifyPaymentResult | null> {
    const session = await this.sessionStore.getSession(paymentRefId);
    if (!session) return null;

    if (session.status === "verified" || session.status === "fulfilled") {
      return {
        success: true,
        orderId: session.orderId,
        paymentRefId: session.paymentReferenceId,
        amount: session.amount,
        status: "Success",
        statusCode: "00_000_000",
        rawResponse: { reconciled: true, session },
      };
    }

    try {
      return await this.checkout.verify({
        paymentRefId,
        expectedAmount: session.amount,
        expectedOrderId: session.orderId,
      });
    } catch {
      return null;
    }
  }

  /**
   * Raw transport escape hatch for direct API calls.
   */
  public readonly raw = {
    post: async (
      path: string,
      body: unknown,
      headers?: Record<string, string>,
    ): Promise<Response> => {
      const url = `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
      return this.fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KM-IP-V4": this.config.serverIp || "127.0.0.1",
          "X-KM-Client-Type": "PC_WEB",
          "X-KM-Api-Version": "v-0.2.0",
          ...headers,
        },
        body: JSON.stringify(body),
      });
    },

    get: async (
      path: string,
      headers?: Record<string, string>,
    ): Promise<Response> => {
      const url = `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
      return this.fetchFn(url, {
        method: "GET",
        headers: {
          "X-KM-IP-V4": this.config.serverIp || "127.0.0.1",
          "X-KM-Client-Type": "PC_WEB",
          "X-KM-Api-Version": "v-0.2.0",
          ...headers,
        },
      });
    },
  };
}

export function createNagad(config: NagadConfig): NagadClient {
  return new NagadClient(config);
}
