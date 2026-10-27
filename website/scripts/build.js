import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.resolve(rootDir, "dist");
const srcDir = path.resolve(rootDir, "src");

// Read configuration from environment
const rawBasePath = process.env.BASE_PATH ?? "/Nagad/";
// Ensure BASE_PATH starts and ends with '/'
const BASE_PATH =
  rawBasePath === "/" ? "/" : `/${rawBasePath.replace(/^\/+|\/+$/g, "")}/`;
const rawSiteUrl =
  process.env.SITE_URL ?? "https://iamtashanto.github.io/Nagad";
const SITE_URL = rawSiteUrl.replace(/\/+$/, "");
const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";

console.log("🚀 Building Nagad Documentation Website...");
console.log(`   BASE_PATH: ${BASE_PATH}`);
console.log(`   SITE_URL:  ${SITE_URL}`);
console.log(`   INDEXABLE: ${SITE_INDEXABLE}`);

// Load status.json
const statusData = JSON.parse(
  fs.readFileSync(path.join(srcDir, "data", "status.json"), "utf-8"),
);

// Ensure dist directories exist
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, "css"), { recursive: true });
fs.mkdirSync(path.join(distDir, "js"), { recursive: true });
fs.mkdirSync(path.join(distDir, "docs"), { recursive: true });

// Copy JS modules
const srcJsDir = path.join(srcDir, "js");
if (fs.existsSync(srcJsDir)) {
  fs.cpSync(srcJsDir, path.join(distDir, "js"), { recursive: true });
}

// Robots meta
const robotsMeta = SITE_INDEXABLE
  ? '<meta name="robots" content="index, follow">'
  : '<meta name="robots" content="noindex, nofollow">';

// Inline theme initialization to avoid flash
const inlineThemeScript = `
<script>
  (function() {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    var lang = localStorage.getItem('lang');
    if (lang === 'bn') {
      document.documentElement.lang = 'bn';
    }
  })();
</script>
`;

// Shared Navigation Bar
const navbarHtml = `
<header class="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-[#090d16]/80 border-b border-subtle transition-colors">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    <!-- Brand Wordmark -->
    <div class="flex items-center space-x-3">
      <a href="${BASE_PATH}" class="flex items-center space-x-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-md" aria-label="Nagad SDK Home">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          <span>N</span>
        </div>
        <div class="flex items-baseline space-x-1.5">
          <span class="text-xl font-bold tracking-tight text-primary font-mono">nagad<span class="text-teal-600 dark:text-teal-400">-sdk</span></span>
          <span class="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">Alpha</span>
        </div>
      </a>
    </div>

    <!-- Desktop Nav Links -->
    <nav class="hidden md:flex items-center space-x-8 text-sm font-medium" aria-label="Primary Navigation">
      <a href="${BASE_PATH}docs/" class="text-secondary hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-1" data-lang-en="Documentation" data-lang-bn="ডকুমেন্টেশন">Documentation</a>
      <a href="${BASE_PATH}docs/changelog/" class="text-secondary hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-1" data-lang-en="Changelog" data-lang-bn="পরিবর্তন তালিকা">Changelog</a>
    </nav>

    <!-- Controls: Language, Theme, GitHub -->
    <div class="flex items-center space-x-3">
      <!-- Language Toggle -->
      <button id="lang-toggle-btn" type="button" class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-subtle bg-surface hover:bg-surface-elevated text-secondary transition-colors flex items-center space-x-1" aria-label="Switch Language">
        <span class="lang-label">বাংলা</span>
      </button>

      <!-- Theme Toggle -->
      <button id="theme-toggle-btn" type="button" class="p-2 rounded-lg border border-subtle bg-surface hover:bg-surface-elevated text-secondary transition-colors" aria-label="Toggle Theme">
        <!-- Sun (visible in dark) -->
        <svg class="w-4 h-4 hidden dark:block text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
        <!-- Moon (visible in light) -->
        <svg class="w-4 h-4 block dark:hidden text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
        </svg>
      </button>

      <!-- GitHub Link -->
      <a href="https://github.com/iamtashanto/Nagad" target="_blank" rel="noopener noreferrer" class="p-2 rounded-lg border border-subtle bg-surface hover:bg-surface-elevated text-secondary transition-colors" aria-label="GitHub Repository">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path>
        </svg>
      </a>

      <!-- Mobile Menu Toggle -->
      <button id="mobile-menu-btn" type="button" class="md:hidden p-2 rounded-lg border border-subtle bg-surface text-secondary" aria-label="Open mobile menu" aria-expanded="false">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile Dropdown -->
  <div id="mobile-menu" class="hidden md:hidden border-b border-subtle bg-surface px-4 pt-2 pb-4 space-y-2">
    <a href="${BASE_PATH}docs/" class="block px-3 py-2 rounded-md text-base font-medium text-secondary hover:bg-surface-elevated" data-lang-en="Documentation" data-lang-bn="ডকুমেন্টেশন">Documentation</a>
    <a href="${BASE_PATH}docs/changelog/" class="block px-3 py-2 rounded-md text-base font-medium text-secondary hover:bg-surface-elevated" data-lang-en="Changelog" data-lang-bn="পরিবর্তন তালিকা">Changelog</a>
  </div>
</header>
`;

