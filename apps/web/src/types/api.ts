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
  revisionNumber: number;
  parentProposalId?: string | null;
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
  parentProposal?: { id: string; revisionNumber: number; status: string } | null;
  revisions?: Array<{ id: string; revisionNumber: number; status: string; createdAt: string }>;
  revisionChain?: Array<{ id: string; revisionNumber: number; status: string; createdAt: string; parentProposalId: string | null }>;
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

// ─── BoQ Types ───────────────────────────────────────────────────────────────

export type BoQStatus = 'draft' | 'final' | 'archived';

export interface BoQTemplateComponent {
  id: string;
  templateId: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  size?: string | null;
  defaultQty: number | string;
  defaultUnitRate?: number | string | null;
  sortOrder: number;
  isOptional: boolean;
}

export interface BoQTemplate {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  components?: BoQTemplateComponent[];
  _count?: { components: number };
}

export interface BoQItem {
  id: string;
  boqProductId: string;
  templateComponentId?: string | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  size?: string | null;
  quantity: number | string;
  unitRate: number | string;
  totalPrice: number | string;
  remarks?: string | null;
  sortOrder: number;
  isOptional: boolean;
  isIncluded: boolean;
}

export interface ProductCharges {
  mode: 'combined' | 'itemized';
  combined?: number;
  installation?: number;
  freight?: number;
  labor?: number;
}

export interface BoQProduct {
  id: string;
  boqId: string;
  templateId?: string | null;
  name: string;
  description?: string | null;
  sortOrder: number;
  priceMode?: string | null;
  fixedPrice?: number | string | null;
  subtotal: number | string;
  customValues?: Record<string, string> | null;
  charges?: ProductCharges | null;
  template?: { id: string; name: string; code: string } | null;
  items: BoQItem[];
}

export interface BoQ {
  id: string;
  boqNumber: string;
  proposalId: string;
  status: BoQStatus;
  notes?: string | null;
  customColumns?: { id: string; label: string }[] | null;
  preparedById: string;
  totalAmount: number | string;
  createdAt: string;
  updatedAt: string;
  proposal?: {
    id: string;
    status: string;
    ticket?: {
      id: string;
      referenceId: string;
      clientName: string;
      projectName?: string | null;
      assignedToId?: string | null;
    } | null;
  } | null;
  preparedBy?: UserSummary;
  products: BoQProduct[];
}

/** Client-side draft item used in the BoQ builder */
export interface BoQItemDraft {
  localId: string;
  templateComponentId: string | null;
  name: string;
  description: string;
  size: string;
  quantity: number;
  unitRate: number;
  totalPrice: number;
  remarks: string;
  sortOrder: number;
  isOptional: boolean;
  isIncluded: boolean;
}

/** Client-side draft product used in the BoQ builder */
export interface BoQProductDraft {
  localId: string;
  templateId: string | null;
  name: string;
  description: string;
  priceMode: 'component' | 'fixed';
  fixedPrice: number;
  customValues: Record<string, string>;
  charges: ProductCharges;
  items: BoQItemDraft[];
}

// ─── Product Catalog ────────────────────────────────────────────────────────

export type ProductStatus = 'active' | 'discontinued' | 'draft';
export type UnitOfMeasure = 'pcs' | 'kg' | 'ltr' | 'mtr' | 'set' | 'box' | 'roll';

