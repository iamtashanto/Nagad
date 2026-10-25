import { NagadError } from "./base.js";

export class NagadVerificationMismatchError extends NagadError {
  public readonly field: string;
  public readonly expected: string;
  public readonly actual: string;

  constructor(field: string, expected: string, actual: string) {
    super(
      `Financial verification mismatch on '${field}': expected '${expected}', got '${actual}'`,
      "NAGAD_VERIFICATION_MISMATCH_ERROR",
    );
    this.field = field;
    this.expected = expected;
    this.actual = actual;
  }
}

export class NagadTimeoutError extends NagadError {
  public readonly retryable: boolean = true;

  constructor(message: string = "Nagad API request timed out") {
    super(message, "NAGAD_TIMEOUT_ERROR");
  }
}

export class NagadSessionNotFoundError extends NagadError {
  constructor(identifier: string) {
    super(
      `Payment session not found for '${identifier}'`,
      "NAGAD_SESSION_NOT_FOUND_ERROR",
    );
  }
}

export class NagadReplayAttackError extends NagadError {
  constructor(
    message: string = "Payment callback already processed or replay detected",
  ) {
    super(message, "NAGAD_REPLAY_ATTACK_ERROR");
  }
}

export class NagadConcurrentVerificationError extends NagadError {
  constructor(
    message: string = "Payment verification currently in progress by another worker",
  ) {
    super(message, "NAGAD_CONCURRENT_VERIFICATION_ERROR");
  }
}
