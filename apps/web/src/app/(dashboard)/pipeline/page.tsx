import { redirect } from 'next/navigation';

/** /pipeline redirects to the unified CRM page (Kanban view). */
export default function PipelineRedirectPage() {
  redirect('/crm?view=kanban');
}

