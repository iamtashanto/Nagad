import type { CryptoProvider } from "./crypto/provider.js";
import type { SessionStore } from "./session/store.js";

export type NagadPaymentStatus =
  | "initialized"
  | "redirected"
  | "verifying"
  | "verified"
  | "fulfilled"
  | "failed"
  | "cancelled";

export interface PaymentSession {
  orderId: string;
  paymentReferenceId: string;
  /** Normalized string amount, e.g. "1250.00" */
  amount: string;
  /** Currency code, e.g. "050" (BDT) */
  currency: string;
  status: NagadPaymentStatus;
  clientIp?: string;
  /** Epoch ms timestamp when an in-progress verification lease expires */
  claimLeaseUntil?: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  verifiedAt?: number;
  fulfilledAt?: number;
}

export interface NagadLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface NagadConfig {
  /** 15-character Merchant ID provided by Nagad */
  merchantId: string;

  /**
   * Merchant RSA Private Key.
   * Accepts: PEM string, single-line Base64 body, or Buffer.
   */
  merchantPrivateKey: string | Buffer;

  /**
   * Nagad Payment Gateway RSA Public Key.
   * Accepts: PEM string, single-line Base64 body, or Buffer.
   */
  pgPublicKey: string | Buffer;

  /**
   * Base URL for Nagad API endpoints.
   * Configured per merchant onboarding (sandbox or production).
   */
  baseUrl: string;

  /**
   * Default server egress IPv4 address passed in X-KM-IP-V4 header.
   */
  serverIp?: string;

  /**
   * Digital signature algorithm.
   * Defaults to 'SHA256' (observed in live production). Supports 'SHA1' for legacy accounts.
   */
  signatureAlgorithm?: "SHA256" | "SHA1";

  /**
   * Whether to cryptographically verify Nagad's signature on responses.
   * Defaults to true (default-on).
   */
  verifySignature?: boolean;

  /**
   * Session persistence store for idempotency and callback verification.
   * Defaults to MemorySessionStore.
   */
  sessionStore?: SessionStore;

  /**
   * Custom CryptoProvider. Defaults to NodeCryptoProvider.
   */
  cryptoProvider?: CryptoProvider;

  /**
   * Custom fetch function (for forward proxies, mock tests, or custom transports).
   */
  fetch?: typeof globalThis.fetch;

  /**
   * Injectable clock function for deterministic time and testing.
   */
  clock?: () => Date;

  /**
   * Allowed clock skew tolerance in milliseconds. Defaults to 300,000 (5 mins).
   */
  clockSkewToleranceMs?: number;

  /**
   * Lifecycle hooks for auditing and side effects.
   */
  hooks?: {
    beforeRequest?: (url: string, init: RequestInit) => Promise<void> | void;
    afterResponse?: (url: string, response: Response) => Promise<void> | void;
    onPaymentVerified?: (
      session: PaymentSession,
      result: VerifyPaymentResult,
    ) => Promise<void> | void;
    onPaymentFulfilled?: (session: PaymentSession) => Promise<void> | void;
  };

  /**
   * Custom logger with automatic PII and secret redaction.
   */
  logger?: NagadLogger;
}

export interface CreateCheckoutParams {
  /**
   * Unique order identifier (5-20 alphanumeric characters).
   * If omitted, a cryptographically secure, collision-resistant orderId is generated.
   */
  orderId?: string;

  /** Payable amount as string (e.g. "1250.00") or integer minor units (poisha) */
  amount: string | number;

  /** Merchant callback URL where Nagad redirects user */
  callbackUrl: string;

  /** Currency code. Defaults to "050" (BDT) */
  currency?: string;

  /** Client IPv4 address for X-KM-IP-V4 header */
  clientIp?: string;

  /** Client type header. Defaults to 'PC_WEB' */
  clientType?: "PC_WEB" | "MOBILE_WEB" | "MOBILE_APP" | "WALLET_WEB_VIEW";

  /** Session TTL in seconds. Defaults to 900 (15 minutes) */
  sessionTtlSeconds?: number;

  /** Additional merchant metadata to store with session */
  metadata?: Record<string, unknown>;
}

export interface CreateCheckoutResult {
  /** Hosted payment checkout URL to redirect the customer */
  callBackUrl: string;

  /** Nagad unique payment reference identifier */
  paymentReferenceId: string;

  /** Final order ID assigned to this checkout */
  orderId: string;
}

export interface VerifyPaymentParams {
  /** Payment reference ID received on callback */
  paymentRefId: string;

  /** Expected amount for this order (e.g. "1250.00") */
  expectedAmount: string | number;

  /** Expected merchant order ID */
  expectedOrderId?: string;

  /** Client IPv4 override for X-KM-IP-V4 header */
  clientIp?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  orderId: string;
  paymentRefId: string;
  amount: string;
  clientMobileNo?: string;
  merchantMobileNo?: string;
  issuerPaymentDateTime?: string;
  issuerPaymentRefNo?: string;
  status: string;
  statusCode: string;
  rawResponse: Record<string, unknown>;
}

export interface NagadVerifyResponse {
  merchantId?: string;
  orderId?: string;
  paymentRefId?: string;
  amount?: string;
  clientMobileNo?: string;
  merchantMobileNo?: string;
  orderDateTime?: string;
  issuerPaymentDateTime?: string;
  issuerPaymentRefNo?: string;
  status?: string;
  statusCode?: string;
  cancelIssuerDateTime?: string;
  cancelIssuerRefNo?: string;
  [key: string]: unknown;
}
