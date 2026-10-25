import crypto from "node:crypto";

export interface KeyPairPem {
  publicKey: string;
  privateKey: string;
}

export interface SimulatorKeys {
  merchant: KeyPairPem;
  pg: KeyPairPem;
}

/**
 * Generates an ephemeral 2048-bit RSA key pair for testing.
 * Outputs PEM format (PKCS#8 for private key, SPKI for public key).
 */
export function generateTestKeyPair(): KeyPairPem {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { publicKey, privateKey };
}

/**
 * Generates throwaway keypairs for both Merchant and Nagad PG.
 */
export function generateSimulatorKeys(): SimulatorKeys {
  return {
    merchant: generateTestKeyPair(),
    pg: generateTestKeyPair(),
  };
}
