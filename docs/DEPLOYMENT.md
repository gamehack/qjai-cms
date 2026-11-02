# Deployment and operational checklist

This guide is a template. Adapt it to your PostgreSQL provider, network, host and reverse proxy. Do not paste live credentials into documentation, issues, pull requests or CI logs.

## Gate 0: source and CI

- Install the Node.js and pnpm versions declared in `package.json`.
- Run `pnpm install --frozen-lockfile`.
- Run `node --test tests/ingest-security.test.mjs`.
- Run `pnpm run typecheck` and `pnpm run build`.
- Review the dependency audit and production dependency license inventory.
- Build immutable application and migration images in CI rather than on a constrained production host.

## Gate 1: PostgreSQL

1. Create a dedicated PostgreSQL database and the private `qjai_cms` schema.
2. Create two separate roles:
   - Runtime role: schema usage and required data access only; no schema CREATE privilege.
   - Migration role: runtime permissions plus the ability to create or alter objects in `qjai_cms`.
3. Generate unique, strong passwords for both roles. Do not reuse a database administrator password.
4. Configure the runtime connection string in `.env`. Configure the migration connection string in `.migration.env`.
5. Require TLS for remote database connections.
6. Protect local environment files:

   ```sh
   chmod 600 .env .migration.env
   ```

7. Apply migrations in a controlled one-shot environment using only migration credentials.
8. Verify that Payload tables exist in `qjai_cms`, not in an unintended exposed schema.
9. Verify the migration status and test a restore from a backup before accepting production data.
10. Configure database backups, retention, monitoring and an incident recovery procedure.

Never use a database superuser for application runtime. Never mount migration credentials into the long-running application container.

## Gate 2: application

1. Configure runtime-only `DATABASE_URL`, `PAYLOAD_SECRET`, `CONTENT_INGEST_TOKEN`, and `SITE_URL` in `.env`.
2. Generate independent random values for `PAYLOAD_SECRET` and `CONTENT_INGEST_TOKEN`; the ingestion token must be at least 32 characters.
3. Pull the tested immutable application image.
4. Configure the image tag and start the service with Docker Compose.
5. Bind the service to loopback or a private interface; expose it only through a correctly configured reverse proxy.
6. Verify the process health endpoint.
7. Create the first CMS administrator and confirm anonymous users cannot access drafts or administrative data.
8. Test ingestion: first request returns 201, duplicate request returns 200, missing or invalid token returns 401, invalid content returns 422, oversized body returns 413, and imported content remains a draft.
9. Test public article pages, category pages, sitemap, robots rules, responsive layout and server-side latency.
10. Monitor CPU, memory, database connections, logs and error rates.

## Gate 3: public launch

- Configure HTTPS and security headers at the reverse proxy.
- Review public routes and Payload collection access rules.
- Configure persistent media storage before enabling image uploads.
- Verify backup restoration and document rollback steps.
- Review privacy, terms, cookie/analytics and content attribution requirements for the deployment jurisdiction.
- Verify search engine metadata and indexing behavior.
- Retain the previous immutable image and a database recovery plan before every schema change.

Do not run broad Docker cleanup commands or restart unrelated services as a deployment shortcut.
