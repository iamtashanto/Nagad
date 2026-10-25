# Contributing to Nagad SDK

Thank you for your interest in contributing to the unofficial Nagad SDK!

## Development Guidelines

1. **Clean-Room Confidentiality**:
   - Never commit or paste confidential merchant integration guides, PDFs, real merchant IDs, keys, or proprietary internal documents into the repository.
   - All tests must use dynamically generated throwaway RSA keys via `generateSimulatorKeys()` from `nagad-simulator`.

2. **Security & Gitleaks**:
   - Run `gitleaks dir .` and `gitleaks git` before opening any PR.
   - Pre-commit hooks verify that no credentials or secret keys are committed.

3. **Code Style & Formatting**:
   - Run `npx prettier --write .` to ensure consistent formatting.
   - Run `pnpm run typecheck` and `pnpm test` to verify that all suites pass.

4. **Pull Request Process**:
   - Create a feature branch from `main`.
   - Include test coverage for any new features or bug fixes.
   - Ensure `@arethetypeswrong/cli` and `publint` pass cleanly on package exports.
