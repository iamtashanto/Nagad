# Release checklist

Release ladder: `0.1.0-alpha.2` → `0.1.0-beta.1` → `0.1.0-rc.1` → stable. Publishing happens only through
`.github/workflows/release.yml` (manual, protected `npm-publish` environment, npm provenance). The `latest`
dist-tag moves to a version only when every **stable gate** below is checked.

## Automated gates (2026-10-27, local runs; CI links added after each push)

| Gate                                       | State                          | Evidence                                        |
| ------------------------------------------ | ------------------------------ | ----------------------------------------------- |
| Typecheck and tests                        | Pass locally                   | 75 tests, Node 22 and 24                        |
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
| Pure-JS crypto fallback verified on Node 18/20 (or Node 22+ only declared)          | Open                                            |
| Independent review of the crypto, verification and session code                     | Open                                            |
| Shadow-mode or pilot results from a real merchant                                   | Open                                            |
| Zero open BLOCKER or HIGH findings                                                  | Open (see `docs/internal/TRIAGE.md`)            |
| npm trusted publishing configured, 2FA on                                           | Owner to configure                              |
| Bangla copy reviewed by a native speaker                                            | Open                                            |

Without all stable gates the website and READMEs keep the pre-release banner and the packages stay on a pre-release tag.

## Support policy (after stable)

- **Supported versions:** the latest minor receives fixes; the previous minor receives security fixes for 90 days.
- **Security contact:** GitHub private vulnerability reporting. Acknowledgement within 3 business days.
- **Deprecation:** a deprecated API stays for at least one minor release with a replacement and a runtime warning.
- **Nagad changes:** the SDK follows information Nagad makes available to merchants; confirmed protocol changes ship as patch releases.
