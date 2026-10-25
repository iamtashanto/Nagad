import type { SessionStore } from "./store.js";
import type { PaymentSession, NagadPaymentStatus } from "../types.js";
import {
  NagadDuplicateOrderIdError,
  NagadSessionNotFoundError,
} from "../errors/index.js";

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, PaymentSession>();
  private orderIdToPaymentRef = new Map<string, string>();
  private ttls = new Map<string, NodeJS.Timeout>();

  constructor(options?: { suppressDevWarning?: boolean }) {
    if (!options?.suppressDevWarning && process.env.NODE_ENV === "production") {
      console.warn(
        "⚠️ [nagad-server] Warning: MemorySessionStore is in use in a production environment. " +
          "MemorySessionStore cannot share state across multiple processes or serverless instances. " +
          "Use RedisSessionStore or a custom persistent SessionStore adapter for production deployments.",
      );
    }
  }

  async createSession(
    session: PaymentSession,
    ttlSeconds: number,
  ): Promise<void> {
    if (this.orderIdToPaymentRef.has(session.orderId)) {
      throw new NagadDuplicateOrderIdError(
        `Session already exists for orderId '${session.orderId}'. Duplicate order IDs are rejected.`,
      );
    }

    const cloned: PaymentSession = { ...session };
    this.sessions.set(session.paymentReferenceId, cloned);
    this.orderIdToPaymentRef.set(session.orderId, session.paymentReferenceId);

    // Set TTL cleanup
    if (ttlSeconds > 0) {
      const existingTimeout = this.ttls.get(session.paymentReferenceId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        this.deleteSession(session.paymentReferenceId);
      }, ttlSeconds * 1000);
      if (timeout.unref) timeout.unref();
      this.ttls.set(session.paymentReferenceId, timeout);
    }
  }

  async getSession(paymentRefId: string): Promise<PaymentSession | null> {
    const session = this.sessions.get(paymentRefId);
    return session ? { ...session } : null;
  }

  async getSessionByOrderId(orderId: string): Promise<PaymentSession | null> {
    const paymentRefId = this.orderIdToPaymentRef.get(orderId);
    if (!paymentRefId) return null;
    return this.getSession(paymentRefId);
  }

  async claimSession(
    paymentRefId: string,
    leaseDurationMs: number,
  ): Promise<boolean> {
    const session = this.sessions.get(paymentRefId);
    if (!session) return false;

    const now = Date.now();

    // Session can be claimed if:
    // 1. It is in 'redirected' status
    // 2. OR it is in 'verifying' status but its lease has expired
    const isAvailable =
      session.status === "redirected" ||
      (session.status === "verifying" &&
        session.claimLeaseUntil !== undefined &&
        session.claimLeaseUntil < now);

    if (!isAvailable) {
      return false;
    }

    session.status = "verifying";
    session.claimLeaseUntil = now + leaseDurationMs;
    session.updatedAt = now;
    return true;
  }

  async releaseClaim(paymentRefId: string): Promise<void> {
    const session = this.sessions.get(paymentRefId);
    if (!session) return;

    if (session.status === "verifying") {
      session.status = "redirected";
      session.claimLeaseUntil = undefined;
      session.updatedAt = Date.now();
    }
  }

  async updateSessionStatus(
    paymentRefId: string,
    status: NagadPaymentStatus,
    patch?: Partial<PaymentSession>,
  ): Promise<void> {
    const session = this.sessions.get(paymentRefId);
    if (!session) {
      throw new NagadSessionNotFoundError(paymentRefId);
    }

    session.status = status;
    session.updatedAt = Date.now();
    if (patch) {
      Object.assign(session, patch);
    }
  }

  async markFulfilled(orderId: string): Promise<void> {
    const paymentRefId = this.orderIdToPaymentRef.get(orderId);
    if (!paymentRefId) {
      throw new NagadSessionNotFoundError(`orderId:${orderId}`);
    }

    const session = this.sessions.get(paymentRefId);
    if (!session) {
      throw new NagadSessionNotFoundError(paymentRefId);
    }

    session.status = "fulfilled";
    session.fulfilledAt = Date.now();
    session.updatedAt = Date.now();
  }

  async findStaleSessions(olderThanMs: number): Promise<PaymentSession[]> {
    const now = Date.now();
    const stale: PaymentSession[] = [];

    for (const session of this.sessions.values()) {
      if (
        (session.status === "verifying" &&
          session.claimLeaseUntil &&
          session.claimLeaseUntil < now) ||
        (session.status === "verified" && now - session.updatedAt > olderThanMs)
      ) {
        stale.push({ ...session });
      }
    }

    return stale;
  }

  async deleteSession(paymentRefId: string): Promise<void> {
    const session = this.sessions.get(paymentRefId);
    if (session) {
      this.orderIdToPaymentRef.delete(session.orderId);
    }
    this.sessions.delete(paymentRefId);

    const timeout = this.ttls.get(paymentRefId);
    if (timeout) {
      clearTimeout(timeout);
      this.ttls.delete(paymentRefId);
    }
  }
}
