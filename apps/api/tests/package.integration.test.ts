import { packageTestHarness, type PackageCase } from './package-test-fixture.js';
import { packagePublicCases } from './package-public.cases.js';
import { packageWriteCases } from './package-write.cases.js';
import { packageAuthCases } from './package-auth.cases.js';

const harness = await packageTestHarness();
try {
  const cases: PackageCase[] = [...packagePublicCases(harness), ...packageWriteCases(harness), ...packageAuthCases(harness)];
  const ordered = process.env.PACKAGE_TEST_ORDER === 'reverse' ? [...cases].reverse() : cases;
  for (const [label, run] of ordered) {
    try { await run(); console.log(`PASS Package: ${label}`); }
    catch (error) { console.error(`FAIL Package: ${label}`); throw error; }
  }
  console.log(`PASS: ${cases.length} PKG-01 HTTP/database cases (${process.env.PACKAGE_TEST_ORDER ?? 'forward'}).`);
} finally { await harness.close(); }
