import {
  createNagadCheckout,
  NagadCheckoutMachine,
  type CheckoutState,
  type CheckoutOptions,
} from "./index.js";

/**
 * Plain TypeScript Angular service.
 * Avoids ng-packagr Angular Package Format (APF) peer dependency lock-in,
 * making it universally compatible across Angular 14, 15, 16, 17, 18, and 19.
 *
 * Usage in Angular:
 * ```ts
 * @Injectable({ providedIn: 'root' })
 * export class PaymentService extends NagadService {}
 * ```
 */
export class NagadService {
  private machine: NagadCheckoutMachine;

  constructor(options: CheckoutOptions = {}) {
    this.machine = createNagadCheckout(options);
  }

  public initiate(url?: string): void {
    this.machine.initiate(url);
  }

  public handleCallback(
    params: string | URLSearchParams | Record<string, string>,
  ) {
    return this.machine.handleCallback(params);
  }

  public reset(): void {
    this.machine.reset();
  }

  public getState(): CheckoutState {
    return this.machine.getState();
  }

  public getError(): Error | null {
    return this.machine.getError();
  }

  public subscribe(
    listener: (state: CheckoutState, error: Error | null) => void,
  ): () => void {
    return this.machine.subscribe(listener);
  }
}
