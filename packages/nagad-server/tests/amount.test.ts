import { describe, it, expect } from "vitest";
import { normalizeAmount, toPoisha, fromPoisha } from "../src/utils/amount.js";
import { NagadValidationError } from "../src/errors/base.js";

describe("Amount Normalization & Poisha Conversions", () => {
  it("normalizes whole numbers and decimals correctly", () => {
    expect(normalizeAmount(10)).toBe("10.00");
    expect(normalizeAmount("10")).toBe("10.00");
    expect(normalizeAmount(12.5)).toBe("12.50");
    expect(normalizeAmount("12.5")).toBe("12.50");
    expect(normalizeAmount("1250.75")).toBe("1250.75");
    expect(normalizeAmount("0500")).toBe("500.00");
    expect(normalizeAmount("050.25")).toBe("50.25");
    expect(normalizeAmount("0.50")).toBe("0.50");
  });

  it("preserves exact fractional string formatting without float drift", () => {
    expect(normalizeAmount("0.05")).toBe("0.05");
    expect(normalizeAmount("0.1")).toBe("0.10");
    expect(normalizeAmount("9999999.99")).toBe("9999999.99");
  });

  it("converts to poisha (integer minor units)", () => {
    expect(toPoisha("10.00")).toBe(1000);
    expect(toPoisha("12.50")).toBe(1250);
    expect(toPoisha("0.05")).toBe(5);
    expect(toPoisha("1.01")).toBe(101);
  });

  it("converts from poisha back to string", () => {
    expect(fromPoisha(1000)).toBe("10.00");
    expect(fromPoisha(1250)).toBe("12.50");
    expect(fromPoisha(5)).toBe("0.05");
  });

  it("rejects invalid, negative, or malformed amounts", () => {
    expect(() => normalizeAmount("0")).toThrow(NagadValidationError);
    expect(() => normalizeAmount("0.00")).toThrow(NagadValidationError);
    expect(() => normalizeAmount("-10.00")).toThrow(NagadValidationError);
    expect(() => normalizeAmount("abc")).toThrow(NagadValidationError);
    expect(() => normalizeAmount("10.123")).toThrow(NagadValidationError); // more than 2 decimals
    expect(() => normalizeAmount("10,00")).toThrow(NagadValidationError);
    expect(() => normalizeAmount(NaN)).toThrow(NagadValidationError);
    expect(() => normalizeAmount(Infinity)).toThrow(NagadValidationError);
  });
});
