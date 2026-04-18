# Roles & Permissions Matrix

> **Access Control Model:** Role-Based Access Control (RBAC)
> **Principle:** Least Privilege — users get minimum access needed for their role

---

## 1. Roles Definition

| Role | Department | Description | Typical Users |
|------|-----------|-------------|---------------|
| **Admin** | Admin | Full system access, user management, settings | Owner, IT Admin |
| **Manager** | Any | Oversees team, views all data in their domain, can assign work | Sales Manager, Ops Manager, Service Manager |
| **Salesperson** | Sales | Creates/manages leads, quotations, converts to orders | Sales executives, BDM |
| **Design Engineer** | Design | Creates design specs, product recommendations, BOMs | Design team, Technical consultants |
| **Installer** | Operations | Executes installations, updates task checklists | Field installation engineers |
| **Service Engineer** | Service | Handles service tickets, records visits | Field service technicians |
| **Finance** | Finance | Manages invoices, payments, expenses | Accountant, Finance executive |

---

## 2. Module-Level Permission Matrix

### Legend
- **F** = Full Access (Create + Read + Update + Delete)
- **C** = Create + Read + Update (no delete)
- **R** = Read Only
- **O** = Own Records Only (can only see/edit records assigned to them)
- **—** = No Access

| Module / Feature | Admin | Manager | Salesperson | Installer | Service Eng | Finance |
|-----------------|-------|---------|-------------|-----------|-------------|---------|
| **User Management** | F | R | — | — | — | — |
| **Create Users** | ✅ | — | — | — | — | — |
| **Deactivate Users** | ✅ | — | — | — | — | — |
| **Leads - View All** | ✅ | ✅ | — | — | — | — |
| **Leads - View Own** | ✅ | ✅ | O | — | — | — |
| **Leads - Create** | ✅ | ✅ | ✅ | — | — | — |
| **Leads - Edit** | ✅ | ✅ | O | — | — | — |
| **Leads - Assign** | ✅ | ✅ | — | — | — | — |
| **Leads - Convert** | ✅ | ✅ | O | — | — | — |
| **Leads - Delete** | ✅ | — | — | — | — | — |
| **Customers - View** | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| **Customers - Edit** | ✅ | ✅ | — | — | — | — |
| **Opportunities - View All** | ✅ | ✅ | — | — | — | — |
| **Opportunities - Own** | ✅ | ✅ | O | — | — | — |
| **Opportunities - Create** | ✅ | ✅ | ✅ | — | — | — |
| **Opportunities - Edit** | ✅ | ✅ | O | — | — | — |
| **Quotations - View** | ✅ | ✅ | O | — | — | ✅ |
| **Quotations - Create** | ✅ | ✅ | ✅ | — | — | — |
| **Quotations - Edit** | ✅ | ✅ | O | — | — | — |
| **Quotations - Download PDF** | ✅ | ✅ | O | — | — | ✅ |
| **Orders - View All** | ✅ | ✅ | — | — | — | ✅ |
| **Orders - View Own** | ✅ | ✅ | O | — | — | ✅ |
| **Orders - Create** | ✅ | ✅ | ✅ | — | — | — |
| **Orders - Edit** | ✅ | ✅ | — | — | — | — |
| **Orders - Change Status** | ✅ | ✅ | — | — | — | — |
| **Products - View** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Products - Manage** | ✅ | ✅ | — | — | — | — |
| **Inventory - View** | ✅ | ✅ | — | ✅ | ✅ | — |
| **Inventory - Stock In/Out** | ✅ | ✅ | — | — | — | — |
| **Installations - View All** | ✅ | ✅ | — | — | — | — |
| **Installations - View Own** | ✅ | ✅ | — | O | — | — |
| **Installations - Create** | ✅ | ✅ | — | — | — | — |
| **Installations - Edit** | ✅ | ✅ | — | — | — | — |
| **Installations - Assign Team** | ✅ | ✅ | — | — | — | — |
| **Installations - Update Tasks** | ✅ | ✅ | — | O | — | — |
| **Installations - Log Issue** | ✅ | ✅ | — | ✅ | — | — |
| **Installations - Sign Off** | ✅ | ✅ | — | ✅ | — | — |
| **AMC - View All** | ✓ | ✓ | — | — | — | ✓ | ✓ |
| **AMC - Create** | ✓ | ✓ | — | — | — | ✓ | — |
| **AMC - Edit** | ✓ | ✓ | — | — | — | — | — |
| **AMC - Renew** | ✓ | ✓ | — | — | — | — | — |
| **Service Tickets - View All** | ✓ | ✓ | — | — | — | — | — |
| **Service Tickets - View Own** | ✓ | ✓ | — | — | — | O | — |
| **Service Tickets - Create** | ✓ | ✓ | ✓ | — | — | ✓ | — |
| **Service Tickets - Assign** | ✓ | ✓ | — | — | — | — | — |
| **Service Tickets - Update** | ✓ | ✓ | — | — | — | O | — |
| **Service Tickets - Escalate** | ✓ | ✓ | — | — | — | — | — |
| **Service Visits - Record** | ✓ | ✓ | — | — | — | O | — |
| **Invoices - View** | ✓ | ✓ | R | — | — | — | ✓ |
| **Invoices - Create** | ✓ | — | — | — | — | — | ✓ |
| **Invoices - Edit** | ✓ | — | — | — | — | — | ✓ |
| **Invoices - Download** | ✓ | ✓ | ✓ | — | — | — | ✓ |
| **Invoices - Void/Credit** | ✓ | — | — | — | — | — | ✓ |
| **Payments - View** | ✓ | ✓ | — | — | — | — | ✓ |
| **Payments - Record** | ✓ | — | — | — | — | — | ✓ |
| **Payments - Confirm** | ✓ | — | — | — | — | — | ✓ |
| **Expenses - Submit** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Expenses - View Own** | ✓ | ✓ | O | O | O | O | O |
| **Expenses - View All** | ✓ | ✓ | — | — | — | — | ✓ |
| **Expenses - Approve/Reject** | ✓ | ✓ | — | — | — | — | — |
| **Expenses - Reimburse** | ✓ | — | — | — | — | — | ✓ |
| **Dashboard - Executive** | ✓ | — | — | — | — | — | — |
| **Dashboard - Sales** | ✓ | ✓ | ✓ | — | — | — | — |
| **Dashboard - Operations** | ✓ | ✓ | — | — | ✓ | — | — |
| **Dashboard - Service** | ✓ | ✓ | — | — | — | ✓ | — |
| **Dashboard - Finance** | ✓ | — | — | — | — | — | ✓ |
| **Reports - View** | ✓ | ✓ | — | — | — | — | ✓ |
| **Reports - Export** | ✓ | ✓ | — | — | — | — | ✓ |
| **Reports - Schedule** | ✓ | — | — | — | — | — | — |
| **Notifications - Own** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Documents - Upload** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Documents - View** | ✓ | ✓ | O | O | O | O | O |
| **Documents - Delete** | ✓ | — | — | — | — | — | — |
| **Audit Logs - View** | ✓ | ✓ | — | — | — | — | — |
| **Company Settings** | ✓ | — | — | — | — | — | — |

