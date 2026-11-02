# Architecture

## Purpose and scope

qjai-cms is a self-hostable publishing core for editorial websites. It provides a public content site, an authenticated CMS, PostgreSQL persistence, and an ingestion boundary for upstream systems.

The repository intentionally excludes upstream source collectors, proprietary research logic, private prompts, external publishing integrations, private datasets, and organization-specific operating procedures. Those systems can integrate through the ingestion contract without becoming dependencies of this application.

## Application

- Next.js serves the public website and server-side routes.
- Payload CMS provides the authenticated editorial interface and REST API.
- PostgreSQL stores users, articles, categories, publishing records, and Payload internal collections.
- The ingestion endpoint accepts authenticated, idempotent content submissions and always creates drafts.
- Public content queries explicitly apply published-only access rules.
- Markdown is rendered without enabling raw HTML.
- Robots and sitemap routes are included.

## Database

- PostgreSQL 17 or a compatible supported version.
- The Payload adapter uses the private `qjai_cms` schema. Keep application tables out of the default `public` schema when using a hosted PostgreSQL service.
- Use a least-privilege runtime role with schema usage and required data access, but without schema creation privileges.
- Use a separate migration role with the privileges needed to apply versioned migrations.
- The runtime connection pool is intentionally small; tune it for your database provider and deployment size.
- Require TLS for remote database connections.
- The adapter has `push: false`. Apply checked-in migrations explicitly; do not enable automatic schema push against a production database.
- Keep database credentials in server-side environment files or a secrets manager. Never commit them or expose them to browser code.

## Deployment model

- Build immutable application and migration images in CI.
- Run the migration image as a one-shot job with migration-only credentials.
- Run the application image with runtime-only credentials.
- Bind the application to a private interface behind a reverse proxy.
- Keep administration routes protected by Payload authentication and collection access rules.
- Configure persistent media storage and off-site backups before enabling production uploads.

## Security boundaries

- The ingestion token authenticates upstream submissions; it is not a user session.
- Ingestion always creates drafts and cannot publish content.
- Public article queries return published content only.
- Admin and collection access rules are enforced by Payload.
- Health checks report process availability, not database readiness.
