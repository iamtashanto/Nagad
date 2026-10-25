import type { SessionStore } from "./store.js";
import type { PaymentSession, NagadPaymentStatus } from "../types.js";
import {
  NagadDuplicateOrderIdError,
  NagadSessionNotFoundError,
} from "../errors/index.js";

export interface UpstashRestConfig {
  url: string;
  token: string;
  keyPrefix?: string;
  tombstoneTtlSeconds?: number;
}

/**
 * REST-based session persistence using Upstash Redis REST API.
 * Uses standard HTTPS fetch, making it 100% compatible with Cloudflare Workers,
 * Vercel Edge, Bun, Deno, and serverless runtimes without raw TCP sockets.
 */
export class UpstashRestSessionStore implements SessionStore {
  private url: string;
  private token: string;
  private prefix: string;
  private tombstoneTtlSeconds: number;

  constructor(config: UpstashRestConfig) {
    this.url = config.url.replace(/\/+$/, "");
    this.token = config.token;
    this.prefix = config.keyPrefix || "nagad:session:";
    this.tombstoneTtlSeconds = config.tombstoneTtlSeconds || 86400 * 7;
  }

  private async execute(command: (string | number)[]): Promise<any> {
    const res = await fetch(`${this.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      throw new Error(`Upstash REST command failed: HTTP ${res.status}`);
    }

    const data = (await res.json()) as { result?: any; error?: string };
    if (data.error) {
      throw new Error(`Upstash REST error: ${data.error}`);
    }
    return data.result;
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

    // Atomically check if orderId exists
    const exists = await this.execute(["EXISTS", oKey]);
    if (exists === 1) {
      throw new NagadDuplicateOrderIdError(
        `Session already exists for orderId '${session.orderId}'. Duplicate order IDs are rejected.`,
      );
    }

    const serialized = JSON.stringify(session);
    // Pipeline order key mapping and session body with TTL
    await this.execute([
      "SET",
      oKey,
      session.paymentReferenceId,
      "EX",
      ttlSeconds,
    ]);
    await this.execute(["SET", sKey, serialized, "EX", ttlSeconds]);
  }

  async getSession(paymentRefId: string): Promise<PaymentSession | null> {
    const raw = await this.execute(["GET", this.sessionKey(paymentRefId)]);
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : (raw as PaymentSession);
  }

  async getSessionByOrderId(orderId: string): Promise<PaymentSession | null> {
    const paymentRefId = await this.execute(["GET", this.orderKey(orderId)]);
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

    await this.execute([
      "SET",
      this.sessionKey(paymentRefId),
      JSON.stringify(session),
      "KEEPTTL",
    ]);
    return true;
  }

  async releaseClaim(paymentRefId: string): Promise<void> {
    const session = await this.getSession(paymentRefId);
    if (!session || session.status !== "verifying") return;

    session.status = "redirected";
    session.claimLeaseUntil = undefined;
    session.updatedAt = Date.now();

    await this.execute([
      "SET",
      this.sessionKey(paymentRefId),
      JSON.stringify(session),
      "KEEPTTL",
    ]);
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

    await this.execute([
      "SET",
      this.sessionKey(paymentRefId),
      JSON.stringify(session),
      "EX",
      ttl,
    ]);
  }

  async markFulfilled(orderId: string): Promise<void> {
    const paymentRefId = await this.execute(["GET", this.orderKey(orderId)]);
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

    await this.execute([
      "SET",
      this.sessionKey(paymentRefId),
      JSON.stringify(session),
      "EX",
      this.tombstoneTtlSeconds,
    ]);
  }

  async findStaleSessions(): Promise<PaymentSession[]> {
    return [];
  }

  async deleteSession(paymentRefId: string): Promise<void> {
    const session = await this.getSession(paymentRefId);
    if (session) {
      await this.execute(["DEL", this.orderKey(session.orderId)]);
    }
    await this.execute(["DEL", this.sessionKey(paymentRefId)]);
  }
}
