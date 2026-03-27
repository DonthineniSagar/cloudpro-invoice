# Development Context - CloudPro Invoice

**Last Updated:** March 27, 2026, 21:31 NZDT
**Status:** All features complete. Pre-launch polish done. Quick wins shipped. Ready for final testing & deployment.
**Launch Date:** April 1, 2026 (5 days remaining)

---

## 🎯 Project Overview

- **Tech Stack:** Next.js 14, AWS Amplify Gen 2 (Sydney ap-southeast-2)
- **Database:** DynamoDB via AppSync GraphQL
- **Auth:** AWS Cognito
- **Storage:** S3 (invoices, receipts) — owner-scoped via entity_id
- **Email:** SES via Lambda function (send invoice with PDF attachment)
- **SES Domain:** cloudpro-digital.co.nz (verified)
- **SES Sandbox:** testing@cloudpro-digital.co.nz
- **SES Production:** noreply@cloudpro-digital.co.nz
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
- ✅ Sort by date (clickable column header, newest first default)
- ✅ Status workflow: DRAFT → SENT → PAID / OVERDUE / CANCELLED
- ✅ Paid/Cancelled invoices locked from editing
- ✅ PDF generation required before emailing (must generate first)
- ✅ PDF stored in S3 (owner-scoped), pdfUrl saved to invoice record
- ✅ Re-download from S3 without regeneration
- ✅ Zod validation (client required, due date ≥ issue date, line items)
- ✅ Mobile responsive line items (stacked on small screens)

### PDF Generation (Professional NZ Tax Invoice)
- ✅ 3 templates: Modern (italic title, payment advice tear-off), Classic (serif, bordered table, navy accent), Minimal (whitespace, no borders)
- ✅ Template selector dropdown on invoice detail page
- ✅ Default template setting in Company Profile (/settings/company)
- ✅ `defaultTemplate` field on CompanyProfile schema
- ✅ "TAX INVOICE" italic title with bold company name
- ✅ Invoice details stacked (label above value): date, number, GST#
- ✅ Company address right-aligned below logo (text wrapping for long addresses)
- ✅ Company email shown under logo (no phone)
- ✅ Clean table: no box border, header line + light row separators
- ✅ WBS merged into description column
- ✅ Right-aligned totals: Subtotal → TOTAL GST 15% → TOTAL NZD (bold)
- ✅ Due date + bank account + payment terms section
- ✅ Payment advice tear-off with scissors dashed line
- ✅ Payment advice: company address wrapped, amount enclosed line
- ✅ Larger fonts (9.5-10pt body, 28pt title) for sharp readability

### Email Integration
- ✅ SES Lambda function for sending emails with PDF attachments
- ✅ Server-controlled sender address (SES_FROM_EMAIL env var, no client spoofing)
- ✅ SES IAM policy scoped to verified identities
- ✅ Email dialog with review before sending:
  - From (read-only, server-controlled)
  - Multiple To recipients (add/remove)
  - Multiple CC recipients (add/remove)
  - Reply-To (editable)
  - Subject (pre-populated from template)
  - Body (pre-populated, editable)
  - PDF auto-attached note
- ✅ Email only available for DRAFT and OVERDUE invoices with PDF generated
- ✅ Professional email body template:
  - Greeting with client name
  - Formatted amounts with currency (NZD 41,814.00)
  - Long date format (13 April 2026)
  - Sign-off with company name
- ✅ Configurable templates with tokens: {invoiceNumber}, {companyName}, {clientName}, {total}, {dueDate}
- ✅ Email preferences settings page (/settings/email)
- ✅ Reply-to email override, CC self toggle

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

### Dashboard
- ✅ Revenue metrics: total, outstanding, paid count, pending count
- ✅ Expense metrics: total expenses, net GST position, profit (ex-GST)
- ✅ Quick actions moved below metrics (New Invoice, New Client, New Expense)
- ✅ Monthly revenue vs expenses bar chart (6 months)
- ✅ Invoice status breakdown (stacked bar + legend)
- ✅ Recent invoices (last 5) + recent expenses (last 5)
- ✅ Setup guide for new users

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
- ✅ Loading skeletons on dashboard, invoice list, client list (components/Skeleton.tsx)
- ✅ Empty state illustrations with CTAs (invoices, clients)
- ✅ Meta tags, Open Graph, Twitter cards for SEO (app/layout.tsx)

### Progressive Web App (PWA)
- ✅ manifest.json (app name, icons, standalone display, theme color)
- ✅ Service worker (network-first caching, offline fallback for key routes)
- ✅ PWA icons (192x192, 512x512) generated from logo
- ✅ Apple touch icon + apple-mobile-web-app-capable meta
- ✅ Install prompt banner (auto-shows on mobile, dismissible)
- ✅ Viewport meta (prevents zoom, proper mobile scaling)

### Security
- ✅ S3 owner-scoped access (entity_id) — users can only access own files
- ✅ DynamoDB owner-based authorization on all models
- ✅ Pre-signed URLs for S3 downloads (time-limited)
- ✅ SES sender address server-controlled (prevents spoofing)
- ✅ fromEmail removed from GraphQL schema (server-only)
- ✅ SES IAM scoped to verified identities

