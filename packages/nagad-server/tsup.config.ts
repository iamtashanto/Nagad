import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/redis.ts",
    "src/frameworks.ts",
    "src/upstash.ts",
    "src/kv.ts",
    "src/proxy.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
