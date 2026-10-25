// Main entrypoint for nagad-server
export { createNagad, NagadClient } from "./client.js";

// Types
export type {
  NagadConfig,
  PaymentSession,
  NagadPaymentStatus,
  NagadLogger,
  CreateCheckoutParams,
  CreateCheckoutResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  NagadVerifyResponse,
} from "./types.js";

// Crypto
export type { CryptoProvider } from "./crypto/provider.js";
export { NodeCryptoProvider } from "./crypto/node-provider.js";
export { PureJsCryptoProvider } from "./crypto/purejs-provider.js";

// Session Stores
export type { SessionStore } from "./session/store.js";
export { MemorySessionStore } from "./session/memory-store.js";
export { RedisSessionStore } from "./session/redis-store.js";
export type { RedisClientLike } from "./session/redis-store.js";

// Errors
export {
  NagadError,
  NagadApiError,
  NagadInvalidMerchantError,
  NagadDuplicateOrderIdError,
  NagadClockSkewError,
  NagadVerificationMismatchError,
  NagadTimeoutError,
  NagadCryptoError,
  NagadCryptoCapabilityError,
  NagadSignatureVerificationError,
  NagadSessionNotFoundError,
  NagadConcurrentVerificationError,
  mapNagadApiError,
} from "./errors/index.js";

// Utilities
export { generateOrderId, validateOrderId } from "./utils/order-id.js";
export { normalizeAmount, toPoisha, fromPoisha } from "./utils/amount.js";
export { formatBdtDateTime, getBdtDate } from "./utils/date.js";
export { normalizeKey } from "./utils/keys.js";
export { maskMsisdn, redactSecrets } from "./utils/pii.js";
