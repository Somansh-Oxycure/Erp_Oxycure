# Oxycure ERP — Test Plan

> Run the **Pre-Deploy** column on staging, then run the **Post-Deploy** column on the live URL.
> Mark each item ✅ Pass | ❌ Fail | ⚠️ Partial

---

## Test Environment Setup

| Item | Pre-Deploy (Staging) | Post-Deploy (Live) |
|------|----------------------|---------------------|
| URL | `http://localhost:3000` | `https://<your-domain.com>` |
| API | `http://localhost:3001/api` | `https://<your-api-domain.com>/api` |
| DB  | Local Docker postgres | Production postgres |
| Admin user ready | ✅ (from seed) | ✅ (from seed) |
| Test salesperson user ready | Create manually | Create manually |

---

## 1. Authentication

### 1.1 Login
| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 1.1.1 | Login with valid admin credentials | Redirect to dashboard, JWT cookie set | ⬜ | ⬜ |
| 1.1.2 | Login with invalid password | Error toast: "Invalid credentials" | ⬜ | ⬜ |
| 1.1.3 | Login with non-existent email | Error toast: "Invalid credentials" | ⬜ | ⬜ |
| 1.1.4 | Submit login form empty | Validation errors on required fields | ⬜ | ⬜ |
| 1.1.5 | Login page is accessible without auth | Login form renders correctly | ⬜ | ⬜ |

### 1.2 Session & Token
| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 1.2.1 | Access `/` while logged in | Dashboard loads | ⬜ | ⬜ |
| 1.2.2 | Access `/` while logged out | Redirect to `/login` | ⬜ | ⬜ |
| 1.2.3 | JWT access token expires (wait 15 min or shorten JWT_EXPIRY) | Refresh token silently renews session | ⬜ | ⬜ |
| 1.2.4 | Logout | Redirect to `/login`, tokens cleared, subsequent API calls fail | ⬜ | ⬜ |

### 1.3 Role-Based Access
| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 1.3.1 | Salesperson visits `/users` | Redirect or 403 error | ⬜ | ⬜ |
| 1.3.2 | Salesperson visits `/settings/boq-templates` | Redirect or 403 error | ⬜ | ⬜ |
| 1.3.3 | Admin visits all pages | All pages accessible | ⬜ | ⬜ |
| 1.3.4 | Salesperson sidebar | Users and BoQ Templates links hidden | ⬜ | ⬜ |

---

## 2. Dashboard

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 2.1 | Dashboard loads | KPI cards render (Tickets, Proposals, Orders, Stock Alerts) | ⬜ | ⬜ |
| 2.2 | KPI numbers are accurate | Numbers match DB data | ⬜ | ⬜ |
| 2.3 | Charts render | No blank chart areas | ⬜ | ⬜ |
| 2.4 | Sidebar navigation visible | All 13 nav items shown for admin | ⬜ | ⬜ |
| 2.5 | Sidebar collapse/expand | Sidebar collapses on toggle | ⬜ | ⬜ |
| 2.6 | Active route highlighted | Current page has sky-500 accent in sidebar | ⬜ | ⬜ |

---

## 3. Users Management (Admin/Manager only)

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 3.1 | `/users` page loads | Table with all users visible | ⬜ | ⬜ |
| 3.2 | Create new user | Modal opens, form validates, user appears in table | ⬜ | ⬜ |
| 3.3 | Create user with duplicate email | Error: email already exists | ⬜ | ⬜ |
| 3.4 | Toggle user active/inactive | Status badge updates, user cannot login when inactive | ⬜ | ⬜ |
| 3.5 | Role badge displays correctly | Admin = "admin", Salesperson = "salesperson", etc. | ⬜ | ⬜ |
| 3.6 | New user can login | Freshly created user logs in successfully | ⬜ | ⬜ |

---

## 4. Customers

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 4.1 | `/customers` page loads | Customer table renders | ⬜ | ⬜ |
| 4.2 | Search customers by name | Filtered results appear | ⬜ | ⬜ |
| 4.3 | Create new customer | Form validates, customer added to table | ⬜ | ⬜ |
| 4.4 | Edit customer details | Changes saved and reflected | ⬜ | ⬜ |
| 4.5 | Customer type badge | Individual / Business / Hospital renders correctly | ⬜ | ⬜ |

---

