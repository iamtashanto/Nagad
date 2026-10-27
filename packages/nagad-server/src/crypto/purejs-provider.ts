import crypto from "node:crypto";
import type { CryptoProvider } from "./provider.js";
import { NodeCryptoProvider } from "./node-provider.js";
import {
  NagadCryptoError,
  NagadCryptoCapabilityError,
} from "../errors/crypto-error.js";

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

/**
 * Crypto provider that performs the RSA PKCS#1 v1.5 private-key decryption with BigInt
 * arithmetic, so it works on Node.js builds whose OpenSSL refuses that padding (for example
 * Node 18 and 20). Encryption, signing and verification use node:crypto, which is not
 * restricted. Not constant-time: it is meant for decrypting responses that come from Nagad
 * over TLS, not for an endpoint that accepts attacker-chosen ciphertexts.
 *
 * An optional peer provider can still be injected to override the decryption.
 */
export class PureJsCryptoProvider implements CryptoProvider {
  private readonly node = new NodeCryptoProvider();
  private readonly peer?: CryptoProvider;

  constructor(customPeerProvider?: CryptoProvider) {
    this.peer = customPeerProvider;
  }

  async checkCapability(): Promise<void> {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
      });
      const enc = await this.encryptWithPublicKey(
        "nagad-canary-test",
        publicKey.export({ type: "spki", format: "pem" }) as string,
      );
      const dec = await this.decryptWithPrivateKey(
        enc,
        privateKey.export({ type: "pkcs8", format: "pem" }) as string,
      );
      if (dec !== "nagad-canary-test") throw new Error("round-trip mismatch");
    } catch (error) {
      throw new NagadCryptoCapabilityError(
        `Pure-JS RSA self-test failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  encryptWithPublicKey(
    plaintext: string,
    publicKeyPem: string,
  ): Promise<string> {
    return (this.peer ?? this.node).encryptWithPublicKey(
      plaintext,
      publicKeyPem,
    );
  }

  async decryptWithPrivateKey(
    ciphertextBase64: string,
    privateKeyPem: string,
  ): Promise<string> {
    try {
      if (this.peer) {
        return await this.peer.decryptWithPrivateKey(
          ciphertextBase64,
          privateKeyPem,
        );
      }
      return rsaDecryptPkcs1v15(ciphertextBase64, privateKeyPem).toString(
        "utf-8",
      );
    } catch {
      // One uniform error for any decryption or padding failure.
      throw new NagadCryptoError("Failed to decrypt sensitive data");
    }
  }

  signWithPrivateKey(
    data: string,
    privateKeyPem: string,
    algorithm: "SHA256" | "SHA1" = "SHA256",
  ): Promise<string> {
    return (this.peer ?? this.node).signWithPrivateKey(
      data,
      privateKeyPem,
      algorithm,
    );
  }

  verifyWithPublicKey(
    data: string,
    signatureBase64: string,
    publicKeyPem: string,
    algorithm: "SHA256" | "SHA1" = "SHA256",
  ): Promise<boolean> {
    return (this.peer ?? this.node).verifyWithPublicKey(
      data,
      signatureBase64,
      publicKeyPem,
      algorithm,
    );
  }
}
