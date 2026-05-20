# Stock Transfer Feature — Full Spec & Implementation Prompt

---

## CONTEXT (Feed this to the AI)

You are working on an existing inventory management system built with:
- **Backend**: NestJS + Prisma (PostgreSQL)
- **Frontend**: Next.js (App Router) with TypeScript
- **Auth**: Role-based — roles are `admin`, `manager`, `staff`
- **Existing stock module path**: `apps/web/src/app/(dashboard)/stock/`
- **Existing API**: REST under `/stock`

The current stock module supports:
- `StockLevel` — one row per product (qtyOnHand, qtyOnOrder, avgCost)
- `StockTransaction` — immutable audit log (txnType enum: opening, grn, adjustment_in, adjustment_out)
- Manual adjustments via `POST /stock/:productId/adjust`
- GRN (Goods Received Note) via purchase orders

**DO NOT modify any existing tables, endpoints, or UI. Only ADD new entities, endpoints, and pages.**

---

## FEATURE: Stock Transfer (Challan-Based Movement)

### Overview

Replace the raw adjust-modal approach for inter-location or inter-party stock movements with a **formal challan/transfer document system**. Every stock movement out or in must now be tied to a Transfer document — not a freehand adjustment.

There are two transfer types:
- **TRANSFER OUT** — stock leaving your warehouse (dispatch to a party/location)
- **TRANSFER IN** — stock arriving into your warehouse (receipt from a party/location)

---

## DATABASE — New Prisma Models

Add these models to `schema.prisma`. Do NOT alter existing models.

```prisma
enum TransferType {
  TRANSFER_OUT
  TRANSFER_IN
}

enum TransferStatus {
  DRAFT
  CONFIRMED
  CANCELLED
}

model StockTransfer {
  id              String         @id @default(uuid())

  // Document header
  transferType    TransferType
  status          TransferStatus @default(DRAFT)
  transferNumber  String         @unique   // Auto-generated: TC-OUT-00001 / TC-IN-00001

  // Party / Destination details
  partyName       String         // Supplier name (IN) or Customer/Location name (OUT)
  partyGSTNumber  String?        // GST number of the party
  partyAddress    String?        // Full address

  // Document references
  billNumber      String?        // External bill / invoice number from the party
  billDate        DateTime?      // Date on the external bill
  transporterName String?        // Lorry / courier name
  vehicleNumber   String?        // Vehicle / AWB number
  eWayBillNumber  String?        // e-Way bill number (for GST compliance)

  // Transfer metadata
  transferDate    DateTime       @default(now())
  notes           String?

  // Line items
  items           StockTransferItem[]

  // Audit
  createdById     String
  createdBy       User           @relation("TransferCreatedBy", fields: [createdById], references: [id])
  confirmedById   String?
  confirmedBy     User?          @relation("TransferConfirmedBy", fields: [confirmedById], references: [id])
  confirmedAt     DateTime?
  cancelledById   String?
  cancelledBy     User?          @relation("TransferCancelledBy", fields: [cancelledById], references: [id])
  cancelledAt     DateTime?

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model StockTransferItem {
  id              String        @id @default(uuid())

  transfer        StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  transferId      String

  product         Product       @relation(fields: [productId], references: [id])
  productId       String

  qtyRequested    Decimal(10,2) // Qty entered in the form
  qtyFulfilled    Decimal(10,2) @default(0) // Qty actually moved (set on confirm)

  unitCost        Decimal(10,2)? // Optional unit cost
  notes           String?

  // Snapshot at time of creation for audit
  qtyOnHandAtTime Decimal(10,2)

  createdAt       DateTime      @default(now())
}
```

Run `npx prisma migrate dev --name add_stock_transfer` after adding the models.

---

## BACKEND — NestJS

### Module Structure

Create a new module at `src/stock-transfer/` — do NOT put it inside the existing `stock` module.

