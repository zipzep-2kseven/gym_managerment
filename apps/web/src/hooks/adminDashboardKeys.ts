// One system snapshot, isolated by authenticated actor.
export const adminDashboardKeys = {
  summary: (userId: string | undefined) => ['admin-dashboard', userId] as const,
};
