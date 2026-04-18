import { redirect } from 'next/navigation';

/** /leads redirects to the unified CRM page (Leads List view). */
export default function LeadsRedirectPage() {
  redirect('/crm?view=list');
}

