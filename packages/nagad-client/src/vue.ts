import {
  createNagadCheckout,
  NagadCheckoutMachine,
  type CheckoutState,
  type CheckoutOptions,
} from "./index.js";

export function useNagad(options: CheckoutOptions = {}) {
  const machine = createNagadCheckout(options);

  return {
    machine,
    initiate: (url?: string) => machine.initiate(url),
    handleCallback: (
      params: string | URLSearchParams | Record<string, string>,
    ) => machine.handleCallback(params),
    reset: () => machine.reset(),
    getState: () => machine.getState(),
    getError: () => machine.getError(),
    subscribe: (
      listener: (state: CheckoutState, error: Error | null) => void,
    ) => machine.subscribe(listener),
  };
}
