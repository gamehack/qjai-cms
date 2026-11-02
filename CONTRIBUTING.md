# Contributing

Thank you for considering a contribution.

## Before opening an issue

- Search existing issues and discussions first.
- Do not post credentials, private URLs, personal data, customer content or production logs.
- For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

Use the Node.js and pnpm versions declared in `package.json`. Follow the [local development instructions](README.md#local-development).

## Checks

Run these checks before submitting a pull request:

```sh
node --test tests/ingest-security.test.mjs
pnpm run typecheck
pnpm run build
pnpm audit --prod --audit-level high
pnpm licenses list --prod
```

Database changes must include a versioned Payload migration. Do not rely on automatic schema push for production databases.

## Pull requests

- Keep changes focused and explain the problem being solved.
- Include tests for security-sensitive behavior and bug fixes.
- Update documentation and environment examples when interfaces change.
- Never add real credentials, production identifiers, private datasets or proprietary prompts.
- Confirm that ingestion remains draft-only and that anonymous users cannot read drafts.