```
src/
  stock-transfer/
    stock-transfer.module.ts
    stock-transfer.controller.ts
    stock-transfer.service.ts
    dto/
      create-transfer.dto.ts
      confirm-transfer.dto.ts
      list-transfers.dto.ts
```

### DTOs

**`create-transfer.dto.ts`**
```typescript
export class CreateTransferDto {
  transferType: 'TRANSFER_OUT' | 'TRANSFER_IN';

  // Header
  partyName: string;
  partyGSTNumber?: string;
  partyAddress?: string;
  billNumber?: string;
  billDate?: string;           // ISO date string
  transporterName?: string;
  vehicleNumber?: string;
  eWayBillNumber?: string;
  transferDate?: string;       // ISO date string, defaults to now
  notes?: string;

  // Line items
  items: {
    productId: string;
    qtyRequested: number;
    unitCost?: number;
    notes?: string;
  }[];
}
```

### Service Methods

Implement the following in `StockTransferService`:

#### `createTransfer(dto, userId)`
1. Auto-generate `transferNumber`:
   - Query count of existing transfers of this type → pad to 5 digits
   - Format: `TC-OUT-00001` or `TC-IN-00001`
2. For each item, snapshot `qtyOnHandAtTime` from `StockLevel.qtyOnHand`
3. For TRANSFER_OUT: validate that `qtyRequested` ≤ `qtyOnHand` for each product. Throw `BadRequestException` if not.
4. Create `StockTransfer` with status `DRAFT` and nested `StockTransferItem` rows.
5. Return the full transfer with items.

#### `confirmTransfer(transferId, userId)`
1. Load transfer — throw if not DRAFT.
2. For each item:
   - Set `qtyFulfilled = qtyRequested`
   - Call existing `StockService.adjust()` internally:
     - TRANSFER_OUT → `direction: '-'`, `txnType: 'adjustment_out'`, `referenceId: transferNumber`
     - TRANSFER_IN → `direction: '+'`, `txnType: 'adjustment_in'`, `referenceId: transferNumber`
   - Pass `unitCost` if provided.
3. Set `status = CONFIRMED`, `confirmedById`, `confirmedAt = now()`.
4. Return updated transfer.

#### `cancelTransfer(transferId, userId)`
1. Load transfer — throw if already CONFIRMED.
2. Set `status = CANCELLED`, `cancelledById`, `cancelledAt`.
3. Do NOT reverse any stock — only DRAFT transfers can be cancelled (no stock was moved yet).

#### `listTransfers(query)`
- Filters: `transferType`, `status`, `partyName` (contains search), `dateFrom`, `dateTo`
- Pagination: `page`, `limit`
- Order: `transferDate DESC`

#### `getTransfer(transferId)`
- Return full transfer with items, product details (name, code), and user details (createdBy, confirmedBy).

#### `getTransferStats()`
- Return: `{ total, drafts, confirmed, cancelled, totalOut, totalIn }` (counts)

### Controller Endpoints

```
POST   /stock-transfers               → createTransfer        (admin, manager)
GET    /stock-transfers               → listTransfers          (all roles)
GET    /stock-transfers/stats         → getTransferStats       (all roles)
GET    /stock-transfers/:id           → getTransfer            (all roles)
PATCH  /stock-transfers/:id/confirm   → confirmTransfer        (admin, manager)
PATCH  /stock-transfers/:id/cancel    → cancelTransfer         (admin, manager)
```

Register the new module in `AppModule`.

---

## FRONTEND — Next.js

### Pages & File Structure

```
apps/web/src/app/(dashboard)/stock-transfers/
  page.tsx                     ← List page
  new/
    page.tsx                   ← Create Transfer form (OUT or IN)
  [id]/
    page.tsx                   ← Transfer detail / view page
```

### Components

```
apps/web/src/components/stock-transfers/
  TransferListTable.tsx
  TransferStatsBar.tsx
  TransferForm.tsx             ← Shared form for OUT and IN
  TransferItemRow.tsx          ← Single product line in the form
  TransferDetailView.tsx       ← Read-only challan view
  TransferStatusBadge.tsx
  ConfirmTransferModal.tsx
  CancelTransferModal.tsx
```

