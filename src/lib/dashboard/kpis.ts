/**
 * Dashboard KPI types and loader
 */

export interface DashboardKpis {
  totalClaims: number;
  activeClaims: number;
  totalRevenue: number;
  pendingTasks: number;
  recentActivity: number;
  activeLeads: number;
  openClaims: number;
  revenueMtdCents: number;
  conversionRate: number;
}

export async function loadKpis(orgId: string): Promise<DashboardKpis> {
  // Stub implementation — real KPI aggregation TBD
  return {
    totalClaims: 0,
    activeClaims: 0,
    totalRevenue: 0,
    pendingTasks: 0,
    recentActivity: 0,
    activeLeads: 0,
    openClaims: 0,
    revenueMtdCents: 0,
    conversionRate: 0,
  };
}
