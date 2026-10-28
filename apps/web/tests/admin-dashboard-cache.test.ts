import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { adminDashboardKeys } from '../src/hooks/adminDashboardKeys';

test('summary invalidation preserves values, isolates actors and leaves paginated lists alone', async () => {
  const client = new QueryClient();
  const a = adminDashboardKeys.summary('admin-a');
  const b = adminDashboardKeys.summary('admin-b');
  client.setQueryData(a, { total_gyms: 42 });
  client.setQueryData(['gyms', 'admin', 'admin-a'], { total: 42 });
  assert.equal(client.getQueryData(b), undefined);
  await client.invalidateQueries({ queryKey: ['admin-dashboard'] });
  assert.equal(client.getQueryState(a)?.isInvalidated, true);
  assert.equal(client.getQueryState(['gyms', 'admin', 'admin-a'])?.isInvalidated, false);
  assert.deepEqual(client.getQueryData(a), { total_gyms: 42 });
  client.clear();
  assert.equal(client.getQueryData(a), undefined);
});