---

### Page: `/stock-transfers` (List Page)

**Layout** — matches the existing `/stock` page pattern exactly:

- **Header row**: Title "Stock Transfers" + two buttons: `+ New Transfer OUT` (red/danger) and `+ New Transfer IN` (green/success) — both navigate to `/stock-transfers/new?type=TRANSFER_OUT` and `?type=TRANSFER_IN`
- **Stats bar**: 4 cards — Total Transfers | Drafts | Confirmed | Cancelled
- **Filters bar**: Search (partyName) | Type dropdown (All / Out / In) | Status dropdown (All / Draft / Confirmed / Cancelled) | Date range (from / to)
- **Table columns**: Transfer # | Type badge | Party Name | Bill # | Date | Items (count) | Status badge | Actions
- **Actions**: Eye icon → detail page | Confirm button (if DRAFT, admin/manager) | Cancel button (if DRAFT, admin/manager)
- **Pagination**: same previous/next pattern as `/stock`

---

### Page: `/stock-transfers/new` (Create Form)

This is the main new UI. It is a **single-page form** split into two sections.

#### Section 1 — Transfer Header

Display a form card titled based on type:
- TRANSFER_OUT: "New Stock Transfer — Outward" with a red left border accent
- TRANSFER_IN: "New Stock Transfer — Inward" with a green left border accent

Fields in a responsive grid (2–3 columns on desktop):

| Field | Required | Type | Notes |
|---|---|---|---|
| Party Name | ✅ | Text | "Deliver To" (OUT) or "Received From" (IN) |
| Party GST Number | ❌ | Text | Validate GST format (15-char alphanumeric) |
| Party Address | ❌ | Textarea | Full address |
| Transfer Date | ✅ | Date picker | Defaults to today |
| Bill / Invoice Number | ❌ | Text | External doc reference |
| Bill Date | ❌ | Date picker | Date on external bill |
| Transporter Name | ❌ | Text | Courier / lorry service |
| Vehicle / AWB Number | ❌ | Text | Truck number or tracking |
| e-Way Bill Number | ❌ | Text | For large shipments |
| Notes | ❌ | Textarea | Internal notes |

#### Section 2 — Product Line Items

Below the header card, show a **Product Lines** card.

- **Add Product** button opens a search-able dropdown/combobox of all active products (fetched from existing `/products` or `/stock` endpoint)
- Each added product appears as a **table row** with:
  - Product name + code (read-only)
  - Available Qty (read-only, from StockLevel — shown with color: green if >0, red if 0)
  - Requested Qty (number input — for OUT: max = available qty, enforce client-side)
  - Unit Cost (optional number input)
  - Line Notes (optional short text)
  - Remove row button (trash icon)
- Minimum 1 item required to submit
- Show a **running summary** at the bottom right of the table: total line count, total qty

#### Form Footer

- **Save as Draft** button (secondary style) — creates transfer with DRAFT status
- **Save & Confirm** button (primary, colored by type) — creates AND immediately confirms (for quick single-step flow)
- Cancel link → back to list

---

### Page: `/stock-transfers/[id]` (Detail View)

A **read-only challan/document view** that looks like a printable document.

Layout:
- **Top bar**: Back button | Transfer # (large) | Status badge | Action buttons (Confirm / Cancel / Print)
- **Document card** (white, shadow, looks like a real document):
  - **Header section** — two columns:
    - Left: Your company name/logo placeholder, "STOCK TRANSFER CHALLAN", Transfer #, Date
    - Right: Type badge (OUTWARD / INWARD), Party details (name, GST, address)
  - **Reference section** — horizontal row of pills/chips: Bill #, Bill Date, Transporter, Vehicle, e-Way Bill
  - **Items table**:
    - Columns: S.No | Product Name | Product Code | Qty Requested | Qty Fulfilled | Unit Cost | Line Total | Notes
    - Footer row: Total Qty | Total Value
  - **Footer section**: Notes | Created by + date | Confirmed by + date (if applicable)
