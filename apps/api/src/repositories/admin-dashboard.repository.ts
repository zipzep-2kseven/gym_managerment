import { sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const createAdminDashboardRepository = (tx: Tx) => ({
  summary: async (asOf: Date) => {
    // One statement gives all aggregates the same snapshot. Bound instants avoid
    // session-timezone dependence; amounts stay decimal strings over the wire.
    const result = await tx.execute<{
      total_gyms: number; active_gyms: number; total_accounts: number;
      month_revenue: string; month: string; daily_revenue: { date: string; amount: string }[];
    }>(sql`WITH bounds AS (
      SELECT ${asOf.toISOString()}::timestamptz AS instant,
        (${asOf.toISOString()}::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today
    ), successful AS (
      SELECT amount, (paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day
      FROM payments, bounds WHERE payment_status='SUCCESS' AND paid_at <= instant
        AND paid_at >= (LEAST(date_trunc('month', today)::date, today - 6)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
    ), daily AS (
      SELECT dates.day::date, COALESCE(sum(s.amount),0)::text AS amount
      FROM bounds CROSS JOIN LATERAL generate_series(today - 6, today, interval '1 day') dates(day)
      LEFT JOIN successful s ON s.day=dates.day::date GROUP BY dates.day
    ) SELECT (SELECT count(*)::int FROM gyms) AS total_gyms,
      (SELECT count(*)::int FROM gyms WHERE status='ACTIVE') AS active_gyms,
      (SELECT count(*)::int FROM users) AS total_accounts,
      (SELECT COALESCE(sum(amount),0)::text FROM successful, bounds WHERE day >= date_trunc('month',today)::date) AS month_revenue,
      (SELECT to_char(today,'YYYY-MM') FROM bounds) AS month,
      (SELECT json_agg(json_build_object('date',to_char(day,'YYYY-MM-DD'),'amount',amount) ORDER BY day) FROM daily) AS daily_revenue`);
    return { ...result.rows[0], as_of: asOf.toISOString(), timezone: 'Asia/Ho_Chi_Minh' };
  },
});
