# CloudPro Invoice - Feature Backlog

**Launch Date:** April 1, 2026  
**Last Updated:** March 16, 2026  
**Status:** MVP complete. Deploying to AWS Amplify. Testing in progress.

---

## 🐛 Bug Fixes & Tech Debt (P0)

- [ ] Fix missing `toast` import in `app/invoices/[id]/edit/page.tsx:222` — uses `toast.error()` but never imports `useToast`
- [ ] Fix `SignInOutput` type mismatch in `lib/auth-context.tsx:88`
- [ ] Pre-existing ESLint warnings: unused vars, `any` types in generate-pdf.ts, auth-context.tsx, settings pages
- [ ] `<img>` tag in `AppLayout.tsx` — replace with `next/image` for optimised loading
- [ ] Amplify Node 16 deprecation notice — ensure Lambda runtime is Node 20+

---

## 🚀 Pre-Launch (Before April 1)

### Deployment & Infrastructure
- [ ] Connect GitHub repo (`main` branch) to Amplify app `d1tnysmm95p3te` via Console
- [ ] Verify Amplify CI/CD pipeline builds and deploys successfully
- [ ] Request SES production access (exit sandbox mode)
- [ ] Set `SES_FROM_EMAIL=noreply@cloudpro-digital.co.nz` for prod environment
- [ ] End-to-end test on deployed URL: signup → create invoice → PDF → email
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Set up custom domain (if applicable)
- [ ] Create `prod` branch on GitHub, connect to Amplify as production environment

### Quick Wins
- [ ] Add loading skeletons on dashboard, invoice list, client list
- [ ] Add empty state illustrations (no invoices yet, no clients yet)
- [ ] Favicon update — use CloudPro logo instead of Next.js default
- [ ] Meta tags / Open Graph for landing page SEO
- [ ] 404 page — custom not-found page

---

## 📋 Phase 2 — Post-Launch (April–May 2026)

### P1 — High Value

#### Payment Reminders & Overdue Automation
- [ ] Auto-send reminder email X days before due date
- [ ] Auto-mark invoices as OVERDUE when past due (cron/EventBridge)
- [ ] Overdue notification email to business owner
- [ ] Configurable reminder schedule (7 days, 3 days, 1 day before)

#### Recurring Invoices
- [ ] Recurring schedule (weekly, fortnightly, monthly, quarterly)
- [ ] Auto-generate draft invoice from template
- [ ] Recurring invoice list view
- [ ] Pause/resume recurring invoices

#### Invoice Templates
- [ ] Multiple PDF templates (modern, classic, minimal)
- [ ] Template preview in settings
- [ ] Custom colour scheme per template
- [ ] Custom footer text / terms

#### Client Portal
- [ ] Public invoice view link (no login required)
- [ ] Client can download PDF from portal
- [ ] Payment status visible to client
- [ ] Client invoice history page

### P2 — Nice to Have

#### Payment Integration (Stripe)
- [ ] Stripe Connect onboarding
- [ ] Pay Now button on client portal
- [ ] Payment confirmation auto-updates invoice status to PAID
- [ ] Payment receipt email
- [ ] Partial payments support

#### Receipt OCR (AWS Textract)
- [ ] Upload receipt photo → auto-extract amount, date, vendor
- [ ] Pre-fill expense form from OCR results
- [ ] Confidence score display
- [ ] Manual correction UI

#### Advanced Reporting
- [ ] Profit & loss statement (printable)
- [ ] Aged receivables report (30/60/90 days)
- [ ] Cash flow forecast (based on outstanding invoices + recurring)
- [ ] Year-over-year comparison
- [ ] Export to PDF (reports)

#### Multi-Currency
- [ ] Support AUD, USD, GBP, EUR alongside NZD
- [ ] Exchange rate lookup (at invoice date)
- [ ] Currency selector on invoice form
- [ ] Reporting in base currency (NZD)

---

## 📋 Phase 3 — Growth (June+ 2026)

### P3 — Scale

#### Team & Multi-User
- [ ] Invite team members (Cognito groups)
- [ ] Role-based access: Admin, Accountant, Viewer
- [ ] Company-scoped data (companyId on all models)
- [ ] Activity log / audit trail

#### Integrations
- [ ] Xero export (CSV/API)
- [ ] QuickBooks export
- [ ] Google Sheets sync
- [ ] Zapier webhooks (invoice created, paid, overdue)

#### Time Tracking
- [ ] Timer per project/client
- [ ] Timesheet entries (date, hours, description, project)
- [ ] Auto-generate invoice from timesheet
- [ ] Hourly rate per client/project

#### Mileage Tracking
- [ ] Log trips (date, distance, purpose)
- [ ] IRD rate auto-calculation
- [ ] Auto-create expense from mileage
- [ ] Monthly mileage summary

#### Mobile App
- [ ] React Native or PWA
- [ ] Camera receipt capture
- [ ] Push notifications (payment received, invoice overdue)
- [ ] Quick invoice creation

---

## 🔒 Security & Compliance Backlog

- [ ] Rate limiting on API (AppSync WAF)
- [ ] Input sanitisation audit (XSS prevention)
- [ ] GDPR/Privacy Act compliance (data export, account deletion)
- [ ] S3 bucket lifecycle policy (archive old PDFs after 7 years per IRD)
- [ ] CloudWatch alarms (Lambda errors, API latency)
- [ ] Backup strategy for DynamoDB (point-in-time recovery)

---

## 📊 Performance Backlog

- [ ] Lazy load charts on dashboard (reduce initial bundle)
- [ ] Paginate invoice/expense lists (currently loads all)
- [ ] Image optimisation — `next/image` for logo, receipts
- [ ] Bundle analysis — `/invoices/[id]` page is 340kB first load (PDF lib)
- [ ] Consider code-splitting generate-pdf.ts (dynamic import)

---

## ✅ Completed (MVP)

All MVP features shipped — see [CONTEXT.md](./CONTEXT.md) for full list:
- Auth (Cognito signup/login/forgot password)
- Company profile with logo upload
- Client CRUD
- Invoice CRUD with line items + WBS
- Professional NZ tax invoice PDF generation
- Email sending via SES (with review dialog)
- Expense tracking with receipt upload + GST calculations
- Dashboard with charts & metrics
- NZ tax reports with CSV export
- Dark/light theme
- Mobile responsive
- Owner-based data security

---

**Next Review:** March 20, 2026  
**Team:** Solo developer
