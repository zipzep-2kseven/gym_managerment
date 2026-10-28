import type { db as appDb } from '../src/database/index.js';
import { sql } from 'drizzle-orm';

// The harness supplies a single-client database inside BEGIN. Fixtures are
// created before these savepoints; every case sees that same initial state.
export const createIsolatedCases = (database: typeof appDb, label: string) => {
  const cases: { name: string; run: () => Promise<void> }[] = [];
  return {
    check: (name: string, run: () => Promise<void>) => { cases.push({ name, run }); },
    runCases: async () => {
      const ordered = process.env.GYM_TEST_ORDER === 'reverse' ? [...cases].reverse() : cases;
      for (const { name, run } of ordered) {
        await database.execute(sql`SAVEPOINT gym_test_case`);
        try {
          await run();
        } catch (error) {
          throw new Error(`${label}: ${name}`, { cause: error });
        } finally {
          await database.execute(sql`ROLLBACK TO SAVEPOINT gym_test_case`);
          await database.execute(sql`RELEASE SAVEPOINT gym_test_case`);
        }
        console.log(`PASS ${label}: ${name}`);
      }
      return cases.length;
    },
  };
};
