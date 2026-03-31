# CloudPro Invoice - Feature Backlog

**Launch Date:** April 1, 2026  
**Last Updated:** March 27, 2026  
**Status:** MVP complete. Pre-launch quick wins shipped. Deploying to AWS Amplify. Testing in progress.

---

## ✅ Bug Fixes & Tech Debt — DONE

- [x] Fix missing `useToast` import in `app/invoices/[id]/edit/page.tsx`
- [x] Fix `SignInOutput` return type mismatch in `lib/auth-context.tsx`
- [x] Fix unused `error` variable in `lib/auth-context.tsx`
- [x] Fix ESLint `any` types in `generate-pdf.ts` and `settings/security`
- [x] Replace `<img>` with `next/image` in `AppLayout.tsx`
- [x] Set Lambda runtime to Node 20
- [x] Custom 404 page
- [x] Favicon updated to CloudPro logo

---

## 🚀 Pre-Launch (Before April 1)

### Deployment & Infrastructure
- [ ] Connect GitHub repo (`main` branch) to Amplify app via Console
- [ ] Verify Amplify CI/CD pipeline builds and deploys successfully
- [ ] Request SES production access (exit sandbox mode)
- [ ] Set `SES_FROM_EMAIL=noreply@cloudpro-digital.co.nz` for prod environment
- [ ] End-to-end test on deployed URL: signup → create invoice → PDF → email
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Set up custom domain (if applicable)
- [ ] Create `prod` branch on GitHub, connect to Amplify as production environment

### Quick Wins
- [x] Add loading skeletons on dashboard, invoice list, client list
- [x] Add empty state illustrations (no invoices yet, no clients yet)
- [x] Meta tags / Open Graph for landing page SEO

---

## 📋 Phase 2 — Post-Launch (April–May 2026)

### 2.1 Payment Reminders & Overdue Automation
Auto-chase overdue invoices without manual effort.

**Implementation:**
- EventBridge scheduled rule (daily at 9am NZST)
- Lambda function scans invoices: marks past-due as OVERDUE, sends reminders
- Configurable reminder schedule stored in CompanyProfile

**Tasks:**
- [x] Add `reminderSchedule` fields to CompanyProfile (reminderDaysBefore, reminderDaysAfter, templates)
- [ ] Create `process-overdue` Lambda (EventBridge → scan DynamoDB → update status)
- [ ] Send reminder email via SES (reuse existing email Lambda pattern)
- [x] Add reminder history to Invoice model (`lastReminderSent`, `reminderCount`)
- [x] Settings UI: configure reminder days, enable/disable auto-reminders (/settings/email)
- [x] Dashboard: overdue count badge
- [x] "Send Reminder" quick action on invoice detail (manual, reuses email Lambda)

---

### 2.2 Recurring Invoices
Set-and-forget billing for retainer clients.

**Implementation:**
- New `RecurringInvoice` model (template + schedule)
- EventBridge cron triggers Lambda to generate draft invoices from templates
- Supports weekly, fortnightly, monthly, quarterly, annually

**Tasks:**
- [x] Add `RecurringInvoice` model (clientId, lineItems, frequency, nextDate, endDate, active)
- [ ] Create `generate-recurring` Lambda (EventBridge daily → check nextDate → create Invoice draft)
- [x] Recurring invoice form UI (select client, line items, frequency, start/end date)
- [x] Recurring invoice list view with status (Active, Paused)
- [x] Pause/resume toggle
- [x] "Generate Now" manual trigger (creates draft invoice + advances nextDate)
- [x] Auto-advance `nextDate` after each generation
- [ ] Email notification when recurring invoice is generated

---

### 2.3 Invoice Templates
Multiple professional PDF layouts.

**Implementation:**
- Template definitions in code (no DB needed for MVP)
- Template selector on company settings + invoice detail page
- Each template = different `generate-pdf` layout function

**Tasks:**
- [x] Create 3 templates: Modern (current), Classic (serif fonts, traditional), Minimal (clean, no borders)
- [ ] Template preview thumbnails in settings
- [x] Add `defaultTemplate` field to CompanyProfile
- [x] Template selector dropdown on invoice detail (override per invoice)
- [ ] Custom accent colour picker (stored in CompanyProfile)
- [ ] Custom footer text field (payment terms, legal notices)

---

### 2.4 Client Portal
Let clients view and download their invoices without logging in.

