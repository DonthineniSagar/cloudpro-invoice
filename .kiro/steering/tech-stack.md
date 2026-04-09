# Tech Stack & Architecture

## Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: AWS Amplify Gen 2 (AppSync GraphQL, Cognito, S3, DynamoDB, Lambda, SES)
- **Region**: ap-southeast-2 (Sydney)
- **Validation**: Zod schemas (`lib/validation.ts`)
- **Icons**: Lucide React (never use other icon libraries)
- **Fonts**: Inter (Google Fonts, loaded in root layout)
- **PDF**: Custom generation via `lib/generate-pdf.ts`
- **Receipt OCR**: AWS Textract AnalyzeExpense (images inline, PDFs via S3)
- **Bank Import**: CSV parser via `lib/bank-statement-parser.ts` (dynamic header mapping, NZ bank formats)

## Project Structure
```
app/                  → Next.js pages (App Router)
  auth/               → Login, signup, forgot password
  dashboard/          → Main dashboard
  invoices/           → Invoice CRUD + recurring
  clients/            → Client management
  expenses/           → Expense tracking + bank CSV import + review
  reports/            → Financial reports
  settings/           → Profile, company, security, email
  api/                → API routes
components/           → Shared React components
lib/                  → Utilities, contexts, helpers
amplify/              → AWS Amplify backend
  auth/               → Cognito config
  data/resource.ts    → DynamoDB schema (single source of truth)
  storage/            → S3 config
  functions/          → Lambda functions
  backend.ts          → Backend orchestration
```

## Key Patterns
- Path alias: `@/*` maps to project root (e.g., `@/lib/auth-context`)
- All pages under `app/` that use hooks must have `'use client'` directive
- Auth context via `@/lib/auth-context` — use `useAuth()` hook
- Theme context via `@/lib/theme-context` — use `useTheme()` hook
- Toast notifications via `@/lib/toast-context` — use `useToast()` hook
- Protected pages wrap content in `<AppLayout>` component
- Amplify config loaded once in root layout via `<AmplifyConfig />`

## Data Layer
- Schema defined in `amplify/data/resource.ts` — this is the single source of truth
- All models use `.authorization((allow) => allow.owner())` for row-level security
- Access data via Amplify `generateClient()` — never direct DynamoDB calls from frontend
- Lambda functions use AWS SDK v3 for direct DynamoDB/SES/S3/Textract access

## Environment
- `amplify_outputs.json` — auto-generated Amplify config (do not edit manually)
- `.env.local` — local environment overrides
- Lambda env vars set in `amplify/backend.ts`
