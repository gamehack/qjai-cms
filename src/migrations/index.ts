import * as migration_20261101_135009_initial_schema from './20261101_135009_initial_schema';
import * as migration_20261102_000001_restrict_article_delete_with_publication_records from './20261102_000001_restrict_article_delete_with_publication_records';
import * as migration_20261102_000002_add_user_admin_flag from './20261102_000002_add_user_admin_flag';

export const migrations = [
  {
    up: migration_20261101_135009_initial_schema.up,
    down: migration_20261101_135009_initial_schema.down,
    name: '20261101_135009_initial_schema'
  },
  {
    up: migration_20261102_000001_restrict_article_delete_with_publication_records.up,
    down: migration_20261102_000001_restrict_article_delete_with_publication_records.down,
    name: '20261102_000001_restrict_article_delete_with_publication_records'
  },
  {
    up: migration_20261102_000002_add_user_admin_flag.up,
    down: migration_20261102_000002_add_user_admin_flag.down,
    name: '20261102_000002_add_user_admin_flag'
  },
];
