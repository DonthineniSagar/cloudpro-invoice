# Development Context - CloudPro Invoice

**Last Updated:** March 12, 2026, 00:16 NZDT  
**Current Sprint:** Sprint 1 - Foundation & Auth  
**Current Day:** Day 3 In Progress (50% done)  
**Status:** Settings pages complete, ready for client management

---

## 🎯 Project Overview

**Launch Date:** April 1, 2026 (19 days remaining)  
**Focus:** Invoice, Client, Expenses, User Settings, Enriched Reporting  
**Tech Stack:** Next.js 14, AWS Amplify Gen 2 (Sydney region)  
**Development Mode:** Real AWS backend with local frontend

---

## ✅ What's Built & Working

### Sprint 1 Day 1 (Complete)
- ✅ Testing framework (Jest + LocalStack config)
- ✅ AWS Amplify deployed to Sydney (ap-southeast-2)
- ✅ Cognito User Pool + Identity Pool
- ✅ DynamoDB tables (User, Client, Invoice, InvoiceItem, Expense, CompanyProfile)
- ✅ S3 buckets
- ✅ AppSync GraphQL API

### Sprint 1 Day 2 (Complete - 100%)
- ✅ Real AWS Cognito authentication
- ✅ Login page with professional error handling
- ✅ Signup page with firstName/lastName
- ✅ Email verification flow (signup & login)
- ✅ Resend verification code
- ✅ Input text visibility (black text)
- ✅ Company Profile page (full CRUD)
- ✅ Dashboard showing user's first name
- ✅ User profile stored in Cognito

### Sprint 1 Day 3 (In Progress - 50%)
- ✅ Settings page layout with tabs
- ✅ User profile settings (firstName, lastName, phone)
- ✅ Company profile settings (already working)
- ✅ Navigation between settings
- ⏳ Client management - NEXT
- ⏳ Invoice creation - TODO

### Authentication (Real AWS Cognito)
**Files:**
- `lib/amplify-config.tsx` - Amplify configuration
- `lib/auth-context.tsx` - Real Cognito auth (signUp, signIn, signOut)
- `app/auth/login/page.tsx` - Login form
- `app/auth/signup/page.tsx` - Signup form
- `amplify_outputs.json` - AWS config (auto-generated)

**Features:**
- Email/password authentication
- Auto sign-in after signup
- Session management
- Protected routes
- User attributes (email, given_name, family_name)

### Company Profile (Real DynamoDB)
**Files:**
- `app/settings/company/page.tsx` - Company profile CRUD
- `amplify/data/resource.ts` - Data schema

**Fields:**
- Company: name, email, phone, address, city, state, postalCode, country
- Tax: gstNumber, bankAccount, defaultCurrency (NZD), defaultGstRate (15%)
- Owner-based authorization (users see only their data)

**Features:**
- Create/update company profile
- Load existing profile
- Save to DynamoDB
- Link to user via userId

---

## 📊 Data Models (Amplify Gen 2)

### Implemented & Working
```typescript
CompanyProfile {
  companyName*, companyEmail, companyPhone, companyAddress
  companyCity, companyState, companyPostalCode, companyCountry
  gstNumber, bankAccount
  defaultCurrency: 'NZD', defaultGstRate: 15
  userId* (owner)
}

User {
  email*, firstName, lastName
  companyProfile (hasOne)
}
```

### Defined, Not Yet Used
```typescript
Client {
  name*, email, phone
  address, city, state, postalCode, country
  notes, userId* (owner)
}

Invoice {
  invoiceNumber*, issueDate*, dueDate
  clientName*, clientEmail, clientAddress
  subtotal*, gstRate, gstAmount, total*
  currency, status, pdfUrl
  companyName, companyEmail, gstNumber, bankAccount
  userId*, clientId
  items (hasMany InvoiceItem)
}

InvoiceItem {
  description*, wbs, quantity*, unitPrice*, amount*
  invoiceId*
}

Expense {
  description*, category, amount*
  amountExGst, gstAmount, gstClaimable
  date*, receiptUrl, notes, status
  userId*
}
```

---

## 🗂️ File Structure

