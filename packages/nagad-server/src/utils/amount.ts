import { NagadError } from "../errors/base.js";

const AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;

/**
 * Validates that an amount string or number is a positive financial value with up to 2 decimal places.
 */
export function validateAmount(amount: string | number): void {
  const str = typeof amount === "number" ? amount.toString() : amount;
  if (!str || typeof str !== "string" || !AMOUNT_REGEX.test(str.trim())) {
    throw new NagadError(
      `Invalid amount '${amount}': must be a positive number with up to 2 decimal places (e.g. '1250.00' or 1250).`,
      "NAGAD_INVALID_AMOUNT_ERROR",
    );
  }

  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) {
    throw new NagadError(
      `Invalid amount '${amount}': must be greater than zero.`,
      "NAGAD_INVALID_AMOUNT_ERROR",
    );
  }
}

/**
 * Normalizes an amount string or number to exactly 2 decimal places without floating-point math inaccuracies.
 * e.g. "1500" -> "1500.00", 125.5 -> "125.50"
 */
export function normalizeAmount(amount: string | number): string {
  validateAmount(amount);
  const str = typeof amount === "number" ? amount.toFixed(2) : amount.trim();
  const parts = str.split(".");
  const whole = parts[0];
  const decimal = parts[1] || "";
  return `${whole}.${decimal.padEnd(2, "0").slice(0, 2)}`;
}

/**
 * Converts a normalized amount into integer minor units (poisha / cents).
 * Avoids float multiplication drift: "12.34" -> 1234.
 */
export function toPoisha(amount: string | number): number {
  const normalized = normalizeAmount(amount);
  const [whole, decimal] = normalized.split(".");
  return parseInt(whole, 10) * 100 + parseInt(decimal, 10);
}

/**
 * Converts integer minor units (poisha) back into a 2-decimal normalized amount string.
 * 1234 -> "12.34"
 */
export function fromPoisha(poisha: number): string {
  if (!Number.isInteger(poisha) || poisha <= 0) {
    throw new NagadError(
      `Invalid poisha minor unit: must be a positive integer.`,
      "NAGAD_INVALID_AMOUNT_ERROR",
    );
  }
  const whole = Math.floor(poisha / 100);
  const decimal = (poisha % 100).toString().padStart(2, "0");
  return `${whole}.${decimal}`;
}
