# qjai-cms

An open-source, self-hosted content management system built with Next.js, Payload CMS and PostgreSQL.

> **Status: Alpha.** This project is under active development. Review authentication, access control, backups, recovery and deployment security before using it with production data.

## Features

- Public editorial website with article and category pages.
- Payload CMS administration and authentication.
- PostgreSQL persistence with versioned database migrations.
- Authenticated, idempotent content ingestion API. Imported content is always saved as a draft.
- Explicit editorial approval before publication.
- Docker runtime and one-shot migration build targets.
- GitHub Actions for tests, dependency auditing and container builds.

This repository contains the CMS core only. It does not include upstream collectors, proprietary prompts or scoring rules, private datasets, internal automation, or external publishing executors.

## Requirements

- Node.js 24.22.1+
- pnpm 10.20.0+
- PostgreSQL 17+

## Local development

1. Create a PostgreSQL database.
2. As a database owner or administrator, create the schema used by this project:

   ```sql
   CREATE SCHEMA IF NOT EXISTS qjai_cms;
   ```

3. Copy the environment examples and configure separate runtime and migration database credentials:

   ```sh
   cp .env.example .env
   cp .migration.env.example .migration.env
   ```

   Set `DATABASE_URL`, `PAYLOAD_SECRET`, `SITE_URL` and `CONTENT_INGEST_TOKEN` in `.env`. Set `SITE_NAME` if you want to customize the public site name. Set the migration-role `DATABASE_URL` in `.migration.env`. Never commit either file.

4. Install dependencies:

   ```sh
   pnpm install --frozen-lockfile
   ```

5. Apply versioned Payload migrations with the migration-only credentials:

   ```sh
   set -a
   . ./.migration.env
   set +a
   pnpm payload migrate
   ```

6. Start the development server:

   ```sh
   pnpm dev
   ```

7. Open [http://localhost:3000/admin](http://localhost:3000/admin) to initialize the CMS administrator.

Use a least-privilege runtime role without schema-creation privileges. Keep migration credentials separate from the long-running application. Require TLS for remote PostgreSQL connections.

## Ingestion API

The `POST /api/ingest` endpoint accepts authenticated JSON submissions and creates drafts only. Configure a unique `CONTENT_INGEST_TOKEN` of at least 32 characters in the server environment. Do not expose it to browser code.

The endpoint enforces a request-body limit, validates the source and content fields, and uses `source + externalId` for idempotency. Replayed submissions do not overwrite editorial changes. The endpoint cannot publish articles.

See [the ingestion contract](docs/INGESTION.md) for the request format and response codes.

## Docker

The Dockerfile provides two build targets:

- `runtime`: the standalone Next.js application.
- `migrate`: a one-shot Payload migration runner.

Build them separately and provide the appropriate credentials only at run time. Never pass production secrets as Docker build arguments or bake them into an image.

The Compose file is an example for running the published GHCR image. Review its resource limits, ports and reverse-proxy configuration for your environment before use.

## Security and contributions

- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Do not open public issues containing credentials, private URLs, personal data, customer content or production logs. Report suspected vulnerabilities privately as described in `SECURITY.md`.

## License

The original project code is licensed under the MIT License. See [LICENSE](LICENSE). Third-party dependencies retain their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The qjai-cms name and associated marks are not licensed by the MIT License.
