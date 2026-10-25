/**
 * Base Error class for all Nagad SDK errors.
 * Aligned with BkashError hierarchy in sibling monorepo.
 */
export class NagadError extends Error {
  public readonly code: string;
  public readonly timestamp: number;

  constructor(message: string, code: string = "NAGAD_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
