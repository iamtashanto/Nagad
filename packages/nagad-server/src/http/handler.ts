import type { NagadClient } from "../client.js";
import type {
  CreateCheckoutParams,
  CreateCheckoutResult,
  VerifyPaymentResult,
} from "../types.js";

export interface NagadHandlerOptions {
  /** Optional base path prefix (e.g. "/api/nagad") */
  basePath?: string;
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
        const body = (await request.json()) as CreateCheckoutParams;
        const result: CreateCheckoutResult =
          await this.client.checkout.create(body);
        return new Response(JSON.stringify({ success: true, ...result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
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
          throw new Error("Missing payment_ref_id in callback parameters");
        }

        // Look up session to retrieve expected amount if resolver is not provided
        let expectedAmount: string | number = "0.00";
        if (this.options.resolveExpectedAmount) {
          expectedAmount = await this.options.resolveExpectedAmount(
            { paymentRefId, orderId },
            request,
          );
        } else {
          const session =
            await this.client.sessionStore.getSession(paymentRefId);
          if (session) {
            expectedAmount = session.amount;
          }
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

        return new Response(JSON.stringify(verifyResult), {
          status: 200,
          headers: { "Content-Type": "application/json" },
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

      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Nagad transaction failed",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
}

export function createWebHandler(
  client: NagadClient,
  options?: NagadHandlerOptions,
): (request: Request) => Promise<Response> {
  const handler = new NagadHttpHandler(client, options);
  return (req: Request) => handler.handle(req);
}
