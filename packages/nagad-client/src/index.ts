export type CheckoutState =
  | "idle"
  | "initializing"
  | "redirecting"
  | "verifying"
  | "success"
  | "pending"
  | "error";

export interface CheckoutOptions {
  /** Hosted payment URL returned from backend create checkout */
  paymentUrl?: string;
  /**
   * Fired when the customer returns from Nagad. This is NOT proof of payment: verify
   * the payment on your server, then call confirmSuccess() or confirmPending().
   */
  onCallback?: (result: {
    orderId: string;
    paymentRefId: string;
    status: string;
  }) => void;
  /** Fired by confirmSuccess(), i.e. only after your server verified the payment */
  onSuccess?: (result: { orderId: string; paymentRefId: string }) => void;
  /** Callback fired on payment error or cancellation */
  onError?: (error: Error) => void;
  /** Callback fired when checkout modal or redirection begins */
  onOpen?: () => void;
  /** Callback fired when checkout window or modal is closed */
  onClose?: () => void;
}

export class NagadCheckoutMachine {
  private state: CheckoutState = "idle";
  private error: Error | null = null;
  private listeners: Set<(state: CheckoutState, error: Error | null) => void> =
    new Set();
  private options: CheckoutOptions;
  private returned: { orderId: string; paymentRefId: string } | null = null;

  constructor(options: CheckoutOptions = {}) {
    this.options = options;
  }

  public getState(): CheckoutState {
    return this.state;
  }

  public getError(): Error | null {
    return this.error;
  }

  public subscribe(
    listener: (state: CheckoutState, error: Error | null) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private transition(newState: CheckoutState, err: Error | null = null): void {
    this.state = newState;
    this.error = err;
    this.listeners.forEach((l) => l(this.state, this.error));
  }

  /**
   * Redirects the browser or window to Nagad's hosted checkout URL.
   */
  public initiate(url?: string): void {
    const targetUrl = url || this.options.paymentUrl;
    if (!targetUrl) {
      const err = new Error("No checkout URL provided for redirection");
      this.transition("error", err);
      this.options.onError?.(err);
      return;
    }

    this.transition("redirecting");
    this.options.onOpen?.();

    if (typeof window !== "undefined" && window.location) {
      window.location.href = targetUrl;
    }
  }

  /**
   * Parses callback parameters from the return URL.
   */
  public handleCallback(
    searchParams: string | URLSearchParams | Record<string, string>,
  ): {
    status: string | null;
    paymentRefId: string | null;
    orderId: string | null;
  } {
    let params: URLSearchParams;
    if (typeof searchParams === "string") {
      params = new URLSearchParams(searchParams.replace(/^\?/, ""));
    } else if (searchParams instanceof URLSearchParams) {
      params = searchParams;
    } else {
      params = new URLSearchParams(searchParams);
    }

    const status = params.get("status");
    const paymentRefId =
      params.get("payment_ref_id") || params.get("paymentRefId");
    const orderId = params.get("order_id") || params.get("orderId");

    if (status === "Success" && paymentRefId) {
      // The query string can be forged by anyone. Wait for the server to verify.
      this.returned = { orderId: orderId || "", paymentRefId };
      this.transition("verifying");
      this.options.onCallback?.({ ...this.returned, status });
    } else {
      const err = new Error(
        status
          ? `Payment ended with status: ${status}`
          : "Unknown callback status",
      );
      this.transition("error", err);
      this.options.onError?.(err);
    }

    return { status, paymentRefId, orderId };
  }

  /**
   * Call after YOUR server verified the payment with Nagad (nagad-server verify).
   * Only then is the checkout considered successful.
   */
  public confirmSuccess(): void {
    if (!this.returned || this.state !== "verifying") return;
    this.transition("success");
    this.options.onSuccess?.(this.returned);
  }

  /**
   * Call when your server could not confirm the outcome (timeout, unknown).
   * Show "payment pending, do not pay again" and verify again later.
   */
  public confirmPending(): void {
    if (this.state !== "verifying") return;
    this.transition("pending");
  }

  public reset(): void {
    this.returned = null;
    this.transition("idle", null);
  }
}

export function createNagadCheckout(
  options: CheckoutOptions = {},
): NagadCheckoutMachine {
  return new NagadCheckoutMachine(options);
}
