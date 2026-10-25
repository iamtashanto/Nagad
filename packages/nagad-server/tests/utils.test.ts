import { describe, it, expect } from 'vitest';
import { formatBdtDateTime, getBdtDate } from '../src/utils/date.js';
import { maskMsisdn, redactSecrets } from '../src/utils/pii.js';
import { normalizeKey } from '../src/utils/keys.js';
import { mapNagadApiError, NagadInvalidMerchantError, NagadApiError } from '../src/errors/index.js';

describe('Utility Functions & Error Mapping', () => {
  it('formats BDT datetime strictly without timezone drift', () => {
    const fixedDate = new Date('2026-10-25T15:30:45.000Z'); // 15:30 UTC -> 21:30 BDT
    const bdtStr = formatBdtDateTime(() => fixedDate);
    expect(bdtStr).toBe('20261025213045');

    const bdtDate = getBdtDate(() => fixedDate);
    expect(bdtDate).toBeInstanceOf(Date);
  });

  it('masks MSISDN correctly and handles edge cases', () => {
    expect(maskMsisdn('01712345678')).toBe('017****5678');
    expect(maskMsisdn('+8801812345678')).toBe('+88****5678');
    expect(maskMsisdn('123')).toBe('****');
    expect(maskMsisdn(undefined)).toBeUndefined();
    expect(maskMsisdn(null)).toBeUndefined();
  });

  it('redacts sensitive fields from objects recursively', () => {
    const sensitive = {
      orderId: 'ORD12345',
      sensitiveData: 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...',
      signature: 'U2lnbmF0dXJlQmFzZTY0...',
      clientMobileNo: '01712345678',
      merchantPrivateKey: 'PRIVATE_KEY_DATA',
      nested: {
        pin: '1234',
        safeField: 'hello',
      },
    };

    const redacted = redactSecrets(sensitive);
    expect(redacted.sensitiveData).toBe('[REDACTED]');
    expect(redacted.signature).toBe('[REDACTED]');
    expect(redacted.clientMobileNo).toBe('017****5678');
    expect(redacted.merchantPrivateKey).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).safeField).toBe('hello');
    expect((redacted.nested as Record<string, unknown>).pin).toBe('[REDACTED]');
  });

  it('normalizes PEM, single-line Base64, and Buffer keys', () => {
    const validKeyBody = 'A'.repeat(120);
    const pem = `-----BEGIN PUBLIC KEY-----\n${validKeyBody}\n-----END PUBLIC KEY-----`;
    expect(normalizeKey(pem, 'PUBLIC')).toBe(pem);

    const buffer = Buffer.from(pem, 'utf-8');
    expect(normalizeKey(buffer, 'PUBLIC')).toBe(pem);

    const rawBase64 = validKeyBody;
    const normalized = normalizeKey(rawBase64, 'PUBLIC');
    expect(normalized).toContain('-----BEGIN PUBLIC KEY-----');
    expect(normalized).toContain('-----END PUBLIC KEY-----');
  });

  it('maps known Nagad status codes and fallback to NagadApiError', () => {
    const err1 = mapNagadApiError('16_0006_004', 'Invalid merchant ID', 400);
    expect(err1).toBeInstanceOf(NagadInvalidMerchantError);
    expect(err1.code).toBe('NAGAD_INVALID_MERCHANT_ERROR');

    const errUnknown = mapNagadApiError('9999_UNKNOWN_CODE', 'Unexpected gateway condition', 502);
    expect(errUnknown).toBeInstanceOf(NagadApiError);
    expect(errUnknown.rawCode).toBe('9999_UNKNOWN_CODE');
    expect(errUnknown.httpStatus).toBe(502);
  });
});