```
cloudpro-invoice/
├── app/
│   ├── layout.tsx              ✅ AuthProvider + AmplifyConfig
│   ├── page.tsx                ✅ Redirects to login
│   ├── auth/
│   │   ├── login/page.tsx      ✅ Real Cognito login
│   │   └── signup/page.tsx     ✅ Real Cognito signup
│   ├── dashboard/page.tsx      ✅ Dashboard with setup prompt
│   └── settings/
│       └── company/page.tsx    ✅ Company profile CRUD
├── lib/
│   ├── amplify-config.tsx      ✅ AWS configuration
│   ├── auth-context.tsx        ✅ Real Cognito auth
│   ├── gst-calculations.ts     ✅ GST utilities
│   ├── local-db.ts             ⚠️  Mock DB (not used anymore)
│   ├── mock-auth.ts            ⚠️  Mock auth (not used anymore)
│   └── aws-clients.ts          ✅ AWS SDK clients
├── amplify/
│   ├── package.json            ✅ {"type": "module"}
│   ├── tsconfig.json           ✅ ES2022 config
│   ├── backend.ts              ✅ Auth + Data + Storage
│   ├── auth/resource.ts        ✅ Cognito config
│   ├── data/resource.ts        ✅ GraphQL schema
│   └── storage/resource.ts     ✅ S3 config
├── amplify_outputs.json        ✅ AWS config (auto-generated)
├── .env.creds                  ✅ AWS credentials (not in git)
├── .env.local                  ✅ Sydney region config
├── CONTEXT.md                  ← This file
├── DEV_GUIDE.md                ✅ Development instructions
├── TEST_NOW.md                 ✅ Testing instructions
├── BACKLOG.md                  ✅ Sprint tasks
├── SPRINT1_DAY1.md             ✅ Day 1 summary
└── START_HERE.md               ✅ Quick start
```

---

## 🎯 Current Status

### Working Features
✅ User signup/login/logout (AWS Cognito)  
✅ Protected dashboard route  
✅ Company profile CRUD (DynamoDB)  
✅ Real AWS backend (Sydney region)  
✅ Owner-based authorization  
✅ GST calculations (15% NZ rate)  
✅ Auto-generated GraphQL API  

### In Progress (Day 2)
⏳ User profile (firstName, lastName)  
⏳ Settings page navigation  

### Not Yet Started
❌ Client management  
❌ Invoice creation  
❌ Expense tracking  
❌ PDF generation  
❌ S3 file uploads  
❌ Dashboard metrics (real data)  

---

## 📋 Next Tasks (Day 2 Continued)

### Priority 1: User Profile
- [ ] Add firstName, lastName to signup
- [ ] Create user profile page
- [ ] Update user attributes in Cognito
- [ ] Link user to company profile
- [ ] Show user name in dashboard header

### Priority 2: Settings Navigation
- [ ] Create settings layout
- [ ] Add navigation tabs (Profile, Company)
- [ ] User settings page
- [ ] Company settings page (already exists)

### Priority 3: Dashboard Improvements
- [ ] Check if company profile exists
- [ ] Hide setup prompt if profile complete
- [ ] Add navigation to clients/invoices

---

## 🔧 Development Commands

```bash
# AWS Sandbox (Terminal 1 - keep running)
npm run sandbox          # Start Amplify sandbox (foreground)
npm run sandbox:bg       # Start Amplify sandbox (background)

# Frontend (Terminal 2)
npm run dev              # Start Next.js dev server

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Deployment
source .env.creds && export AWS_REGION=ap-southeast-2
npx ampx sandbox --once  # One-time deploy
```

---

## 🚀 How to Resume Development

### 1. Read This File
Understand current state and what's built.

### 2. Start AWS Sandbox (Terminal 1)
```bash
cd /Users/sdonthineni/projects/cloudpro-invoice
npm run sandbox
```
Keep this running - it syncs AWS backend.

### 3. Start Frontend (Terminal 2)
```bash
cd /Users/sdonthineni/projects/cloudpro-invoice
npm run dev
```
Visit: http://localhost:3000

### 4. Test Current Features
- Sign up with email/password
- Go to dashboard
- Click "Set Up Company Profile"
- Fill in company details
- Save and verify data persists

### 5. Continue Day 2 Tasks
Pick up from "Next Tasks" section above.

---

## 🐛 Known Issues

### Minor
- No firstName/lastName in signup yet
- No settings navigation
- Dashboard metrics show $0 (no real data yet)
- No error toast notifications

### To Fix Later
- Add loading states everywhere
- Add error boundaries
- Add form validation with Zod
- Add success/error toasts
- Improve mobile responsiveness

---

## 💡 Key Decisions & Learnings

### Why Real AWS Now?
- Faster to build with real backend
- No migration needed later
- Test auth/data flows early
- Owner authorization works out of the box

### Critical Fix for Amplify
- Must add `amplify/package.json` with `{"type": "module"}`
- Must use ES2022 module resolution in tsconfig
- Cannot use `.default()` on enums in schema

### Data Model Decisions
- CompanyProfile separate from User (1:1 relationship)
- Invoice stores company snapshot (for historical accuracy)
- Owner-based auth on all models
- Default currency: NZD, GST rate: 15%

---

## 📚 Important Files to Reference

