import * as migration_20261101_135009_initial_schema from './20261101_135009_initial_schema';
import * as migration_20261102_090000_publishing_records_delete_cascade from './20261102_090000_publishing_records_delete_cascade';

export const migrations = [
  {
    up: migration_20261101_135009_initial_schema.up,
    down: migration_20261101_135009_initial_schema.down,
    name: '20261101_135009_initial_schema'
  },
  {
    up: migration_20261102_090000_publishing_records_delete_cascade.up,
    down: migration_20261102_090000_publishing_records_delete_cascade.down,
    name: '20261102_090000_publishing_records_delete_cascade'
  },
];
