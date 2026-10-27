import type { NagadClient } from "../client.js";
import {
  NagadError,
  NagadSessionNotFoundError,
  NagadTimeoutError,
  NagadVerificationMismatchError,
} from "../errors/index.js";
import type {
  CreateCheckoutParams,
  CreateCheckoutResult,
  VerifyPaymentResult,
} from "../types.js";

/** Order details decided by the merchant's server, never by the browser. */
export interface ResolvedOrder {
  /** Payable amount as a decimal string or integer poisha. */
  amount: string | number;
  /** Optional merchant order id (5-20 alphanumeric). Generated when omitted. */
  orderId?: string;
  currency?: string;
  /** Overrides the handler-level callback URL for this order. */
  callbackUrl?: string;
}

export interface NagadHandlerOptions {
  /** Optional base path prefix (e.g. "/api/nagad") */
  basePath?: string;
  /**
   * Decide the order for POST /create from your own data (session, cart, database).
   * Required unless `allowClientAmount` is set. The request body is passed for
   * reference only; never trust amounts from it.
   */
  resolveOrder?: (
    req: Request,
    body: Record<string, unknown>,
  ) => Promise<ResolvedOrder> | ResolvedOrder;
  /**
   * UNSAFE: take amount/orderId from the client request body. Only for demos and
   * tests. Off by default.
   */
  allowClientAmount?: boolean;
  /** Fixed callback URL sent to Nagad. Defaults to `<request origin><basePath>/callback`. */
  callbackUrl?: string;
  /**
   * Origins a client-supplied `callbackUrl` may use. Without this list the
   * client-supplied value is ignored.
   */
  allowedCallbackOrigins?: string[];
  /** Hook called when payment completes and verifies successfully */
  onSuccess?: (
    result: VerifyPaymentResult,
    req: Request,
  ) => Promise<Response | void> | Response | void;
  /** Hook called when verification or creation fails */
  onError?: (
    error: Error,
    req: Request,
  ) => Promise<Response | void> | Response | void;
  /** Resolve expected amount for a given paymentRefId or orderId on callback */
  resolveExpectedAmount?: (
    params: { paymentRefId: string; orderId?: string },
    req: Request,
  ) => Promise<string | number> | string | number;
}

export class NagadHttpHandler {
  private client: NagadClient;
  private options: NagadHandlerOptions;

  constructor(client: NagadClient, options?: NagadHandlerOptions) {
    this.client = client;
    this.options = options || {};
  }

  /**
   * Universal Web Standard request handler:
   * handle(request: Request): Promise<Response>
   */
  public async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const basePath = (this.options.basePath || "").replace(/\/+$/, "");
    let path = url.pathname;