### Planning
- `BACKLOG.md` - All sprint tasks
- `IMPLEMENTATION_PLAN.md` - 20-day breakdown
- `ARCHITECTURE.md` - System design

### Development
- `DEV_GUIDE.md` - How to run everything
- `TEST_NOW.md` - What to test
- `lib/auth-context.tsx` - Auth implementation
- `amplify/data/resource.ts` - Data schema

### Testing
- `TESTING.md` - Testing guide
- `__tests__/unit/lib/gst-calculations.test.ts` - Example tests

---

## 🎨 Design System

### Colors
- **Primary:** Indigo (#6366F1)
- **Secondary:** Purple (#A855F7)
- **Success:** Green (#10B981)
- **Error:** Red (#EF4444)

### Components
- **Buttons:** `bg-indigo-600 hover:bg-indigo-700 rounded-lg px-6 py-3`
- **Inputs:** `border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500`
- **Cards:** `bg-white rounded-xl shadow-sm border border-gray-200 p-6`

---

## 📊 Progress Tracking

### Sprint 1 (Days 1-5): Foundation & Auth
- ✅ Day 1: Auth setup, AWS deployment (100%)
- ⏳ Day 2: Company profile, user profile (50%)
- ⏳ Day 3: Settings, polish (0%)
- ⏳ Day 4: Testing, fixes (0%)
- ⏳ Day 5: Sprint review (0%)

**Overall Progress:** 30% of Sprint 1 complete

### Timeline
- **Today:** March 11, 2026
- **Launch:** April 1, 2026
- **Days Remaining:** 19 days

---

## 🔐 AWS Configuration

### Region
- **Primary:** ap-southeast-2 (Sydney)

### Services Deployed
- **Cognito:** User Pool + Identity Pool
- **AppSync:** GraphQL API
- **DynamoDB:** 6 tables (User, Client, Invoice, InvoiceItem, Expense, CompanyProfile)
- **S3:** Storage buckets
- **IAM:** Roles and policies

### Credentials
- Stored in `.env.creds` (not in git)
- Session token expires - need to refresh periodically

---

## 📝 Notes for Next Session

### Session Workflow
1. Read CONTEXT.md (this file)
2. Start sandbox: `npm run sandbox`
3. Start frontend: `npm run dev`
4. Test current features
5. Continue Day 2 tasks
6. Commit progress
7. Update CONTEXT.md

### Git Workflow
```bash
git add -A
git commit -m "feat: [description]"
git push origin main
```

### After Each Logical Work
1. Commit code with clear message
2. Update CONTEXT.md with progress
3. Create/update day summary if needed

---

## ✅ Ready to Continue!

**Current State:** AWS deployed, Company Profile working  
**Next:** User profile + Settings navigation  
**Then:** Client management → Invoice creation  

**Everything is connected to real AWS!** 🚀

### Amplify Schema (`amplify/data/resource.ts`)
```typescript
CompanyProfile {
  companyName, companyEmail, companyPhone, companyAddress
  gstNumber, bankAccount
  defaultCurrency: 'NZD'
  defaultGstRate: 15
  logoUrl
}

User {
  email, firstName, lastName
  companyProfile (hasOne)
}

Client {
  name, email, phone
  address, city, state, postalCode, country
}

Invoice {
  invoiceNumber, issueDate, dueDate
  clientName, clientEmail, clientAddress
  subtotal, gstRate, gstAmount, total
  currency: 'NZD'
  status: DRAFT | SENT | PAID | OVERDUE | CANCELLED
  items (hasMany InvoiceItem)
}

InvoiceItem {
  description, wbs, quantity, unitPrice, amount
}

Expense {
  description, category
  amount, amountExGst, gstAmount, gstClaimable
  date, receiptUrl, status
}
```

---

## 🗂️ File Structure

```
cloudpro-invoice/
├── app/
│   ├── layout.tsx              ✅ AuthProvider added
│   ├── page.tsx                ✅ Redirects to login
│   ├── auth/
│   │   ├── login/page.tsx      ✅ Login form
│   │   └── signup/page.tsx     ✅ Signup form
│   └── dashboard/page.tsx      ✅ Basic dashboard
├── lib/
│   ├── auth-context.tsx        ✅ Auth hooks
│   ├── mock-auth.ts            ✅ Mock authentication
│   ├── local-db.ts             ✅ Mock database
│   ├── gst-calculations.ts     ✅ GST utilities
│   └── aws-clients.ts          ✅ AWS client setup (unused)
├── amplify/
│   ├── data/resource.ts        ✅ Schema defined
│   ├── auth/resource.ts        ✅ Cognito config
│   ├── storage/resource.ts     ✅ S3 config
│   └── backend.ts              ✅ Backend config
├── __tests__/
│   └── unit/lib/
│       └── gst-calculations.test.ts ✅ 7 tests passing
├── BACKLOG.md                  ✅ 20-day sprint plan
├── ARCHITECTURE.md             ✅ System design
├── PRODUCT_VISION.md           ✅ Vision & roadmap
├── IMPLEMENTATION_PLAN.md      ✅ Sprint breakdown
├── DESIGN_SYSTEM.md            ✅ UI guidelines
├── TESTING.md                  ✅ Testing guide
├── SPRINT1_DAY1.md             ✅ Day 1 summary
└── CONTEXT.md                  ← This file
```

---

## 🎯 Current Status

### Working Features
✅ User signup/login/logout (AWS Cognito)  
✅ Protected dashboard route  
✅ Company profile CRUD (DynamoDB)  
✅ Real AWS backend (Sydney region)  
✅ Owner-based authorization  
✅ GST calculations (15% NZ rate)  

### Not Yet Implemented
❌ User profile (firstName, lastName)  
❌ Client management  
❌ Invoice creation  
❌ Expense tracking  
❌ PDF generation  
❌ S3 file uploads  

---

## 📋 Next Tasks (Sprint 1 Day 2)

### Priority 1: Company Profile
- [ ] Create company profile form
- [ ] Fields: companyName, email, phone, address
- [ ] Add GST number field
- [ ] Add bank account field
- [ ] Add default currency (NZD)
- [ ] Add default GST rate (15%)
- [ ] Save to local DB
- [ ] Link to user

### Priority 2: User Profile
- [ ] Add firstName, lastName to user
- [ ] Create user profile page
- [ ] Link user to company profile
- [ ] Update auth context

### Priority 3: Settings Page
- [ ] Create settings layout
- [ ] User settings section
- [ ] Company settings section
- [ ] Navigation between sections

---

## 🔧 Development Commands

```bash
# Development
npm run dev                     # Start Next.js dev server

# Testing
npm test                        # Run all tests
npm run test:watch              # Watch mode
npm run test:coverage           # Coverage report

# LocalStack (optional, not required for current dev)
npm run localstack:start        # Start LocalStack
npm run localstack:setup        # Create AWS resources
npm run localstack:stop         # Stop LocalStack
```

---

## 🎨 Design System

### Colors
- **Primary:** Indigo (#6366F1)
- **Secondary:** Purple (#A855F7)
- **Success:** Green (#10B981)
- **Error:** Red (#EF4444)

### Components
- **Buttons:** `bg-indigo-600 hover:bg-indigo-700 rounded-lg px-6 py-3`
- **Inputs:** `border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500`
- **Cards:** `bg-white rounded-xl shadow-sm border border-gray-200 p-6`

---

## 🐛 Known Issues

### Minor
- Data lost on page refresh (in-memory only)
- No email validation
- No password strength indicator
- No loading states on forms

### To Fix Later
- Add localStorage persistence
- Add proper validation
- Add error boundaries
- Add toast notifications

---

## 💡 Key Decisions

### Why Local Mocks?
- **Fast iteration** - No AWS setup during development
- **No Docker** - Works without LocalStack
- **Easy testing** - Simple in-memory data
- **Later migration** - Easy to swap with real AWS Amplify

### When to Switch to AWS?
- After MVP features are built and tested locally
- When ready for production deployment
- When need real authentication (Cognito)
- When need persistent storage (DynamoDB)

---

## 📚 Important Files to Reference

### Planning
- `BACKLOG.md` - Sprint tasks and priorities
- `IMPLEMENTATION_PLAN.md` - Day-by-day breakdown
- `ARCHITECTURE.md` - System design

### Development
- `lib/auth-context.tsx` - Auth state management
- `lib/local-db.ts` - Data operations
- `amplify/data/resource.ts` - Data schema

### Testing
- `TESTING.md` - Testing guide
- `__tests__/unit/lib/gst-calculations.test.ts` - Example tests

---

## 🚀 Quick Start for Next Session

1. **Review this file** - Understand current state
2. **Check SPRINT1_DAY1.md** - See what was completed
3. **Check BACKLOG.md** - See next tasks
4. **Start coding** - Continue from Day 2 tasks
5. **Update this file** - After completing logical work

---

## 📝 Notes for Future Sessions

### Session Workflow
1. Read CONTEXT.md (this file)
2. Review last day's summary (SPRINT1_DAYX.md)
3. Check BACKLOG.md for next tasks
4. Build features
5. Test locally (npm run dev)
6. Commit progress
7. Update CONTEXT.md
8. Create day summary

### Git Workflow
```bash
git add -A
git commit -m "feat: [description]"
git push origin main
```

---

**Ready to continue Sprint 1 Day 2!** 🎯
