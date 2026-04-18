'use client';

import { KanbanBoard } from './kanban-board';
import { LeadsListView } from './leads-list-view';
import type { Lead } from '@/components/leads/lead-table';

interface SplitViewProps {
  selectedLeadId: string | null;
  onLeadSelect: (lead: Lead) => void;
  onKanbanSelect: (leadId: string | null, oppId: string | null) => void;
  externalSearch?: string;
  externalProductType?: string;
}

export function SplitView({
  selectedLeadId,
  onLeadSelect,
  onKanbanSelect,
  externalSearch,
  externalProductType,
}: SplitViewProps) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-2xl ring-1 ring-border">
      {/* Left: Kanban (60%) */}
      <div className="flex flex-col" style={{ flex: '60 1 0%', minWidth: 0, overflow: 'hidden' }}>
        <div className="h-full p-3 overflow-hidden">
          <KanbanBoard
            selectedLeadId={selectedLeadId}
            onSelectOpp={onKanbanSelect}
            compact
          />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-border shrink-0" />

      {/* Right: Leads list (40%) */}
      <div className="flex flex-col overflow-hidden" style={{ flex: '40 1 0%', minWidth: 0 }}>
        <div className="h-full overflow-auto p-3">
          <LeadsListView
            compact
            selectedLeadId={selectedLeadId}
            onLeadSelect={onLeadSelect}
            externalSearch={externalSearch}
            externalProductType={externalProductType}
          />
        </div>
      </div>
    </div>
  );
}
