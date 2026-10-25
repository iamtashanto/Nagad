import type { SessionStore } from "./store.js";
import type { PaymentSession, NagadPaymentStatus } from "../types.js";
import {
  NagadDuplicateOrderIdError,
  NagadSessionNotFoundError,
} from "../errors/index.js";

export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    ...args: (string | number)[]
  ): Promise<unknown>;
  del(key: string): Promise<number>;
  eval(
    script: string,
    numkeys: number,
    ...args: (string | number)[]
  ): Promise<unknown>;
  keys?(pattern: string): Promise<string[]>;
}

export class RedisSessionStore implements SessionStore {
  private redis: RedisClientLike;
  private prefix: string;
  private tombstoneTtlSeconds: number;

  constructor(options: {
    redis: RedisClientLike;
    keyPrefix?: string;
    tombstoneTtlSeconds?: number;
  }) {
    this.redis = options.redis;
    this.prefix = options.keyPrefix || "nagad:session:";
    this.tombstoneTtlSeconds = options.tombstoneTtlSeconds || 86400 * 7; // 7 days tombstone
  }

  private sessionKey(paymentRefId: string): string {
    return `${this.prefix}ref:${paymentRefId}`;
  }

  private orderIndexKey(orderId: string): string {
    return `${this.prefix}ord:${orderId}`;
  }

  async createSession(
    session: PaymentSession,
    ttlSeconds: number,
  ): Promise<void> {
    const orderKey = this.orderIndexKey(session.orderId);
    const sessionKey = this.sessionKey(session.paymentReferenceId);
    const serialized = JSON.stringify(session);

    // Atomic Lua script: creates order index with NX, sets session key with EX
    const luaScript = `
      local orderExists = redis.call("EXISTS", KEYS[1])
      if orderExists == 1 then
        return 0
      end
      redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[3])
      redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[3])
      return 1
    `;

    const result = await this.redis.eval(
      luaScript,
      2,
      orderKey,
      sessionKey,
      session.paymentReferenceId,
      serialized,
      ttlSeconds,
    );

    if (result === 0) {
      throw new NagadDuplicateOrderIdError(
        `Session already exists for orderId '${session.orderId}'. Duplicate order IDs are rejected.`,
      );
    }
  }

  async getSession(paymentRefId: string): Promise<PaymentSession | null> {
    const raw = await this.redis.get(this.sessionKey(paymentRefId));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async getSessionByOrderId(orderId: string): Promise<PaymentSession | null> {
    const paymentRefId = await this.redis.get(this.orderIndexKey(orderId));
    if (!paymentRefId) return null;
    return this.getSession(paymentRefId);
  }

  async claimSession(
    paymentRefId: string,
    leaseDurationMs: number,
  ): Promise<boolean> {
    const sessionKey = this.sessionKey(paymentRefId);
    const now = Date.now();
    const leaseUntil = now + leaseDurationMs;

    // Atomic Lua script: grants claim only if status is 'redirected' or lease is expired
    const luaScript = `
      local raw = redis.call("GET", KEYS[1])
      if not raw then
        return 0
      end
      local session = cjson.decode(raw)
      local now = tonumber(ARGV[1])
      local isAvailable = (session.status == "redirected") or 
        (session.status == "verifying" and session.claimLeaseUntil and tonumber(session.claimLeaseUntil) < now)

      if isAvailable then
        session.status = "verifying"
        session.claimLeaseUntil = tonumber(ARGV[2])
        session.updatedAt = now
        redis.call("SET", KEYS[1], cjson.encode(session), "KEEPTTL")
        return 1
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      sessionKey,
      now,
      leaseUntil,
    );
    return result === 1;
  }

  async releaseClaim(paymentRefId: string): Promise<void> {
    const sessionKey = this.sessionKey(paymentRefId);
    const now = Date.now();

    const luaScript = `
      local raw = redis.call("GET", KEYS[1])
      if not raw then return 0 end
      local session = cjson.decode(raw)
      if session.status == "verifying" then
        session.status = "redirected"
        session.claimLeaseUntil = nil
        session.updatedAt = tonumber(ARGV[1])
        redis.call("SET", KEYS[1], cjson.encode(session), "KEEPTTL")
        return 1
      end
      return 0
    `;

    await this.redis.eval(luaScript, 1, sessionKey, now);
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

    await this.redis.set(
      this.sessionKey(paymentRefId),
      JSON.stringify(session),
      "EX",
      ttl,
    );
  }

  async markFulfilled(orderId: string): Promise<void> {
    const paymentRefId = await this.redis.get(this.orderIndexKey(orderId));
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

    await this.redis.set(
      this.sessionKey(paymentRefId),
      JSON.stringify(session),
      "EX",
      this.tombstoneTtlSeconds,
    );
  }

  async findStaleSessions(_olderThanMs: number): Promise<PaymentSession[]> {
    // In production Redis, stale sweeping is queried via scan or queue
    return [];
  }

  async deleteSession(paymentRefId: string): Promise<void> {
    const session = await this.getSession(paymentRefId);
    if (session) {
      await this.redis.del(this.orderIndexKey(session.orderId));
    }
    await this.redis.del(this.sessionKey(paymentRefId));
  }
}
