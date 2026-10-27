import crypto from "node:crypto";

function b64urlToBigInt(value: string): bigint {
  return BigInt("0x" + Buffer.from(value, "base64url").toString("hex"));
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus;
    e >>= 1n;
    b = (b * b) % modulus;
  }
  return result;
}

/**
 * RSAES-PKCS1-v1_5 decryption done with BigInt arithmetic, independent of the OpenSSL padding
 * policy (OpenSSL 3.0 builds of Node reject PKCS#1 v1.5 private-key decryption since CVE-2023-46809).
 * Throws on any malformed input; callers must map this to one uniform error.
 */
export function rsaDecryptPkcs1v15(
  ciphertextBase64: string,
  privateKeyPem: string,
): Buffer {
  const jwk = crypto
    .createPrivateKey(privateKeyPem)
    .export({ format: "jwk" }) as { n?: string; d?: string };
  if (!jwk.n || !jwk.d) throw new Error("not an RSA private key");
  const n = b64urlToBigInt(jwk.n);
  const d = b64urlToBigInt(jwk.d);
  const k = Buffer.from(jwk.n, "base64url").length;

  const cipher = Buffer.from(ciphertextBase64, "base64");
  if (cipher.length !== k) throw new Error("bad ciphertext length");
  const c = BigInt("0x" + cipher.toString("hex"));
  if (c >= n) throw new Error("ciphertext out of range");

  const m = modPow(c, d, n);
  const em = Buffer.from(m.toString(16).padStart(k * 2, "0"), "hex");

  if (em[0] !== 0x00 || em[1] !== 0x02) throw new Error("bad padding");
  let sep = -1;
  for (let i = 2; i < em.length; i++) {
    if (em[i] === 0x00) {
      sep = i;
      break;
    }
  }
  if (sep < 10) throw new Error("bad padding");
  return em.subarray(sep + 1);
}
