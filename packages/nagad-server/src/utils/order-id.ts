import crypto from "node:crypto";
import { NagadInvalidOrderIdError } from "../errors/api-error.js";

const ORDER_ID_REGEX = /^[A-Za-z0-9]{5,20}$/;

/**
 * Validates that an orderId strictly satisfies Nagad's 5-20 alphanumeric constraint.
 */
export function validateOrderId(orderId: string): void {
  if (typeof orderId !== "string" || !ORDER_ID_REGEX.test(orderId)) {
    throw new NagadInvalidOrderIdError(
      `Invalid Order ID '${orderId}': must be between 5 and 20 alphanumeric characters ([A-Za-z0-9]) with no spaces or symbols.`,
    );
  }
}

/**
 * Generates a collision-resistant 16-character alphanumeric order ID.
 * Format: NG (2 chars) + Base36 Timestamp (7 chars) + Base36 Cryptographic Random (7 chars).
 * Strictly complies with Nagad's 5-20 alphanumeric character limit.
 */
export function generateOrderId(prefix: string = "NG"): string {
  const timestampPart = Date.now()
    .toString(36)
    .toUpperCase()
    .padStart(7, "0")
    .slice(-7);
  const randomBytes = crypto.randomBytes(5);
  const randomPart = BigInt("0x" + randomBytes.toString("hex"))
    .toString(36)
    .toUpperCase()
    .padStart(7, "0")
    .slice(-7);

  const orderId = `${prefix}${timestampPart}${randomPart}`;
  validateOrderId(orderId);
  return orderId;
}