- **Print button** uses `window.print()` with a print-specific CSS that hides the sidebar/nav

---

## INTEGRATION WITH EXISTING STOCK MODULE

The existing `/stock` page should show a new column or indicator where relevant, but **do not modify the existing table**. Instead:

1. Add a small **"Transfers"** link/button in the existing stock page header that navigates to `/stock-transfers`
2. In `GET /stock/:productId` response, optionally add a `recentTransfers` field (last 5 transfers involving this product) — add this to the existing service without breaking the existing response shape.
3. In `StockTransaction`, when a transfer confirm writes a transaction, set `referenceId = transferNumber` and `notes = "Transfer: {partyName}"` so the existing transaction history tab on the product detail page shows meaningful context.

---

## BUSINESS RULES

1. **DRAFT → CONFIRMED**: Stock moves. This is irreversible via the app.
2. **DRAFT → CANCELLED**: No stock moved. Safe to cancel.
3. **CONFIRMED → CANCELLED**: NOT ALLOWED. Show an error toast.
4. **Transfer OUT**: Cannot request more than available `qtyOnHand`. Validate on both frontend (real-time) and backend (on confirm).
5. **Transfer IN**: No quantity cap. Can receive any amount.
6. **Transfer Number**: Sequential, per type, never reused. Generate in the service using a DB transaction to avoid race conditions (`SELECT COUNT(*) FOR UPDATE` or use Prisma's `$transaction`).
7. **Roles**: `staff` can VIEW transfers. Only `admin` and `manager` can CREATE, CONFIRM, or CANCEL.

---

## NAMING & STYLE CONVENTIONS

Match the existing codebase exactly:

- DTOs: use `class-validator` decorators (`@IsString()`, `@IsOptional()`, `@IsEnum()`, `@IsArray()`, `@ValidateNested()`)
- Services: inject `PrismaService` and `StockService` — follow the existing `StockService` pattern
- Frontend: use the same Tailwind classes, shadcn/ui components (Button, Badge, Input, Select, Table, Card, Dialog), and toast patterns already used in `/stock/page.tsx` and its modals
- API calls: use the same `fetch`/`axios` wrapper or React Query hooks already used in the stock page
- Error handling: same toast error pattern as existing modals
- Guard: same `RolesGuard` and `@Roles()` decorator already used in `StockController`

---

## ACCEPTANCE CRITERIA

- [ ] Can create a TRANSFER_OUT with header details + multiple product lines → saved as DRAFT
- [ ] Can create a TRANSFER_IN with header details + multiple product lines → saved as DRAFT
- [ ] Confirming a TRANSFER_OUT reduces `StockLevel.qtyOnHand` for each product
- [ ] Confirming a TRANSFER_IN increases `StockLevel.qtyOnHand` for each product
- [ ] Each confirmed transfer writes a `StockTransaction` row per product with the transfer number as `referenceId`
- [ ] Cannot confirm a TRANSFER_OUT if any product's requested qty exceeds on-hand
- [ ] Cannot cancel a CONFIRMED transfer
- [ ] Transfer list page filters work correctly
- [ ] Transfer detail page renders correctly and has a working print view
- [ ] Staff can only view, not create or confirm
- [ ] All existing `/stock` endpoints and UI are unchanged

---

## OPTIONAL ENHANCEMENTS (Phase 2)

- **PDF Export**: Generate a proper challan PDF using `@react-pdf/renderer` or `puppeteer`
- **Email Dispatch**: Send challan PDF to party email on confirm
- **Partial Fulfillment**: Allow `qtyFulfilled < qtyRequested` on confirm, with a PARTIAL status
- **Return Transfer**: Link a TRANSFER_IN back to an original TRANSFER_OUT as a return/rejection
- **Barcode on Challan**: Print product barcodes on the detail view
- **Stock Transfer Report**: Date-range report of all movements by party or product
