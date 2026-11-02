# qjai-cms

An open-source, self-hosted CMS core built with Next.js, Payload CMS and PostgreSQL.

> **Status: Alpha.** This project is under active development. Review authentication, access control, backups, recovery and deployment security before using it with production data.

## What it includes

- A public editorial website with article and category pages.
- Payload CMS administration and authentication.
- PostgreSQL persistence with versioned database migrations.
- An authenticated, idempotent content ingestion API. Imported content is always saved as a draft.
- Editorial review before public publication.
- Docker runtime and one-shot migration build targets.

This repository contains the CMS core only. Upstream collection agents, proprietary prompts and scoring rules, private datasets, production credentials, internal automation and external publishing executors are out of scope.

## Requirements

- Node.js 24.22.1+
- pnpm 10.20.0+
- PostgreSQL 17+

## Quick start

1. Create a PostgreSQL database and the application schema:

   ```sql
   CREATE SCHEMA IF NOT EXISTS qjai_content;
   ```

2. Copy the environment templates:

   ```sh
   cp .env.example .env
   cp .migration.env.example .migration.env
   ```

3. Configure the runtime `.env`:

   - `DATABASE_URL`: least-privilege runtime database connection.
   - `PAYLOAD_SECRET`: a unique, high-entropy secret.
   - `SITE_URL`: public site origin (or localhost for development).
   - `SITE_NAME`: optional display name.
   - `CONTENT_INGEST_TOKEN`: unique token of at least 32 characters.

   Configure a separate migration-role `DATABASE_URL` in `.migration.env`. Never commit either file.

4. Install dependencies and apply migrations:

   ```sh
   pnpm install --frozen-lockfile
   set -a && . ./.migration.env && set +a
   pnpm payload migrate
   ```

5. Start the development server:

   ```sh
   pnpm dev
   ```

6. Open [http://localhost:3000/admin](http://localhost:3000/admin) to initialize the CMS administrator.

Use TLS for remote PostgreSQL connections. Do not grant schema-creation privileges to the runtime database role. Keep migration credentials separate from the long-running application.

## Content ingestion

`POST /api/ingest` accepts authenticated JSON submissions and creates drafts only. It enforces a request-body limit and uses `source + externalId` for idempotency. Replayed submissions do not overwrite editorial changes. The endpoint cannot publish articles.

## Database backup and recovery

See [Database operations](docs/OPERATIONS.md) for schema-scoped backup, guarded restore and read-only deployment smoke checks.

## Docker

The Dockerfile provides two build targets:

- `runtime`: the standalone Next.js application.
- `migrate`: a one-shot Payload migration runner.

Build and run them separately. Supply credentials at run time; never pass production secrets as Docker build arguments or bake them into images. Review the Compose example's ports, resource limits and reverse-proxy configuration before deployment.

## Project policies

- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Do not open public issues containing credentials, private URLs, personal data, customer content or production logs. Report suspected vulnerabilities privately as described in `SECURITY.md`.

## License

Original project code is licensed under the MIT License. See [LICENSE](LICENSE). Third-party dependencies retain their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The qjai-cms name and associated marks are not licensed by the MIT License.
