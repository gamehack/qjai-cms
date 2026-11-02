import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // article_id is NOT NULL. SET NULL would cause a not-null violation when an
  // article is deleted, so publication records are an audit trail and must prevent hard deletion of the article.
  await db.execute(sql`
    ALTER TABLE "qjai_content"."publishing_records"
      DROP CONSTRAINT IF EXISTS "publishing_records_article_id_articles_id_fk";
    ALTER TABLE "qjai_content"."publishing_records"
      ADD CONSTRAINT "publishing_records_article_id_articles_id_fk"
      FOREIGN KEY ("article_id")
      REFERENCES "qjai_content"."articles"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // NO ACTION preserves the same audit-trail protection on rollback.
  await db.execute(sql`
    ALTER TABLE "qjai_content"."publishing_records"
      DROP CONSTRAINT IF EXISTS "publishing_records_article_id_articles_id_fk";
    ALTER TABLE "qjai_content"."publishing_records"
      ADD CONSTRAINT "publishing_records_article_id_articles_id_fk"
      FOREIGN KEY ("article_id")
      REFERENCES "qjai_content"."articles"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION;
  `)
}
