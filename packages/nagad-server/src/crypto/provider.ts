export interface CryptoProvider {
  /**
   * Encrypts plaintext string with Nagad PG Public Key using RSA PKCS#1 v1.5 padding.
   * Returns Base64-encoded ciphertext.
   */
  encryptWithPublicKey(
    plaintext: string,
    publicKeyPem: string,
  ): Promise<string>;

  /**
   * Decrypts Base64-encoded ciphertext with Merchant Private Key using RSA PKCS#1 v1.5 padding.
   * Returns UTF-8 decrypted plaintext.
   * Must return a single uniform error on failure without leaking padding or timing details.
   */
  decryptWithPrivateKey(
    ciphertextBase64: string,
    privateKeyPem: string,
  ): Promise<string>;

  /**
   * Generates a digital signature over data using Merchant Private Key.
   * Returns Base64-encoded signature.
   */
  signWithPrivateKey(
    data: string,
    privateKeyPem: string,
    algorithm?: "SHA256" | "SHA1",
  ): Promise<string>;

  /**
   * Verifies digital signature over data using Nagad PG Public Key.
   */
  verifyWithPublicKey(
    data: string,
    signatureBase64: string,
    publicKeyPem: string,
    algorithm?: "SHA256" | "SHA1",
  ): Promise<boolean>;

  /**
   * Runs an in-memory startup capability check with ephemeral keys.
   * Throws NagadCryptoCapabilityError if the runtime cannot safely decrypt PKCS#1 v1.5.
   */
  checkCapability(): Promise<void>;
}
