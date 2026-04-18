# API Routes Blueprint — Complete Reference

> **Base URL:** `/api/v1`
> **Auth:** JWT Bearer Token (all routes except auth)
> **Format:** JSON request/response
> **Pagination:** `?page=1&limit=20` on all list endpoints
> **Filtering:** Query params on list endpoints
> **Sorting:** `?sortBy=created_at&sortOrder=desc`

---

## Conventions

| Convention | Standard |
|-----------|----------|
| HTTP Methods | GET (read), POST (create), PATCH (update), DELETE (soft-delete) |
| Success Response | `{ success: true, data: {...}, message: "..." }` |
| Error Response | `{ success: false, error: { code: "...", message: "..." } }` |
| Pagination | `{ data: [...], pagination: { page, limit, total, totalPages } }` |
| Status Codes | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Validation Error, 500 Server Error |
| Date Format | ISO 8601 (`2026-04-16T10:30:00Z`) |
| ID Format | UUID v4 |

---

## Phase 1 Routes

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| POST | `/auth/login` | Login with email/password | No | All |
| POST | `/auth/logout` | Logout (invalidate token) | Yes | All |
| POST | `/auth/refresh-token` | Refresh JWT token | Yes | All |
| POST | `/auth/forgot-password` | Send password reset email | No | All |
| POST | `/auth/reset-password` | Reset password with token | No | All |
| PATCH | `/auth/change-password` | Change own password | Yes | All |

### Users (`/api/v1/users`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/users` | List all users | Yes | Admin, Manager |
| POST | `/users` | Create new user | Yes | Admin |
| GET | `/users/me` | Get current user profile | Yes | All |
| PATCH | `/users/me` | Update own profile | Yes | All |
| GET | `/users/:id` | Get user by ID | Yes | Admin, Manager |
| PATCH | `/users/:id` | Update user | Yes | Admin |
| PATCH | `/users/:id/toggle-active` | Activate/deactivate user | Yes | Admin |
| GET | `/users/by-role/:role` | Get users by role | Yes | Admin, Manager |
| GET | `/users/by-department/:dept` | Get users by department | Yes | Admin, Manager |

**Query Params for GET /users:**
```
?role=salesperson
&department=sales
&is_active=true
&search=john          (searches name, email, phone)
&page=1&limit=20
```

### Leads (`/api/v1/leads`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/leads` | List leads (filtered) | Yes | Admin, Manager, Sales |
| POST | `/leads` | Create new lead | Yes | Admin, Manager, Sales |
| GET | `/leads/my` | My assigned leads | Yes | Sales |
| GET | `/leads/today-followups` | Today's follow-ups | Yes | Sales, Manager |
| GET | `/leads/overdue-followups` | Overdue follow-ups | Yes | Sales, Manager |
| GET | `/leads/unassigned` | Leads without assignment | Yes | Manager, Admin |
| GET | `/leads/check-duplicate/:phone` | Check duplicate by phone | Yes | All |
| GET | `/leads/stats` | Lead statistics | Yes | Manager, Admin |
| GET | `/leads/:id` | Get lead detail | Yes | Admin, Manager, Sales (own) |
| PATCH | `/leads/:id` | Update lead | Yes | Admin, Manager, Sales (own) |
| PATCH | `/leads/:id/assign` | Assign to salesperson | Yes | Manager, Admin |
| PATCH | `/leads/:id/status` | Update status | Yes | Admin, Manager, Sales (own) |
| POST | `/leads/:id/convert` | Convert to customer + order | Yes | Admin, Manager, Sales (own) |
| POST | `/leads/:id/request-design-spec` | Request design spec | Yes | Admin, Manager, Sales (own) |
| GET | `/leads/:id/notes` | Get lead notes | Yes | Admin, Manager, Sales (own) |
| POST | `/leads/:id/notes` | Add note to lead | Yes | Admin, Manager, Sales (own) |
| GET | `/leads/:id/follow-ups` | Get follow-ups | Yes | Admin, Manager, Sales (own) |
| POST | `/leads/:id/follow-ups` | Create follow-up | Yes | Admin, Manager, Sales (own) |
| PATCH | `/leads/:id/follow-ups/:fid` | Update follow-up | Yes | Admin, Manager, Sales (own) |
| GET | `/leads/:id/timeline` | Lead activity timeline | Yes | Admin, Manager, Sales (own) |