**Implementation:**
- Public route `/portal/[token]` — token = random UUID stored on invoice
- API route `/api/portal/[token]` — queries via API key auth
- No auth required — token-based access
- Read-only view of invoice

**Tasks:**
- [x] Generate unique portal token per invoice (random UUID)
- [x] Add `portalToken` field to Invoice model
- [x] Public `/portal/[token]` page — verify token, display invoice details
- [ ] PDF download button on portal page (pre-signed S3 URL)
- [x] "Copy Portal Link" button on invoice detail page
- [x] Portal shows payment status (Paid/Unpaid/Overdue)
- [ ] "View Online" link in email template
- [ ] Optional: client can mark as "Disputed" with a note

---

### 2.5 Payment Integration (Stripe)
Get paid directly from invoices.

**Implementation:**
- Stripe Checkout session created per invoice
- Webhook Lambda listens for `checkout.session.completed` → marks invoice PAID
- Stripe Connect for receiving payments

**Tasks:**
- [ ] Stripe Connect onboarding flow in settings
- [ ] Add `stripeAccountId` to CompanyProfile, `stripeSessionId` to Invoice
- [ ] Create `create-checkout` Lambda (generates Stripe Checkout session)
- [ ] "Pay Now" button on client portal page
- [ ] Create `stripe-webhook` Lambda (listens for payment events)
- [ ] Auto-update invoice status to PAID on successful payment
- [ ] Payment receipt email to client
- [ ] Partial payments support (track `amountPaid` on Invoice)
- [ ] Stripe dashboard link in settings

---

### 2.6 Receipt OCR (AWS Textract)
Snap a receipt, auto-fill the expense.

**Implementation:**
- Upload receipt image → Lambda → Textract `AnalyzeExpense`
- Parse response for total, date, vendor name
- Pre-fill expense form, user confirms/edits

**Tasks:**
- [x] Create `process-receipt` Lambda (Textract AnalyzeExpense)
- [x] Parse Textract response: extract TOTAL, DATE, VENDOR_NAME, TAX
- [ ] Store OCR results in new `ReceiptOCR` model (invoiceId, rawResponse, extracted fields)
- [x] Pre-fill expense form from OCR results (auto-scan on receipt upload)
- [ ] Confidence score display (highlight low-confidence fields in yellow)
- [x] Manual correction UI (edit extracted values before saving)
- [x] Support JPEG, PNG, PDF receipt formats
- [x] Camera capture button on mobile (capture="environment")

---

### 2.7 Advanced Reporting
Deeper financial insights for tax time and business planning.

**Tasks:**
- [ ] Profit & loss statement (printable PDF)
- [ ] Aged receivables report (current, 30, 60, 90+ days buckets)
- [ ] Cash flow forecast (outstanding invoices by due date + recurring projections)
- [ ] Year-over-year comparison (revenue, expenses, profit)
- [ ] Export reports to PDF
- [ ] Monthly email summary (Lambda + EventBridge, first of month)

---

### 2.8 Multi-Currency
Support international clients.

**Tasks:**
- [ ] Add `currency` field to Client model (default NZD)
- [ ] Currency selector on invoice form (NZD, AUD, USD, GBP, EUR)
- [ ] Exchange rate lookup API (at invoice date) — use exchangerate.host or similar
- [ ] Store `exchangeRate` and `baseCurrencyTotal` on Invoice
- [ ] Dashboard reporting always in NZD (converted at invoice exchange rate)
- [ ] Currency symbol formatting throughout UI

---

### 2.9 Mobile App (PWA)
Full mobile experience without app store.

**Implementation:**
- Progressive Web App — add `manifest.json`, service worker, install prompt
- Optimise existing responsive UI for touch interactions
- Camera access for receipt capture

**Tasks:**
- [x] Add `manifest.json` with app name, icons, theme colour, start URL
- [x] Add service worker for offline caching (network-first with offline fallback)
- [x] App install prompt banner on mobile
- [ ] Camera capture button on expense form (receipt photo)
- [ ] Push notifications via Web Push API (payment received, invoice overdue)
- [ ] Touch-optimised: larger tap targets, swipe actions on lists
- [x] Splash screen with CloudPro branding
- [ ] Test on iOS Safari, Android Chrome, Samsung Internet

---

## 📋 Phase 3 — Growth (June+ 2026)

### PAYE Payroll
Monthly PAYE processing for employees.

