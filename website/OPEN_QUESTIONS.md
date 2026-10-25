# Nagad Documentation & Marketing Website: Open Questions & Status Record

**File**: `website/OPEN_QUESTIONS.md`  
**Purpose**: Document all verified architectural decisions and unconfirmed specifications.

---

### 1. Programmatic Refund API

- **Status**: **Not supported: use the Nagad merchant portal**.
- **Specification**: In both live codebases and the official DFS integration guide, no automated programmatic refund API endpoint is provided. Merchants perform refunds manually through the Nagad Merchant Portal. Public documentation reflects: _"Not supported: use the Nagad merchant portal"_.

### 2. Server-to-Server Webhooks / IPN

- **Status**: **Not supported (unverified)**.
- **Specification**: Nagad's confirmed integration flow is strictly a customer-facing browser redirect via HTTP `GET` (`merchantCallbackURL?merchant=...&payment_ref_id=...&status=...`). Because no asynchronous server-to-server webhook endpoint is documented or verified, webhooks are classified as _"Not supported (unverified)"_.

### 3. Base URLs & Confidentiality

- **Status**: **Dynamic & Configurable (`baseUrl`)**.
- **Specification**: Public documentation does not hardcode internal sandbox or production hosts/ports. Documentation instructs users to _"use the base URL provided during your Nagad onboarding"_ and maintains an injectable `baseUrl` option across all client and server APIs.

### 4. Confidentiality & Merchant Documentation Policy

- **Status**: **Merchant-Confidential Compliance**.
- **Specification**: The official Nagad API documentation PDF is proprietary and confidential to Kona Software Lab Limited and Third Wave Technologies Limited. No text, tables, or figures are copied into public website documentation. All guides, explanations, and diagrams are written entirely in original words. Any raw analysis is kept strictly in `docs/internal/` (gitignored).

### 5. Signature Algorithm Compatibility

- **Status**: **RSA-SHA256 (Default) with optional SHA1 Fallback**.
- **Specification**: Modern production live code utilizes `RSA-SHA256`. The library defaults to `RSA-SHA256` while offering `{ signatureAlgorithm: 'SHA1' }` for backward compatibility with legacy merchant accounts.

### 6. Deployment Target

- **Status**: **GitHub Pages via GitHub Actions**.
- **Site URL**: `https://iamtashanto.github.io/Nagad/`
- **Base Path**: `/Nagad/` (read dynamically from environment `BASE_PATH` and `SITE_URL`).
- **Indexability**: `SITE_INDEXABLE=false` during alpha/pre-release phase.
