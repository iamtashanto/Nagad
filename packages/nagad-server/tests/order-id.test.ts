import { describe, it, expect } from "vitest";
import { generateOrderId, validateOrderId } from "../src/utils/order-id.js";
import { NagadValidationError } from "../src/errors/base.js";

describe("Order ID Generation & Validation", () => {
  it("generates valid 16-character alphanumeric order IDs by default", () => {
    const id = generateOrderId();
    expect(id).toMatch(/^[A-Z0-9]{16}$/);
    expect(() => validateOrderId(id)).not.toThrow();
  });

  it("generates collision-resistant unique IDs in bulk", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const id = generateOrderId();
      expect(set.has(id)).toBe(false);
      set.add(id);
    }
    expect(set.size).toBe(1000);
  });

  it("accepts valid 5-20 alphanumeric IDs", () => {
    expect(() => validateOrderId("ABC12")).not.toThrow(); // 5 chars
    expect(() => validateOrderId("ORDER12345678901234")).not.toThrow(); // 19 chars
    expect(() => validateOrderId("ORDER123456789012345")).not.toThrow(); // 20 chars
  });

  it("rejects order IDs shorter than 5 characters", () => {
    expect(() => validateOrderId("1234")).toThrow(NagadValidationError);
    expect(() => validateOrderId("")).toThrow(NagadValidationError);
  });

  it("rejects order IDs longer than 20 characters", () => {
    expect(() => validateOrderId("ORDER1234567890123456")).toThrow(
      NagadValidationError,
    ); // 21 chars
  });

  it("rejects order IDs containing invalid characters, symbols, or whitespace", () => {
    expect(() => validateOrderId("ORD-12345")).toThrow(NagadValidationError);
    expect(() => validateOrderId("ORD_12345")).toThrow(NagadValidationError);
    expect(() => validateOrderId("ORD 12345")).toThrow(NagadValidationError);
    expect(() => validateOrderId("ORD#12345")).toThrow(NagadValidationError);
  });
});
