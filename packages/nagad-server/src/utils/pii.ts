/**
 * Masks a mobile number for log and model sanitization.
 * e.g. "01712345678" -> "017****5678"
 */
export function maskMsisdn(phone?: string | null): string | undefined {
  if (!phone || typeof phone !== "string") return undefined;
  const cleaned = phone.trim();
  if (cleaned.length < 8) return "****";
  const start = cleaned.slice(0, 3);
  const end = cleaned.slice(-4);
  return `${start}****${end}`;
}

const SENSITIVE_KEYS = new Set([
  "privatekey",
  "merchantprivatekey",
  "pgpublickey",
  "publickey",
  "signature",
  "sensitivedata",
  "challenge",
  "password",
  "pin",
  "otp",
  "token",
]);

/**
 * Deeply redacts sensitive keys from objects before logging.
 */
export function redactSecrets<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSecrets(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = "[REDACTED]";
    } else if (
      lowerKey.includes("mobile") ||
      lowerKey.includes("phone") ||
      lowerKey.includes("msisdn")
    ) {
      result[key] = typeof value === "string" ? maskMsisdn(value) : value;
    } else if (value && typeof value === "object") {
      result[key] = redactSecrets(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
