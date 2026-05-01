/**
 * TypeScript interfaces mirroring backend API response shapes.
 * Use these in API call functions and TanStack Query hooks instead of `any`.
 */

export interface User {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'salesperson' | 'installer';
  department: string;
  region?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
}

export interface Note {
  id: string;
  ticketId: string;
  content: string;
  type: 'general' | 'status_change' | 'site_visit' | 'call' | 'email' | 'system';
  createdAt: string;
  updatedAt: string;
  createdBy?: UserSummary;
}

export interface FollowUp {
  id: string;
  ticketId: string;
  scheduledAt: string;
  outcome: string | null;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
  updatedAt: string;
  createdBy?: UserSummary;
}

export interface Ticket {
  id: string;
  referenceId: string;
  clientName: string;
  name: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  clientLocation?: string | null;
  region?: string | null;
  projectName?: string | null;
  projectLocation?: string | null;
  consultantName?: string | null;
  consultantLocation?: string | null;
  architectName?: string | null;
  architectLocation?: string | null;
  approveMake?: string | null;
  productType: string;
  estimatedValue?: number | null;
  requirementNotes?: string | null;
  status: 'new' | 'contacted' | 'site_inspection' | 'design_review' | 'quoted' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  sourceDetail?: string | null;
  lostReason?: string | null;
  siteInspectionNeeded: boolean;
  nextFollowUpDate?: string | null;
  convertedAt?: string | null;
  convertedById?: string | null;
  assignedToId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  /** Virtual field computed in the service layer — not stored in DB */
  agingDays?: number;
  assignedTo?: UserSummary | null;
  createdBy?: UserSummary;
  notes?: Note[];
  followUps?: FollowUp[];
  proposals?: ProposalSummary[];
  quotations?: { id: string; status: string; totalAmount: number; createdAt: string }[];
  orders?: { id: string; status: string; totalAmount: number; createdAt: string }[];
  designSpecs?: { id: string; status: string; requirementSummary?: string; createdAt: string }[];
  _count?: { notes: number; followUps: number };
}

export interface ProposalNote {
  id: string;
  proposalId: string;
  content: string;
  createdAt: string;
  createdBy?: UserSummary;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  productName: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  totalPrice: number;
  sortOrder: number;
}

export interface Proposal {
  id: string;
  ticketId: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  documentUrl?: string | null;
  documentOriginalName?: string | null;
  termsAndConditions?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  ticket?: {
    id: string;
    referenceId: string;
    clientName: string;
    name: string;
    phone: string;
    email?: string | null;
    projectName?: string | null;
    estimatedValue?: number | null;
  } | null;
  createdBy?: UserSummary;
  items: ProposalItem[];
  notes: ProposalNote[];
}

/** Lightweight reference included on Ticket.proposals[] */
export interface ProposalSummary {
  id: string;
  status: string;
  totalAmount: number;
  validUntil?: string | null;
  createdAt: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginatedMeta;
}