**Query Params for GET /leads:**
```
?status=new,contacted,qualified,quoted
&source=website,referral
&priority=high,urgent
&assigned_to=<user_id>
&city=Mumbai
&created_from=2026-04-01
&created_to=2026-04-30
&search=john              (searches name, phone, company)
&sortBy=created_at
&sortOrder=desc
&page=1&limit=20
```

### Customers (`/api/v1/customers`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/customers` | List customers | Yes | Admin, Manager, Sales |
| GET | `/customers/:id` | Customer detail | Yes | Admin, Manager, Sales |
| PATCH | `/customers/:id` | Update customer | Yes | Admin, Manager |
| GET | `/customers/:id/orders` | Customer's orders | Yes | Admin, Manager, Sales |
| GET | `/customers/:id/timeline` | Customer timeline | Yes | Admin, Manager |
| GET | `/customers/search` | Search by phone/name | Yes | All |

### Opportunities (`/api/v1/opportunities`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/opportunities` | List all / pipeline view | Yes | Admin, Manager, Sales |
| POST | `/opportunities` | Create opportunity | Yes | Admin, Manager, Sales |
| GET | `/opportunities/my` | My opportunities | Yes | Sales |
| GET | `/opportunities/pipeline-stats` | Pipeline stage stats | Yes | Manager, Admin |
| GET | `/opportunities/:id` | Detail | Yes | Admin, Manager, Sales (own) |
| PATCH | `/opportunities/:id` | Update | Yes | Admin, Manager, Sales (own) |
| PATCH | `/opportunities/:id/stage` | Change pipeline stage | Yes | Admin, Manager, Sales (own) |

### Quotations (`/api/v1/quotations`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/quotations` | List quotations | Yes | Admin, Manager, Sales |
| POST | `/quotations` | Create quotation | Yes | Admin, Manager, Sales |
| GET | `/quotations/:id` | Detail | Yes | Admin, Manager, Sales (own) |
| PATCH | `/quotations/:id` | Update quotation | Yes | Admin, Manager, Sales (own) |
| PATCH | `/quotations/:id/status` | Change status | Yes | Admin, Manager, Sales (own) |
| GET | `/quotations/:id/pdf` | Download PDF | Yes | Admin, Manager, Sales (own) |
| POST | `/quotations/:id/items` | Add line item | Yes | Admin, Manager, Sales (own) |
| PATCH | `/quotations/:id/items/:iid` | Update line item | Yes | Admin, Manager, Sales (own) |
| DELETE | `/quotations/:id/items/:iid` | Remove line item | Yes | Admin, Manager, Sales (own) |

### Orders (`/api/v1/orders`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/orders` | List orders | Yes | Admin, Manager, Sales |
| POST | `/orders` | Create order | Yes | Admin, Manager, Sales |
| GET | `/orders/my` | My orders | Yes | Sales |
| GET | `/orders/stats` | Order statistics | Yes | Manager, Admin |
| GET | `/orders/:id` | Order detail | Yes | Admin, Manager, Sales (own) |
| PATCH | `/orders/:id` | Update order | Yes | Admin, Manager |
| PATCH | `/orders/:id/status` | Change status | Yes | Admin, Manager |
| GET | `/orders/:id/timeline` | Order timeline | Yes | Admin, Manager, Sales (own) |
| POST | `/orders/:id/items` | Add line item | Yes | Admin, Manager |
| PATCH | `/orders/:id/items/:iid` | Update line item | Yes | Admin, Manager |
| DELETE | `/orders/:id/items/:iid` | Remove line item | Yes | Admin, Manager |

### Design Specifications (`/api/v1/design-specs`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/design-specs` | List design specs | Yes | Admin, Manager, Sales, Design |
| POST | `/design-specs` | Request design spec | Yes | Admin, Manager, Sales |
| GET | `/design-specs/my` | My assigned specs | Yes | Design |
| GET | `/design-specs/pending` | Specs awaiting review | Yes | Manager, Admin |
| GET | `/design-specs/:id` | Detail | Yes | Admin, Manager, Sales (own lead), Design (own) |
| PATCH | `/design-specs/:id` | Update spec | Yes | Admin, Manager, Design (own) |
| PATCH | `/design-specs/:id/status` | Change status | Yes | Admin, Manager, Design (own) |
| PATCH | `/design-specs/:id/assign` | Assign to design engineer | Yes | Manager, Admin |
| POST | `/design-specs/:id/create-quotation` | Create quotation from spec | Yes | Admin, Manager, Sales |
| GET | `/design-specs/:id/quotation` | Get linked quotation | Yes | Admin, Manager, Sales, Design |

---

## Phase 2 Routes

