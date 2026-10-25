import { NagadError } from "./base.js";

export class NagadApiError extends NagadError {
  public readonly rawCode?: string;
  public readonly httpStatus?: number;
  public readonly rawResponse?: unknown;

  constructor(
    message: string,
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
    code: string = "NAGAD_API_ERROR",
  ) {
    super(message, code);
    this.rawCode = rawCode;
    this.httpStatus = httpStatus;
    this.rawResponse = rawResponse;
  }
}

export class NagadInvalidMerchantError extends NagadApiError {
  constructor(
    message: string,
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(
      message,
      rawCode,
      httpStatus,
      rawResponse,
      "NAGAD_INVALID_MERCHANT_ERROR",
    );
  }
}

export class NagadInactiveMerchantError extends NagadApiError {
  constructor(
    message: string,
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(
      message,
      rawCode,
      httpStatus,
      rawResponse,
      "NAGAD_INACTIVE_MERCHANT_ERROR",
    );
  }
}

export class NagadDuplicateOrderIdError extends NagadApiError {
  constructor(
    message: string = "Duplicate Order ID in same day",
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(
      message,
      rawCode,
      httpStatus,
      rawResponse,
      "NAGAD_DUPLICATE_ORDER_ID_ERROR",
    );
  }
}

export class NagadClockSkewError extends NagadApiError {
  constructor(
    message: string = "Transaction Date Time Not in allowed window",
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(message, rawCode, httpStatus, rawResponse, "NAGAD_CLOCK_SKEW_ERROR");
  }
}

export class NagadInvalidOrderIdError extends NagadApiError {
  constructor(
    message: string = "Invalid Order Id: must be 5-20 alphanumeric characters",
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(
      message,
      rawCode,
      httpStatus,
      rawResponse,
      "NAGAD_INVALID_ORDER_ID_ERROR",
    );
  }
}

export class NagadInvalidTimestampError extends NagadApiError {
  constructor(
    message: string = "Invalid Date Time Format",
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(
      message,
      rawCode,
      httpStatus,
      rawResponse,
      "NAGAD_INVALID_TIMESTAMP_ERROR",
    );
  }
}

export class NagadInvalidCurrencyError extends NagadApiError {
  constructor(
    message: string = 'Invalid Currency Code: must be "050" (BDT)',
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(
      message,
      rawCode,
      httpStatus,
      rawResponse,
      "NAGAD_INVALID_CURRENCY_ERROR",
    );
  }
}

export class NagadMissingHeaderError extends NagadApiError {
  constructor(
    message: string = "Mandatory Header Missing",
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(
      message,
      rawCode,
      httpStatus,
      rawResponse,
      "NAGAD_MISSING_HEADER_ERROR",
    );
  }
}

export class NagadKeyError extends NagadApiError {
  constructor(
    message: string = "Invalid merchant key",
    rawCode?: string,
    httpStatus?: number,
    rawResponse?: unknown,
  ) {
    super(message, rawCode, httpStatus, rawResponse, "NAGAD_KEY_ERROR");
  }
}

/**
 * Maps raw Nagad API error response to strongly-typed NagadApiError subclasses.
 * Falls back safely to NagadApiError for unknown or undocumented codes.
 */
export function mapNagadApiError(
  rawCode: string | undefined,
  message: string,
  httpStatus?: number,
  rawResponse?: unknown,
): NagadApiError {
  switch (rawCode) {
    case "16_0006_004":
    case "16_0006_050":
    case "16_0006_052":
      return new NagadInvalidMerchantError(
        message,
        rawCode,
        httpStatus,
        rawResponse,
      );
    case "16_0006_053":
      return new NagadInactiveMerchantError(
        message,
        rawCode,
        httpStatus,
        rawResponse,
      );
    case "16_0006_061":
      return new NagadKeyError(message, rawCode, httpStatus, rawResponse);
    case "16_0006_064":
      return new NagadMissingHeaderError(
        message,
        rawCode,
        httpStatus,
        rawResponse,
      );
    case "16_0006_068":
      return new NagadInvalidOrderIdError(
        message,
        rawCode,
        httpStatus,
        rawResponse,
      );
    case "16_0006_076":
      return new NagadClockSkewError(message, rawCode, httpStatus, rawResponse);
    case "16_0006_081":
      return new NagadInvalidTimestampError(
        message,
        rawCode,
        httpStatus,
        rawResponse,
      );
    case "16_0006_083":
      return new NagadDuplicateOrderIdError(
        message,
        rawCode,
        httpStatus,
        rawResponse,
      );
    case "16_0006_080":
      return new NagadInvalidCurrencyError(
        message,
        rawCode,
        httpStatus,
        rawResponse,
      );
    default:
      return new NagadApiError(message, rawCode, httpStatus, rawResponse);
  }
}
