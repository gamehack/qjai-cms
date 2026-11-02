import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "qjai_cms"."enum_articles_status" AS ENUM('draft', 'review', 'published');
  CREATE TYPE "qjai_cms"."enum_publishing_records_channel" AS ENUM('website', 'external');
  CREATE TYPE "qjai_cms"."enum_publishing_records_state" AS ENUM('pending', 'succeeded', 'failed');
  CREATE TABLE "qjai_cms"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "qjai_cms"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "qjai_cms"."articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"body_markdown" varchar NOT NULL,
  	"status" "qjai_cms"."enum_articles_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"source" varchar DEFAULT 'manual' NOT NULL,
  	"source_key" varchar,
  	"original_url" varchar,
  	"category_id" integer,
  	"ai_generated" boolean DEFAULT true,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "qjai_cms"."categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "qjai_cms"."publishing_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"article_id" integer NOT NULL,
  	"channel" "qjai_cms"."enum_publishing_records_channel" NOT NULL,
  	"state" "qjai_cms"."enum_publishing_records_state" DEFAULT 'pending' NOT NULL,
  	"external_reference" varchar,
  	"error_message" varchar,
  	"delivered_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "qjai_cms"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "qjai_cms"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "qjai_cms"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"articles_id" integer,
  	"categories_id" integer,
  	"publishing_records_id" integer
  );
  
  CREATE TABLE "qjai_cms"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "qjai_cms"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "qjai_cms"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "qjai_cms"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "qjai_cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "qjai_cms"."articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "qjai_cms"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "qjai_cms"."publishing_records" ADD CONSTRAINT "publishing_records_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "qjai_cms"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "qjai_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "qjai_cms"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "qjai_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "qjai_cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "qjai_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "qjai_cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "qjai_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "qjai_cms"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "qjai_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_publishing_records_fk" FOREIGN KEY ("publishing_records_id") REFERENCES "qjai_cms"."publishing_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "qjai_cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "qjai_cms"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "qjai_cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "qjai_cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "qjai_cms"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "qjai_cms"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "qjai_cms"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "qjai_cms"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "qjai_cms"."users" USING btree ("email");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "qjai_cms"."articles" USING btree ("slug");
  CREATE INDEX "articles_status_idx" ON "qjai_cms"."articles" USING btree ("status");
  CREATE UNIQUE INDEX "articles_source_key_idx" ON "qjai_cms"."articles" USING btree ("source_key");
  CREATE INDEX "articles_category_idx" ON "qjai_cms"."articles" USING btree ("category_id");
  CREATE INDEX "articles_updated_at_idx" ON "qjai_cms"."articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "qjai_cms"."articles" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "qjai_cms"."categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "qjai_cms"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "qjai_cms"."categories" USING btree ("created_at");
  CREATE INDEX "publishing_records_article_idx" ON "qjai_cms"."publishing_records" USING btree ("article_id");
  CREATE INDEX "publishing_records_updated_at_idx" ON "qjai_cms"."publishing_records" USING btree ("updated_at");
  CREATE INDEX "publishing_records_created_at_idx" ON "qjai_cms"."publishing_records" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "qjai_cms"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "qjai_cms"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "qjai_cms"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "qjai_cms"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "qjai_cms"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "qjai_cms"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "qjai_cms"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "qjai_cms"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "qjai_cms"."payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "qjai_cms"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_publishing_records_id_idx" ON "qjai_cms"."payload_locked_documents_rels" USING btree ("publishing_records_id");
  CREATE INDEX "payload_preferences_key_idx" ON "qjai_cms"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "qjai_cms"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "qjai_cms"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "qjai_cms"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "qjai_cms"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "qjai_cms"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "qjai_cms"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "qjai_cms"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "qjai_cms"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "qjai_cms"."users_sessions" CASCADE;
  DROP TABLE "qjai_cms"."users" CASCADE;
  DROP TABLE "qjai_cms"."articles" CASCADE;
  DROP TABLE "qjai_cms"."categories" CASCADE;
  DROP TABLE "qjai_cms"."publishing_records" CASCADE;
  DROP TABLE "qjai_cms"."payload_kv" CASCADE;
  DROP TABLE "qjai_cms"."payload_locked_documents" CASCADE;
  DROP TABLE "qjai_cms"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "qjai_cms"."payload_preferences" CASCADE;
  DROP TABLE "qjai_cms"."payload_preferences_rels" CASCADE;
  DROP TABLE "qjai_cms"."payload_migrations" CASCADE;
  DROP TYPE "qjai_cms"."enum_articles_status";
  DROP TYPE "qjai_cms"."enum_publishing_records_channel";
  DROP TYPE "qjai_cms"."enum_publishing_records_state";`)
}
