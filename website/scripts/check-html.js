import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

console.log(
  "🔍 Validating HTML landmarks, titles, and accessibility essentials...",
);

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
  const relPath = path.relative(distDir, file);

  // Check doctype
  if (!content.includes("<!DOCTYPE html>")) {
    console.error(`❌ Missing <!DOCTYPE html> in ${relPath}`);
    errors++;
  }

  // Check title
  if (!content.includes("<title>") || !content.includes("</title>")) {
    console.error(`❌ Missing <title> in ${relPath}`);
    errors++;
  }

  // Check viewport
  if (!content.includes('name="viewport"')) {
    console.error(`❌ Missing viewport meta tag in ${relPath}`);
    errors++;
  }

  // Check main landmark
  if (!content.includes("<main")) {
    console.error(`❌ Missing <main> landmark in ${relPath}`);
    errors++;
  }

  // Check lang attribute
  if (!content.includes("<html lang=")) {
    console.error(`❌ Missing lang attribute on <html> in ${relPath}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`💥 Found ${errors} HTML validation issues!`);
  process.exit(1);
} else {
  console.log(`✅ HTML validation passed across ${htmlFiles.length} pages!`);
}
