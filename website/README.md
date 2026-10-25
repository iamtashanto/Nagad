# nagad-sdk Documentation & Marketing Website

This directory contains the source code, design system, and static generator for the official documentation and marketing portal for `nagad-server` and `nagad-client`.

- **Live URL**: [https://iamtashanto.github.io/Nagad/](https://iamtashanto.github.io/Nagad/)
- **Technology Stack**: Plain HTML5 + Tailwind CSS v4 (via `@tailwindcss/cli`, no CDN scripts) + Vanilla JavaScript (ES Modules).

---

## 1. Local Development

### Prerequisites

- Node.js >= 18 (Node 20+ recommended)
- `pnpm` >= 9

### Commands

```bash
# Install dependencies at repository root
pnpm install

# Build CSS and HTML pages once
pnpm build:website

# Start local preview server (serves at http://localhost:3000/Nagad/)
pnpm dev:website

# Run CI checks locally (links, HTML validation, Prettier)
pnpm check:website
```

---

## 2. Environment Variables

The static build script (`website/scripts/build.js`) respects the following environment variables:

| Variable         | Default Value                         | Description                                                                                                                                                                 |
| :--------------- | :------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_PATH`      | `/Nagad/`                             | Base URL path for GitHub Pages subfolder. Set to `/` when deploying to a custom domain.                                                                                     |
| `SITE_URL`       | `https://iamtashanto.github.io/Nagad` | Canonical origin URL for Open Graph cards, canonical tags, and `sitemap.xml`.                                                                                               |
| `SITE_INDEXABLE` | `false`                               | When `false` (default for pre-release), adds `<meta name="robots" content="noindex, nofollow">` and Disallow all in `robots.txt`. Set to `true` upon public v1.0.0 release. |

---

## 3. GitHub Pages Setup Guide

### One-Time Repository Configuration

To enable automated deployments via GitHub Actions:

1. Navigate to your repository on GitHub: `https://github.com/iamtashanto/Nagad/settings/pages`.
2. Under **Build and deployment** > **Source**, select:
   **GitHub Actions** (do NOT select "Deploy from a branch").
3. Subsequent pushes to `main` modifying files in `website/**` or `.github/workflows/pages.yml` will automatically trigger `.github/workflows/pages.yml` to build and publish the site.

---

## 4. Custom Domain Configuration

If you configure a custom domain (e.g., `https://nagad-js.org`):

1. Add a `CNAME` record in your DNS provider pointing to `iamtashanto.github.io`.
2. In GitHub repository **Settings > Pages > Custom domain**, enter your domain name.
3. Update the GitHub Actions workflow environment in `.github/workflows/pages.yml`:
   ```yaml
   env:
     BASE_PATH: "/"
     SITE_URL: "https://nagad-js.org"
     SITE_INDEXABLE: "true"
   ```

---

## 5. Flipping Site Indexability for Public Launch

During the pre-release and alpha development phases, `SITE_INDEXABLE` is strictly set to `false` to prevent search engines from indexing incomplete alpha specifications.

When the library reaches public release on npm:

1. Edit `.github/workflows/pages.yml`:
   ```yaml
   SITE_INDEXABLE: "true"
   ```
2. Commit and push to `main`. The build script will automatically emit `<meta name="robots" content="index, follow">` and an open `robots.txt` pointing to `${SITE_URL}/sitemap.xml`.
