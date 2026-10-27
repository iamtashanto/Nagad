import {
  createNagadCheckout,
  type CheckoutState,
  type CheckoutOptions,
} from "./index.js";

export function createNagadStore(options: CheckoutOptions = {}) {
  const machine = createNagadCheckout(options);

  return {
    subscribe(
      fn: (state: { state: CheckoutState; error: Error | null }) => void,
    ) {
      fn({ state: machine.getState(), error: machine.getError() });
      return machine.subscribe((state, error) => {
        fn({ state, error });
      });
    },
    initiate: (url?: string) => machine.initiate(url),
    handleCallback: (
      params: string | URLSearchParams | Record<string, string>,
    ) => machine.handleCallback(params),
    confirmSuccess: () => machine.confirmSuccess(),
    confirmPending: () => machine.confirmPending(),
    reset: () => machine.reset(),
  };
}