## 5. Tickets (CRM Pipeline)

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 5.1 | `/tickets` page loads | Ticket table visible with filters | ⬜ | ⬜ |
| 5.2 | Create new ticket | Modal opens, fills correctly, ticket created with reference ID | ⬜ | ⬜ |
| 5.3 | Reference ID auto-generated | Format: `TKT-2526-0001` (FY-based) | ⬜ | ⬜ |
| 5.4 | Filter by status | Only tickets with that status shown | ⬜ | ⬜ |
| 5.5 | Filter by priority | Only matching priority shown | ⬜ | ⬜ |
| 5.6 | Open ticket detail panel | Side panel shows notes, follow-ups, history | ⬜ | ⬜ |
| 5.7 | Add note to ticket | Note appears in the ticket detail | ⬜ | ⬜ |
| 5.8 | Add follow-up task | Follow-up appears with due date | ⬜ | ⬜ |
| 5.9 | Mark follow-up complete | Status changes to completed | ⬜ | ⬜ |
| 5.10 | Change ticket status | Status updates, history log shows the change | ⬜ | ⬜ |
| 5.11 | `/crm` Kanban board loads | Columns for each status, tickets as cards | ⬜ | ⬜ |
| 5.12 | Drag ticket to new column | Ticket status updates | ⬜ | ⬜ |

---

## 6. Proposals

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 6.1 | `/proposals` page loads | Proposal list with status and amounts | ⬜ | ⬜ |
| 6.2 | Generate new proposal from a ticket | Proposal creation form opens, linked to ticket | ⬜ | ⬜ |
| 6.3 | Add proposal items/products | Line items with quantity, rate, total calculated | ⬜ | ⬜ |
| 6.4 | Totals calculated correctly | Subtotal, tax, grand total auto-computed | ⬜ | ⬜ |
| 6.5 | Save proposal as draft | Status = draft, visible in list | ⬜ | ⬜ |
| 6.6 | Change proposal status to Sent | Status updates to "sent" | ⬜ | ⬜ |
| 6.7 | Download proposal as DOCX | File downloads successfully, content is correct | ⬜ | ⬜ |
| 6.8 | Upload file attachment to proposal | File attached, downloadable | ⬜ | ⬜ |
| 6.9 | View proposal detail panel | Notes, follow-ups, items visible | ⬜ | ⬜ |
| 6.10 | Mark proposal as Accepted/Rejected | Status changes, reflected in list | ⬜ | ⬜ |
| 6.11 | Filter proposals by status | Correct subset shown | ⬜ | ⬜ |
| 6.12 | Amount formatting in INR | Amounts display as ₹1,00,000 format | ⬜ | ⬜ |

---

## 7. Design Specifications

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 7.1 | `/design-specs` page loads | Spec cards visible with status tabs | ⬜ | ⬜ |
| 7.2 | Create new design spec | Form validates, spec created linked to ticket | ⬜ | ⬜ |
| 7.3 | Filter by status (Requested / In Progress / Completed) | Correct specs shown | ⬜ | ⬜ |
| 7.4 | View design spec detail | Full spec details open | ⬜ | ⬜ |
| 7.5 | Update design spec status | Status changes reflect on card | ⬜ | ⬜ |
| 7.6 | Role-based actions | Design engineers see relevant actions | ⬜ | ⬜ |

---

## 8. Quotations

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 8.1 | `/quotations` page loads | Table with status badges | ⬜ | ⬜ |
| 8.2 | Create quotation | Form saves with line items | ⬜ | ⬜ |
| 8.3 | Quotation totals correct | Sum of line items matches | ⬜ | ⬜ |
| 8.4 | Change status to Accepted | Status updates | ⬜ | ⬜ |
| 8.5 | Expired status badge | Expired quotations show "expired" badge | ⬜ | ⬜ |

---

## 9. Orders

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 9.1 | `/orders` page loads | Orders table renders | ⬜ | ⬜ |
| 9.2 | Create order | Form saves, order appears | ⬜ | ⬜ |
| 9.3 | Order status flow | Created → Confirmed → In Progress → Completed | ⬜ | ⬜ |
| 9.4 | Order line items | Items with quantities and amounts visible | ⬜ | ⬜ |
| 9.5 | Cancel order | Status = Cancelled, cannot proceed | ⬜ | ⬜ |

---

## 10. Product Catalog

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 10.1 | `/catalog` page loads | Product grid renders | ⬜ | ⬜ |
| 10.2 | Toggle Grid / List view | View changes correctly | ⬜ | ⬜ |
| 10.3 | Search products by name | Filtered results appear | ⬜ | ⬜ |
| 10.4 | Filter by product type | Air Purifier / Moscure / HVAC, etc. | ⬜ | ⬜ |
| 10.5 | Create new product | Modal opens, product saved with category/unit | ⬜ | ⬜ |
| 10.6 | Edit product | Changes saved | ⬜ | ⬜ |
| 10.7 | Product status toggle (Active / Discontinued) | Status updates | ⬜ | ⬜ |
| 10.8 | Product specifications saved | Technical specs visible on product card | ⬜ | ⬜ |
| 10.9 | Product categories listed correctly | Category picker in product form | ⬜ | ⬜ |
| 10.10 | Units of measure assigned | Unit dropdown in product form | ⬜ | ⬜ |

