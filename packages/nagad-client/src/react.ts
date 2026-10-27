import { useState, useEffect, useMemo, useCallback } from "react";
import {
  createNagadCheckout,
  NagadCheckoutMachine,
  type CheckoutState,
  type CheckoutOptions,
} from "./index.js";

export function useNagadCheckout(options: CheckoutOptions = {}) {
  const machine = useMemo(() => createNagadCheckout(options), []);
  const [state, setState] = useState<CheckoutState>(machine.getState());
  const [error, setError] = useState<Error | null>(machine.getError());

  useEffect(() => {
    const unsubscribe = machine.subscribe((newState, newError) => {
      setState(newState);
      setError(newError);
    });
    return () => unsubscribe();
  }, [machine]);

  const initiate = useCallback(
    (url?: string) => {
      machine.initiate(url);
    },
    [machine],
  );

  const handleCallback = useCallback(
    (searchParams: string | URLSearchParams | Record<string, string>) => {
      return machine.handleCallback(searchParams);
    },
    [machine],
  );

  const confirmSuccess = useCallback(() => machine.confirmSuccess(), [machine]);
  const confirmPending = useCallback(() => machine.confirmPending(), [machine]);

  const reset = useCallback(() => {
    machine.reset();
  }, [machine]);

  return {
    state,
    error,
    isLoading:
      state === "initializing" ||
      state === "redirecting" ||
      state === "verifying",
    isSuccess: state === "success",
    isPending: state === "pending",
    isError: state === "error",
    initiate,
    handleCallback,
    confirmSuccess,
    confirmPending,
    reset,
  };
}
