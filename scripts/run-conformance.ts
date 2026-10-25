import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { NodeCryptoProvider } from '../packages/nagad-server/src/crypto/node-provider.js';
import { generateSimulatorKeys } from '../packages/nagad-simulator/src/keys.js';
import { formatBdtDateTime } from '../packages/nagad-server/src/utils/date.js';

interface ConformanceResult {
  signatureMatch: boolean;
  crossDecryptionToRef: boolean;
  crossDecryptionFromRef: boolean;
  datetimeFormatMatch: boolean;
}

async function main() {
  console.log('--- NAGAD CONFORMANCE & FIXTURE GENERATOR ---');

  const refDir = process.env.NAGAD_REFERENCE_DIR;
  if (!refDir) {
    console.log(
      '⚠️ NAGAD_REFERENCE_DIR is not set. Skipping live reference cross-testing.\n' +
      'Generating standalone throwaway golden fixtures for CI...'
    );
  }

  // 1. Generate throwaway 2048-bit RSA keys
  const keys = generateSimulatorKeys();
  const provider = new NodeCryptoProvider();

  const fixedDate = new Date('2026-10-25T15:30:45.000Z'); // 21:30:45 BDT
  const fixedClock = () => fixedDate;
  const formattedDate = formatBdtDateTime(fixedClock);

  const testPayload = JSON.stringify({
    merchantId: 'MERC_TEST_12345',
    datetime: formattedDate,
    orderId: 'ORD_TEST_99999',
    challenge: 'c0ffee1234567890abcdef1234567890',
  });

  // 2. Compute canonical signature and encryption
  const signature = await provider.signWithPrivateKey(testPayload, keys.merchant.privateKey, 'SHA256');
  const encrypted = await provider.encryptWithPublicKey(testPayload, keys.pg.publicKey);
  const decrypted = await provider.decryptWithPrivateKey(encrypted, keys.pg.privateKey);

  if (decrypted !== testPayload) {
    throw new Error('Self-decryption failed in conformance test');
  }

  let refResult: Partial<ConformanceResult> = {};

  if (refDir) {
    try {
      const refUtilsPath = path.resolve(refDir, 'utils.ts');
      console.log(`Loading reference utils from: ${refUtilsPath}`);

      const refUtils = (await import(pathToFileURL(refUtilsPath).href)) as {
        encryptSensitiveData?: (params: { sensitive_data: string; public_key: string }) => string;
        decryptSensitiveData?: (params: { sensitive_data: string; private_key: string }) => string;
        isVerifiedDigitalSignature?: (params: { sensitive_data: string; signature: string; public_key: string }) => boolean;
        generateDigitalSignature?: (params: { sensitive_data: string; private_key: string }) => string;
      };

      if (refUtils.generateDigitalSignature) {
        const refSig = refUtils.generateDigitalSignature({
          sensitive_data: testPayload,
          private_key: keys.merchant.privateKey,
        });

        refResult.signatureMatch = refSig === signature;
        console.log(`- Signature Match (Deterministic PKCS#1 v1.5): ${refResult.signatureMatch ? 'PASS' : 'FAIL'}`);
      }

      if (refUtils.decryptSensitiveData) {
        const refDecrypted = refUtils.decryptSensitiveData({
          sensitive_data: encrypted,
          private_key: keys.pg.privateKey,
        });
        refResult.crossDecryptionToRef = refDecrypted === testPayload;
        console.log(`- Cross-Decryption (Ours -> Ref): ${refResult.crossDecryptionToRef ? 'PASS' : 'FAIL'}`);
      }

      if (refUtils.encryptSensitiveData) {
        const refEncrypted = refUtils.encryptSensitiveData({
          sensitive_data: testPayload,
          public_key: keys.pg.publicKey,
        });
        const ourDecryptedFromRef = await provider.decryptWithPrivateKey(refEncrypted, keys.pg.privateKey);
        refResult.crossDecryptionFromRef = ourDecryptedFromRef === testPayload;
        console.log(`- Cross-Decryption (Ref -> Ours): ${refResult.crossDecryptionFromRef ? 'PASS' : 'FAIL'}`);
      }
    } catch (err) {
      console.warn(`Could not execute dynamic reference comparison: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Write purely throwaway golden fixtures to packages/nagad-server/tests/fixtures/golden-vectors.json
  const fixturesDir = path.resolve('packages/nagad-server/tests/fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const goldenVectors = {
    _description: 'Deterministic throwaway cryptographic golden test vectors for Nagad PKCS#1 v1.5 and RSA-SHA256',
    keys: {
      merchantPublicKey: keys.merchant.publicKey,
      merchantPrivateKey: keys.merchant.privateKey,
      pgPublicKey: keys.pg.publicKey,
      pgPrivateKey: keys.pg.privateKey,
    },
    sampleInput: {
      merchantId: 'MERC_TEST_12345',
      orderId: 'ORD_TEST_99999',
      dateTime: formattedDate,
      challenge: 'c0ffee1234567890abcdef1234567890',
      rawPayloadJson: testPayload,
    },
    expectedOutputs: {
      sha256Signature: signature,
      dateTimeFormat: formattedDate,
    },
    conformanceResults: refResult,
  };

  const fixturePath = path.join(fixturesDir, 'golden-vectors.json');
  fs.writeFileSync(fixturePath, JSON.stringify(goldenVectors, null, 2), 'utf-8');
  console.log(`✅ Golden fixture written to: ${fixturePath}`);
}

main().catch((err) => {
  console.error('Conformance error:', err);
  process.exit(1);
});
