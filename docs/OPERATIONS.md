# Database operations

These scripts back up and restore only the `qjai_content` schema. They do not back up Supabase Auth, Storage buckets, project settings, edge functions, or any other schema. Back up those resources separately if your deployment uses them.

## Requirements

- PostgreSQL client tools (`psql`, `pg_dump`, `pg_restore`) compatible with the server major version.
- A database connection using a role with the required read or restore privileges.
- TLS enabled for remote database connections.

Do not put connection strings in shell history or commit them. Export `DATABASE_URL` in the shell or load it from a protected secret manager.

## Create a backup

```sh
export DATABASE_URL='postgresql://...'
BACKUP_DIR=./backups bash scripts/db-backup.sh
```

The script refuses to produce an empty backup, writes a PostgreSQL custom-format archive with restrictive file permissions, and verifies that the archive can be listed by `pg_restore`. Keep backups outside the application container and encrypt them at rest before uploading to remote storage.

## Restore into a new, empty database

Restore is intentionally non-destructive: it refuses to run unless the target database does not already contain the `qjai_content` schema. Create a new empty database first, then:

```sh
export DATABASE_URL='postgresql://...'
export BACKUP_FILE='./backups/qjai_content-YYYYMMDDTHHMMSSZ.dump'
CONFIRM_RESTORE=RESTORE_QJAI_CONTENT_TO_EMPTY_DATABASE bash scripts/db-restore.sh
```

Never point this command at the production database as a shortcut for testing. Verify restored table counts and application behavior before switching traffic.

## Read-only deployment smoke test

After migrations and the app are running:

```sh
export CONTENT_INGEST_TOKEN='the-server-side-token'
BASE_URL='https://your-cms.example' bash scripts/smoke-test.sh
```

This checks database readiness, the homepage, unauthenticated ingestion rejection, and content-type validation. It does not create content.

## Operational requirements

- Run a backup before every production migration.
- Retain multiple encrypted backup generations in a separate failure domain.
- Perform periodic restore drills into a fresh database; a successful `pg_dump` alone does not prove recoverability.
- Store restore credentials separately from the application runtime credentials.
- The application runtime role should not own the schema or have DDL privileges; migrations use a separate role.