---

## 11. Stock Management

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 11.1 | `/stock` page loads | Stock level table with product names | ⬜ | ⬜ |
| 11.2 | Current stock levels visible | Quantity, min-level, reorder level shown | ⬜ | ⬜ |
| 11.3 | Record stock-in (GRN) | Stock quantity increases, transaction logged | ⬜ | ⬜ |
| 11.4 | Record stock adjustment (out) | Stock decreases, transaction logged | ⬜ | ⬜ |
| 11.5 | Stock goes below minimum level | Alert triggered (check alerts page) | ⬜ | ⬜ |
| 11.6 | View stock transaction history | All movements shown with type and date | ⬜ | ⬜ |
| 11.7 | Search/filter by product | Correct product stock shown | ⬜ | ⬜ |

---

## 12. Stock Transfers

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 12.1 | `/stock-transfers` page loads | Transfer list visible | ⬜ | ⬜ |
| 12.2 | Create new transfer | From-location → To-location, items selected | ⬜ | ⬜ |
| 12.3 | Confirm transfer | Status changes to CONFIRMED, stock levels updated | ⬜ | ⬜ |
| 12.4 | Cancel transfer | Status = CANCELLED, stock levels unchanged | ⬜ | ⬜ |
| 12.5 | Transfer history visible | Previous transfers listed | ⬜ | ⬜ |
| 12.6 | Transfer items listed correctly | Product, quantity in transfer detail | ⬜ | ⬜ |

---

## 13. Suppliers

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 13.1 | `/stock/suppliers` page loads | Supplier list renders | ⬜ | ⬜ |
| 13.2 | Create supplier | Form saves with contact details | ⬜ | ⬜ |
| 13.3 | Edit supplier | Changes saved | ⬜ | ⬜ |
| 13.4 | Delete supplier | Supplier removed (or deactivated) | ⬜ | ⬜ |
| 13.5 | Supplier status (Active/Inactive) | Status badge updates | ⬜ | ⬜ |
| 13.6 | Supplier linked to products | Product-supplier mapping works | ⬜ | ⬜ |

---

## 14. Purchase Orders

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 14.1 | `/stock/purchase-orders` page loads | PO list renders | ⬜ | ⬜ |
| 14.2 | Create new PO | Linked to supplier, items added | ⬜ | ⬜ |
| 14.3 | PO reference number auto-generated | Format: `PO-2526-0001` | ⬜ | ⬜ |
| 14.4 | Send PO | Status changes to "sent" | ⬜ | ⬜ |
| 14.5 | Mark items as received | PO becomes "received", stock GRN created | ⬜ | ⬜ |
| 14.6 | Partial receipt | Status = "partially_received", stock updated for received qty | ⬜ | ⬜ |
| 14.7 | Cancel PO | Status = cancelled | ⬜ | ⬜ |
| 14.8 | Role-based: salesperson cannot create PO | 403 response on POST | ⬜ | ⬜ |

---

## 15. Stock Alerts

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 15.1 | `/stock/alerts` page loads | Alert logs and rules visible | ⬜ | ⬜ |
| 15.2 | Create low_stock alert rule | Rule saved for a product | ⬜ | ⬜ |
| 15.3 | Alert triggered when stock drops below min | Alert log appears with status "open" | ⬜ | ⬜ |
| 15.4 | Acknowledge alert | Status changes to "acknowledged" | ⬜ | ⬜ |
| 15.5 | Resolve alert | Status changes to "resolved" | ⬜ | ⬜ |
| 15.6 | Overstock alert rule | Alert fires when quantity exceeds threshold | ⬜ | ⬜ |

---

## 16. BoQ Templates (Admin/Manager only)

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 16.1 | `/settings/boq-templates` page loads | Template list renders | ⬜ | ⬜ |
| 16.2 | Create new BoQ template | Template saved with name and status | ⬜ | ⬜ |
| 16.3 | Add component to template | Component added with product/quantity | ⬜ | ⬜ |
| 16.4 | Edit template | Changes saved | ⬜ | ⬜ |
| 16.5 | Use template in a BoQ | Template components populate the BoQ | ⬜ | ⬜ |
| 16.6 | Archive template | Status changes to "archived", no longer selectable | ⬜ | ⬜ |
| 16.7 | Salesperson cannot access | 403 or redirect | ⬜ | ⬜ |

