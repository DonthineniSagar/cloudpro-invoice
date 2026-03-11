# CloudPro Invoice - Product Backlog

**Launch Date:** April 1, 2026 (20 days)  
**Last Updated:** March 11, 2026  
**Focus:** Basics - Invoice, Client, Expenses, User Settings, Enriched Reporting

---

## 🎯 MVP Scope - Core Features Only

### ✅ 1. Company Profile & Settings
**Priority:** P0 - Must have for invoice generation

- [ ] Company profile model (name, email, phone, address)
- [ ] GST number field
- [ ] Bank account field
- [ ] Default currency (NZD)
- [ ] Default GST rate (15%)
- [ ] Logo upload to S3
- [ ] Settings page UI
- [ ] Auto-populate invoice from profile

**Why:** Invoice needs company details - fetch from profile instead of manual entry

---

### ✅ 2. Client Management
**Priority:** P0 - Core feature

- [ ] Create client (name, email, phone, address)
- [ ] List clients with search
- [ ] View client details
- [ ] Edit client
- [ ] Delete client (soft delete)
- [ ] Client selector in invoice form
- [ ] Auto-populate client details in invoice

**Fields:**
- Name, Email, Phone
- Address, City, State, Postal Code
- Country (default: New Zealand)
- Notes

---

### ✅ 3. Invoice Management
**Priority:** P0 - Core feature

#### Invoice Fields
- [ ] Invoice number (auto-generated: INV-YYMM-XXX)
- [ ] Client selection (dropdown)
- [ ] Issue date (default: today)
- [ ] Due date (default: +30 days)
- [ ] Payment terms (default: "Due within 30 days")
- [ ] Currency (default: NZD)
- [ ] Status (DRAFT, SENT, PAID, OVERDUE, CANCELLED)

#### Line Items with WBS
- [ ] Description (required)
- [ ] **WBS** (Work Breakdown Structure / Project code)
- [ ] Quantity (default: 1)
- [ ] Unit Price (rate)
- [ ] Amount (auto-calculated: qty × price)
- [ ] Add/remove line items dynamically

#### Calculations
- [ ] Subtotal (sum of all line items)
- [ ] GST Rate (default: 15% from company profile)
- [ ] GST Amount (subtotal × 15%)
- [ ] Total (subtotal + GST)

#### Company Details (Auto-populated from Profile)
- [ ] Company name
- [ ] Company email
- [ ] Company phone
- [ ] Company address
- [ ] GST number
- [ ] Bank account

#### Actions
- [ ] Save as draft
- [ ] Mark as sent
- [ ] Mark as paid (with payment date)
- [ ] Generate PDF
- [ ] Download PDF
- [ ] Delete invoice

---

### ✅ 4. Invoice PDF Generation
**Priority:** P0 - Must have

- [ ] Professional PDF template
- [ ] Company logo
- [ ] Company details (from profile)
- [ ] Client details
- [ ] Invoice number, dates
- [ ] Line items table with WBS column
- [ ] Subtotal, GST, Total
- [ ] Payment terms
- [ ] Bank account details
- [ ] GST number
- [ ] Store PDF in S3
- [ ] Download link

---

### ✅ 5. Expense Tracking
**Priority:** P1 - Important for reporting

#### Expense Fields
- [ ] Description
- [ ] Category (dropdown: Office, Travel, Equipment, etc.)
- [ ] Amount (total including GST)
- [ ] Amount Ex-GST (calculated: amount / 1.15)
- [ ] GST Amount (calculated: amount - amountExGst)
- [ ] GST Claimable (boolean, default: true)
- [ ] Date
- [ ] Receipt upload (S3)
- [ ] Notes
- [ ] Status (PENDING, APPROVED, REJECTED)

#### Actions
- [ ] Create expense
- [ ] List expenses
- [ ] View expense details
- [ ] Edit expense
- [ ] Delete expense
- [ ] Upload receipt
- [ ] Approve/reject expense

---

### ✅ 6. Dashboard & Reporting
**Priority:** P1 - Business insights

#### Basic Metrics
- [ ] Total revenue (all time)
- [ ] Revenue ex-GST
- [ ] GST collected
- [ ] Outstanding amount
- [ ] Paid invoices count
- [ ] Pending invoices count
- [ ] Total expenses
- [ ] Expenses ex-GST
- [ ] GST paid (claimable)

#### Enriched Reporting
- [ ] Revenue by month (chart)
- [ ] Expenses by category (chart)
- [ ] GST position (collected - paid)
- [ ] Profit/Loss (revenue - expenses, ex-GST)
- [ ] Invoice status breakdown (pie chart)
- [ ] Top clients by revenue
- [ ] Recent invoices (last 10)
- [ ] Recent expenses (last 10)
- [ ] Date range filter
- [ ] Export to CSV

