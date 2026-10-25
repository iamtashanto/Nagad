import type { CryptoProvider } from "./provider.js";
import { NagadCryptoError } from "../errors/crypto-error.js";

export class PureJsCryptoProvider implements CryptoProvider {
  private peerProvider?: CryptoProvider;

  constructor(customPeerProvider?: CryptoProvider) {
    this.peerProvider = customPeerProvider;
  }

  async checkCapability(): Promise<void> {
    // PureJs provider does not rely on OpenSSL native bindings
  }

  async encryptWithPublicKey(
    plaintext: string,
    publicKeyPem: string,
  ): Promise<string> {
    if (this.peerProvider) {
      return this.peerProvider.encryptWithPublicKey(plaintext, publicKeyPem);
    }
    throw new NagadCryptoError(
      "PureJsCryptoProvider requires an injected peer engine or @nagad-crypto/purejs package.",
    );
  }

  async decryptWithPrivateKey(
    ciphertextBase64: string,
    privateKeyPem: string,
  ): Promise<string> {
    if (this.peerProvider) {
      try {
        return await this.peerProvider.decryptWithPrivateKey(
          ciphertextBase64,
          privateKeyPem,
        );
      } catch {
        // Uniform error guarantee: never expose padding or timing specifics
        throw new NagadCryptoError("Failed to decrypt sensitive data");
      }
    }
    throw new NagadCryptoError(
      "PureJsCryptoProvider requires an injected peer engine or @nagad-crypto/purejs package.",
    );
  }

  async signWithPrivateKey(
    data: string,
    privateKeyPem: string,
    algorithm: "SHA256" | "SHA1" = "SHA256",
  ): Promise<string> {
    if (this.peerProvider) {
      return this.peerProvider.signWithPrivateKey(
        data,
        privateKeyPem,
        algorithm,
      );
    }
    throw new NagadCryptoError(
      "PureJsCryptoProvider requires an injected peer engine.",
    );
  }

  async verifyWithPublicKey(
    data: string,
    signatureBase64: string,
    publicKeyPem: string,
    algorithm: "SHA256" | "SHA1" = "SHA256",
  ): Promise<boolean> {
    if (this.peerProvider) {
      return this.peerProvider.verifyWithPublicKey(
        data,
        signatureBase64,
        publicKeyPem,
        algorithm,
      );
    }
    return false;
  }
}
