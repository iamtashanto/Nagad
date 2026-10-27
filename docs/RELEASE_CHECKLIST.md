# Release checklist

Version history: `0.1.0-alpha.1` (deprecated) → `0.1.0` (first release, 2026-10-27). Publishing happens only through
`.github/workflows/release.yml` (manual, protected `npm-publish` environment, npm provenance). The stable gates below are the bar for calling a release production-proven (1.0.0); `0.1.0` ships with the open gates listed in its release notes.

## Automated gates (2026-10-27, local runs; CI links added after each push)

| Gate                                       | State                          | Evidence                                        |
| ------------------------------------------ | ------------------------------ | ----------------------------------------------- |
| Typecheck and tests                        | Pass locally                   | 94 tests, Node 20, 22 and 24                        |
| Handler security regression tests          | Pass                           | `tests/handler-security.test.ts`                |
| Client verify-before-success contract      | Pass                           | `nagad-client/tests/callback-untrusted.test.ts` |
| Error table equals `mapNagadApiError`      | Pass                           | `tests/error-table.test.ts`                     |
| publint and attw                           | Pass in CI (alpha.1 run)       | CI                                              |
| Website build, links and HTML checks       | Pass locally                   | `pnpm check:website`                            |
| Status tables generated from `status.json` | Pass                           | `node website/scripts/gen-status.mjs --check`   |
| Real Redis session store                   | Runs in CI (service container) | CI                                              |

## Stable gates (all required before `latest`)

| Gate                                                                                | State                                           |
| ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| Owner-run Nagad sandbox: initialize, complete, verify with a registered test wallet | **Owner to run** (needs onboarding credentials) |
| Both signature algorithms (SHA-256 and SHA-1) checked against the live gateway      | **Owner to run**                                |
| Production smoke test with a fixed egress IP (and proxy recipe if used)             | **Owner to run**                                |
| Real-device Android and iOS smoke test of the WebView handler                       | **Owner to run**                                |
| Pure-JS crypto fallback verified on Node 18/20                                       | Done (tests on 20, smoke run on 18)             |
| Independent review of the crypto, verification and session code                     | Open                                            |
| Shadow-mode or pilot results from a real merchant                                   | Open                                            |
| Zero open BLOCKER or HIGH findings                                                  | Open (see `docs/internal/TRIAGE.md`)            |
| npm trusted publishing configured, 2FA on                                           | Owner to configure                              |
| Bangla copy reviewed by a native speaker                                            | Open                                            |

Until all stable gates pass, the website and READMEs state that the SDK is not yet validated against the live gateway, and the version stays below 1.0.0.

## Support policy (after stable)

- **Supported versions:** the latest minor receives fixes; the previous minor receives security fixes for 90 days.
- **Security contact:** GitHub private vulnerability reporting. Acknowledgement within 3 business days.
- **Deprecation:** a deprecated API stays for at least one minor release with a replacement and a runtime warning.
- **Nagad changes:** the SDK follows information Nagad makes available to merchants; confirmed protocol changes ship as patch releases.
