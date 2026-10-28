import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const docsDir = fileURLToPath(
  new URL("../../../website/docs/", import.meta.url),
);
const entries: Record<string, () => Promise<Record<string, unknown>>> = {
  "nagad-server": () => import("../../nagad-server/src/index.js"),
  "nagad-server/frameworks": () =>
    import("../../nagad-server/src/frameworks.js"),
  "nagad-server/redis": () => import("../../nagad-server/src/redis.js"),
  "nagad-server/upstash": () => import("../../nagad-server/src/upstash.js"),
  "nagad-server/kv": () => import("../../nagad-server/src/kv.js"),
  "nagad-server/proxy": () => import("../../nagad-server/src/proxy.js"),
  "nagad-client": () => import("../src/index.js"),
  "nagad-client/react": () => import("../src/react.js"),
  "nagad-client/vue": () => import("../src/vue.js"),
  "nagad-client/svelte": () => import("../src/svelte.js"),
  "nagad-client/angular": () => import("../src/angular.js"),
  "nagad-client/react-native": () => import("../src/react-native.js"),
};

describe("documentation samples only import names that exist", () => {
  const imports: Array<{ file: string; names: string[]; spec: string }> = [];
  for (const file of readdirSync(docsDir).filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(docsDir + file, "utf8");
    for (const m of text.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*['"](nagad-(?:server|client)[^'"]*)['"]/g,
    )) {
      imports.push({
        file,
        spec: m[2],
        names: m[1]
          .split(",")
          .map((n) => n.trim().split(/\s+as\s+/)[0])
          .filter(Boolean),
      });
    }
  }

  it("finds imports in the docs", () =>
    expect(imports.length).toBeGreaterThan(5));

  for (const { file, spec, names } of imports) {
    it(`${file}: ${spec} { ${names.join(", ")} }`, async () => {
      expect(entries[spec], `unknown entry point ${spec}`).toBeDefined();
      const mod = await entries[spec]();
      for (const n of names)
        expect(Object.keys(mod), `${n} is not exported by ${spec}`).toContain(
          n,
        );
    });
  }
});