    if (basePath && path.startsWith(basePath)) {
      path = path.slice(basePath.length);
    }
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    try {
      // 1. Create Checkout Session: POST /create
      if (request.method === "POST" && path === "/create") {
        const body = ((await request.json().catch(() => ({}))) || {}) as Record<
          string,
          unknown
        >;

        let order: ResolvedOrder;
        if (this.options.resolveOrder) {
          order = await this.options.resolveOrder(request, body);
        } else if (this.options.allowClientAmount) {
          if (body.amount === undefined || body.amount === "") {
            return json(400, { success: false, error: "amount is required." });
          }
          order = {
            amount: body.amount as string | number,
            orderId: body.orderId as string | undefined,
            currency: body.currency as string | undefined,
          };
        } else {
          return json(400, {
            success: false,
            error:
              "Client-supplied amounts are disabled. Provide resolveOrder(request, body) in the handler options, or set allowClientAmount: true for demos.",
          });
        }

        const callbackUrl = this.pickCallbackUrl(
          request,
          basePath,
          order.callbackUrl,
          body.callbackUrl,
        );
        if (!callbackUrl) {
          return json(400, {
            success: false,
            error: "callbackUrl is not on the allowed origin list.",
          });
        }

        // clientIp, clientType and sessionTtl are never taken from the body.
        const result: CreateCheckoutResult = await this.client.checkout.create({
          amount: order.amount,
          orderId: order.orderId,
          currency: order.currency,
          callbackUrl,
        });
        return json(200, { success: true, ...result });
      }

      // 2. Callback Handling: GET or POST /callback
      if (
        (request.method === "GET" || request.method === "POST") &&
        path === "/callback"
      ) {
        let paymentRefId: string | null = null;
        let orderId: string | undefined;

        if (request.method === "GET") {
          paymentRefId =
            url.searchParams.get("payment_ref_id") ||
            url.searchParams.get("paymentRefId");
          orderId =
            url.searchParams.get("order_id") ||
            url.searchParams.get("orderId") ||
            undefined;
        } else {
          try {
            const body = (await request.json()) as Record<string, unknown>;
            paymentRefId = String(
              body.payment_ref_id || body.paymentRefId || "",
            );
            orderId = body.order_id
              ? String(body.order_id)
              : body.orderId
                ? String(body.orderId)
                : undefined;
          } catch {
            // body might be form-urlencoded
            const text = await request.text();
            const params = new URLSearchParams(text);
            paymentRefId =
              params.get("payment_ref_id") || params.get("paymentRefId");
            orderId =
              params.get("order_id") || params.get("orderId") || undefined;
          }
        }

        if (!paymentRefId) {
          return json(400, {
            success: false,
            error: "Missing payment_ref_id in callback parameters.",
          });
        }

        // Look up session to retrieve expected amount if resolver is not provided
        let expectedAmount: string | number;
        if (this.options.resolveExpectedAmount) {
          expectedAmount = await this.options.resolveExpectedAmount(
            { paymentRefId, orderId },
            request,
          );
        } else {
          const session =
            await this.client.sessionStore.getSession(paymentRefId);
          if (!session) {
            throw new NagadSessionNotFoundError(paymentRefId);
          }
          expectedAmount = session.amount;
        }

        const verifyResult = await this.client.checkout.verify({
          paymentRefId,
          expectedAmount,
          expectedOrderId: orderId,
        });

        if (this.options.onSuccess) {
          const customResponse = await this.options.onSuccess(
            verifyResult,
            request,
          );
          if (customResponse instanceof Response) {
            return customResponse;
          }
        }

        // Data minimization: never return rawResponse or wallet numbers to the browser.
        return json(200, {
          success: verifyResult.success,
          orderId: verifyResult.orderId,
          paymentRefId: verifyResult.paymentRefId,
          amount: verifyResult.amount,
          status: verifyResult.status,
          statusCode: verifyResult.statusCode,
          issuerPaymentDateTime: verifyResult.issuerPaymentDateTime,
        });
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (this.options.onError) {
        const customErrorRes = await this.options.onError(
          error as Error,
          request,
        );
        if (customErrorRes instanceof Response) {
          return customErrorRes;
        }
      }

      return this.errorResponse(error);
    }
  }

  private pickCallbackUrl(
    request: Request,
    basePath: string,
    fromOrder?: string,
    fromClient?: unknown,
  ): string | null {
    if (fromOrder) return fromOrder;
    if (typeof fromClient === "string" && fromClient) {
      try {
        const origin = new URL(fromClient).origin;
        if ((this.options.allowedCallbackOrigins || []).includes(origin)) {
          return fromClient;
        }
      } catch {
        // fall through to the configured/default URL
      }
      if (this.options.allowedCallbackOrigins?.length) return null;
    }
    return (
      this.options.callbackUrl ||
      new URL(request.url).origin + basePath + "/callback"
    );
  }

  /**
   * Maps errors to a minimal public response. Raw messages of unknown errors are
   * never returned. An uncertain outcome (timeout) is reported as "unknown", not "failed".
   */
  private errorResponse(error: unknown): Response {
    if (error instanceof NagadTimeoutError) {
      return json(202, {
        success: false,
        status: "unknown",
        retryable: false,
        error:
          "The gateway did not answer in time. The payment may still have succeeded; verify before retrying.",
      });
    }
    if (error instanceof NagadSessionNotFoundError) {
      return json(404, {
        success: false,
        status: "unknown_session",
        error: "No pending payment found for this reference.",
      });
    }
    if (error instanceof NagadVerificationMismatchError) {
      return json(409, {
        success: false,
        status: "mismatch",
        error: "Payment details did not match the expected order.",
      });
    }
    if (error instanceof NagadError) {
      return json(400, {
        success: false,
        code: error.code,
        error: error.message,
      });
    }
    return json(500, { success: false, error: "Nagad request failed." });
  }
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createWebHandler(
  client: NagadClient,
  options?: NagadHandlerOptions,
): (request: Request) => Promise<Response> {
  const handler = new NagadHttpHandler(client, options);
  return (req: Request) => handler.handle(req);
}
