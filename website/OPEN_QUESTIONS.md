# Nagad Documentation & Marketing Website: Open Questions

**File**: `website/OPEN_QUESTIONS.md`  
**Purpose**: Document all unconfirmed specifications, architectural questions, and roadmap items requiring user clarification.

---

### 1. Programmatic Refund API
- **Context**: In our audit of both live codebases (`LifeLineit`, `Payment-Gateway-Integration`) and the official Nagad DFS Integration Guide (v3.3), there is no programmatic refund endpoint (e.g. `/api/dfs/refund`). Nagad merchants usually perform refunds via the Merchant Portal or manual support requests.
- **Question**: Should the website docs explicitly document refunds as *"Handled via Nagad Merchant Portal (Programmatic API coming soon / subject to merchant agreement)"*?
- **Proposed Answer**: Yes, label programmatic refund as *"Coming soon (Manual portal workflow documented)"* to adhere to the rule of never inventing APIs.

### 2. Signature Algorithm Compatibility
- **Context**: The official v3.3 specification (October 2021) documents `SHA1withRSA`, whereas live working production code (`LifeLineit`) successfully calls Nagad using `RSA-SHA256`.
- **Question**: Should the documentation recommend `RSA-SHA256` as the modern default while providing `{ signatureAlgorithm: 'SHA1' }` as a backward-compatibility option for legacy merchant accounts?
- **Proposed Answer**: Yes. Recommend `RSA-SHA256` with documentation explaining both options.

### 3. Sandbox Base URL
- **Context**: Two sandbox URLs appear in live and reference implementations:
  1. `https://sandbox.mynagad.com:10080/api/dfs`
  2. `https://sandbox-ssl.mynagad.com/api/dfs`
- **Question**: Which sandbox URL should be documented as the primary default in the guides?
- **Proposed Answer**: Document `https://sandbox.mynagad.com:10080/api/dfs` with note about `https://sandbox-ssl.mynagad.com/api/dfs` and how developers can customize `baseUrl`.

### 4. Asynchronous Webhooks vs. Callback Redirect
- **Context**: Nagad's documented flow is entirely customer-driven browser redirect via HTTP `GET` (`merchantCallbackURL?merchant=...&payment_ref_id=...&status=...`).
- **Question**: Does Nagad provide server-to-server POST webhooks/IPN, or should our documentation explicitly emphasize the browser GET callback + immediate mandatory server verification pattern?
- **Proposed Answer**: Emphasize the browser callback + mandatory server-side verification (`verify()`) as the confirmed Nagad architecture, and describe server-to-server webhook as an internal application pattern.

### 5. Deployment Target for GitHub Actions
- **Context**: The requirements specify GitHub Actions deployment to GitHub Pages or Cloudflare Pages with base-path awareness.
- **Question**: What is the expected deployment domain or subpath (e.g. `https://iamtashanto.github.io/Nagad/` or a custom domain like `https://nagad-js.org/`)?
- **Proposed Answer**: We will configure the build script with configurable `BASE_PATH` support (defaulting to relative `./` or environment variable `BASE_PATH`) so it works out-of-the-box on both GitHub Pages subpaths and custom domains.
