import { describe, it, expect } from 'vitest';
import { NodeCryptoProvider } from '../src/crypto/node-provider.js';
import goldenVectors from './fixtures/golden-vectors.json';

describe('Cryptographic Conformance & Golden Vectors', () => {
  const provider = new NodeCryptoProvider();

  it('reproduces deterministic RSA-SHA256 signature matching vendor reference', async () => {
    const signature = await provider.signWithPrivateKey(
      goldenVectors.sampleInput.rawPayloadJson,
      goldenVectors.keys.merchantPrivateKey,
      'SHA256'
    );

    expect(signature).toBe(goldenVectors.expectedOutputs.sha256Signature);

    const isValid = await provider.verifyWithPublicKey(
      goldenVectors.sampleInput.rawPayloadJson,
      signature,
      goldenVectors.keys.merchantPublicKey,
      'SHA256'
    );
    expect(isValid).toBe(true);
  });

  it('performs end-to-end roundtrip encryption and decryption on golden input', async () => {
    const encrypted = await provider.encryptWithPublicKey(
      goldenVectors.sampleInput.rawPayloadJson,
      goldenVectors.keys.pgPublicKey
    );

    const decrypted = await provider.decryptWithPrivateKey(
      encrypted,
      goldenVectors.keys.pgPrivateKey
    );

    expect(decrypted).toBe(goldenVectors.sampleInput.rawPayloadJson);
  });

  it('validates golden Asia/Dhaka datetime format (14 digits)', () => {
    expect(goldenVectors.expectedOutputs.dateTimeFormat).toMatch(/^\d{14}$/);
    expect(goldenVectors.sampleInput.dateTime).toBe(goldenVectors.expectedOutputs.dateTimeFormat);
  });
});