**Tasks:**
- [ ] Employee model (name, IRD number, tax code, salary/hourly rate, KiwiSaver rate)
- [ ] Pay run: calculate gross, PAYE tax (NZ tax tables), KiwiSaver, student loan, net pay
- [ ] Pay run history with payslip PDF generation
- [ ] IR345 Employment Information filing summary (monthly to IRD)
- [ ] Employee payslip email
- [ ] KiwiSaver employer contribution tracking (3% minimum)
- [ ] Holiday pay accrual tracking (8% or 4 weeks)
- [ ] Dashboard widget: next pay run due, YTD PAYE paid

### Team & Multi-User
- [ ] Invite team members (Cognito groups)
- [ ] Role-based access: Admin, Accountant, Viewer
- [ ] Company-scoped data (companyId on all models)
- [ ] Activity log / audit trail

### Integrations
- [ ] Xero export (CSV/API)
- [ ] QuickBooks export
- [ ] Google Sheets sync
- [ ] Zapier webhooks (invoice created, paid, overdue)

### Time Tracking
- [ ] Timer per project/client
- [ ] Timesheet entries (date, hours, description, project)
- [ ] Auto-generate invoice from timesheet
- [ ] Hourly rate per client/project

### Mileage Tracking
- [ ] Log trips (date, distance, purpose)
- [ ] IRD rate auto-calculation
- [ ] Auto-create expense from mileage
- [ ] Monthly mileage summary

---

## 🔒 Security & Compliance

- [ ] Rate limiting on API (AppSync WAF)
- [ ] Input sanitisation audit (XSS prevention)
- [ ] GDPR/Privacy Act compliance (data export, account deletion)
- [ ] S3 bucket lifecycle policy (archive old PDFs after 7 years per IRD)
- [ ] CloudWatch alarms (Lambda errors, API latency)
- [ ] DynamoDB point-in-time recovery

---

## 📊 Dashboard Improvements

- [ ] Rename "Profit (ex-GST)" to "Pre-Tax Margin" — current label is misleading
- [ ] Show "Revenue (ex-GST)" metric alongside total revenue (÷ 1.15)
- [ ] Show "Expenses (ex-GST)" metric alongside total expenses
- [ ] Pre-Tax Margin = Revenue ex-GST minus Expenses ex-GST (current calc is correct, label is wrong)
- [ ] Consider adding gross margin % indicator

### Email History & SES
- [ ] Email history model (invoiceId, to, cc, subject, sentAt, status)
- [ ] Log every sent email (invoice email + reminders) to EmailHistory
- [ ] Email history tab on invoice detail page (who, when, status)
- [ ] Email history list in settings (all sent emails, searchable)
- [ ] SES: Request production access (exit sandbox mode)
- [ ] SES: Set SES_FROM_EMAIL=noreply@cloudpro-digital.co.nz for prod
- [ ] SES: Verify recipient not required after production access

### Financial Year (FY) Support — PRIORITY
NZ Financial Year runs April 1 – March 31. All views should be FY-aware.

**Rules:**
- FY is determined by the expense/invoice DATE, not the created date
- FY26 = 1 Apr 2025 – 31 Mar 2026, FY27 = 1 Apr 2026 – 31 Mar 2027
- Previous FY expenses can be added until May 15 cutoff (IRD filing deadline)
- After May 15, previous FY is locked (read-only, no new expenses)

**Tasks:**
- [ ] Add FY selector/filter to dashboard (default: current FY)
- [ ] Dashboard metrics scoped to selected FY
- [ ] Monthly chart scoped to FY (Apr–Mar, not Jan–Dec)
- [ ] Invoice list: FY filter (based on issueDate)
- [ ] Expense list: FY filter (based on expense date, not createdAt)
- [ ] Reports page: default to current FY (already uses Apr–Mar range)
- [ ] FY cutoff logic: allow previous FY expense entry until May 15
- [ ] After May 15 cutoff: previous FY expenses are read-only
- [ ] FY badge/label on expense form when date falls in previous FY
- [ ] FY summary card: show FY totals on dashboard

---

## 📊 Performance

- [ ] Lazy load charts on dashboard (dynamic import)
- [ ] Paginate invoice/expense lists (currently loads all)
- [ ] Bundle analysis — `/invoices/[id]` is 345kB first load (PDF lib)
- [ ] Code-split generate-pdf.ts (dynamic import on demand)

---

## ✅ Completed (MVP)

All MVP features shipped — see [CONTEXT.md](./CONTEXT.md) for full list.

---

**Next Review:** March 20, 2026  
**Team:** Solo developer