### Client Portal
- ✅ Public `/portal/[token]` page — no auth required, token-based access
- ✅ API route `/api/portal/[token]` — queries via API key auth mode
- ✅ `portalToken` field on Invoice model (random UUID)
- ✅ "Copy Portal Link" button on invoice detail page
- ✅ Status display (Paid/Due/Overdue/Cancelled)
- ✅ Professional read-only invoice view with line items, totals, payment info

### Payment Reminders
- ✅ Reminder settings in /settings/email (toggle, days before/after, subject/body templates)
- ✅ "Send Reminder" button on invoice detail (SENT/OVERDUE invoices)
- ✅ Reminder count badge on button (tracks how many sent)
- ✅ `lastReminderSent` and `reminderCount` fields on Invoice model
- ✅ Reminder fields on CompanyProfile (reminderEnabled, daysBefore, daysAfter, templates)
- ✅ Overdue count badge on dashboard metrics
- ⏳ Automated daily Lambda (EventBridge) — backend not yet deployed

### Recurring Invoices
- ✅ RecurringInvoice model (clientId, lineItems JSON, frequency, nextDate, endDate, active)
- ✅ List page (/invoices/recurring) with Active/Paused badges
- ✅ Create form (/invoices/recurring/new) — client, frequency, start/end date, line items
- ✅ "Generate Now" button — creates draft Invoice + InvoiceItems from template
- ✅ Auto-advances nextDate based on frequency after generation
- ✅ Auto-deactivates when endDate is passed
- ✅ Pause/resume toggle, delete
- ✅ "Recurring" link added to navigation

### Receipt OCR (AWS Textract)
- ✅ `process-receipt` Lambda with Textract AnalyzeExpense
- ✅ `processReceipt` GraphQL mutation (authenticated)
- ✅ Textract IAM policy on Lambda
- ✅ Auto-scan on receipt upload — fills description (vendor), amount (total), date
- ✅ Camera capture on mobile (`capture="environment"`)
- ✅ Scanning indicator while processing
- ✅ Supports JPEG, PNG, PDF

### Pre-Launch Cleanup (Done March 14)
- ✅ Deleted legacy files (lib/local-db.ts, lib/mock-auth.ts)
- ✅ Ran npm audit fix (remaining vulns in Amplify CDK toolchain only)
- ✅ Removed .amplify/ artifacts and amplify_outputs.json from git tracking
- ✅ Added *.pdf to .gitignore
- ✅ Fixed GraphQL schema error (newlines in default string)

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
│   ├── page.tsx                Invoice list (sortable by date)
│   ├── new/page.tsx            Create invoice (Zod validated)
│   ├── [id]/page.tsx           Invoice detail + PDF + Email dialog
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
├── portal/[token]/page.tsx     Public client portal (no auth)
├── api/portal/[token]/route.ts Portal API (API key auth)
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
├── generate-pdf.ts             Professional NZ tax invoice PDF (with logo, payment advice)
├── csv-export.ts               CSV download utility
├── validation.ts               Zod schemas (invoice, expense, client, company)
├── aws-clients.ts              AWS SDK clients
└── toast-context.tsx           Toast notification provider

components/
└── AppLayout.tsx               Nav bar + hamburger menu + theme wrapper
└── Skeleton.tsx                Loading skeleton components (dashboard, table, cards)
└── InstallPrompt.tsx           PWA install prompt banner

amplify/
├── auth/resource.ts            Cognito config
├── data/resource.ts            GraphQL schema (6 models + sendInvoiceEmail mutation)
├── storage/resource.ts         S3 (invoices/{entity_id}/*, receipts/{entity_id}/*)
├── functions/
│   └── send-invoice-email/
│       ├── resource.ts         Function definition (SES_FROM_EMAIL env var)
│       └── handler.ts          SES raw email with PDF attachment (server-controlled sender)
└── backend.ts                  Backend entry point + SES IAM policy (scoped to verified identities)

scripts/
├── migrate-data.py             Prod→sandbox data migration
├── setup-localstack.sh         LocalStack setup
└── start-sandbox.sh            Sandbox launcher
```

---

## 📋 Pre-Launch Checklist

### Done ✅
- [x] SES domain verified (cloudpro-digital.co.nz)
- [x] SES_FROM_EMAIL configured (testing@ for sandbox, noreply@ for prod)
- [x] SES IAM policy scoped to verified identities
- [x] Server-controlled sender (no client spoofing)
- [x] Remove legacy files (lib/local-db.ts, lib/mock-auth.ts)
- [x] Run npm audit fix
- [x] Remove .amplify artifacts from git

### Before Deployment
- [ ] Request SES production access (exit sandbox) — needed to send to any email
- [ ] Set SES_FROM_EMAIL=noreply@cloudpro-digital.co.nz for production
- [ ] End-to-end test: create invoice → generate PDF → email → verify delivery
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
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
- **SES Status:** Sandbox mode (can only send to verified addresses)
- **SES Verified:** cloudpro-digital.co.nz (domain), sagar.d2506@gmail.com (email)
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
| 5: Pre-launch Polish (Mar 14-16) | SES security, PDF overhaul, email dialog, cleanup | ✅ Complete |

**All features complete. 16 days remaining for final testing and deployment.**
