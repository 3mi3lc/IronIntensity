// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_slow_dark_beast.sql';
import m0001 from './0001_seed_body_parts.sql';
import m0002 from './0002_bumpy_mongoose.sql';
import m0003 from './0003_abnormal_mantis.sql';
import m0004 from './0004_motionless_lady_vermin.sql';
import m0005 from './0005_backfill_completed_at.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  