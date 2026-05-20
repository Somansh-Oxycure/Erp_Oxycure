# Oxycure ERP — BoQ (Bill of Quantities) System Blueprint
## GitHub Copilot Implementation Prompt

---

## 0. Project Context (Read First)

This task extends an existing NestJS + Next.js ERP monorepo (Turborepo).
Before writing a single line of code, read and mirror:

- Existing Prisma models in `prisma/schema.prisma` — follow the exact same
  field naming conventions, relation patterns, and enum definitions already there.
- Existing NestJS modules (e.g., `proposals`, `tickets`) — mirror their folder
  structure: `module.ts`, `controller.ts`, `service.ts`, `dto/`, with no deviation.
- Existing Next.js pages under `app/proposals/[id]/` — the BoQ UI lives here,
  not on a new route. It is a section/panel within the existing proposal detail page.
- Existing TanStack Query hook patterns, API client abstraction, and error handling
  — replicate them exactly. Do not introduce a new data-fetching pattern.
- Existing Tailwind component patterns (StatusBadge, TableSkeleton, ConfirmDialog,
  Toast) — use and extend these. Do not bring in a component library.
- Existing auth context and `useRole()` hook — all role-based visibility rules
  apply here as they do elsewhere.

Do not install new packages unless explicitly noted. Do not create new routes.
Do not alter any existing model's fields — only add new models and relations.

---

## 1. What We Are Building

A BoQ (Bill of Quantities) module that:

1. Is accessible via a "Generate BoQ" button on `/proposals/[id]`
2. Lets the user pick a product type from a list of predefined templates
3. Auto-populates a component list from that template
4. Lets the user edit: add components, remove components, change quantities/prices
5. Saves the BoQ as a structured record tied to the proposal
6. Renders a clean, printable BoQ output for the sales team to share with clients

The BoQ replaces the current manual Excel-based process. It is not an inventory
or procurement system — it is a configurable pricing document.

---

## 2. High-Level Data Flow

```
User opens /proposals/[id]
        │
        ▼
[ Generate BoQ ] button appears if no BoQ exists for this proposal
        │
        ▼
BoQ Builder Panel slides open (within the same page, not a new route)
        │
        ├─ Step 1: Select Product Type
        │     └─ API: GET /boq-templates → list of available product templates
        │           (e.g., ERV, AHU, FCU, VRF, Chiller, Custom)
        │
        ├─ Step 2: Template loads its default components
        │     └─ API: GET /boq-templates/:id → template with components[]
        │
        ├─ Step 3: User edits the component list
        │     └─ Pure client-side state (no API call per edit)
        │           Add row / Remove row / Edit qty, unitPrice, notes
        │
        ├─ Step 4: User saves the BoQ
        │     └─ API: POST /boqs (create) or PATCH /boqs/:id (update)
        │           Payload: { proposalId, templateId?, items[] }
        │
        └─ Step 5: View / Print BoQ
              └─ API: GET /boqs/:id
                    Renders read-only BoQ with totals and print stylesheet
```

---

## 3. Database Schema (Prisma)

Add the following models to `prisma/schema.prisma`.
Follow the exact field types, naming conventions, and relation syntax
already used by `Ticket`, `Proposal`, and `ProposalItem` in the schema.

### 3a. BoQTemplate — the master product catalog

```
Model: BoQTemplate

Purpose: Stores a reusable product type template (e.g., "ERV Unit").
         Admins manage these. Templates are never deleted — they are
         deactivated (isActive: false) to preserve historical BoQs.

Fields to define (follow existing Prisma conventions):
  - id             UUID primary key, auto-generated
  - name           String — human-readable product type name
  - code           String — short code (e.g., ERV, AHU, FCU), unique
  - description    String? — optional explanation shown to users
  - isActive       Boolean, default true
  - createdAt      DateTime, default now()
  - updatedAt      DateTime, updatedAt

Relations:
  - components     BoQTemplateComponent[]  (one template has many default components)
  - boqs           BoQ[]                   (one template can inspire many BoQs)
```

### 3b. BoQTemplateComponent — default components per template

