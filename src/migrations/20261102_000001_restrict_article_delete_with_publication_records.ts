import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Keep publishing records as an audit trail: an article with delivery records
 * cannot be hard-deleted. The original generated FK combined NOT NULL with
 * ON DELETE SET NULL, which made deletion fail with a constraint violation.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "qjai_content"."publishing_records"
      DROP CONSTRAINT "publishing_records_article_id_articles_id_fk";
    ALTER TABLE "qjai_content"."publishing_records"
      ADD CONSTRAINT "publishing_records_article_id_articles_id_fk"
      FOREIGN KEY ("article_id")
      REFERENCES "qjai_content"."articles"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "qjai_content"."publishing_records"
      DROP CONSTRAINT "publishing_records_article_id_articles_id_fk";
    ALTER TABLE "qjai_content"."publishing_records"
      ADD CONSTRAINT "publishing_records_article_id_articles_id_fk"
      FOREIGN KEY ("article_id")
      REFERENCES "qjai_content"."articles"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  `)
}
