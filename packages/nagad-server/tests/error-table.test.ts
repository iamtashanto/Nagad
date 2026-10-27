import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mapNagadApiError } from "../src/index.js";

describe("error table on the website matches mapNagadApiError", () => {
  const rows = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../../../website/src/data/error-codes.json", import.meta.url),
      ),
      "utf8",
    ),
  ) as Array<{ code: string; errorClass: string }>;

  it("maps every documented code to the documented class", () => {
    for (const row of rows) {
      const err = mapNagadApiError(row.code, "msg");
      expect(err.constructor.name, row.code).toBe(row.errorClass);
    }
  });

  it("falls back to NagadApiError for unknown codes", () => {
    expect(mapNagadApiError("99_9999_999", "x").constructor.name).toBe(
      "NagadApiError",
    );
  });
});