```
Model: BoQTemplateComponent

Purpose: The default list of components for a given template.
         These are COPIED into BoQItem when a BoQ is created —
         the user edits the copy, not the template.

Fields:
  - id             UUID primary key
  - templateId     FK → BoQTemplate
  - name           String — component name (e.g., "Supply Fan Motor")
  - description    String? — optional spec note
  - unit           String — unit of measure (e.g., Nos, Set, RFT, Sqft)
  - defaultQty     Decimal — pre-filled quantity suggestion
  - sortOrder      Int — display order within the template
  - isOptional     Boolean, default false — if true, shown greyed out by default

Relations:
  - template       BoQTemplate (belongsTo)
```

### 3c. BoQ — the actual BoQ document tied to a proposal

```
Model: BoQ

Purpose: One BoQ per proposal. Created when the user clicks "Generate BoQ".
         Can be edited while in draft. Locked when proposal is accepted.

Fields:
  - id             UUID primary key
  - boqNumber      String, unique — auto-generated, format: BOQ-YYYY-NNNN
                   Follow the exact same auto-numbering pattern used for
                   proposalNumber in proposals.service.ts
  - proposalId     FK → Proposal (unique — one proposal, one BoQ)
  - templateId     FK → BoQTemplate? (nullable — user may build a custom BoQ
                   without selecting a template)
  - status         Enum: BoQStatus (draft | final | archived)
                   draft   → editable
                   final   → read-only, can be printed
                   archived → soft-deleted
  - notes          String? — overall BoQ notes
  - preparedById   FK → User — who created this BoQ
  - totalAmount    Decimal — recomputed and stored on every save
  - createdAt      DateTime
  - updatedAt      DateTime

Relations:
  - proposal       Proposal (belongsTo) — add `boq BoQ?` back-relation on Proposal
  - template       BoQTemplate? (belongsTo)
  - items          BoQItem[]
  - preparedBy     User (belongsTo)
```

### 3d. BoQItem — the individual line items of a BoQ

```
Model: BoQItem

Purpose: Each row in the BoQ table. Copied from template components and
         then freely editable. Can also be added from scratch.

Fields:
  - id                UUID primary key
  - boqId             FK → BoQ
  - templateComponentId FK → BoQTemplateComponent? (nullable — custom rows
                        have no template origin)
  - name              String — editable component name
  - description       String? — spec detail or make/model note
  - unit              String — unit of measure
  - quantity          Decimal
  - unitRate          Decimal — rate per unit
  - totalPrice        Decimal — computed: quantity × unitRate (stored, not virtual)
  - remarks           String? — site-specific note
  - sortOrder         Int — drag-and-drop order
  - isOptional        Boolean, default false
  - isIncluded        Boolean, default true — user can uncheck optional items

Relations:
  - boq               BoQ (belongsTo)
  - templateComponent BoQTemplateComponent? (belongsTo)
```

### 3e. Add relation on Proposal

```
On the existing Proposal model, add:
  boq    BoQ?

This is the only change to an existing model.
```

### 3f. BoQStatus Enum

```
enum BoQStatus {
  draft
  final
  archived
}
```

---

## 4. Backend — NestJS Module

Create `apps/api/src/boq/` following the exact folder structure of
`apps/api/src/proposals/`. File for file. Mirror the module registration
pattern in `app.module.ts`.

### 4a. Module structure

```
apps/api/src/boq/
  ├── boq.module.ts
  ├── boq.controller.ts
  ├── boq.service.ts
  └── dto/
        ├── create-boq.dto.ts
        ├── update-boq.dto.ts
        └── update-boq-status.dto.ts

apps/api/src/boq-templates/
  ├── boq-templates.module.ts
  ├── boq-templates.controller.ts
  ├── boq-templates.service.ts
  └── dto/
        ├── create-boq-template.dto.ts
        └── update-boq-template.dto.ts
```

### 4b. BoQ Templates API

```
GET  /boq-templates
     - Returns all active templates (isActive: true)
     - Include component count but NOT the full component list (for list performance)
     - Accessible to all authenticated roles

GET  /boq-templates/:id
     - Returns one template with its full components[] array
     - Components sorted by sortOrder ASC
     - Accessible to all authenticated roles

POST /boq-templates
     - Admin only (guard with existing role guard pattern)
     - Body: CreateBoQTemplateDto
       { name, code, description, components: [{ name, description, unit,
         defaultQty, sortOrder, isOptional }] }

PATCH /boq-templates/:id
     - Admin only
     - Partial update: can update template fields and/or replace component list
     - If components[] is provided in the body, replace the entire component
       list (delete old, insert new) — same pattern as UpdateProposalDto replaces
       ProposalItems in the existing proposals.service.ts

PATCH /boq-templates/:id/deactivate
     - Admin only
     - Sets isActive: false — never hard-delete templates
```

