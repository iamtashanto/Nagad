# Nagad SDK Monorepo

> Production-grade, zero-dependency, open-source Nagad Payment Gateway SDK for Node.js, Web, and Mobile.

[![CI](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml/badge.svg)](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml)
[![Website](https://img.shields.io/badge/docs-website-teal.svg)](https://iamtashanto.github.io/Nagad/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Disclaimer

This repository is an **unofficial**, community-driven open-source project. It is **not** affiliated with, endorsed by, or sponsored by Nagad or Third Wave Technologies Limited.

---

## Packages

| Package                                       | Description                                                                             |     Version     | Links                                                                                                     |
| :-------------------------------------------- | :-------------------------------------------------------------------------------------- | :-------------: | :-------------------------------------------------------------------------------------------------------- |
| [`nagad-server`](packages/nagad-server)       | Server SDK with zero runtime dependencies, atomic SessionStores, and framework adapters | `0.1.0-alpha.1` | [![npm](https://img.shields.io/npm/v/nagad-server/alpha.svg)](https://www.npmjs.com/package/nagad-server) |
| [`nagad-client`](packages/nagad-client)       | Headless client SDK for React, React Native, Vue, Svelte, Angular, and Vanilla JS       | `0.1.0-alpha.1` | [![npm](https://img.shields.io/npm/v/nagad-client/alpha.svg)](https://www.npmjs.com/package/nagad-client) |
| [`nagad-simulator`](packages/nagad-simulator) | Offline mock Nagad server with throwaway test RSA keys for deterministic CI             | `0.1.0-alpha.1` | Internal test package                                                                                     |

---

## Quickstart

### 1. Server (`nagad-server`)

```bash
npm install nagad-server@alpha
```

```typescript
import { createNagad } from "nagad-server";

export const nagad = createNagad({
  merchantId: process.env.NAGAD_MERCHANT_ID!,
  merchantPrivateKey: process.env.NAGAD_PRIVATE_KEY!,
  pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY!,
  baseUrl: process.env.NAGAD_BASE_URL!,
});
```

### 2. Client (`nagad-client`)

```bash
npm install nagad-client@alpha
```

```tsx
import { useNagadCheckout } from "nagad-client/react";

function Checkout() {
  const { initiate, isLoading } = useNagadCheckout();
  // ...
}
```

---

## Documentation & Architecture

- **[Technical Architecture & Design (DESIGN.md)](docs/DESIGN.md)**: Deep dive into the cryptographic protocol, RSA PKCS#1 v1.5 handling, CVE-2023-46809 mitigation, and distributed state machines.
- **[Security Policy & Threat Model (SECURITY.md)](docs/SECURITY.md)**: Threat vectors, verification rules, and vulnerability reporting.
- **[Release Checklist & Hardening Gate (RELEASE_CHECKLIST.md)](docs/RELEASE_CHECKLIST.md)**: Production go/no-go audit, dogfood rollout plan, and publication commands.
- **[Interactive Documentation Website](https://iamtashanto.github.io/Nagad/)**: Guides, tokenized palettes, and compatibility matrices.

---

## Security & Verification

- **Full History Gitleaks Clean**: Scanned across all commits; zero secrets, real keys, or confidential IPs exist in git.
- **Marvin / Bleichenbacher Mitigation**: `NodeCryptoProvider.checkCapability()` validates host runtime OpenSSL implicit rejection at boot.
- **Types Resolution Modes**: 100% green on `@arethetypeswrong/cli` for `node10`, `node16`, `nodenext`, and `bundler`.
- **Deterministic Cryptographic Conformance**: Byte-identical RSA signatures cross-verified against official vendor reference implementations.

---

## License

MIT © [Md Tanvir Ahamed Shanto](https://github.com/iamtashanto)
