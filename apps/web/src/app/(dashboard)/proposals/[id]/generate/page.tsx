'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { proposalsApi } from '@/lib/api';
import { ArrowLeft, ChevronRight, FileDown, Loader2, AlertCircle } from 'lucide-react';
import { ProposalGenerateForm } from '@/components/proposals/ProposalGenerateForm';

export default function ProposalGeneratePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalsApi.findOne(id),
    enabled: !!id,
  });

  const proposal = data?.data?.data ?? data?.data;

  // Build initial form values: prefer saved generateFormData, then fall back
  // to ticket-derived defaults so the form is never empty on first visit.
  const savedData = proposal?.generateFormData
    ? (proposal.generateFormData as Record<string, unknown>)
    : {
        client_name: proposal?.ticket?.clientName ?? '',
        project_name: proposal?.ticket?.projectName ?? '',
        ref_number: proposal?.ticket?.referenceId ?? '',
      };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">Proposal not found</p>
        <button
          onClick={() => router.push('/proposals')}
          className="text-sm text-sky-500 hover:text-sky-400 underline"
        >
          Back to Proposals
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <FileDown className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              <button
                onClick={() => router.push('/proposals')}
                className="hover:text-foreground transition-colors"
              >
                Proposals
              </button>
              <ChevronRight className="w-3 h-3" />
              <button
                onClick={() => router.push(`/proposals/${id}`)}
                className="hover:text-foreground transition-colors"
              >
                {proposal.ticket?.referenceId || id.slice(0, 8).toUpperCase()}
              </button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">Generate</span>
            </div>
            <h1 className="text-base font-bold text-foreground">Generate Proposal</h1>
          </div>
        </div>
        <button
          onClick={() => router.push(`/proposals/${id}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Proposal
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-6 max-w-5xl w-full mx-auto">
        <ProposalGenerateForm proposalId={id} savedData={savedData} />
      </div>
    </div>
  );
}