### 4c. BoQ API

```
GET  /boqs
     - Role-scoped exactly like /proposals:
       admin/manager → all BoQs
       salesperson   → only BoQs whose proposal.ticket is assigned to them
     - Filters: status, proposalId, templateId, preparedById
     - Returns list with: id, boqNumber, status, totalAmount, proposal summary,
       template name, preparedBy name, createdAt

GET  /boqs/:id
     - Returns full BoQ with items[] sorted by sortOrder
     - Include: proposal (with client name, project name), template name,
       preparedBy name
     - Accessible to roles that can see the related proposal

POST /boqs
     - Body: CreateBoQDto
       { proposalId, templateId? }
     - Service logic:
       1. Verify the proposal exists and the caller has access to it
       2. Verify no BoQ exists yet for this proposal (unique constraint —
          throw ConflictException using the existing prisma-error.util pattern)
       3. Auto-generate boqNumber using the same pattern as proposalNumber
       4. If templateId is provided, fetch the template's components and
          create BoQItems from them (copy name, description, unit, defaultQty
          as quantity, sortOrder, isOptional; set isIncluded: true;
          set unitRate: 0 and totalPrice: 0 — user fills pricing)
       5. Set status: draft
       6. Set totalAmount: 0
       7. Return the created BoQ with items

PATCH /boqs/:id
     - Only allowed when status === draft (throw BadRequestException otherwise)
     - Body: UpdateBoQDto
       { notes?, items?: [{ id?, name, description, unit, quantity,
         unitRate, remarks, sortOrder, isOptional, isIncluded,
         templateComponentId? }] }
     - If items[] is provided:
       1. Delete all existing BoQItems for this BoQ
       2. Re-insert the items array
       3. Compute totalPrice per item: quantity × unitRate
       4. Recompute totalAmount: sum of totalPrice where isIncluded: true
     - Do not accept totalPrice or totalAmount from the client — always compute them

PATCH /boqs/:id/status
     - Body: UpdateBoQStatusDto { status: BoQStatus }
     - Enforce transition map (same pattern as proposals status guard):
       draft   → final
       final   → archived
       archived → (terminal)
     - When transitioning to final: lock items (status becomes read-only)
     - Return updated BoQ

DELETE /boqs/:id
     - Soft-delete: set status: archived
     - Admin only
     - Do not hard-delete
```

### 4d. Service layer rules (boq.service.ts)

```
- All Prisma errors must pass through the existing handlePrismaError() utility
- All write operations must verify the caller's role and ownership using the
  same role-scoping pattern used in proposals.service.ts
- totalAmount computation is always done server-side, never trusted from client
- boqNumber generation must use the same retry-on-collision pattern already
  implemented for proposalNumber
- When a BoQ is finalized (status → final), check if the linked Proposal
  is in 'accepted' state. If not, simply allow finalization without
  changing proposal state — BoQ finalization is independent of proposal status
  at this stage
```

---

## 5. Frontend — UI Blueprint

The BoQ UI lives entirely within the existing `/proposals/[id]` page.
Do not create a new route or a new top-level page.

### 5a. Entry point — proposal detail page

```
Location: apps/web/app/proposals/[id]/page.tsx (existing file)

Add below the existing proposal detail content:

┌─────────────────────────────────────────────────────────────┐
│  Bill of Quantities                                          │
│                                                             │
│  [No BoQ generated yet]           [ Generate BoQ ] button   │
│                                                             │
│  OR if BoQ exists:                                          │
│                                                             │
│  BOQ-2026-0001  ·  draft  ·  ₹X,XX,XXX    [ Edit ] [ View ]│
└─────────────────────────────────────────────────────────────┘

Rules:
- "Generate BoQ" button: hidden for 'installer' role (use useRole() hook)
- "Generate BoQ" button: disabled if proposal status is 'rejected' or 'expired'
- When clicked: open the BoQ Builder Panel (see 5b)
- If BoQ exists and status is 'draft': show [ Edit BoQ ] and [ Finalize ] buttons
- If BoQ exists and status is 'final': show [ View BoQ ] and [ Print ] buttons
- Fetch BoQ data via: GET /boqs?proposalId={id} using existing TanStack Query
  pattern — create a useBoQ(proposalId) hook following the pattern of useProposal()
```