---

## 17. Settings Page

| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 17.1 | `/settings` page loads | Settings hub renders | ⬜ | ⬜ |
| 17.2 | Settings links navigate correctly | All sub-links go to correct pages | ⬜ | ⬜ |
| 17.3 | Units of measure listed | All units visible (pcs, kg, ltr, mtr, set, box, roll) | ⬜ | ⬜ |

---

## 18. Cross-Cutting Concerns

### 18.1 API & Network
| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 18.1.1 | All API calls use HTTPS in production | No mixed-content errors in browser console | — | ⬜ |
| 18.1.2 | CORS headers present | API responds to frontend domain, no CORS errors | ⬜ | ⬜ |
| 18.1.3 | Rate limiting works | 11th request within 1 sec returns 429 Too Many Requests | ⬜ | ⬜ |
| 18.1.4 | Unauthorized API call | Returns 401, not 500 | ⬜ | ⬜ |
| 18.1.5 | Accessing admin endpoint as salesperson | Returns 403 | ⬜ | ⬜ |
| 18.1.6 | Invalid request body | Returns 400 with validation messages | ⬜ | ⬜ |

### 18.2 UI/UX
| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 18.2.1 | Loading skeletons show on slow network | TableSkeleton visible while fetching | ⬜ | ⬜ |
| 18.2.2 | Empty state shown when no data | "No results" / empty state renders, not blank | ⬜ | ⬜ |
| 18.2.3 | Success toast on create/update | Sonner toast appears | ⬜ | ⬜ |
| 18.2.4 | Error toast on API failure | Error toast with message appears | ⬜ | ⬜ |
| 18.2.5 | Confirm dialog before delete | ConfirmDialog shown, cancel works | ⬜ | ⬜ |
| 18.2.6 | Responsive on tablet (768px) | No horizontal scroll, layout intact | ⬜ | ⬜ |
| 18.2.7 | Responsive on mobile (390px) | Core content readable | ⬜ | ⬜ |

### 18.3 Data Integrity
| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 18.3.1 | Decimal quantities stored correctly | 3 decimal precision (e.g., 1.250 kg) | ⬜ | ⬜ |
| 18.3.2 | Decimal amounts stored correctly | 2 decimal precision (e.g., ₹10,500.00) | ⬜ | ⬜ |
| 18.3.3 | FY-based reference counters | TKT-2526-0001, PO-2526-0001 after April 1 → TKT-2627-0001 | ⬜ | ⬜ |
| 18.3.4 | Audit log entries created | Create/update/delete actions logged in AuditLog | ⬜ | ⬜ |

### 18.4 Security
| # | Test Case | Expected Result | Pre | Post |
|---|-----------|----------------|-----|------|
| 18.4.1 | Swagger UI not accessible in production | `/api/docs` returns 404 | — | ⬜ |
| 18.4.2 | Passwords not returned in API responses | `GET /api/users` does not include `password` field | ⬜ | ⬜ |
| 18.4.3 | Helmet headers present | `X-Content-Type-Options`, `X-Frame-Options` in response headers | ⬜ | ⬜ |
| 18.4.4 | JWT token not in localStorage | Token stored in httpOnly cookie or memory only | ⬜ | ⬜ |
| 18.4.5 | SQL injection attempt in search | Returns 400 or empty result, not 500 | ⬜ | ⬜ |

---

## 19. End-to-End Business Flows

These are the critical workflows that combine multiple modules:

| # | Flow | Steps | Pre | Post |
|---|------|-------|-----|------|
| E2E-1 | **Lead to Proposal** | Create Ticket → Add Design Spec → Generate Proposal → Download DOCX | ⬜ | ⬜ |
| E2E-2 | **Proposal to Order** | Accept Proposal → Create Order from it → Mark In Progress | ⬜ | ⬜ |
| E2E-3 | **Stock Replenishment** | Low stock alert fires → Create PO from supplier → Receive PO → Stock increases → Alert resolves | ⬜ | ⬜ |
| E2E-4 | **New Employee Onboarding** | Admin creates User → User logs in → Role restricts access correctly | ⬜ | ⬜ |
| E2E-5 | **BoQ Creation** | Create BoQ Template → Apply to a Proposal → Verify product list carried over | ⬜ | ⬜ |

---

## Test Sign-Off

| Tester | Date | Environment | Result |
|--------|------|-------------|--------|
| | | Staging | |
| | | Production | |

**Minimum pass criteria before go-live**: All BLOCKING pre-deployment tasks complete + all E2E flows pass + no `❌ Fail` in sections 1 (Auth), 6 (Proposals), 11 (Stock), 14 (Purchase Orders).
