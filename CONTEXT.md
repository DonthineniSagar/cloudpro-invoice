# Development Context - CloudPro Invoice

**Last Updated:** March 11, 2026, 23:27 NZDT  
**Current Sprint:** Sprint 1 - Foundation & Auth  
**Current Day:** Day 1 Complete + Day 2 Started ✅

---

## 🎯 Project Overview

**Launch Date:** April 1, 2026 (20 days total)  
**Focus:** Invoice, Client, Expenses, User Settings, Enriched Reporting  
**Tech Stack:** Next.js 14, Local Mocks (transitioning to AWS Amplify Gen 2)  
**Development Mode:** Local development with mock data (no Docker/AWS required)

---

## ✅ What's Built (Sprint 1 Day 1-2)

### Authentication System (Real AWS Cognito)
- **AWS Cognito** (`lib/auth-context.tsx`) - Real authentication
- **Amplify Config** (`lib/amplify-config.tsx`) - AWS configuration
- **Login Page** (`/auth/login`) - Email/password sign in
- **Signup Page** (`/auth/signup`) - Account creation with Cognito
- **Dashboard** (`/dashboard`) - Protected route with setup prompt

### Company Profile (Real DynamoDB)
- **Company Profile Page** (`/settings/company`) - Full CRUD
- **Fields:** Company name, email, phone, address, city, state, postal code, country
- **Tax Fields:** GST number, bank account, default currency (NZD), GST rate (15%)
- **Owner Authorization:** Users see only their own data

### Data Layer
- **Mock Database** (`lib/local-db.ts`) - In-memory CRUD operations
- **GST Calculations** (`lib/gst-calculations.ts`) - NZ tax utilities (15% GST)

### Testing
- **Jest + React Testing Library** - 7 tests passing
- **LocalStack Config** - Ready but not required for local dev

---

## 📊 Data Models (Defined, Not Yet Implemented)

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
