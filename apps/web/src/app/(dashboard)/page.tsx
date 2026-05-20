import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { ProposalStatusChart } from '@/components/dashboard/ProposalStatusChart';
import { QuotationFunnelCard } from '@/components/dashboard/QuotationFunnelCard';
import { OrdersActivityChart } from '@/components/dashboard/OrdersActivityChart';
import { StockHealthCard } from '@/components/dashboard/StockHealthCard';
import { StockAlertsCard } from '@/components/dashboard/StockAlertsCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RoleGate } from '@/components/dashboard/RoleGate';

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Section 1 — Greeting */}
      <DashboardHeader />

      {/* Section 2 — KPI Strip */}
      <KpiStrip />

      {/* Section 3 — Sales Pipeline */}
      <PipelineChart />

      {/* Section 4 — Proposals & Quotations */}
      <RoleGate roles={['admin', 'manager', 'salesperson', 'finance']}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProposalStatusChart />
          <QuotationFunnelCard />
        </div>
      </RoleGate>

      {/* Section 5 — Orders Activity */}
      <RoleGate roles={['admin', 'manager', 'finance']}>
        <OrdersActivityChart />
      </RoleGate>

      {/* Section 6 — Stock Health */}
      <RoleGate roles={['admin', 'manager', 'installer']}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StockHealthCard />
          <StockAlertsCard />
        </div>
      </RoleGate>

      {/* Section 7 — Activity Feed */}
      <ActivityFeed />

      {/* Section 8 — Quick Actions */}
      <QuickActions />
    </div>
  );
}
