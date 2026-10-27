import { describe, it, expect } from "vitest";
import { createNagadCheckout } from "../src/index.js";
import { createNagadStore } from "../src/svelte.js";
import { useNagad } from "../src/vue.js";
import { NagadService } from "../src/angular.js";
import { createWebViewNavigationHandler } from "../src/react-native.js";

describe("Nagad Client State Machine & Bindings", () => {
  it("manages transitions through idle -> redirecting -> success", () => {
    let successFired = false;
    const checkout = createNagadCheckout({
      paymentUrl: "https://sandbox.nagad.com.bd/pay/123",
      onSuccess: () => {
        successFired = true;
      },
    });

    expect(checkout.getState()).toBe("idle");

    checkout.initiate();
    expect(checkout.getState()).toBe("redirecting");

    const result = checkout.handleCallback(
      "?payment_ref_id=PAY_123&status=Success&order_id=ORD_999",
    );
    expect(result.status).toBe("Success");
    expect(result.paymentRefId).toBe("PAY_123");
    expect(result.orderId).toBe("ORD_999");
    expect(checkout.getState()).toBe("verifying");
    expect(successFired).toBe(false);
    checkout.confirmSuccess();
    expect(checkout.getState()).toBe("success");
    expect(successFired).toBe(true);
  });

  it("transitions to error on cancellation or failed status", () => {
    let errorFired = false;
    const checkout = createNagadCheckout({
      onError: () => {
        errorFired = true;
      },
    });

    checkout.handleCallback("?payment_ref_id=PAY_123&status=Aborted");
    expect(checkout.getState()).toBe("error");
    expect(errorFired).toBe(true);
  });

  it("works seamlessly in Svelte store binding", () => {
    const store = createNagadStore();
    let currentState: string = "";

    const unsub = store.subscribe((val) => {
      currentState = val.state;
    });

    expect(currentState).toBe("idle");
    store.handleCallback("?payment_ref_id=PAY_456&status=Success");
    expect(currentState).toBe("verifying");
    store.confirmSuccess();
    expect(currentState).toBe("success");
    unsub();
  });

  it("works in Vue composable", () => {
    const { getState, handleCallback } = useNagad();
    expect(getState()).toBe("idle");

    handleCallback({ payment_ref_id: "PAY_VUE", status: "Success" });
    expect(getState()).toBe("verifying");
  });

  it("works in Angular service", () => {
    const service = new NagadService();
    expect(service.getState()).toBe("idle");

    service.handleCallback("?payment_ref_id=PAY_NG&status=Success");
    expect(service.getState()).toBe("verifying");
    service.confirmSuccess();
    expect(service.getState()).toBe("success");
  });

  it("intercepts React Native WebView callback URLs", () => {
    let success = false;
    const handler = createWebViewNavigationHandler({
      callbackUrl: "https://myapp.com/payment/callback",
      onSuccess: () => {
        success = true;
      },
    });

    // Foreign URL is allowed to navigate
    const foreignNav = handler.onNavigationStateChange({
      url: "https://sandbox.nagad.com.bd/otp",
    });
    expect(foreignNav).toBe(true);

    // Callback URL is intercepted
    const callbackNav = handler.onNavigationStateChange({
      url: "https://myapp.com/payment/callback?payment_ref_id=PAY_RN&status=Success",
    });
    expect(callbackNav).toBe(false);
    expect(success).toBe(false);
    expect(handler.machine.getState()).toBe("verifying");
    handler.machine.confirmSuccess();
    expect(success).toBe(true);

    // onShouldStartLoadWithRequest interceptor
    let requestInterceptSuccess = false;
    const requestHandler = createWebViewNavigationHandler({
      callbackUrl: "https://myapp.com/payment/callback",
      allowedHosts: ["sandbox.nagad.com.bd", "myapp.com"],
      onSuccess: () => {
        requestInterceptSuccess = true;
      },
    });

    // Allowed foreign host
    expect(
      requestHandler.onShouldStartLoadWithRequest({
        url: "https://sandbox.nagad.com.bd/checkout",
      }),
    ).toBe(true);

    // Blocked malicious foreign host
    expect(
      requestHandler.onShouldStartLoadWithRequest({
        url: "https://malicious-phishing.com/drain",
      }),
    ).toBe(false);

    // Intercepted callback
    expect(
      requestHandler.onShouldStartLoadWithRequest({
        url: "https://myapp.com/payment/callback?payment_ref_id=PAY_REQ&status=Success",
      }),
    ).toBe(false);
    expect(requestInterceptSuccess).toBe(false);
    requestHandler.machine.confirmSuccess();
    expect(requestInterceptSuccess).toBe(true);
  });
});
