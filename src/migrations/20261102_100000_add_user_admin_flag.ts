import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add an explicit administrator flag. On existing installations, preserve
 * access by promoting the earliest existing account. On fresh installations,
 * the Payload first-user registration hook promotes the first account.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "qjai_content"."users"
      ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;

    UPDATE "qjai_content"."users"
      SET "is_admin" = true
      WHERE "id" = (
        SELECT "id"
        FROM "qjai_content"."users"
        ORDER BY "created_at" ASC, "id" ASC
        LIMIT 1
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "qjai_content"."users"
      DROP COLUMN "is_admin";
  `)
}