### Products (`/api/v1/products`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/products` | List products | Yes | All |
| POST | `/products` | Create product | Yes | Admin, Manager |
| GET | `/products/:id` | Product detail | Yes | All |
| PATCH | `/products/:id` | Update product | Yes | Admin, Manager |
| GET | `/products/categories` | List categories | Yes | All |
| POST | `/products/categories` | Create category | Yes | Admin |
| PATCH | `/products/categories/:id` | Update category | Yes | Admin |

### Inventory (`/api/v1/inventory`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/inventory` | Stock overview | Yes | Admin, Manager, Ops |
| GET | `/inventory/:productId` | Stock for a product | Yes | All |
| POST | `/inventory/stock-in` | Add stock | Yes | Admin, Manager |
| POST | `/inventory/stock-out` | Remove stock | Yes | Admin, Manager |
| GET | `/inventory/low-stock` | Low stock alerts | Yes | Manager, Admin |
| GET | `/inventory/transactions` | Transaction history | Yes | Manager, Admin |

### Installations (`/api/v1/installations`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/installations` | List all | Yes | Admin, Manager, Ops |
| POST | `/installations` | Create from order | Yes | Admin, Manager, Ops |
| GET | `/installations/my` | My installations | Yes | Installer |
| GET | `/installations/calendar` | Calendar view | Yes | Manager, Ops |
| GET | `/installations/:id` | Detail | Yes | Admin, Manager, Ops, Installer (own) |
| PATCH | `/installations/:id` | Update | Yes | Admin, Manager, Ops |
| PATCH | `/installations/:id/status` | Change status | Yes | Admin, Manager, Ops |
| POST | `/installations/:id/survey` | Submit survey | Yes | Ops |
| PATCH | `/installations/:id/schedule` | Set schedule | Yes | Manager |
| POST | `/installations/:id/sign-off` | Customer sign-off | Yes | Ops, Manager |
| GET | `/installations/:id/tasks` | List tasks | Yes | Ops, Installer |
| POST | `/installations/:id/tasks` | Add task | Yes | Manager, Ops |
| PATCH | `/installations/:id/tasks/:tid` | Update task | Yes | Ops, Installer |
| GET | `/installations/:id/team` | List team | Yes | Manager, Ops |
| POST | `/installations/:id/team` | Add team member | Yes | Manager |
| DELETE | `/installations/:id/team/:uid` | Remove member | Yes | Manager |
| GET | `/installations/:id/issues` | List issues | Yes | Ops, Manager |
| POST | `/installations/:id/issues` | Create issue | Yes | Ops, Installer |
| PATCH | `/installations/:id/issues/:iid` | Update issue | Yes | Ops, Manager |
| GET | `/installations/:id/materials` | List materials | Yes | Ops |
| POST | `/installations/:id/materials` | Add material | Yes | Ops |
| PATCH | `/installations/:id/materials/:mid` | Update material | Yes | Ops |

### Order Fulfillment (`/api/v1/fulfillments`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/fulfillments` | List fulfillments | Yes | Admin, Manager, Ops |
| POST | `/fulfillments` | Create from order | Yes | Admin, Manager, Ops |
| GET | `/fulfillments/pending` | Pending fulfillments | Yes | Ops, Manager |
| GET | `/fulfillments/:id` | Detail | Yes | Admin, Manager, Ops |
| PATCH | `/fulfillments/:id` | Update | Yes | Ops, Manager |
| PATCH | `/fulfillments/:id/status` | Change status | Yes | Ops, Manager |
| PATCH | `/fulfillments/:id/pick` | Mark items picked | Yes | Ops |
| PATCH | `/fulfillments/:id/pack` | Mark items packed | Yes | Ops |
| POST | `/fulfillments/:id/dispatch` | Dispatch with details | Yes | Ops, Manager |
| POST | `/fulfillments/:id/deliver` | Confirm delivery | Yes | Ops |
| GET | `/fulfillments/:id/items` | List items | Yes | Ops, Manager |

### Vendors (`/api/v1/vendors`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/vendors` | List vendors | Yes | Admin, Manager, Ops |
| POST | `/vendors` | Create vendor | Yes | Admin, Manager |
| GET | `/vendors/:id` | Vendor detail | Yes | Admin, Manager, Ops |
| PATCH | `/vendors/:id` | Update vendor | Yes | Admin, Manager |
| GET | `/vendors/:id/purchase-orders` | Vendor's POs | Yes | Admin, Manager, Ops |
| GET | `/vendors/search` | Search vendors | Yes | Ops, Manager |

