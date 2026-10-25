import type { PaymentSession, NagadPaymentStatus } from "../types.js";

export interface SessionStore {
  /**
   * Atomically creates a session IF AND ONLY IF orderId does not already exist.
   * Throws NagadDuplicateOrderIdError if orderId is already present (prevents race conditions before calling Nagad).
   */
  createSession(session: PaymentSession, ttlSeconds: number): Promise<void>;

  /**
   * Retrieves a session by paymentReferenceId.
   */
  getSession(paymentRefId: string): Promise<PaymentSession | null>;

  /**
   * Retrieves a session by merchant orderId.
   */
  getSessionByOrderId(orderId: string): Promise<PaymentSession | null>;

  /**
   * Atomically claims a session for verification with a lease duration (e.g., 30s).
   * Transitions from 'redirected' (or an expired 'verifying') to 'verifying'.
   * Returns true if lease acquired; false if another worker is actively verifying.
   */
  claimSession(paymentRefId: string, leaseDurationMs: number): Promise<boolean>;

  /**
   * Releases a lease back to 'redirected' on transient network failures so it can be retried.
   */
  releaseClaim(paymentRefId: string): Promise<void>;

  /**
   * Updates an existing session with status and timestamp.
   */
  updateSessionStatus(
    paymentRefId: string,
    status: NagadPaymentStatus,
    patch?: Partial<PaymentSession>,
  ): Promise<void>;

  /**
   * Marks a session as fulfilled, completing the lifecycle.
   */
  markFulfilled(orderId: string): Promise<void>;

  /**
   * Finds sessions stuck in 'verifying' or 'verified' for background reconciliation.
   */
  findStaleSessions(olderThanMs: number): Promise<PaymentSession[]>;

  /**
   * Deletes or archives a session.
   */
  deleteSession(paymentRefId: string): Promise<void>;
}
