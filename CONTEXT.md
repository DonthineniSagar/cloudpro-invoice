# Development Context - CloudPro Invoice

**Last Updated:** March 14, 2026, 16:55 NZDT
**Status:** All MVP + nice-to-have features complete. Ready for testing & deployment.
**Launch Date:** April 1, 2026 (17 days remaining)

---

## 🎯 Project Overview

- **Tech Stack:** Next.js 14, AWS Amplify Gen 2 (Sydney ap-southeast-2)
- **Database:** DynamoDB via AppSync GraphQL
- **Auth:** AWS Cognito
- **Storage:** S3 (invoices, receipts) — owner-scoped via entity_id
- **Email:** SES via Lambda function (send invoice with PDF attachment)
- **Validation:** Zod schemas
- **Development Mode:** Real AWS backend with local frontend

---

## ✅ All Completed Features

### Auth & User Management
- ✅ Cognito signup/login/logout with email verification
- ✅ User profile settings (firstName, lastName, phone)
- ✅ Password change (/settings/security)
- ✅ Protected routes, session management
- ✅ Forgot password flow (email → code → new password via Cognito)

### Company Profile
- ✅ Full CRUD (name, email, phone, address, GST#, bank account)
- ✅ Auto-populate on invoice creation
- ✅ Logo upload to S3 with preview
- ✅ Company logo on generated PDFs (top-right corner)

### Client Management
- ✅ List, create, edit, delete with search
- ✅ Client selector in invoice form

### Invoice Management
- ✅ Create with line items + WBS codes
- ✅ Auto-generated invoice numbers (INV-YYMM-XXX)
- ✅ Client auto-populate, company snapshot
- ✅ GST calculations (15% NZ rate)
- ✅ List view with status badges, detail view, edit
- ✅ Status workflow: DRAFT → SENT → PAID / OVERDUE / CANCELLED
- ✅ Paid/Cancelled invoices locked from editing
- ✅ PDF generation & download (jsPDF + autotable)
- ✅ PDF stored in S3 (owner-scoped), pdfUrl saved to invoice record
- ✅ Re-download from S3 without regeneration
- ✅ Email invoice to client with PDF attachment via SES
- ✅ Zod validation (client required, due date ≥ issue date, line items)
- ✅ Mobile responsive line items (stacked on small screens)

### Expense Tracking
- ✅ Full CRUD with categories (Travel, Office, Software, etc.)
- ✅ GST auto-calculation from inclusive amount
- ✅ GST claimable toggle
- ✅ Inline approve on list (approved expenses cannot revert to pending)
- ✅ S3 receipt upload (create + edit) — owner-scoped
- ✅ Receipt thumbnail display on expense list
- ✅ Missing receipt warning (IRD: >$50 needs receipt)
- ✅ Month filter + text search
- ✅ Zod validation (amount > 0, description required)

### Email Integration
- ✅ SES Lambda function for sending emails with PDF attachments
- ✅ Custom GraphQL mutation (sendInvoiceEmail)
- ✅ Email preferences settings page (/settings/email)
- ✅ Configurable subject/body templates with token replacement
- ✅ Reply-to email override
- ✅ CC self toggle
- ✅ "Email Invoice" button on invoice detail (replaces Mark as Sent)

### Dashboard
- ✅ Revenue metrics: total, outstanding, paid count, pending count
- ✅ Expense metrics: total expenses, net GST position, profit (ex-GST)
- ✅ Monthly revenue vs expenses bar chart (6 months)
- ✅ Invoice status breakdown (stacked bar + legend)
- ✅ Recent invoices (last 5) + recent expenses (last 5)
- ✅ Quick actions, setup guide for new users

### Reports & Tax (/reports)
- ✅ NZ GST return summary (collected vs paid, net position)
- ✅ Date range filter (defaults to NZ financial year Apr-Mar)
- ✅ Expenses by category horizontal bar chart
- ✅ Top 5 clients by revenue
- ✅ CSV export: invoices, expenses, tax summary

### UI/UX & Polish
- ✅ Dark/Light theme toggle, consistent across all pages
- ✅ Shared theme helper (lib/theme-classes.ts)
- ✅ CloudPro logo in nav
- ✅ Navigation: Dashboard, Invoices, Clients, Expenses, Reports, Settings
- ✅ Mobile responsive: hamburger menu, stacked layouts, scrollable tables
- ✅ Error boundaries (root, dashboard, invoices, expenses)
- ✅ Toast notification system

### Security
- ✅ S3 owner-scoped access (entity_id) — users can only access own files
- ✅ DynamoDB owner-based authorization on all models
- ✅ Pre-signed URLs for S3 downloads (time-limited)

### Data Migration
- ✅ Prod data migrated to sandbox (scripts/migrate-data.py)
- ✅ Overdue invoice auto-detection (dashboard marks past-due as OVERDUE)
- ✅ Field mapping: taxRate→gstRate, taxAmount→gstAmount, terms→paymentTerms
- ✅ Owner/userId remapped for sandbox user
- ✅ 20 invoices, 66 line items, 72 expenses, 1 client copied

---

## 🗂️ File Structure

```
app/
├── auth/login, signup, forgot-password
├── dashboard/
│   ├── page.tsx                Dashboard with charts & metrics
│   └── error.tsx               Dashboard error boundary
├── invoices/
│   ├── page.tsx                Invoice list
│   ├── new/page.tsx            Create invoice (Zod validated)
│   ├── [id]/page.tsx           Invoice detail + PDF + Email
│   ├── [id]/edit/page.tsx      Invoice edit (responsive)
│   └── error.tsx               Invoices error boundary
├── clients/
│   ├── page.tsx                Client list
│   ├── new/page.tsx            Create client
│   └── [id]/edit/page.tsx      Edit client
├── expenses/
│   ├── page.tsx                Expense list + thumbnails + month filter
│   ├── new/page.tsx            Create expense (Zod validated)
│   ├── [id]/edit/page.tsx      Edit expense + receipt upload
│   └── error.tsx               Expenses error boundary
├── reports/page.tsx            NZ Tax report + CSV exports
├── settings/
│   ├── layout.tsx              Settings tabs (Profile, Company, Email, Security)
│   ├── profile/page.tsx        User profile
│   ├── company/page.tsx        Company profile + logo upload
│   ├── email/page.tsx          Email preferences & templates
│   └── security/page.tsx       Password change
└── error.tsx                   Root error boundary

lib/
├── auth-context.tsx            Cognito auth provider
├── amplify-config.tsx          Amplify setup
├── theme-context.tsx           Dark/light theme
├── theme-classes.ts            Shared theme CSS classes
├── gst-calculations.ts         GST math utilities
├── generate-pdf.ts             Invoice PDF generation (with logo)
├── csv-export.ts               CSV download utility
├── validation.ts               Zod schemas (invoice, expense, client, company)
├── aws-clients.ts              AWS SDK clients
├── local-db.ts                 ⚠️ Legacy (unused)
└── mock-auth.ts                ⚠️ Legacy (unused)

components/
└── AppLayout.tsx               Nav bar + hamburger menu + theme wrapper

amplify/
├── auth/resource.ts            Cognito config
├── data/resource.ts            GraphQL schema (6 models + sendInvoiceEmail mutation)
├── storage/resource.ts         S3 (invoices/{entity_id}/*, receipts/{entity_id}/*)
├── functions/
│   └── send-invoice-email/
│       ├── resource.ts         Function definition
│       └── handler.ts          SES raw email with PDF attachment
└── backend.ts                  Backend entry point + SES IAM policy

scripts/
├── migrate-data.py             Prod→sandbox data migration
├── setup-localstack.sh         LocalStack setup
└── start-sandbox.sh            Sandbox launcher
```

---

## 📋 Pre-Launch Checklist

### Before Deployment
- [ ] Verify SES sending domain/email in production
- [ ] Request SES production access (exit sandbox)
- [ ] Update SES_FROM_EMAIL env var to verified domain
- [ ] End-to-end test: create invoice → email → PDF download
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Remove legacy files (lib/local-db.ts, lib/mock-auth.ts)
- [ ] Run `npm audit fix`
- [ ] Deploy to production (`npx ampx pipeline-deploy`)

### Long-Term Roadmap
- [ ] Multi-user / team access (Cognito groups + companyId scoping)
- [ ] Recurring invoices
- [ ] Payment integration (Stripe)
- [ ] Client portal (view/pay invoices)

---

## 🔧 Development Commands

```bash
# Terminal 1: AWS Sandbox
npm run sandbox

# Terminal 2: Frontend
npm run dev

# Testing
npm test
npm run test:watch

# Data migration
source .env.creds && export AWS_REGION=ap-southeast-2
python3 scripts/migrate-data.py
```

---

## 🔐 AWS Configuration

- **Region:** ap-southeast-2 (Sydney)
- **Services:** Cognito, AppSync, DynamoDB (6 tables), S3, SES, Lambda, IAM
- **Sandbox API ID:** kdhpyo3bhnenbm2vgxgy2qo24u
- **Prod API ID:** gpvtefxrxvgbbj2kqzt5ri7x5e
- **Credentials:** `.env.creds` (session token, not in git)

---

## 📊 Sprint Progress

| Sprint | Planned | Status |
|--------|---------|--------|
| 1: Foundation (Days 1-5) | Auth, models, company profile | ✅ Complete |
| 2: Clients & Invoices (Days 6-10) | Client CRUD, invoice creation | ✅ Complete |
| 3: PDF & Expenses (Days 11-15) | PDF gen, expense tracking | ✅ Complete |
| 4: Dashboard & Launch (Days 16-20) | Reporting, polish, deploy | ✅ Complete |

**All planned features complete. 17 days remaining for testing, polish, and deployment.**