### 5b. BoQ Builder Panel

```
Component: components/boq/BoQBuilderPanel.tsx

This is a full-width collapsible panel (not a modal — modals are bad UX for
data entry heavy workflows). It renders below the proposal header.

Use a slide-down / expand animation (CSS transition, no animation library).

Panel structure:
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Select Product Type                                │
│  ┌──────────────────────────────┐                          │
│  │  [ Dropdown: product type ] ▼│  or  [ Skip / Custom ]  │
│  └──────────────────────────────┘                          │
│                                                             │
│  Step 2: Component List                                     │
│  ┌────┬──────────────┬──────┬──────┬────────┬──────┬────┐  │
│  │ #  │ Component    │ Unit │ Qty  │ Rate   │ Total│ ✕  │  │
│  ├────┼──────────────┼──────┼──────┼────────┼──────┼────┤  │
│  │ 1  │ [editable]   │[ed.] │[ed.] │ [ed.]  │ auto │ ✕  │  │
│  │    │ optional rows shown greyed out with checkbox     │  │
│  ├────┴──────────────┴──────┴──────┴────────┴──────┴────┤  │
│  │ [ + Add Component ]                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Notes: [textarea]                                         │
│                                                             │
│  ┌──────────────────────────┐  Total: ₹ X,XX,XXX          │
│  │ [ Cancel ]  [ Save BoQ ] │                              │
│  └──────────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### 5c. State management for the builder

```
Use a single useReducer hook inside BoQBuilderPanel for all editable state.
Do NOT use server state (TanStack Query) for in-flight edits — only use it
for the initial load and the final save.

State shape (mirrors BoQItem structure, not Prisma directly):
{
  selectedTemplateId: string | null,
  notes: string,
  items: BoQItemDraft[]
}

BoQItemDraft: {
  localId: string          // temp client-side ID (use crypto.randomUUID())
  templateComponentId: string | null
  name: string
  description: string
  unit: string
  quantity: number
  unitRate: number
  totalPrice: number       // derived: quantity * unitRate, computed in reducer
  remarks: string
  sortOrder: number
  isOptional: boolean
  isIncluded: boolean
}

Reducer actions:
  LOAD_TEMPLATE_ITEMS  — replaces items[] with template's components (mapped to drafts)
  ADD_ITEM             — appends a blank item row
  REMOVE_ITEM          — removes by localId
  UPDATE_ITEM          — patches one item by localId, recomputes totalPrice
  TOGGLE_INCLUDED      — toggles isIncluded for optional items
  REORDER_ITEMS        — updates sortOrder after drag (if drag-to-reorder is added later)
  SET_NOTES            — updates notes string
  RESET                — clears all state back to initial

Derived value (computed in render, not in state):
  grandTotal = items.filter(i => i.isIncluded).reduce((sum, i) => sum + i.totalPrice, 0)

On "Save BoQ":
  1. Show loading state on button (isPending from mutation)
  2. Map BoQItemDraft[] to the API payload shape
  3. Call POST /boqs (if creating) or PATCH /boqs/:id (if editing)
  4. On success: show toast, collapse panel, refetch proposal data
  5. On error: show toast with error message, keep panel open
```

### 5d. BoQ View / Print panel

```
Component: components/boq/BoQViewPanel.tsx

Rendered when BoQ status is 'final' or when user clicks "View".
This is read-only.

Layout:
┌────────────────────────────────────────────────────────────┐
│  BILL OF QUANTITIES                                        │
│  BOQ-2026-0001                        Date: DD/MM/YYYY     │
│  Project: [project name]                                   │
│  Client:  [client name]                                    │
│  Prepared by: [user name]                                  │
│                                                            │
│  ┌────┬─────────────────────┬──────┬──────┬───────┬──────┐ │
│  │ #  │ Description         │ Unit │  Qty │ Rate  │Total │ │
│  ├────┼─────────────────────┼──────┼──────┼───────┼──────┤ │
│  │ 1  │ [name + description]│      │      │       │      │ │
│  └────┴─────────────────────┴──────┴──────┴───────┴──────┘ │
│                                                            │
│  Notes: [...]                               Total: ₹X,XXX  │
│                                                            │
│  [ ← Back to Proposal ]              [ 🖨 Print BoQ ]      │
└────────────────────────────────────────────────────────────┘

