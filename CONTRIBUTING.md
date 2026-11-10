# Contributing to GameVault

Thanks for helping. This guide covers how to set up the project, what to check before you open a
pull request, and how review works.

## Getting started

Requirements: Node.js 20.9 or newer and npm.

1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/GameVault.git
   cd GameVault
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your change:
   ```bash
   git checkout -b feature/short-description
   ```
5. Start the development server and open [http://localhost:3000](http://localhost:3000):
   ```bash
   npm run dev
   ```

## Code style

- Write TypeScript for application code.
- Follow the ESLint rules: `npm run lint`.
- Keep changes in the style of the surrounding code.

## Tests

- The tests use Node's built-in test runner and live in `test/`. Run them with `npm test`.
- Add or update tests when you change behaviour, especially in the catalogue scripts.
- A new test file must also be added to the `test:catalogue` script in `package.json`, or it will
  not run.

## Before you open a pull request

Run the same checks as the GitHub Actions `validate` job:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Pull requests

- Keep pull requests small and focused on one change.
- Give the pull request a clear title and description, and say how you tested it.
- Link the related issue (for example `Closes #77`).
- Fill in the pull request template.
- Wait for a review. The maintainer may ask for changes before merging.

## Reporting bugs and requesting features

Use the issue templates under **Issues → New issue**. For security problems, do **not** open a
public issue; follow [SECURITY.md](SECURITY.md) instead.

## Code of conduct

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
