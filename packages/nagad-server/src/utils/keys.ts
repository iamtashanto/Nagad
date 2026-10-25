import fs from "node:fs";
import { NagadKeyError } from "../errors/api-error.js";

export function normalizeKey(
  keyInput: string | Buffer,
  keyType: "PUBLIC" | "PRIVATE",
): string {
  if (!keyInput) {
    throw new NagadKeyError(`${keyType} key is required and cannot be empty.`);
  }

  let str = Buffer.isBuffer(keyInput) ? keyInput.toString("utf-8") : keyInput;

  // Check if it's a file path
  if (str.startsWith("file://")) {
    const filePath = str.slice(7);
    if (!fs.existsSync(filePath)) {
      throw new NagadKeyError(`Key file not found at path: ${filePath}`);
    }
    str = fs.readFileSync(filePath, "utf-8");
  }

  // Strip carriage returns and trim
  str = str.replace(/\r\n/g, "\n").trim();

  // If already standard PEM with matching header
  const beginPrefix = `-----BEGIN ${keyType} KEY-----`;
  const beginRsaPrefix = `-----BEGIN RSA ${keyType} KEY-----`;
  if (str.includes(beginPrefix) || str.includes(beginRsaPrefix)) {
    return str;
  }

  // Otherwise, strip any existing headers and all whitespace, then wrap in standard headers
  const cleanBody = str
    .replace(/-----BEGIN[^-]+-----/g, "")
    .replace(/-----END[^-]+-----/g, "")
    .replace(/\s+/g, "");

  if (cleanBody.length < 100) {
    throw new NagadKeyError(
      `Invalid ${keyType} key format: key body is suspiciously short.`,
    );
  }

  // Chunk into 64-character lines
  const lines = cleanBody.match(/.{1,64}/g) || [cleanBody];
  return `-----BEGIN ${keyType} KEY-----\n${lines.join("\n")}\n-----END ${keyType} KEY-----`;
}