Print behaviour:
- Add a @media print stylesheet (in the component's style block or a
  global print.css) that:
  - Hides: sidebar, navbar, all buttons except the BoQ table
  - Shows: the BoQ panel only, full width
  - Adds a page-break-inside: avoid on table rows
  - Renders in black-and-white friendly contrast
- "Print BoQ" button calls window.print() — no PDF library needed at this stage
```

### 5e. TanStack Query hooks to create

```
Follow the exact pattern of existing hooks like useProposal(), useProposals().
Create in apps/web/hooks/boq/ or alongside existing query hooks.

Hooks:
  useBoQTemplates()         — GET /boq-templates, staleTime: 5 minutes (templates
                              rarely change, cache aggressively)
  useBoQTemplate(id)        — GET /boq-templates/:id, enabled: !!id
  useProposalBoQ(proposalId)— GET /boqs?proposalId={id}, returns first result or null
  useBoQ(id)                — GET /boqs/:id
  useCreateBoQ()            — mutation: POST /boqs
  useUpdateBoQ(id)          — mutation: PATCH /boqs/:id
  useFinalizeBoQ(id)        — mutation: PATCH /boqs/:id/status { status: 'final' }

On mutation success in useCreateBoQ and useUpdateBoQ:
  - Invalidate: ['boqs', proposalId] and ['proposals', proposalId]
    (so the proposal page reflects the linked BoQ immediately)
```

---

## 6. Template Management (Admin UI)

```
Location: Add a "BoQ Templates" link in the existing admin settings section
          or sidebar — wherever other admin config lives in the current UI.

Route: /settings/boq-templates  (create this page)

List page:
  - Table of all templates (active + inactive)
  - Columns: Code, Name, Component Count, Status (active/inactive), Actions
  - "New Template" button → opens TemplateFormPanel (inline, not modal)

Template form panel:
  Component: components/boq/BoQTemplateForm.tsx

  Fields:
    - Name (required)
    - Code (required, auto-uppercased)
    - Description (optional)
    - Component list (same editable table pattern as BoQ builder):
        name, unit, defaultQty, isOptional, sortOrder
    - [ Add Component ] row button

  On save: POST /boq-templates or PATCH /boq-templates/:id
  On deactivate: PATCH /boq-templates/:id/deactivate (with ConfirmDialog)
```

---

## 7. Role & Permission Matrix

```
Apply using the existing useRole() hook and role guards.

Action                        admin  manager  salesperson  installer
─────────────────────────────────────────────────────────────────────
View BoQ on proposal           ✓       ✓          ✓*          ✗
Generate / Create BoQ          ✓       ✓          ✓*          ✗
Edit BoQ (draft only)          ✓       ✓          ✓*          ✗
Finalize BoQ                   ✓       ✓          ✗           ✗
Print BoQ                      ✓       ✓          ✓*          ✗
Manage BoQ Templates           ✓       ✗          ✗           ✗

* salesperson: only if the proposal's ticket is assigned to them
  (same scoping rule as existing proposals access)
```

---

## 8. Indian Currency Formatting

```
Reuse the existing INR formatting utility already in the project
(or create formatINR(amount: number): string if not yet present).

Pattern: amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

Apply this to all monetary fields in:
  - BoQ builder totals
  - BoQ view panel
  - The BoQ summary card on the proposal detail page
```

---

## 9. Error States & Loading States

```
Follow existing patterns exactly:

Loading:
  - Use TableSkeleton component for the component list while template loads
  - Disable "Save BoQ" button with isPending from mutation hook

Empty states:
  - If no templates exist: show empty state in dropdown with message
    "No product templates configured. Contact your admin."
  - Use existing empty state UI pattern (icon + message + optional CTA)

Errors:
  - All API errors → use existing Toast system (error variant)
  - Conflict (BoQ already exists): show specific message
    "A BoQ already exists for this proposal."
  - Network errors: mirror existing onError handler in QueryClient config

