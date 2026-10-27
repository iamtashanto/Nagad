import { describe, it, expect } from "vitest";
import { createNagadCheckout } from "../src/index.js";
import { createWebViewNavigationHandler } from "../src/react-native.js";

describe("the callback URL is not proof of payment (regression)", () => {
  it("a status=Success callback moves to verifying and does not fire onSuccess", () => {
    let success = 0;
    let returned = 0;
    const checkout = createNagadCheckout({
      onSuccess: () => success++,
      onCallback: () => returned++,
    });
    checkout.handleCallback("?payment_ref_id=P1&status=Success&order_id=O1");
    expect(checkout.getState()).toBe("verifying");
    expect(success).toBe(0);
    expect(returned).toBe(1);
  });

  it("onSuccess fires only after the server confirms", () => {
    let paid: { orderId: string; paymentRefId: string } | null = null;
    const checkout = createNagadCheckout({ onSuccess: (r) => (paid = r) });
    checkout.handleCallback("?payment_ref_id=P1&status=Success&order_id=O1");
    checkout.confirmSuccess();
    expect(checkout.getState()).toBe("success");
    expect(paid).toEqual({ orderId: "O1", paymentRefId: "P1" });
  });

  it("an unconfirmed outcome is pending, not an error", () => {
    const checkout = createNagadCheckout({});
    checkout.handleCallback("?payment_ref_id=P1&status=Success");
    checkout.confirmPending();
    expect(checkout.getState()).toBe("pending");
    expect(checkout.getError()).toBeNull();
  });

  it("confirmSuccess without a callback is ignored", () => {
    let success = 0;
    const checkout = createNagadCheckout({ onSuccess: () => success++ });
    checkout.confirmSuccess();
    expect(checkout.getState()).toBe("idle");
    expect(success).toBe(0);
  });

  it("the React Native handler also waits for confirmation", () => {
    let success = 0;
    const handler = createWebViewNavigationHandler({
      callbackUrl: "https://myapp.com/cb",
      onSuccess: () => success++,
    });
    handler.onShouldStartLoadWithRequest({
      url: "https://myapp.com/cb?payment_ref_id=P1&status=Success",
    });
    expect(success).toBe(0);
    expect(handler.machine.getState()).toBe("verifying");
  });
});
