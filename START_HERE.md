# Quick Reference - Start Here

**For AI Assistant:** Read this first when resuming work

---

## 📍 Current State

**Sprint:** 1 (Foundation & Auth)  
**Day:** 1 Complete → Starting Day 2  
**Date:** March 11, 2026  
**Launch:** April 1, 2026 (19 days remaining)

---

## ✅ What Works Now

```bash
npm run dev
# Visit http://localhost:3000
# Sign up → Dashboard → Sign out
```

**Working:**
- Auth (signup/login/logout)
- Dashboard (basic)
- Mock data (in-memory)
- Tests (7 passing)

---

## 🎯 Next: Day 2 Tasks

1. **Company Profile Form**
   - companyName, email, phone, address
   - gstNumber, bankAccount
   - defaultCurrency: NZD
   - defaultGstRate: 15%

2. **User Profile**
   - firstName, lastName
   - Link to company profile

3. **Settings Page**
   - User settings
   - Company settings

---

## 📁 Key Files

**Read First:**
- `CONTEXT.md` - Full development context
- `SPRINT1_DAY1.md` - What was completed
- `BACKLOG.md` - All tasks

**Code:**
- `lib/auth-context.tsx` - Auth state
- `lib/local-db.ts` - Mock database
- `app/dashboard/page.tsx` - Dashboard

**Schema:**
- `amplify/data/resource.ts` - Data models

---

## 🚀 Quick Start

```bash
# 1. Read context
cat CONTEXT.md

# 2. Start dev server (separate terminal)
npm run dev

# 3. Run tests
npm test

# 4. Start coding Day 2 features
```

---

## 💾 After Each Logical Work

1. Commit code
2. Update `CONTEXT.md`
3. Create/update `SPRINT1_DAYX.md`

---

**Ready to build Company Profile!** 🎯