// Shared Footer
const footerHtml = `
<footer class="border-t border-subtle bg-surface mt-24 py-12 transition-colors">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
      <!-- Wordmark & Mission -->
      <div class="md:col-span-2 space-y-4">
        <div class="flex items-center space-x-2">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">N</div>
          <span class="text-lg font-bold tracking-tight text-primary font-mono">nagad-sdk</span>
        </div>
        <p class="text-sm text-secondary max-w-md" data-lang-en="An open-source, MIT-licensed TypeScript SDK for Nagad payments in Bangladesh. Designed for dead-simple developer setup, zero runtime dependencies, and bulletproof security." data-lang-bn="বাংলাদেশে নগদ পেমেন্টের জন্য একটি ওপেন-সোর্স, এমআইটি লাইসেন্সযুক্ত টাইপস্ক্রিপ্ট এসডিকে। সহজ সেটআপ, শূন্য ডিপেন্ডেন্সি এবং সর্বোচ্চ নিরাপত্তার জন্য নির্মিত।">
          An open-source, MIT-licensed TypeScript SDK for Nagad payments in Bangladesh. Designed for dead-simple developer setup, zero runtime dependencies, and bulletproof security.
        </p>
        <div class="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-200 text-xs leading-relaxed max-w-md">
          <strong class="font-semibold" data-lang-en="⚠️ Disclaimer:" data-lang-bn="⚠️ অস্বীকৃতি:">⚠️ Disclaimer:</strong>
          <span data-lang-en=" This is an independent, community-driven open-source project. It is not affiliated with, sponsored by, or endorsed by Nagad, Third Wave Technologies Limited, or the Bangladesh Post Office." data-lang-bn=" এটি একটি স্বাধীন, কমিউনিটি ওপেন-সোর্স প্রকল্প। এটি নগদ, থার্ড ওয়েভ টেকনোলজিস লিমিটেড বা বাংলাদেশ ডাক বিভাগের সাথে অনুমোদিত বা সংশ্লিষ্ট নয়।">
            This is an independent, community-driven open-source project. It is not affiliated with, sponsored by, or endorsed by Nagad, Third Wave Technologies Limited, or the Bangladesh Post Office.
          </span>
        </div>
      </div>

      <!-- Navigation -->
      <div>
        <h2 class="text-xs font-semibold text-primary uppercase tracking-wider mb-4" data-lang-en="Resources" data-lang-bn="রিসোর্স">Resources</h2>
        <ul class="space-y-2.5 text-sm text-secondary">
          <li><a href="${BASE_PATH}docs/" class="hover:text-primary transition-colors" data-lang-en="Documentation" data-lang-bn="ডকুমেন্টেশন">Documentation</a></li>
          <li><a href="${BASE_PATH}docs/changelog/" class="hover:text-primary transition-colors" data-lang-en="Changelog" data-lang-bn="পরিবর্তন তালিকা">Changelog</a></li>
        </ul>
      </div>

      <!-- Legal & Security -->
      <div>
        <h2 class="text-xs font-semibold text-primary uppercase tracking-wider mb-4" data-lang-en="Integrity & Standards" data-lang-bn="নিরাপত্তা ও মানদণ্ড">Integrity & Standards</h2>
        <ul class="space-y-2.5 text-sm text-secondary">
          <li><span class="text-muted" data-lang-en="MIT License (Open Source)" data-lang-bn="এমআইটি লাইসেন্স (ওপেন সোর্স)">MIT License (Open Source)</span></li>
          <li><span class="text-muted" data-lang-en="Zero Runtime Dependencies" data-lang-bn="শূন্য রানটাইম ডিপেন্ডেন্সি">Zero Runtime Dependencies</span></li>
          <li><span class="text-muted" data-lang-en="Zero Client-Side Keys" data-lang-bn="সার্ভারে চাবি সুরক্ষিত">Zero Client-Side Keys</span></li>
          <li><span class="text-muted" data-lang-en="Strict WCAG 2.2 AA Contrast" data-lang-bn="WCAG 2.2 AA অ্যাক্সেসিবিলিটি">Strict WCAG 2.2 AA Contrast</span></li>
        </ul>
      </div>
    </div>

    <div class="pt-8 border-t border-subtle flex flex-col sm:flex-row items-center justify-between text-xs text-muted">
      <p>© 2026 nagad-sdk Contributors. Built with TypeScript, Tailwind CSS, and Web Standards.</p>
      <p class="mt-2 sm:mt-0">Repository: <a href="https://github.com/iamtashanto/Nagad" target="_blank" rel="noopener noreferrer" class="text-teal-600 dark:text-teal-400 hover:underline">github.com/iamtashanto/Nagad</a></p>
    </div>
  </div>
</footer>
`;

