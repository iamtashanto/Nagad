import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const rawBasePath = process.env.BASE_PATH ?? "/Nagad/";
const BASE_PATH =
  rawBasePath === "/" ? "/" : `/${rawBasePath.replace(/^\/+|\/+$/g, "")}/`;

console.log("🔍 Checking internal links across website/dist...");

function getAllFiles(dir, ext = ".html") {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

const htmlFiles = getAllFiles(distDir);
let errors = 0;

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, "utf-8");
  // Match href and src
  const hrefMatches = content.matchAll(/href=["']([^"']+)["']/g);
  const srcMatches = content.matchAll(/src=["']([^"']+)["']/g);

  const checkUrl = (url, type) => {
    // Ignore external URLs, anchors, mailto, javascript, and data URIs
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("#") ||
      url.startsWith("mailto:") ||
      url.startsWith("javascript:") ||
      url.startsWith("data:")
    ) {
      return;
    }

    // Must start with BASE_PATH for internal links
    let targetPath = url.split("#")[0].split("?")[0];
    if (BASE_PATH !== "/" && targetPath.startsWith(BASE_PATH)) {
      targetPath = targetPath.slice(BASE_PATH.length);
    } else if (targetPath.startsWith("/")) {
      targetPath = targetPath.slice(1);
    }

    let resolvedPath = path.join(distDir, targetPath);
    if (
      fs.existsSync(resolvedPath) &&
      fs.statSync(resolvedPath).isDirectory()
    ) {
      resolvedPath = path.join(resolvedPath, "index.html");
    }

    if (!fs.existsSync(resolvedPath)) {
      console.error(
        `❌ Broken link in ${path.relative(distDir, file)}: ${type}="${url}" (resolved to ${resolvedPath})`,
      );
      errors++;
    }
  };

  for (const m of hrefMatches) checkUrl(m[1], "href");
  for (const m of srcMatches) checkUrl(m[1], "src");
}

if (errors > 0) {
  console.error(`💥 Found ${errors} broken link(s)!`);
  process.exit(1);
} else {
  console.log(
    `✅ All internal links verified successfully across ${htmlFiles.length} pages!`,
  );
}