export interface ProductSpecification {
  id: string;
  productId: string;
  specKey: string;
  specValue: string;
  specUnit: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ProductCategorySummary {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface ProductCategory extends ProductCategorySummary {
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  parent?: ProductCategorySummary | null;
  children?: ProductCategory[];
  _count?: { products: number };
}

export interface Product {
  id: string;
  productCode: string;
  name: string;
  brand: string | null;
  categoryName: string | null;
  categoryId: string | null;
  subCategory: string | null;
  unitOfMeasure: UnitOfMeasure;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  status: ProductStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category?: ProductCategorySummary | null;
  specifications?: ProductSpecification[];
}

export interface ProductsListResponse {
  success: boolean;
  data: Product[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ProductSpecInput {
  specKey: string;
  specValue: string;
  specUnit?: string;
  sortOrder?: number;
}

export interface CreateProductInput {
  productCode: string;
  name: string;
  brand?: string;
  categoryName?: string;
  categoryId?: string;
  subCategory?: string;
  unitOfMeasure?: UnitOfMeasure;
  description?: string;
  imageUrl?: string;
  location?: string;
  status?: ProductStatus;
  tags?: string[];
  specifications?: ProductSpecInput[];
}

export type UpdateProductInput = Partial<CreateProductInput>;

// ============================================================
// PHASE 2 — STOCK, SUPPLIERS, PURCHASE ORDERS, ALERTS
// ============================================================

export type StockTxnType = 'opening' | 'grn' | 'adjustment_in' | 'adjustment_out';
export type PurchaseOrderStatus = 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
export type SupplierStatus = 'active' | 'inactive';
export type AlertRuleType = 'low_stock' | 'reorder' | 'expiry' | 'overstock';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type StockAlertStatus = 'ok' | 'low' | 'out' | 'on_order';

export interface StockLevel {
  id: string;
  productId: string;
  qtyOnHand: number;
  qtyOnOrder: number;
  avgCost: number | null;
  lastUpdatedAt: string;
}

export interface StockTransaction {
  id: string;
  productId: string;
  txnType: StockTxnType;
  qty: number;
  direction: string;
  unitCost: number | null;
  referenceId: string | null;
  notes: string | null;
  performedById: string;
  txnAt: string;
  performedBy?: { id: string; firstName: string; lastName: string };
}

export interface StockWithProduct {
  id: string;
  productCode: string;
  name: string;
  brand: string | null;
  categoryName: string | null;
  unitOfMeasure: UnitOfMeasure;
  status: ProductStatus;
  location: string | null;
  stockLevel: StockLevel | null;
  onHand: number;
  onOrder: number;
  alertStatus: StockAlertStatus;
  specifications?: ProductSpecification[];
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  bankBranch: string | null;
  cancelledChequeUrl: string | null;
  leadTimeDays: number;
  notes: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { productSuppliers: number; purchaseOrders: number };
}

export interface ProductSupplier {
  id: string;
  productId: string;
  supplierId: string;
  supplierSku: string | null;
  unitPrice: number | null;
  minOrderQty: number;
  isPreferred: boolean;
  createdAt: string;
  product?: { id: string; productCode: string; name: string; unitOfMeasure: UnitOfMeasure };
  supplier?: Supplier;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitPrice: number | null;
  totalPrice: number;
  notes: string | null;
  product?: { id: string; productCode: string; name: string; unitOfMeasure: UnitOfMeasure; stockLevel?: { qtyOnHand: number } | null };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  notes: string | null;
  totalAmount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string };
  createdBy?: { id: string; firstName: string; lastName: string };
  items?: PurchaseOrderItem[];
  _count?: { items: number };
}

export interface AlertRule {
  id: string;
  ruleName: string;
  ruleType: AlertRuleType;
  productId: string | null;
  categoryId: string | null;
  thresholdValue: number | null;
  notifyChannels: string[];
  notifyUserIds: string[];
  autoCreatePo: boolean;
  escalateAfterHrs: number;
  isActive: boolean;
  createdAt: string;
  product?: { id: string; productCode: string; name: string } | null;
  category?: { id: string; name: string } | null;
  _count?: { alertLogs: number };
}

export interface AlertLog {
  id: string;
  ruleId: string;
  productId: string;
  triggeredAt: string;
  alertMessage: string | null;
  status: AlertStatus;
  resolvedAt: string | null;
  resolvedById: string | null;
  rule?: { id: string; ruleName: string; ruleType: AlertRuleType };
  product?: { id: string; productCode: string; name: string; categoryName: string | null };
  resolvedBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface StockStats {
  total: number;
  ok: number;
  low: number;
  out: number;
}

// ─── Stock Transfers ──────────────────────────────────────────────────────────

export type TransferType = 'TRANSFER_OUT' | 'TRANSFER_IN';
export type TransferStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface StockTransferCharge {
  label: string;
  amount: number;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  qtyRequested: number;
  qtyFulfilled: number;
  unitCost: number | null;
  notes: string | null;
  qtyOnHandAtTime: number;
  createdAt: string;
  product?: { id: string; name: string; productCode: string; unitOfMeasure: string };
}

export interface StockTransfer {
  id: string;
  transferType: TransferType;
  status: TransferStatus;
  transferNumber: string;
  partyName: string;
  partyGSTNumber: string | null;
  partyAddress: string | null;
  billNumber: string | null;
  billDate: string | null;
  placeOfSupply: string | null;
  poNumber: string | null;
  contactNumber: string | null;
  transporterName: string | null;
  vehicleNumber: string | null;
  eWayBillNumber: string | null;
  shippedToName: string | null;
  shippedToAddress: string | null;
  shippedToGST: string | null;
  transferDate: string;
  notes: string | null;
  additionalCharges: StockTransferCharge[] | null;
  createdById: string;
  confirmedById: string | null;
  confirmedAt: string | null;
  cancelledById: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: StockTransferItem[];
  createdBy?: { id: string; firstName: string; lastName: string };
  confirmedBy?: { id: string; firstName: string; lastName: string } | null;
  cancelledBy?: { id: string; firstName: string; lastName: string } | null;
  _count?: { items: number };
}

export interface StockTransferStats {
  total: number;
  drafts: number;
  confirmed: number;
  cancelled: number;
  totalOut: number;
  totalIn: number;
}