// Build Homepage (index.html)
function buildHomePage() {
  const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>nagad-sdk — Unofficial Open-Source Nagad Payment Gateway SDK</title>
  <meta name="description" content="Zero-runtime-dependency TypeScript SDK for Nagad (Bangladesh) payments: nagad-server and nagad-client. Dead-simple setup, deep security control.">
  <link rel="canonical" href="${SITE_URL}/">
  ${robotsMeta}

  <!-- Open Graph / Social -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/">
  <meta property="og:title" content="nagad-sdk — Enterprise Nagad Payment Gateway SDK">
  <meta property="og:description" content="Zero-dependency TypeScript library for Nagad MFS payments. Built for Node.js, Express, Next.js, and React Native.">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Favicon placeholder (pure SVG) -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230D9488'/><text x='50%' y='65%' font-size='60' font-weight='bold' fill='white' text-anchor='middle'>N</text></svg>">

  <link rel="stylesheet" href="${BASE_PATH}css/output.css">
  ${inlineThemeScript}
</head>
<body class="antialiased selection:bg-teal-500/20 selection:text-teal-400">
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-600 focus:text-white focus:rounded-md">
    Skip to main content
  </a>

  ${navbarHtml}

  <!-- Pre-release Alpha Notification Banner -->
  <aside class="bg-teal-950/40 border-b border-teal-500/20 text-teal-200 text-xs py-2 px-4 text-center" aria-label="Pre-release Notice">
    <div class="max-w-7xl mx-auto flex items-center justify-center space-x-2">
      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">Pre-release / Alpha</span>
      <span data-lang-en="nagad-server and nagad-client are currently under active design and initial development. Packages are not yet published to npm." data-lang-bn="nagad-server এবং nagad-client বর্তমানে সক্রিয় ডিজাইন ও প্রাথমিক ডেভেলপমেন্টে রয়েছে। প্যাকেজগুলো এখনও npm-এ প্রকাশিত হয়নি।">
        nagad-server and nagad-client are currently under active design and initial development. Packages are not yet published to npm.
      </span>
    </div>
  </aside>

  <main id="main-content">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-24 overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 blur-[100px] pointer-events-none rounded-full"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <!-- Status Pill -->
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-700 dark:text-teal-300 text-xs font-medium mb-8">
          <span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
          <span data-lang-en="Open-Source MIT Monorepo for Nagad Payments" data-lang-bn="নগদ পেমেন্টের জন্য ওপেন সোর্স এমআইটি লাইব্রেরি">Open-Source MIT Monorepo for Nagad Payments</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-primary max-w-4xl mx-auto leading-tight sm:leading-tight">
          <span data-lang-en="Zero-Dependency Nagad Payment SDK for" data-lang-bn="শূন্য ডিপেন্ডেন্সিতে দ্রুত ও নিরাপদ">Zero-Dependency Nagad Payment SDK for</span>
          <span class="bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-300 bg-clip-text text-transparent">Modern TypeScript</span>
        </h1>

        <p class="mt-6 text-lg sm:text-xl text-secondary max-w-2xl mx-auto leading-relaxed" data-lang-en="Dead-simple setup for beginners, deep cryptographic control for enterprise backends. Secure server-side verification, headless client state machine, and zero client-side keys." data-lang-bn="নতুনদের জন্য সহজ সেটআপ, এন্টারপ্রাইজ ব্যাকএন্ডের জন্য গভীর ক্রিপ্টোগ্রাফিক নিয়ন্ত্রণ। নিরাপদ সার্ভার ভেরিফিকেশন, হেডলেস ক্লায়েন্ট স্টেট মেশিন এবং ক্লায়েন্ট থেকে চাবি সম্পূর্ণরূপে সুরক্ষিত।">
          Dead-simple setup for beginners, deep cryptographic control for enterprise backends. Secure server-side verification, headless client state machine, and zero client-side keys.
        </p>

        <!-- Pre-release Install Box -->
        <div class="mt-10 max-w-xl mx-auto">
          <div class="rounded-2xl border border-subtle bg-surface shadow-card p-3 sm:p-4 text-left">
            <div class="flex items-center justify-between pb-3 border-b border-subtle">
              <!-- PM Tabs -->
              <div class="flex space-x-1" role="tablist" aria-label="Package Manager">
                <button type="button" data-pm="pnpm" class="px-2.5 py-1 text-xs font-medium rounded-md border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300">pnpm</button>
                <button type="button" data-pm="npm" class="px-2.5 py-1 text-xs font-medium rounded-md border border-transparent text-secondary hover:text-primary">npm</button>
                <button type="button" data-pm="yarn" class="px-2.5 py-1 text-xs font-medium rounded-md border border-transparent text-secondary hover:text-primary">yarn</button>
                <button type="button" data-pm="bun" class="px-2.5 py-1 text-xs font-medium rounded-md border border-transparent text-secondary hover:text-primary">bun</button>
              </div>

              <!-- Pre-release tag -->
              <span class="text-[11px] font-medium text-muted">(Coming to npm soon)</span>
            </div>

            <!-- Install snippets -->
            <div class="mt-3 flex items-center justify-between font-mono text-sm px-2 py-1.5 rounded-lg bg-surface-elevated">
              <span id="install-pnpm" data-pm-snippet="pnpm" class="text-primary truncate">pnpm add nagad-server@alpha nagad-client@alpha</span>
              <span id="install-npm" data-pm-snippet="npm" class="text-primary truncate hidden">npm install nagad-server@alpha nagad-client@alpha</span>
              <span id="install-yarn" data-pm-snippet="yarn" class="text-primary truncate hidden">yarn add nagad-server@alpha nagad-client@alpha</span>
              <span id="install-bun" data-pm-snippet="bun" class="text-primary truncate hidden">bun add nagad-server@alpha nagad-client@alpha</span>

              <button type="button" data-copy-target="install-pnpm" class="ml-2 p-1.5 rounded hover:bg-surface text-secondary transition-colors shrink-0" aria-label="Copy install command">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Action CTAs -->
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="${BASE_PATH}docs/" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900" data-lang-en="Read Architecture & Docs" data-lang-bn="আর্কিটেকচার ও ডকুমেন্টেশন">
            Read Architecture & Docs
          </a>
          <a href="${BASE_PATH}playground/" class="w-full sm:w-auto px-6 py-3 rounded-xl border border-subtle bg-surface hover:bg-surface-elevated text-primary font-medium transition-colors" data-lang-en="Explore Payment Flow" data-lang-bn="পেমেন্ট ফ্লো দেখুন">
            Explore Payment Flow
          </a>
        </div>
      </div>
    </section>

    <!-- Production Prerequisites Spotlight -->
    <section class="py-16 bg-surface-elevated/40 border-y border-subtle">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Production Reliability</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-primary mt-2" data-lang-en="Two Non-Negotiable Prerequisites for Nagad Live Integration" data-lang-bn="লাইভ নগদে যাওয়ার আগে দুটি অপরিহার্য শর্ত">
            Two Non-Negotiable Prerequisites for Nagad Live Integration
          </h2>
          <p class="text-sm text-secondary mt-3" data-lang-en="Unlike standard REST payment gateways, Nagad enforces strict network-layer and cryptographic constraints that trip up most developers." data-lang-bn="সাধারণ পেমেন্ট গেটওয়ের তুলনায় নগদের নেটওয়ার্ক এবং ক্রিপ্টোগ্রাফিক সুরক্ষা অত্যন্ত কঠোর। এই দুটি বিষয় নিশ্চিত না করলে লাইভ ট্রানজ্যাকশন কাজ করবে না।">
            Unlike standard REST payment gateways, Nagad enforces strict network-layer and cryptographic constraints that trip up most developers.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Card 1: Server IP Whitelisting -->
          <div class="rounded-2xl border border-subtle bg-surface p-6 sm:p-8 shadow-card flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold mb-5 border border-teal-500/20">
                <span>01</span>
              </div>
              <h3 class="text-xl font-bold text-primary" data-lang-en="1. Server Egress IPv4 Whitelisting" data-lang-bn="১. সার্ভারের পাবলিক আইপি হোয়াইটলিস্টিং">
                1. Server Egress IPv4 Whitelisting
              </h3>
              <p class="text-sm text-secondary mt-3 leading-relaxed" data-lang-en="Nagad's API gateway verifies every incoming request against a pre-registered static IP list. The merchant must register their production server's public egress IPv4 in the Nagad Merchant Portal, and the client library must pass it in the mandatory X-KM-IP-V4 HTTP header. Requests from unlisted IPs or dynamic cloud IPs (like serverless functions without fixed NAT gateways) are immediately rejected by Nagad with security errors." data-lang-bn="নগদ গেটওয়ে প্রতিটি রিকোয়েস্টে মার্চেন্টের পূর্বনিবন্ধিত স্ট্যাটিক পাবলিক আইপি যাচাই করে। মার্চেন্ট পোর্টালে এই আইপি নথিভুক্ত থাকতে হয় এবং X-KM-IP-V4 হেডারে তা পাঠাতে হয়। আইপি মিল না থাকলে বা ডাইনামিক ক্লাউড আইপি থেকে রিকোয়েস্ট গেলে নগদের সিকিউরিটি সিস্টেম তা সাথে সাথে বাতিল করে দেয়।">
                Nagad's API gateway verifies every incoming request against a pre-registered static IP list. The merchant must register their production server's public egress IPv4 in the Nagad Merchant Portal, and the client library must pass it in the mandatory <code class="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-elevated text-primary">X-KM-IP-V4</code> HTTP header. Requests from unlisted IPs or dynamic cloud IPs (like serverless functions without fixed NAT gateways) are immediately rejected by Nagad with security errors.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-subtle text-xs text-muted flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-teal-500"></span>
              <span>Supported in nagad-server via automatic egress resolution or explicit config</span>
            </div>
          </div>

          <!-- Card 2: Node.js PKCS#1 v1.5 Decryption (CVE-2023-46809) -->
          <div class="rounded-2xl border border-subtle bg-surface p-6 sm:p-8 shadow-card flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold mb-5 border border-teal-500/20">
                <span>02</span>
              </div>
              <h3 class="text-xl font-bold text-primary" data-lang-en="2. Node.js RSA PKCS#1 v1.5 Compatibility (CVE-2023-46809)" data-lang-bn="২. নোড জেএস RSA PKCS#1 v1.5 ক্রিপ্টো সামঞ্জস্য">
                2. Node.js RSA PKCS#1 v1.5 Compatibility (CVE-2023-46809)
              </h3>
              <p class="text-sm text-secondary mt-3 leading-relaxed" data-lang-en="Nagad uses RSA PKCS#1 v1.5 padding to encrypt sensitive response payloads. Starting in Node.js 20 and 21, OpenSSL mitigations against Marvin timing attacks introduced stricter PKCS#1 padding validations that can cause silent decryption mismatches if keys or ciphertext boundaries differ slightly. nagad-server handles key format normalization and safe PKCS#1 decryption under Node.js runtime crypto, isolating developers from OpenSSL subtleties." data-lang-bn="নগদ তাদের সেনসিটিভ রেসপন্স ডাটা এনক্রিপ্ট করার জন্য RSA PKCS#1 v1.5 প্যাডিং ব্যবহার করে। নোড জেএস ২০+ সংস্করণে মার্ভিন অ্যাটাক প্রতিহত করতে ওপেনএসএসএল প্যাডিং যাচাইকরণ আরও কঠোর করেছে। nagad-server চাবির ফরম্যাট ঠিক রেখে নিরাপদ ডিক্রিপশন পরিচালনা করে যাতে ডেভেলপারদের লো-লেভেল ক্রিপ্টো জটিলতায় পড়তে না হয়।">
                Nagad uses RSA PKCS#1 v1.5 padding to encrypt sensitive response payloads. Starting in Node.js 20 and 21, OpenSSL mitigations against Marvin timing attacks introduced stricter PKCS#1 padding validations that can cause silent decryption mismatches if keys or ciphertext boundaries differ slightly. <code class="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-elevated text-primary">nagad-server</code> handles key format normalization and safe PKCS#1 decryption under Node.js runtime crypto, isolating developers from OpenSSL subtleties.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-subtle text-xs text-muted flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-teal-500"></span>
              <span>Fully normalized in our zero-dependency CryptoProvider</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Payment Flow Sequence (Inline SVG Visual) -->
    <section class="py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Architecture</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-primary mt-2" data-lang-en="How Nagad Handshake Works" data-lang-bn="নগদ পেমেন্ট হ্যান্ডশেক কীভাবে কাজ করে">
            How Nagad Handshake Works
          </h2>
          <p class="text-sm text-secondary mt-3" data-lang-en="Understanding the boundary between your server, the customer browser, and the Nagad Payment Gateway." data-lang-bn="আপনার ব্যাকএন্ড, গ্রাহকের ব্রাউজার এবং নগদ গেটওয়ের সংযোগ কাঠামো।">
            Understanding the boundary between your server, the customer browser, and the Nagad Payment Gateway.
          </p>
        </div>

        <!-- Interactive Diagram Box -->
        <div class="rounded-2xl border border-subtle bg-surface p-6 sm:p-10 shadow-card overflow-x-auto">
          <div class="min-w-[700px] flex flex-col space-y-6">
            <!-- Diagram Steps -->
            <div class="grid grid-cols-4 gap-4 text-center font-mono text-xs pb-4 border-b border-subtle">
              <div class="font-bold text-primary">1. Customer / App</div>
              <div class="font-bold text-teal-700 dark:text-teal-400">2. Merchant Backend (nagad-server)</div>
              <div class="font-bold text-primary">3. Nagad Gateway API</div>
              <div class="font-bold text-primary">4. Nagad Hosted Checkout</div>
            </div>

            <!-- Step 1 -->
            <div class="flex items-center space-x-3 text-xs">
              <span class="px-2 py-1 rounded bg-surface-elevated font-mono font-bold text-muted">01</span>
              <div class="flex-1 p-3 rounded-xl bg-surface-elevated border border-subtle text-secondary">
                <span class="font-semibold text-primary">Initiate Checkout:</span> Customer clicks "Pay with Nagad". Client calls merchant endpoint <code class="font-mono text-xs">/api/payment/create</code>.
              </div>
            </div>

            <!-- Step 2 -->
            <div class="flex items-center space-x-3 text-xs">
              <span class="px-2 py-1 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 font-mono font-bold">02</span>
              <div class="flex-1 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 text-secondary">
                <span class="font-semibold text-primary">Two-Step RSA Handshake:</span> <code class="font-mono text-xs">nagad-server</code> initializes session and places order with Nagad API using RSA-PKCS1 encryption and RSA-SHA256 digital signature. Nagad returns hosted payment URL.
              </div>
            </div>

            <!-- Step 3 -->
            <div class="flex items-center space-x-3 text-xs">
              <span class="px-2 py-1 rounded bg-surface-elevated font-mono font-bold text-muted">03</span>
              <div class="flex-1 p-3 rounded-xl bg-surface-elevated border border-subtle text-secondary">
                <span class="font-semibold text-primary">Customer Authorization:</span> Browser redirects to Nagad-hosted portal. Customer enters wallet number, SMS OTP, and 4-digit PIN. <em>(Merchant never touches credentials)</em>.
              </div>
            </div>

            <!-- Step 4 -->
            <div class="flex items-center space-x-3 text-xs">
              <span class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold">04</span>
              <div class="flex-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-secondary">
                <span class="font-semibold text-primary">Callback & Mandatory Server Verification:</span> Nagad redirects to callback URL. Merchant backend validates payment via <code class="font-mono text-xs">nagad.checkout.verify()</code>, verifying amount, currency, and order ID before confirming fulfillment.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quickstart Code Tabs (Preview) -->
    <section class="py-16 bg-surface-elevated/30 border-t border-subtle">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-10">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Clean Developer Experience</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-primary mt-2">10-Line Integration Architecture</h2>
          <p class="text-sm text-secondary mt-2">Designed to fit cleanly in modern web frameworks with zero boilerplate.</p>
        </div>

        <div class="max-w-4xl mx-auto rounded-2xl border border-subtle bg-surface shadow-card overflow-hidden" data-tabs-group>
          <!-- Framework Navigation Tabs -->
          <div class="flex border-b border-subtle bg-surface-elevated px-4 pt-3 overflow-x-auto space-x-2" role="tablist">
            <button type="button" data-tab-target="tab-express" class="px-3.5 py-2 text-xs font-medium border-b-2 border-teal-500 text-teal-700 dark:text-teal-400 active-tab focus:outline-none">Node / Express</button>
            <button type="button" data-tab-target="tab-next" class="px-3.5 py-2 text-xs font-medium border-b-2 border-transparent text-secondary hover:text-primary focus:outline-none">Next.js App Router</button>
            <button type="button" data-tab-target="tab-react" class="px-3.5 py-2 text-xs font-medium border-b-2 border-transparent text-secondary hover:text-primary focus:outline-none">React Hook</button>
            <button type="button" data-tab-target="tab-rn" class="px-3.5 py-2 text-xs font-medium border-b-2 border-transparent text-secondary hover:text-primary focus:outline-none">React Native WebView</button>
          </div>

          <!-- Code Snippet Panels -->
          <div class="p-6 font-mono text-xs leading-relaxed overflow-x-auto">
            <!-- Express Tab -->
            <div data-tab-panel="tab-express">
              <pre class="text-secondary"><span class="text-teal-700 dark:text-teal-400 font-bold">import</span> { createNagad } <span class="text-teal-700 dark:text-teal-400 font-bold">from</span> <span class="text-emerald-700 dark:text-emerald-400">'nagad-server'</span>;
<span class="text-teal-700 dark:text-teal-400 font-bold">import</span> express <span class="text-teal-700 dark:text-teal-400 font-bold">from</span> <span class="text-emerald-700 dark:text-emerald-400">'express'</span>;

<span class="text-muted">// Explicit config loading (or read from environment variables)</span>
<span class="text-teal-700 dark:text-teal-400 font-bold">const</span> nagad = createNagad({
  merchantId: process.env.NAGAD_MERCHANT_ID!,
  merchantPrivateKey: process.env.NAGAD_PRIVATE_KEY!,
  pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY!,
  baseUrl: process.env.NAGAD_BASE_URL!,
});
<span class="text-teal-700 dark:text-teal-400 font-bold">const</span> app = express();

<span class="text-muted">// 1. Initiate checkout session (alphanumeric order ID)</span>
app.post(<span class="text-emerald-700 dark:text-emerald-400">'/api/payment/create'</span>, <span class="text-teal-700 dark:text-teal-400 font-bold">async</span> (req, res) => {
  <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> session = <span class="text-teal-700 dark:text-teal-400 font-bold">await</span> nagad.checkout.create({
    orderId: <span class="text-emerald-700 dark:text-emerald-400">'ORD'</span> + Date.now(),
    amount: <span class="text-emerald-700 dark:text-emerald-400">'1250.00'</span>,
    callbackUrl: <span class="text-emerald-700 dark:text-emerald-400">'https://merchant.com/api/payment/callback'</span>,
  });
  res.json({ url: session.callBackUrl });
});

<span class="text-muted">// 2. Verify payment on callback</span>
app.get(<span class="text-emerald-700 dark:text-teal-400 font-bold">'/api/payment/callback'</span>, <span class="text-teal-700 dark:text-teal-400 font-bold">async</span> (req, res) => {
  <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> payment = <span class="text-teal-700 dark:text-teal-400 font-bold">await</span> nagad.checkout.verify({
    paymentRefId: req.query.payment_ref_id,
    expectedAmount: <span class="text-emerald-700 dark:text-emerald-400">'1250.00'</span>,
    expectedOrderId: req.query.order_id,
  });
  res.redirect(<span class="text-emerald-700 dark:text-emerald-400">\`/payment/status?order=\${payment.orderId}&status=success\`</span>);
});</pre>
            </div>

            <!-- Next.js Tab -->
            <div data-tab-panel="tab-next" class="hidden">
              <pre class="text-secondary"><span class="text-muted">// app/api/payment/create/route.ts</span>
<span class="text-teal-700 dark:text-teal-400 font-bold">import</span> { createNagad } <span class="text-teal-700 dark:text-teal-400 font-bold">from</span> <span class="text-emerald-700 dark:text-emerald-400">'nagad-server'</span>;
<span class="text-teal-700 dark:text-teal-400 font-bold">import</span> { NextResponse } <span class="text-teal-700 dark:text-teal-400 font-bold">from</span> <span class="text-emerald-700 dark:text-emerald-400">'next/server'</span>;

<span class="text-teal-700 dark:text-teal-400 font-bold">const</span> nagad = createNagad({
  merchantId: process.env.NAGAD_MERCHANT_ID!,
  merchantPrivateKey: process.env.NAGAD_PRIVATE_KEY!,
  pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY!,
  baseUrl: process.env.NAGAD_BASE_URL!,
});

<span class="text-teal-700 dark:text-teal-400 font-bold">export async function</span> POST(request: Request) {
  <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> { orderId, amount } = <span class="text-teal-700 dark:text-teal-400 font-bold">await</span> request.json();
  <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> session = <span class="text-teal-700 dark:text-teal-400 font-bold">await</span> nagad.checkout.create({
    orderId,
    amount,
    callbackUrl: <span class="text-emerald-700 dark:text-emerald-400">\`\${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback\`</span>,
  });
  <span class="text-teal-700 dark:text-teal-400 font-bold">return</span> NextResponse.json({ url: session.callBackUrl });
}</pre>
            </div>

            <!-- React Hook Tab -->
            <div data-tab-panel="tab-react" class="hidden">
              <pre class="text-secondary"><span class="text-teal-700 dark:text-teal-400 font-bold">import</span> { useNagadCheckout } <span class="text-teal-700 dark:text-teal-400 font-bold">from</span> <span class="text-emerald-700 dark:text-emerald-400">'nagad-client/react'</span>;

<span class="text-teal-700 dark:text-teal-400 font-bold">export function</span> CheckoutButton() {
  <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> { initiate, isLoading } = useNagadCheckout();

  <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> handlePay = <span class="text-teal-700 dark:text-teal-400 font-bold">async</span> () => {
    <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> res = <span class="text-teal-700 dark:text-teal-400 font-bold">await</span> fetch(<span class="text-emerald-700 dark:text-emerald-400">'/api/payment/create'</span>, { method: <span class="text-emerald-700 dark:text-emerald-400">'POST'</span> });
    <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> { url } = <span class="text-teal-700 dark:text-teal-400 font-bold">await</span> res.json();
    initiate(url);
  };

  <span class="text-teal-700 dark:text-teal-400 font-bold">return</span> (
    &lt;<span class="text-teal-700 dark:text-teal-400 font-bold">button</span> onClick={handlePay} disabled={isLoading}&gt;
      {isLoading ? <span class="text-emerald-700 dark:text-emerald-400">'Connecting to Nagad...'</span> : <span class="text-emerald-700 dark:text-emerald-400">'Pay with Nagad'</span>}
    &lt;/<span class="text-teal-700 dark:text-teal-400 font-bold">button</span>&gt;
  );
}</pre>
            </div>

            <!-- React Native Tab -->
            <div data-tab-panel="tab-rn" class="hidden">
              <pre class="text-secondary"><span class="text-teal-700 dark:text-teal-400 font-bold">import</span> { WebView } <span class="text-teal-700 dark:text-teal-400 font-bold">from</span> <span class="text-emerald-700 dark:text-emerald-400">'react-native-webview'</span>;
<span class="text-teal-700 dark:text-teal-400 font-bold">import</span> { createWebViewNavigationHandler } <span class="text-teal-700 dark:text-teal-400 font-bold">from</span> <span class="text-emerald-700 dark:text-emerald-400">'nagad-client/react-native'</span>;

<span class="text-teal-700 dark:text-teal-400 font-bold">export function</span> NagadPaymentScreen({ route, navigation }) {
  <span class="text-teal-700 dark:text-teal-400 font-bold">const</span> handler = createWebViewNavigationHandler({
    callbackUrl: <span class="text-emerald-700 dark:text-emerald-400">'https://merchant.com/api/payment/callback'</span>,
    onSuccess: (result) => navigation.navigate(<span class="text-emerald-700 dark:text-emerald-400">'OrderSuccess'</span>, result),
    onClose: () => navigation.goBack(),
  });

  <span class="text-teal-700 dark:text-teal-400 font-bold">return</span> (
    &lt;<span class="text-teal-700 dark:text-teal-400 font-bold">WebView</span>
      source={{ uri: route.params.paymentUrl }}
      onShouldStartLoadWithRequest={handler.onShouldStartLoadWithRequest}
      onNavigationStateChange={handler.onNavigationStateChange}
    /&gt;
  );
}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature Matrix (Driven by status.json) -->
    <section class="py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Feature Status</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-primary mt-2">Implementation & Roadmap Matrix</h2>
          <p class="text-sm text-secondary mt-3">We document strictly what exists today versus what is planned. No fictional APIs.</p>
        </div>

        <div class="rounded-2xl border border-subtle bg-surface shadow-card overflow-hidden">
          <table class="w-full text-left text-sm">
            <thead class="bg-surface-elevated border-b border-subtle font-mono text-xs text-muted uppercase">
              <tr>
                <th scope="col" class="py-3.5 px-4 sm:px-6">Feature</th>
                <th scope="col" class="py-3.5 px-4 sm:px-6">Package</th>
                <th scope="col" class="py-3.5 px-4 sm:px-6">Status</th>
                <th scope="col" class="py-3.5 px-4 sm:px-6 hidden sm:table-cell">Implementation Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-subtle">
              ${Object.entries(statusData.features)
                .map(([key, item]) => {
                  let statusBadge = "";
                  if (item.status === "stable") {
                    statusBadge =
                      '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">Stable</span>';
                  } else if (item.status === "verified-sandbox-e2e") {
                    statusBadge =
                      '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">Verified Sandbox E2E</span>';
                  } else if (item.status === "beta") {
                    statusBadge =
                      '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">Beta</span>';
                  } else if (item.status === "experimental") {
                    statusBadge =
                      '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">Experimental</span>';
                  } else if (item.status === "planned") {
                    statusBadge =
                      '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">Planned</span>';
                  } else {
                    statusBadge =
                      '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">Unverified / Portal Only</span>';
                  }

                  return `
                  <tr class="hover:bg-surface-elevated/40 transition-colors">
                    <td class="py-3.5 px-4 sm:px-6 font-medium text-primary">${item.name}</td>
                    <td class="py-3.5 px-4 sm:px-6 font-mono text-xs text-muted">${item.package}</td>
                    <td class="py-3.5 px-4 sm:px-6">${statusBadge}</td>
                    <td class="py-3.5 px-4 sm:px-6 text-xs text-secondary hidden sm:table-cell">${item.notes || ""}<br><span class="opacity-80">Evidence: ${item.evidence || "-"}</span></td>
                  </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </main>

  ${footerHtml}

  <script type="module" src="${BASE_PATH}js/main.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, "index.html"), html, "utf-8");
}

// Build 404 Page
function build404Page() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404: Page Not Found — nagad-sdk</title>
  ${robotsMeta}
  <link rel="stylesheet" href="${BASE_PATH}css/output.css">
  ${inlineThemeScript}
</head>
<body class="antialiased min-h-screen flex flex-col justify-between">
  ${navbarHtml}

  <main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center flex flex-col items-center justify-center">
    <div class="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center font-mono font-bold text-2xl border border-teal-500/20 mb-6">
      404
    </div>
    <h1 class="text-3xl sm:text-4xl font-extrabold text-primary" data-lang-en="Page Not Found" data-lang-bn="পৃষ্ঠাটি পাওয়া যায়নি">Page Not Found</h1>
    <p class="mt-4 text-sm text-secondary max-w-md" data-lang-en="The requested page could not be located. If you followed a link from the documentation, please open an issue so we can fix it." data-lang-bn="অনুরোধ করা পৃষ্ঠাটি পাওয়া যায়নি। আপনি যদি কোনো লিংকে ক্লিক করে থাকেন, তবে ফেজ সি ও ডি গাইডগুলো প্রকাশের জন্য অপেক্ষা করুন।">
      The requested page could not be located. If you followed a link from the documentation, please open an issue so we can fix it.
    </p>
    <div class="mt-8">
      <a href="${BASE_PATH}" class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors" data-lang-en="Return to Home" data-lang-bn="হোম পেজে ফিরে যান">
        Return to Home
      </a>
    </div>
  </main>

  ${footerHtml}
  <script type="module" src="${BASE_PATH}js/main.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, "404.html"), html, "utf-8");
}

// ---------------------------------------------------------------------------
// Documentation: Markdown in website/docs -> dist/docs/<slug>/index.html
// ---------------------------------------------------------------------------
const docsDir = path.resolve(rootDir, "docs");
const errorCodes = JSON.parse(
  fs.readFileSync(path.join(srcDir, "data", "error-codes.json"), "utf-8"),
);
let docPages = [];

const escapeHtml = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function statusTableHtml() {
  return `<div class="overflow-x-auto"><table><thead><tr><th>Feature</th><th>Package</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${Object.values(
    statusData.features,
  )
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.name)}</td><td><code>${escapeHtml(f.package)}</code></td><td><span class="status-pill status-${f.status}">${escapeHtml(f.status)}</span></td><td>${escapeHtml(f.evidence || "")}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}

function errorTableHtml() {
  return `<div class="overflow-x-auto"><table><thead><tr><th>Nagad code</th><th>SDK error class</th><th>Meaning</th><th>What to do</th></tr></thead><tbody>${errorCodes
    .map(
      (e) =>
        `<tr><td><code>${escapeHtml(e.code)}</code></td><td><code>${escapeHtml(e.errorClass)}</code></td><td>${escapeHtml(e.meaning)}</td><td>${escapeHtml(e.fix)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}

function parseFrontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { data, body: raw.slice(m[0].length) };
}

function slugify(t) {
  const slug = t
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return /^[a-z]/.test(slug) ? slug : `s-${slug}`;
}

function renderMarkdown(body) {
  const toc = [];
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = slugify(text);
    if (depth === 2 || depth === 3)
      toc.push({ depth, id, text: text.replace(/<[^>]+>/g, "") });
    return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to this section">#</a>${text}</h${depth}>\n`;
  };
  renderer.code = function ({ text, lang }) {
    const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    return `<pre class="code-block"><code${cls}>${escapeHtml(text)}</code></pre>\n`;
  };
  const baseTable = renderer.table.bind(renderer);
  renderer.table = function (token) {
    return `<div class="overflow-x-auto">${baseTable(token)}</div>`;
  };
  let html = marked.parse(
    body
      .replace("{{STATUS_TABLE}}", "@@STATUS_TABLE@@")
      .replace("{{ERROR_TABLE}}", "@@ERROR_TABLE@@"),
    { renderer, gfm: true },
  );
  html = html
    .replace(/disabled=""/g, "disabled")
    .replace(/href="\.\.\/([a-z-]+)\//g, `href="${BASE_PATH}docs/$1/`)
    .replace(/<p>@@STATUS_TABLE@@<\/p>|@@STATUS_TABLE@@/, statusTableHtml())
    .replace(/<p>@@ERROR_TABLE@@<\/p>|@@ERROR_TABLE@@/, errorTableHtml());
  return { html, toc };
}

function buildDocs() {
  if (!fs.existsSync(docsDir)) return;
  docPages = fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, body } = parseFrontMatter(
        fs.readFileSync(path.join(docsDir, f), "utf-8"),
      );
      return {
        slug: path.basename(f, ".md"),
        order: Number(data.order ?? 99),
        title: data.title || f,
        description: data.description || "",
        section: data.section || "Guides",
        body,
      };
    })
    .sort((a, b) => a.order - b.order);

  const sections = [...new Set(docPages.map((d) => d.section))];
  for (const doc of docPages) {
    const { html, toc } = renderMarkdown(doc.body);
    const href = (d) =>
      `${BASE_PATH}docs/${d.slug === "index" ? "" : d.slug + "/"}`;
    const nav = sections
      .map(
        (sec) =>
          `<div class="mb-5"><p class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">${escapeHtml(sec)}</p><ul class="space-y-1">${docPages
            .filter((d) => d.section === sec)
            .map(
              (d) =>
                `<li><a href="${href(d)}" class="block px-2 py-1 rounded-md text-sm ${d.slug === doc.slug ? "bg-accent-surface font-semibold" : "text-secondary hover:text-primary"}"${d.slug === doc.slug ? ' aria-current="page"' : ""}>${escapeHtml(d.title)}</a></li>`,
            )
            .join("")}</ul></div>`,
      )
      .join("");
    const tocHtml = toc.length
      ? `<nav aria-label="On this page" class="hidden xl:block w-56 shrink-0"><div class="sticky top-24 text-sm"><p class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">On this page</p><ul class="space-y-1">${toc
          .map(
            (t) =>
              `<li class="${t.depth === 3 ? "pl-3" : ""}"><a class="text-secondary hover:text-primary" href="#${t.id}">${t.text}</a></li>`,
          )
          .join("")}</ul></div></nav>`
      : "";
    const canonical = `${SITE_URL}/docs/${doc.slug === "index" ? "" : doc.slug + "/"}`;
    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.title)} — nagad-sdk</title>
  <meta name="description" content="${escapeHtml(doc.description)}">
  <link rel="canonical" href="${canonical}">
  ${robotsMeta}
  <link rel="stylesheet" href="${BASE_PATH}css/output.css">
  <link rel="stylesheet" href="${BASE_PATH}css/docs.css">
  ${inlineThemeScript}
</head>
<body class="antialiased min-h-screen flex flex-col">
  ${navbarHtml}
  <div class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
    <aside class="hidden lg:block w-60 shrink-0" aria-label="Documentation"><div class="sticky top-24">${nav}</div></aside>
    <main id="main-content" class="min-w-0 flex-1">
      <details class="lg:hidden mb-6 rounded-lg border border-subtle p-3"><summary class="cursor-pointer text-sm font-semibold">Documentation menu</summary><div class="mt-3">${nav}</div></details>
      <article class="docs-prose">${html}</article>
      <p class="mt-10 text-xs text-muted">Found a mistake? <a class="underline" href="https://github.com/iamtashanto/Nagad/edit/main/website/docs/${doc.slug}.md">Edit this page on GitHub</a>. Unofficial community project, not affiliated with Nagad or Third Wave Technologies Ltd.</p>
    </main>
    ${tocHtml}
  </div>
  ${footerHtml}
  <script type="module" src="${BASE_PATH}js/main.js"></script>
</body>
</html>`;
    const out = path.join(
      distDir,
      "docs",
      doc.slug === "index" ? "" : doc.slug,
      "index.html",
    );
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, page, "utf-8");
  }
  fs.copyFileSync(
    path.join(srcDir, "styles", "docs.css"),
    path.join(distDir, "css", "docs.css"),
  );
  console.log(`   ✓ Rendered ${docPages.length} documentation pages`);
}

// Build clean placeholder landing pages for docs, playground, examples, changelog
// Generate sitemap.xml
function buildSitemap() {
  const pages = [
    "",
    ...docPages.map((d) => (d.slug === "index" ? "docs/" : `docs/${d.slug}/`)),
  ];
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}/${p}</loc>
    <changefreq>weekly</changefreq>
    <priority>${p === "" ? "1.0" : "0.8"}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemapContent, "utf-8");
}

// Generate robots.txt
function buildRobotsTxt() {
  const content = SITE_INDEXABLE
    ? `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`;

  fs.writeFileSync(path.join(distDir, "robots.txt"), content, "utf-8");
}

// Write .nojekyll for GitHub Pages
function writeNoJekyll() {
  fs.writeFileSync(path.join(distDir, ".nojekyll"), "", "utf-8");
}

// Execute builders
buildHomePage();
build404Page();
buildDocs();
buildSitemap();
buildRobotsTxt();
writeNoJekyll();

console.log("✅ Website build completed successfully!");
console.log(`   Output directory: ${distDir}`);
