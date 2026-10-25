export type CheckoutState =
  "idle" | "initializing" | "redirecting" | "verifying" | "success" | "error";

export interface CheckoutOptions {
  /** Hosted payment URL returned from backend create checkout */
  paymentUrl?: string;
  /** Callback fired on successful payment */
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
      this.transition("success");
      this.options.onSuccess?.({ orderId: orderId || "", paymentRefId });
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

  public reset(): void {
    this.transition("idle", null);
  }
}

export function createNagadCheckout(
  options: CheckoutOptions = {},
): NagadCheckoutMachine {
  return new NagadCheckoutMachine(options);
}