---

## 3. Data Visibility Rules

### Salesperson
- Can see **only leads assigned to them**
- Can see **only their own quotations and opportunities**
- Can see **design specs linked to their leads** (read-only)
- Can see **customers they converted**
- Can see **orders they created**
- Cannot see other salespeople's leads/data
- **Exception:** Dashboard shows anonymized team stats (no individual data)

### Design Engineer
- Can see **only design specs assigned to them**
- Can create and edit product recommendations and BOMs on their specs
- Can view lead details (for requirement context)
- Can view products (for spec reference)
- Can view quotations linked to their specs (read-only)
- Cannot see orders, installations, financial data, or other salespeople's leads

### Installer
- Can see **only installations assigned to them**
- Can update **only tasks on their installations**
- Can log issues on their installations
- Cannot see leads, orders, or financial data
- Can view products (for material reference)

### Service Engineer
- Can see **only service tickets assigned to them**
- Can record visits on their tickets
- Can view AMC details (for coverage reference)
- Can view customer details (for context)
- Cannot see leads, orders, installations, or financial data

### Finance
- Can see **all invoices, payments, and expenses**
- Can see **orders** (for invoice generation reference)
- Can see **AMC contracts** (for invoicing)
- Can see **customers** (for billing)
- Cannot see leads, installations, or service tickets (no operational access)

