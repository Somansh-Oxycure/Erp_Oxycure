import { redirect } from 'next/navigation';

/** /leads redirects to the unified Tickets page. */
export default function LeadsRedirectPage() {
  redirect('/tickets');
}