### Purchase Orders (`/api/v1/purchase-orders`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/purchase-orders` | List POs | Yes | Admin, Manager, Ops |
| POST | `/purchase-orders` | Create PO | Yes | Manager, Ops |
| GET | `/purchase-orders/:id` | PO detail | Yes | Admin, Manager, Ops |
| PATCH | `/purchase-orders/:id` | Update PO | Yes | Manager, Ops |
| PATCH | `/purchase-orders/:id/status` | Change status | Yes | Manager, Admin |
| PATCH | `/purchase-orders/:id/approve` | Approve PO | Yes | Manager, Admin |
| POST | `/purchase-orders/:id/receive` | Receive items | Yes | Ops, Manager |
| POST | `/purchase-orders/:id/items` | Add item | Yes | Manager, Ops |
| PATCH | `/purchase-orders/:id/items/:iid` | Update item | Yes | Manager, Ops |
| DELETE | `/purchase-orders/:id/items/:iid` | Remove item | Yes | Manager |

---

## Phase 3 Routes

### AMC (`/api/v1/amc`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/amc` | List AMCs | Yes | Admin, Manager, Service |
| POST | `/amc` | Create AMC | Yes | Admin, Manager, Service |
| GET | `/amc/expiring` | Expiring soon | Yes | Manager, Admin |
| GET | `/amc/customer/:customerId` | AMCs for customer | Yes | Service, Manager |
| GET | `/amc/:id` | Detail | Yes | Admin, Manager, Service |
| PATCH | `/amc/:id` | Update | Yes | Admin, Manager |
| PATCH | `/amc/:id/status` | Change status | Yes | Admin, Manager |
| POST | `/amc/:id/renew` | Renew AMC | Yes | Manager, Admin |
| GET | `/amc/:id/scheduled-visits` | Scheduled visits | Yes | Service, Manager |

### Service Tickets (`/api/v1/service-tickets`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/service-tickets` | List tickets | Yes | Admin, Manager, Service |
| POST | `/service-tickets` | Create ticket | Yes | All (except Installer) |
| GET | `/service-tickets/my` | My assigned tickets | Yes | Service Engineer |
| GET | `/service-tickets/sla-breaches` | SLA breaches | Yes | Manager, Admin |
| GET | `/service-tickets/customer/:id` | Customer's tickets | Yes | Service, Manager |
| GET | `/service-tickets/:id` | Detail | Yes | Admin, Manager, Service (own) |
| PATCH | `/service-tickets/:id` | Update | Yes | Admin, Manager, Service (own) |
| PATCH | `/service-tickets/:id/assign` | Assign engineer | Yes | Manager |
| PATCH | `/service-tickets/:id/status` | Change status | Yes | Manager, Service (own) |
| PATCH | `/service-tickets/:id/escalate` | Escalate | Yes | Manager |
| POST | `/service-tickets/:id/feedback` | Customer feedback | Yes | Service, Manager |
| GET | `/service-tickets/:id/visits` | List visits | Yes | Service, Manager |
| POST | `/service-tickets/:id/visits` | Record visit | Yes | Service |
| GET | `/service-tickets/:id/visits/:vid` | Visit detail | Yes | Service, Manager |
| PATCH | `/service-tickets/:id/visits/:vid` | Update visit | Yes | Service |
| POST | `/service-tickets/:id/visits/:vid/parts` | Add parts | Yes | Service |
| POST | `/service-tickets/:id/visits/:vid/sign-off` | Sign-off | Yes | Service |

---

## Phase 4 Routes

### Invoices (`/api/v1/invoices`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/invoices` | List invoices | Yes | Admin, Manager, Finance |
| POST | `/invoices` | Create invoice | Yes | Admin, Finance |
| GET | `/invoices/overdue` | Overdue invoices | Yes | Admin, Finance, Manager |
| GET | `/invoices/customer/:id` | Customer's invoices | Yes | Finance, Manager |
| GET | `/invoices/summary` | Revenue summary | Yes | Admin, Manager, Finance |
| GET | `/invoices/:id` | Detail | Yes | Admin, Finance, Manager |
| PATCH | `/invoices/:id` | Update | Yes | Admin, Finance |
| PATCH | `/invoices/:id/status` | Change status | Yes | Admin, Finance |
| GET | `/invoices/:id/pdf` | Download PDF | Yes | Admin, Finance, Manager, Sales |
| POST | `/invoices/:id/credit-note` | Issue credit note | Yes | Admin, Finance |

