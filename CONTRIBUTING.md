# Contributing to SORAI ESPORTS Web

Thank you for your interest in contributing to the **SORAI ESPORTS Web Frontend**! We are thrilled to welcome you to our community. Before you start, please take a moment to read through this document to understand the contribution process.

---

## How to Contribute

1. **Fork** the [SORAI ESPORTS Web repository](https://github.com/STUDIO-SORAI/esports-web) to your own GitHub account.
2. **Clone** your fork to your local machine:
   ```bash
   # HTTPS
   git clone https://github.com/<YOUR_GITHUB_USERNAME>/esports-web.git

   # SSH
   git clone git@github.com:<YOUR_GITHUB_USERNAME>/esports-web.git

   # GitHub CLI
   gh repo clone <YOUR_GITHUB_USERNAME>/esports-web
   ```
3. **Change directory** to the project:
   ```bash
   cd esports-web
   ```
4. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b <BRANCH_NAME>
   ```
5. **Install dependencies and start development**:
   ```bash
   pnpm install
   cp .env.example .env
   pnpm dev
   ```
6. **Make your changes** and ensure everything compiles and passes all tests:
   ```bash
   pnpm test
   pnpm build
   ```
7. **Stage and commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add support for new tournament embed"
   ```
8. **Push** to your fork and **open a Pull Request** against the `main` branch of `STUDIO-SORAI/esports-web`.

---

## Commit Guidelines

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Rules

- Commit messages must include a clear **type** (e.g. `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`).
- Commit messages must start with a **lowercase letter** (e.g. `fix: resolve mobile layout overflow`).
- Commit messages must **not end with a period** `.`.
- Commit messages must be written in **English**.
- (Recommended) Commits should be [GPG/SSH signed](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits).

**Examples:**
- `feat: add tournament countdown component`
- `fix: resolve hydration mismatch on dark mode toggle`
- `docs: update payload cms 3 setup instructions`
- `refactor: simplify rich text serializing utilities`

---

## Pull Request Checklist

Before submitting your PR, please make sure:

- [ ] All existing and new unit tests pass (`pnpm test`).
- [ ] The SSR production build completes with zero errors (`pnpm build`).
- [ ] No secrets, private API tokens, or hardcoded IP addresses are committed.
- [ ] Commit messages follow the Conventional Commits specification.

---

## Licensing

By contributing to SORAI ESPORTS Web, you agree that your contributions will be licensed under the [Mozilla Public License 2.0](LICENSE).
