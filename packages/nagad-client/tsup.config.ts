import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "src/index.ts",
      "src/react.ts",
      "src/react-native.ts",
      "src/vue.ts",
      "src/svelte.ts",
      "src/angular.ts",
    ],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "es2020",
  },
  {
    entry: { "nagad-client.iife": "src/index.ts" },
    format: ["iife"],
    globalName: "NagadCheckout",
    minify: true,
    sourcemap: true,
    target: "es2020",
  },
]);
