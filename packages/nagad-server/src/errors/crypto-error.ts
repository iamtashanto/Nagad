import { NagadError } from "./base.js";

export class NagadCryptoError extends NagadError {
  constructor(message: string, code: string = "NAGAD_CRYPTO_ERROR") {
    super(message, code);
  }
}

export class NagadCryptoCapabilityError extends NagadCryptoError {
  constructor(message: string) {
    super(message, "NAGAD_CRYPTO_CAPABILITY_ERROR");
  }
}

export class NagadSignatureVerificationError extends NagadCryptoError {
  constructor(
    message: string = "Failed to verify Nagad response digital signature",
  ) {
    super(message, "NAGAD_SIGNATURE_VERIFICATION_ERROR");
  }
}