Validation (client-side before save):
  - At least one item must exist with isIncluded: true
  - All included items must have name and unit filled
  - quantity and unitRate must be positive numbers
  - Show inline errors below offending fields (existing red text pattern)
  - Do not call the API if validation fails
```

---

## 10. Extensibility Notes for Future Phases

```
Write these as inline code comments in the relevant files.
Do not implement them — document the intent only.

In boq.service.ts:
  // FUTURE: When inventory module is added, resolve BoQItems against
  // the product catalogue to check stock availability before finalizing.

In BoQItem model:
  // FUTURE: Add `catalogueItemId FK → CatalogueItem` to link items
  // to a central product/parts database without changing the BoQItem structure.

In BoQTemplateComponent model:
  // FUTURE: Add `defaultUnitRate Decimal?` to pre-fill pricing from a
  // price list, allowing the service to auto-populate unitRate on BoQ creation.

In boq.controller.ts:
  // FUTURE: Add GET /boqs/:id/export endpoint that returns a structured
  // JSON payload for PDF generation (via a separate PDF microservice).
```

---

## 11. File Creation Checklist for Copilot

### Backend (`apps/api/src/`)

- [ ] `boq-templates/boq-templates.module.ts`
- [ ] `boq-templates/boq-templates.controller.ts`
- [ ] `boq-templates/boq-templates.service.ts`
- [ ] `boq-templates/dto/create-boq-template.dto.ts`
- [ ] `boq-templates/dto/update-boq-template.dto.ts`
- [ ] `boq/boq.module.ts`
- [ ] `boq/boq.controller.ts`
- [ ] `boq/boq.service.ts`
- [ ] `boq/dto/create-boq.dto.ts`
- [ ] `boq/dto/update-boq.dto.ts`
- [ ] `boq/dto/update-boq-status.dto.ts`

### Database

- [ ] `prisma/schema.prisma` — add `BoQTemplate`, `BoQTemplateComponent`, `BoQ`, `BoQItem` models and `BoQStatus` enum. Add `boq BoQ?` relation on `Proposal`.
- [ ] Run: `npx prisma migrate dev --name add_boq_module`
- [ ] Run: `npx prisma generate`

### Frontend (`apps/web/`)

- [ ] `types/api.ts` — add `BoQTemplate`, `BoQTemplateComponent`, `BoQ`, `BoQItem`, `BoQItemDraft` TypeScript interfaces
- [ ] `hooks/boq/useBoQTemplates.ts`
- [ ] `hooks/boq/useBoQTemplate.ts`
- [ ] `hooks/boq/useProposalBoQ.ts`
- [ ] `hooks/boq/useBoQ.ts`
- [ ] `hooks/boq/useCreateBoQ.ts`
- [ ] `hooks/boq/useUpdateBoQ.ts`
- [ ] `hooks/boq/useFinalizeBoQ.ts`
- [ ] `hooks/boq/useBoQReducer.ts` ← the useReducer logic
- [ ] `components/boq/BoQBuilderPanel.tsx`
- [ ] `components/boq/BoQViewPanel.tsx`
- [ ] `components/boq/BoQTemplateForm.tsx`
- [ ] `app/settings/boq-templates/page.tsx`
- [ ] Modify: `app/proposals/[id]/page.tsx` — add BoQ section

---

## 12. Constraints Summary

### DO

- ✓ Mirror every existing pattern exactly — naming, structure, error handling
- ✓ Compute all financial totals server-side on save
- ✓ Use `useReducer` for the builder's client state
- ✓ Use the existing `handlePrismaError()` utility in all service catch blocks
- ✓ Use the existing role guard decorators on all controller endpoints
- ✓ Use the existing Toast, ConfirmDialog, TableSkeleton, StatusBadge components
- ✓ Add `// FUTURE:` comments at extensibility points — do not implement them

### DO NOT

- ✗ Create a standalone `/boq` route — BoQ lives inside `/proposals/[id]`
- ✗ Accept `totalPrice` or `totalAmount` from the client body — compute only
- ✗ Hard-delete any BoQ or template — soft-delete or deactivate only
- ✗ Install new npm packages
- ✗ Add fields to existing Prisma models except the single `boq BoQ?` back-relation on `Proposal`
- ✗ Introduce a new state management library or data-fetching pattern
- ✗ Build inventory, stock, or procurement logic — that is a future phase