#### NZ Tax Reporting
- [ ] Revenue ex-GST
- [ ] GST collected (from invoices)
- [ ] Expenses ex-GST
- [ ] GST paid (claimable expenses)
- [ ] Net GST position
- [ ] Taxable profit (revenue - expenses, ex-GST)

---

### ✅ 7. User Settings
**Priority:** P1 - User management

- [ ] User profile (name, email)
- [ ] Company profile (linked)
- [ ] Password change
- [ ] Email preferences
- [ ] Logout

---

## 🚫 Explicitly OUT of MVP

### Not Now
- ❌ Stripe payment integration
- ❌ Email sending (invoice delivery)
- ❌ Payment reminders
- ❌ Recurring invoices
- ❌ Multiple invoice templates
- ❌ Multi-currency (only NZD for now)
- ❌ Client portal
- ❌ Team collaboration
- ❌ Mobile app
- ❌ Integrations (QuickBooks, Xero)
- ❌ Receipt OCR (Textract)
- ❌ Time tracking
- ❌ Mileage tracking

---

## 📊 Sprint Breakdown (20 Days)

### Sprint 1: Foundation (Days 1-5) - March 12-16
**Goal:** Auth, data models, company profile

- [ ] Day 1: Auth setup (Cognito)
- [ ] Day 2: Data models (User, CompanyProfile, Client)
- [ ] Day 3: Company profile UI
- [ ] Day 4: User settings page
- [ ] Day 5: Testing & fixes

### Sprint 2: Clients & Invoices (Days 6-10) - March 17-21
**Goal:** Client CRUD, invoice creation

- [ ] Day 6: Client list & create
- [ ] Day 7: Client edit & delete
- [ ] Day 8: Invoice form with line items
- [ ] Day 9: Invoice calculations & WBS
- [ ] Day 10: Save invoice, list view

### Sprint 3: PDF & Expenses (Days 11-15) - March 22-26
**Goal:** PDF generation, expense tracking

- [ ] Day 11: PDF template design
- [ ] Day 12: PDF generation & S3 upload
- [ ] Day 13: Expense model & create
- [ ] Day 14: Expense list & GST calculations
- [ ] Day 15: Receipt upload

### Sprint 4: Dashboard & Launch (Days 16-20) - March 27-31
**Goal:** Reporting, polish, deploy

- [ ] Day 16: Dashboard metrics
- [ ] Day 17: Charts & enriched reporting
- [ ] Day 18: NZ tax reporting
- [ ] Day 19: UI polish & testing
- [ ] Day 20: Deploy & launch (April 1)

---

## 🎨 Data Model Summary

```typescript
CompanyProfile {
  companyName, companyEmail, companyPhone, companyAddress
  gstNumber, bankAccount
  defaultCurrency: 'NZD'
  defaultGstRate: 15
  logoUrl
}

Client {
  name, email, phone
  address, city, state, postalCode, country
  notes
}

Invoice {
  invoiceNumber, issueDate, dueDate
  clientName, clientEmail, clientAddress
  subtotal, gstRate, gstAmount, total
  currency: 'NZD'
  status: DRAFT | SENT | PAID | OVERDUE | CANCELLED
  paymentTerms, notes
  // Company snapshot
  companyName, companyEmail, gstNumber, bankAccount
  pdfUrl
}

InvoiceItem {
  description
  wbs  // ← Work Breakdown Structure
  quantity, unitPrice, amount
}

Expense {
  description, category
  amount, amountExGst, gstAmount
  gstClaimable
  date, receiptUrl, notes
  status: PENDING | APPROVED | REJECTED
}
```

---

## 🔒 Security Checklist

- [ ] Owner-based authorization (users see only their data)
- [ ] No hardcoded credentials
- [ ] Environment variables in `.env.local`
- [ ] Input validation with Zod
- [ ] S3 bucket private with signed URLs
- [ ] HTTPS only in production

---

## 📈 Success Metrics (First 30 Days)

### User Metrics
- 50 signups
- 30 active users (created invoice)
- 100 invoices created
- $50K tracked in invoices

### Technical Metrics
- Page load < 2s
- 99.9% uptime
- Zero critical bugs

---

## 🚀 Post-Launch (Phase 2 - April-May)

### Month 2 Priorities
1. Email sending (invoice delivery)
2. Payment reminders
3. Invoice templates
4. Receipt OCR
5. Advanced analytics

---

**Next Review:** March 18, 2026  
**Status:** In Development  
**Team:** Solo developer
