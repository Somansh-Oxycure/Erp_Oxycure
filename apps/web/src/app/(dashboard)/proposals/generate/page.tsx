import { FileDown } from 'lucide-react';
import { ProposalGenerateForm } from '@/components/proposals/ProposalGenerateForm';

export default function GenerateProposalPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <FileDown className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Generate Proposal</h1>
          <p className="text-xs text-muted-foreground">
            Fill in the form below and download a ready-to-send .docx proposal
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-6 max-w-5xl w-full mx-auto">
        <ProposalGenerateForm />
      </div>
    </div>
  );
}