### Manager
- Can see **all data within their department scope**
- Sales Manager → all sales data
- Ops Manager → all installation data
- Service Manager → all service data
- Can assign work to team members
- Can approve expenses from their team
- Cannot manage users or system settings

### Admin
- **Full access to everything**
- User management
- System settings
- Audit logs
- All data across all modules

---

## 4. Permission Implementation (Backend)

### Middleware Approach
```
Request → Auth Middleware (JWT) → Role Middleware → Route Handler
                                      │
                                      ├── Check role has permission for this route
                                      ├── Check data ownership (if role = O)
                                      └── Return 403 if unauthorized
```

### Permission Definition Structure
```typescript
// permissions.ts
export const PERMISSIONS = {
  LEADS: {
    VIEW_ALL:     ['admin', 'manager'],
    VIEW_OWN:     ['admin', 'manager', 'salesperson'],
    CREATE:       ['admin', 'manager', 'salesperson'],
    UPDATE_OWN:   ['admin', 'manager', 'salesperson'],
    UPDATE_ANY:   ['admin', 'manager'],
    ASSIGN:       ['admin', 'manager'],
    CONVERT:      ['admin', 'manager', 'salesperson'],
    DELETE:       ['admin'],
  },
  ORDERS: {
    VIEW_ALL:     ['admin', 'manager', 'finance'],
    VIEW_OWN:     ['admin', 'manager', 'salesperson', 'finance'],
    CREATE:       ['admin', 'manager', 'salesperson'],
    UPDATE:       ['admin', 'manager'],
    CHANGE_STATUS:['admin', 'manager'],
  },
  // ... etc
};
```

### Ownership Check Logic
```
IF user.role in route.allowedRoles:
    IF route requires ownership check (O):
        IF record.assigned_to == user.id OR record.created_by == user.id:
            ALLOW
        ELSE:
            DENY (403)
    ELSE:
        ALLOW
ELSE:
    DENY (403)
```

---

## 5. Special Permission Scenarios

### Scenario 1: Salesperson converts lead
- Salesperson can only convert **their own** assigned leads
- On conversion, they automatically get access to the created customer and order

### Scenario 2: Manager reassigns lead
- Manager can reassign a lead from Salesperson A to Salesperson B
- Salesperson A loses access; Salesperson B gains access
- Audit log records the reassignment

### Scenario 3: Installation team access
- Team lead and all team members get access to the installation
- If removed from team, access revoked
- Team lead has additional permissions (sign-off, status change)

### Scenario 4: Cross-department visibility
- Service engineer creating a ticket can **view** (read-only) the installation record for context
- Finance creating an invoice can **view** (read-only) the order and AMC details
- These are read-only cross-references, not edit permissions

### Scenario 5: Expense chain
- **Submitter** (any role) → Submit + edit (while status = submitted)
- **Manager** → Approve/Reject
- **Finance** → Mark as reimbursed
- Submitter cannot edit after approval

---

## 6. API Security Checklist

- [ ] All routes require JWT authentication (except auth endpoints)
- [ ] JWT tokens expire in 24 hours
- [ ] Refresh tokens expire in 7 days
- [ ] Password hashed with bcrypt (min 10 rounds)
- [ ] Rate limiting: 100 requests/minute per user
- [ ] Input validation on all endpoints (Zod/class-validator)
- [ ] SQL injection prevention (parameterized queries via ORM)
- [ ] XSS prevention (sanitize HTML in text inputs)
- [ ] CORS configured for frontend domain only
- [ ] Sensitive data (passwords, tokens) never in API responses
- [ ] File upload validation (type, size limits)
- [ ] Audit logging for all write operations
- [ ] Account lockout after 5 failed login attempts (15 min)
- [ ] HTTPS enforced in production

---

*Roles and permissions are the backbone of data security. Get this right in Phase 1 — it's much harder to retrofit.*