### Payments (`/api/v1/payments`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/payments` | List payments | Yes | Admin, Finance, Manager |
| POST | `/payments` | Record payment | Yes | Admin, Finance |
| GET | `/payments/pending` | Pending confirmation | Yes | Admin, Finance |
| GET | `/payments/customer/:id` | Customer's payments | Yes | Finance, Manager |
| GET | `/payments/:id` | Detail | Yes | Admin, Finance |
| PATCH | `/payments/:id` | Update | Yes | Admin, Finance |
| PATCH | `/payments/:id/confirm` | Confirm payment | Yes | Admin, Finance |
| GET | `/payments/:id/receipt` | Download receipt | Yes | All |

### Expenses (`/api/v1/expenses`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/expenses` | List expenses | Yes | Admin, Finance, Manager |
| POST | `/expenses` | Submit expense | Yes | All |
| GET | `/expenses/my` | My expenses | Yes | All |
| GET | `/expenses/pending-approval` | Awaiting approval | Yes | Manager, Admin |
| GET | `/expenses/report` | Expense report | Yes | Admin, Finance, Manager |
| GET | `/expenses/:id` | Detail | Yes | Admin, Finance, Manager, Owner |
| PATCH | `/expenses/:id` | Update | Yes | Owner (if submitted) |
| PATCH | `/expenses/:id/approve` | Approve | Yes | Manager, Admin |
| PATCH | `/expenses/:id/reject` | Reject | Yes | Manager, Admin |
| PATCH | `/expenses/:id/reimburse` | Mark reimbursed | Yes | Finance, Admin |

---

## Phase 5 Routes

### Dashboard (`/api/v1/dashboard`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/dashboard/executive` | Executive overview | Yes | Admin |
| GET | `/dashboard/sales` | Sales KPIs | Yes | Manager, Sales |
| GET | `/dashboard/operations` | Operations KPIs | Yes | Manager, Ops |
| GET | `/dashboard/service` | Service KPIs | Yes | Manager, Service |
| GET | `/dashboard/finance` | Finance KPIs | Yes | Admin, Finance |
| GET | `/dashboard/my` | Personal dashboard | Yes | All |

### Reports (`/api/v1/reports`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/reports/:type` | Generate report by type | Yes | Manager, Admin |
| POST | `/reports/export` | Export report (CSV/Excel/PDF) | Yes | Manager, Admin |
| GET | `/reports/templates` | List saved templates | Yes | Manager, Admin |
| POST | `/reports/templates` | Save template | Yes | Manager, Admin |
| DELETE | `/reports/templates/:id` | Delete template | Yes | Admin |
| POST | `/reports/schedule` | Schedule recurring report | Yes | Admin |

### Notifications (`/api/v1/notifications`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/notifications` | My notifications | Yes | All |
| GET | `/notifications/unread-count` | Unread count | Yes | All |
| PATCH | `/notifications/:id/read` | Mark as read | Yes | All |
| POST | `/notifications/mark-all-read` | Mark all as read | Yes | All |
| GET | `/notifications/preferences` | My preferences | Yes | All |
| PATCH | `/notifications/preferences` | Update preferences | Yes | All |

### Documents (`/api/v1/documents`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| POST | `/documents` | Upload document | Yes | All |
| GET | `/documents/:id` | Document metadata | Yes | All (with access) |
| GET | `/documents/:id/download` | Download file | Yes | All (with access) |
| DELETE | `/documents/:id` | Delete document | Yes | Admin, Owner |
| GET | `/documents/entity/:type/:id` | Documents for entity | Yes | All (with access) |

### Settings (`/api/v1/settings`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/settings/company` | Get company settings | Yes | Admin |
| PATCH | `/settings/company` | Update company settings | Yes | Admin |

---

## Audit Logs (Cross-Phase)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/audit-logs` | Search audit logs | Yes | Admin |
| GET | `/audit-logs/entity/:type/:id` | Logs for entity | Yes | Admin, Manager |

---

## Route Count Summary

| Phase | Routes |
|-------|--------|
| Phase 1 (Auth + Users + Leads + Customers + Opportunities + Quotations + Orders) | ~55 |
| Phase 2 (Products + Inventory + Installations) | ~30 |
| Phase 3 (AMC + Service Tickets + Visits) | ~25 |
| Phase 4 (Invoices + Payments + Expenses) | ~25 |
| Phase 5 (Dashboard + Reports + Notifications + Documents) | ~20 |
| Cross-Phase (Audit + Settings) | ~5 |
| **Total** | **~160** |

---

*Build routes phase by phase. Phase 1 routes first. Test thoroughly before adding Phase 2.*
