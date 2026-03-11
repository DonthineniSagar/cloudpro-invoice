# CloudPro Invoice - Development Guide

## 🚀 Quick Start

### Option 1: Run Everything (Recommended)

Open **2 separate terminals**:

**Terminal 1 - Amplify Sandbox:**
```bash
cd /Users/sdonthineni/projects/cloudpro-invoice
npm run sandbox
```
This keeps the AWS backend running and syncs changes.

**Terminal 2 - Frontend:**
```bash
cd /Users/sdonthineni/projects/cloudpro-invoice
npm run dev
```
Then visit: **http://localhost:3000**

---

### Option 2: Background Sandbox

If you want sandbox in background:

```bash
npm run sandbox:bg    # Start sandbox in background
npm run dev           # Start frontend
```

To stop sandbox:
```bash
kill $(cat .sandbox.pid)
```

---

## 📋 What to Test

### 1. Sign Up
- Visit http://localhost:3000
- Click "Sign up"
- Enter email and password (min 8 chars)
- Should redirect to dashboard

### 2. Company Profile
- Click "Set Up Company Profile" button
- Fill in company details
- Add GST number and bank account
- Click "Save Profile"
- Should redirect to dashboard

### 3. Sign Out & Sign In
- Click "Sign out" in header
- Sign in with same credentials
- Should see dashboard again

---

## 🔧 Development Commands

```bash
# Frontend
npm run dev              # Start Next.js dev server

# AWS Sandbox
npm run sandbox          # Start Amplify sandbox (foreground)
npm run sandbox:bg       # Start Amplify sandbox (background)

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

---

## 🐛 Troubleshooting

### Sandbox not connecting
```bash
# Check if sandbox is running
ps aux | grep ampx

# Restart sandbox
kill $(cat .sandbox.pid)
npm run sandbox
```

### Frontend errors
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### AWS credentials expired
```bash
# Update .env.creds with new credentials
# Then restart sandbox
```

---

## 📁 Important Files

- `amplify_outputs.json` - AWS configuration (auto-generated)
- `.env.creds` - AWS credentials (not in git)
- `amplify/data/resource.ts` - Data schema
- `lib/auth-context.tsx` - Authentication
- `app/settings/company/page.tsx` - Company profile

---

## ✅ Current Features

- ✅ AWS Cognito authentication
- ✅ Company profile (DynamoDB)
- ✅ Protected routes
- ✅ Owner-based authorization
- ✅ Sydney region (ap-southeast-2)

---

**Ready to develop!** 🎯
