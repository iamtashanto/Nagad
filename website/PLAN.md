# Implementation Plan: Nagad SDK Documentation & Marketing Website

**Location**: `/website`  
**Purpose**: Build a professional, fast, accessible, Stripe/Vercel-grade documentation and marketing website for `nagad-server` and `nagad-client`.  
**Stack**: Plain HTML5 + Tailwind CSS (via local `@tailwindcss/cli` v4, zero CDN scripts) + Vanilla JavaScript (ES Modules). Zero frontend framework dependencies.

---

## 1. Information Architecture & Sitemap (Folder-Style Clean URLs)

```
website/
├── dist/                          # Compiled production artifacts (ready for Pages deployment)
│   ├── index.html                 # Marketing Homepage
│   ├── 404.html                   # Custom 404 page
│   ├── .nojekyll                  # GitHub Pages bypass
│   ├── sitemap.xml                # Automated SEO sitemap (SITE_URL-aware)
│   ├── robots.txt                 # Search indexing directives (SITE_INDEXABLE-aware)
│   ├── docs/                      # Comprehensive Documentation Portal
│   │   ├── index.html             # Documentation overview landing page
│   │   ├── getting-started/index.html
│   │   ├── core-concepts/index.html
│   │   ├── key-setup/index.html
│   │   ├── server-guide/index.html
│   │   ├── client-guide/index.html
│   │   ├── customization-theming/index.html
│   │   ├── error-reference/index.html
│   │   ├── testing/index.html
│   │   ├── security-checklist/index.html
│   │   ├── production-checklist/index.html
│   │   ├── troubleshooting/index.html
│   │   ├── faq/index.html
│   │   └── migration/index.html
│   ├── playground/index.html      # Client-side interactive checkout simulator
│   ├── examples/index.html        # Runnable code recipes (Express, Next.js, Hono, React Native)
│   ├── api/index.html             # TypeDoc typed API reference
│   ├── changelog/index.html       # Release notes & semantic version history
│   ├── css/output.css             # Tailwind CLI compiled & minified stylesheet
│   └── js/                        # Modular vanilla ES scripts
└── src/
    ├── data/status.json           # Single source of truth for feature availability
    ├── styles/tokens.css          # Design tokens (Teal/Emerald over Obsidian/Polar Slate)
    ├── styles/input.css           # Tailwind v4 entrypoint
    └── js/                        # ES modules (theme, lang, tabs, copy)
```

---

## 2. Design System & Tokens (Teal / Emerald over Obsidian & Polar Slate)

### 2.1 Color Palette & Contrast Verification (WCAG 2.2 AA)

The palette uses an electric Teal / Emerald accent that is visibly distinct from Nagad's commercial red-orange and sibling bKash's magenta/pink:

- **Light Theme**:
  - Background Canvas: `#F8FAFC` (Slate 50), Surface: `#FFFFFF`.
  - Primary Accent: `#0D9488` (Teal 600) with `#0F766E` (Teal 700) for text on white (Contrast ratio 5.85:1, exceeds WCAG AA 4.5:1).
  - Primary Text: `#0F172A` (Slate 900, Contrast 15.6:1).
  - Secondary Text: `#334155` (Slate 700, Contrast 9.6:1).
  - Muted Text: `#64748B` (Slate 500, Contrast 4.6:1).
- **Dark Theme (Default)**:
  - Background Canvas: `#090D16` (Obsidian), Surface: `#0F172A` (Slate 900), Surface Elevated: `#1E293B`.
  - Primary Accent: `#2DD4BF` (Teal 400, Contrast ratio 12.3:1 on `#090D16`).
  - Button Text on Teal: `#090D16` (Obsidian on Teal 400, Contrast 12.3:1).
  - Primary Text: `#F8FAFC` (Slate 50, Contrast 17.5:1).
  - Secondary Text: `#CBD5E1` (Slate 300, Contrast 12.2:1).
  - Muted Text: `#94A3B8` (Slate 400, Contrast 7.2:1).

### 2.2 Typography

- English: `Inter`, system sans-serif.
- Bengali: `'Hind Siliguri'`, `'Noto Sans Bengali'`, `'SolaimanLipi'`, sans-serif.
- Monospace: `'JetBrains Mono'`, `'Fira Code'`, ui-monospace, monospace.

---

## 3. Data-Driven Feature Status (`website/src/data/status.json`)

Features are rendered strictly from `status.json` with badges:

- `stable`: Implemented and tested in the repository.
- `experimental`: Available in alpha/beta.
- `planned`: In active development or scheduled.
- `not_supported`:
  - **Programmatic Refund API**: _"Not supported: use the Nagad merchant portal"_.
  - **Server-to-Server Webhook / IPN**: _"Not supported (unverified)"_.

---

## 4. Production Prerequisites Highlighted on Homepage

The marketing homepage directly educates developers on the two crucial real-world constraints:

1. **Server Egress IPv4 Whitelisting**: Passing public server IP in `X-KM-IP-V4` matching portal registration.
2. **Node.js PKCS#1 v1.5 Decryption Compatibility (CVE-2023-46809)**: Addressing OpenSSL Marvin timing attack mitigations in Node 20+ when decrypting RSA PKCS#1 v1.5 payloads from Nagad.

---

## 5. Deployment Pipeline (`.github/workflows/pages.yml`)

- **Host**: GitHub Pages.
- **Base Path & URL**: Dynamically resolved from `BASE_PATH` and `SITE_URL` via `actions/configure-pages`.
- **Pre-release Robots Directive**: `SITE_INDEXABLE=false` emits `<meta name="robots" content="noindex, nofollow">` and `Disallow: /` in `robots.txt`.
- **Automated Validation in CI**:
  - Pinned actions with full commit SHAs.
  - Dependabot tracking in `.github/dependabot.yml`.
  - Link check verifying all internal links against `BASE_PATH`.
  - HTML5 semantics validation.
  - Prettier formatting check.
  - Gitleaks secret scan.
