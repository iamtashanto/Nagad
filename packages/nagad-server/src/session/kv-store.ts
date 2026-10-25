import type { SessionStore } from "./store.js";
import type { PaymentSession, NagadPaymentStatus } from "../types.js";
import {
  NagadDuplicateOrderIdError,
  NagadSessionNotFoundError,
} from "../errors/index.js";

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Generic KV Session Store adapter.
 * Compatible with Cloudflare Workers KV, Vercel KV, DynamoDB wrappers, or custom databases.
 */
export class GenericKvSessionStore implements SessionStore {
  private kv: KeyValueStore;
  private prefix: string;
  private tombstoneTtlSeconds: number;

  constructor(options: {
    kv: KeyValueStore;
    keyPrefix?: string;
    tombstoneTtlSeconds?: number;
  }) {
    this.kv = options.kv;
    this.prefix = options.keyPrefix || "nagad:session:";
    this.tombstoneTtlSeconds = options.tombstoneTtlSeconds || 86400 * 7;
  }

  private orderKey(orderId: string): string {
    return `${this.prefix}ord:${orderId}`;
  }

  private sessionKey(paymentRefId: string): string {
    return `${this.prefix}ref:${paymentRefId}`;
  }

  async createSession(
    session: PaymentSession,
    ttlSeconds: number,
  ): Promise<void> {
    const oKey = this.orderKey(session.orderId);
    const sKey = this.sessionKey(session.paymentReferenceId);

    const existingRef = await this.kv.get(oKey);
    if (existingRef) {
      throw new NagadDuplicateOrderIdError(
        `Session already exists for orderId '${session.orderId}'. Duplicate order IDs are rejected.`,
      );
    }

    const serialized = JSON.stringify(session);
    await this.kv.set(oKey, session.paymentReferenceId, ttlSeconds);
    await this.kv.set(sKey, serialized, ttlSeconds);
  }

  async getSession(paymentRefId: string): Promise<PaymentSession | null> {
    const raw = await this.kv.get(this.sessionKey(paymentRefId));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async getSessionByOrderId(orderId: string): Promise<PaymentSession | null> {
    const paymentRefId = await this.kv.get(this.orderKey(orderId));
    if (!paymentRefId) return null;
    return this.getSession(paymentRefId);
  }

  async claimSession(
    paymentRefId: string,
    leaseDurationMs: number,
  ): Promise<boolean> {
    const session = await this.getSession(paymentRefId);
    if (!session) return false;

    const now = Date.now();
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

    await this.kv.set(this.sessionKey(paymentRefId), JSON.stringify(session));
    return true;
  }

  async releaseClaim(paymentRefId: string): Promise<void> {
    const session = await this.getSession(paymentRefId);
    if (!session || session.status !== "verifying") return;

    session.status = "redirected";
    session.claimLeaseUntil = undefined;
    session.updatedAt = Date.now();

    await this.kv.set(this.sessionKey(paymentRefId), JSON.stringify(session));
  }

  async updateSessionStatus(
    paymentRefId: string,
    status: NagadPaymentStatus,
    patch?: Partial<PaymentSession>,
  ): Promise<void> {
    const session = await this.getSession(paymentRefId);
    if (!session) {
      throw new NagadSessionNotFoundError(paymentRefId);
    }

    session.status = status;
    session.updatedAt = Date.now();
    if (patch) {
      Object.assign(session, patch);
    }

    const isTerminal =
      status === "fulfilled" || status === "failed" || status === "cancelled";
    const ttl = isTerminal ? this.tombstoneTtlSeconds : 86400;

    await this.kv.set(
      this.sessionKey(paymentRefId),
      JSON.stringify(session),
      ttl,
    );
  }

  async markFulfilled(orderId: string): Promise<void> {
    const paymentRefId = await this.kv.get(this.orderKey(orderId));
    if (!paymentRefId) {
      throw new NagadSessionNotFoundError(`orderId:${orderId}`);
    }

    const session = await this.getSession(paymentRefId);
    if (!session) {
      throw new NagadSessionNotFoundError(paymentRefId);
    }

    session.status = "fulfilled";
    session.fulfilledAt = Date.now();
    session.updatedAt = Date.now();

    await this.kv.set(
      this.sessionKey(paymentRefId),
      JSON.stringify(session),
      this.tombstoneTtlSeconds,
    );
  }

  async findStaleSessions(): Promise<PaymentSession[]> {
    return [];
  }

  async deleteSession(paymentRefId: string): Promise<void> {
    const session = await this.getSession(paymentRefId);
    if (session) {
      await this.kv.delete(this.orderKey(session.orderId));
    }
    await this.kv.delete(this.sessionKey(paymentRefId));
  }
}
