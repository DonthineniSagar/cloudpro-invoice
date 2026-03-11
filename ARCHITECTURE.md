# CloudPro Invoice - Architecture Documentation

## System Overview

CloudPro Invoice is a modern serverless invoicing platform built on AWS Amplify Gen 2, leveraging AWS managed services for scalability, security, and maintainability.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  Next.js 14 App Router + React + TypeScript + Tailwind     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTPS
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    AWS Amplify Gen 2                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Cognito    │  │  AppSync     │  │   Lambda     │     │
│  │   (Auth)     │  │  (GraphQL)   │  │  (Business)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌──────▼──────┐
│   DynamoDB     │  │       S3        │  │  CloudWatch │
│  (Data Store)  │  │  (File Storage) │  │  (Logging)  │
└────────────────┘  └─────────────────┘  └─────────────┘
```

## AWS Amplify Gen 2 Setup

### Backend Configuration

**File**: `amplify/backend.ts`

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

export const backend = defineBackend({
  auth,
  data,
  storage,
});
```

### Key Improvements Over Old System

1. **No Hardcoded Credentials**: All configuration via `amplify_outputs.json`
2. **Type-Safe Schema**: GraphQL schema with TypeScript generation
3. **Declarative Auth**: Authorization rules in schema, not scattered in code
4. **Automatic IAM**: Amplify manages all IAM roles and policies

## Data Models

### Schema Definition

**File**: `amplify/data/resource.ts`

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a
    .model({
      email: a.string().required(),
      businessName: a.string(),
      businessAddress: a.string(),
      businessPhone: a.string(),
      businessLogo: a.string(),
      taxId: a.string(),
      currency: a.string().default('USD'),
      invoicePrefix: a.string().default('INV'),
      nextInvoiceNumber: a.integer().default(1),
    })
    .authorization((allow) => [allow.owner()]),

  Client: a
    .model({
      name: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      address: a.string(),
      taxId: a.string(),
      notes: a.string(),
      invoices: a.hasMany('Invoice', 'clientId'),
    })
    .authorization((allow) => [allow.owner()]),

  Invoice: a
    .model({
      invoiceNumber: a.string().required(),
      clientId: a.id().required(),
      client: a.belongsTo('Client', 'clientId'),
      issueDate: a.date().required(),
      dueDate: a.date().required(),
      status: a.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
      items: a.json().required(), // Array of line items
      subtotal: a.float().required(),
      taxRate: a.float().default(0),
      taxAmount: a.float().default(0),
      total: a.float().required(),
      notes: a.string(),
      pdfUrl: a.string(),
      paymentLink: a.string(),
      paidAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  Expense: a
    .model({
      date: a.date().required(),
      category: a.enum(['SUPPLIES', 'TRAVEL', 'MEALS', 'UTILITIES', 'SOFTWARE', 'OTHER']),
      amount: a.float().required(),
      vendor: a.string().required(),
      description: a.string(),
      receiptUrl: a.string(),
      taxDeductible: a.boolean().default(true),
    })
    .authorization((allow) => [allow.owner()]),

  Payment: a
    .model({
      invoiceId: a.id().required(),
      invoice: a.belongsTo('Invoice', 'invoiceId'),
      amount: a.float().required(),
      paymentDate: a.datetime().required(),
      paymentMethod: a.enum(['BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'CHECK', 'OTHER']),
      reference: a.string(),
      notes: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
```

### Data Model Relationships

```
User (1) ──────────────┐
                       │
Client (1) ────────────┼─── (N) Invoice (1) ─── (N) Payment
                       │
Expense (N) ───────────┘
```

### Invoice Line Item Structure

```typescript
interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
```

## Authentication Flow

### Cognito Configuration

**File**: `amplify/auth/resource.ts`

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: true,
  },
});
```

### Authentication Flow Diagram

```
┌──────────┐
│  User    │
└────┬─────┘
     │
     │ 1. Sign Up/Sign In
     ▼
┌─────────────────┐
│  Cognito User   │
│      Pool       │
└────┬────────────┘
     │
     │ 2. JWT Token
     ▼
┌─────────────────┐
│   Next.js App   │
│  (Client Side)  │
└────┬────────────┘
     │
     │ 3. GraphQL Request + Token
     ▼
┌─────────────────┐
│    AppSync      │
│   (Validates)   │
└────┬────────────┘
     │
     │ 4. Authorized Query
     ▼
┌─────────────────┐
│    DynamoDB     │
└─────────────────┘
```

### Client-Side Auth Implementation

```typescript
// lib/auth.ts
import { getCurrentUser, signIn, signOut, signUp } from 'aws-amplify/auth';

export const authService = {
  signUp: async (email: string, password: string) => {
    return await signUp({ username: email, password });
  },
  
  signIn: async (email: string, password: string) => {
    return await signIn({ username: email, password });
  },
  
  signOut: async () => {
    return await signOut();
  },
  
  getCurrentUser: async () => {
    return await getCurrentUser();
  },
};
```

## API Structure

### GraphQL Operations

**Queries**:
- `getUser(id: ID!)`: Get user profile
- `listClients(filter: ModelClientFilterInput, limit: Int)`: List clients
- `getInvoice(id: ID!)`: Get invoice details
- `listInvoices(filter: ModelInvoiceFilterInput, limit: Int)`: List invoices
- `listExpenses(filter: ModelExpenseFilterInput, limit: Int)`: List expenses

**Mutations**:
- `createClient(input: CreateClientInput!)`: Create new client
- `updateClient(input: UpdateClientInput!)`: Update client
- `createInvoice(input: CreateInvoiceInput!)`: Create invoice
- `updateInvoice(input: UpdateInvoiceInput!)`: Update invoice (status, payment)
- `createExpense(input: CreateExpenseInput!)`: Create expense

**Subscriptions**:
- `onCreateInvoice(owner: String!)`: Real-time invoice creation
- `onUpdateInvoice(owner: String!)`: Real-time invoice updates

### Client-Side Data Access

```typescript
// lib/api/invoices.ts
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

export const invoiceApi = {
  list: async () => {
    const { data } = await client.models.Invoice.list();
    return data;
  },
  
  create: async (invoice: Schema['Invoice']['createType']) => {
    const { data } = await client.models.Invoice.create(invoice);
    return data;
  },
  
  update: async (id: string, updates: Schema['Invoice']['updateType']) => {
    const { data } = await client.models.Invoice.update({ id, ...updates });
    return data;
  },
};
```

## Storage Strategy

### S3 Configuration

**File**: `amplify/storage/resource.ts`

```typescript
import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'cloudproInvoiceStorage',
  access: (allow) => ({
    'invoices/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'receipts/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'logos/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
```

### Storage Structure

```
s3://cloudpro-invoice-storage/
├── invoices/
│   └── {userId}/
│       └── {invoiceId}.pdf
├── receipts/
│   └── {userId}/
│       └── {expenseId}.{ext}
└── logos/
    └── {userId}/
        └── logo.{ext}
```

### File Upload Pattern

```typescript
// lib/storage.ts
import { uploadData, getUrl } from 'aws-amplify/storage';

export const storageService = {
  uploadInvoicePdf: async (invoiceId: string, file: File) => {
    const result = await uploadData({
      path: `invoices/${invoiceId}.pdf`,
      data: file,
    }).result;
    
    return await getUrl({ path: result.path });
  },
  
  uploadReceipt: async (expenseId: string, file: File) => {
    const ext = file.name.split('.').pop();
    const result = await uploadData({
      path: `receipts/${expenseId}.${ext}`,
      data: file,
    }).result;
    
    return await getUrl({ path: result.path });
  },
};
```

## Security Patterns

### Authorization Rules

1. **Owner-Based Access**: All models use `allow.owner()` - users can only access their own data
2. **No Public Access**: No public read/write permissions
3. **Automatic User Context**: Amplify automatically adds `owner` field to records
4. **Token Validation**: AppSync validates JWT tokens on every request

### Security Best Practices

```typescript
// ✅ GOOD: Authorization in schema
Client: a
  .model({ /* fields */ })
  .authorization((allow) => [allow.owner()])

// ❌ BAD: Manual authorization checks in code
// if (userId !== invoice.owner) throw new Error('Unauthorized');
```

### Environment Variables

```bash
# .env.local (never commit)
# No AWS credentials needed - handled by Amplify

# Optional third-party services
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### Secrets Management

- **AWS Secrets**: Use AWS Secrets Manager for API keys
- **Environment Variables**: Use Amplify environment variables for deployment
- **No Hardcoding**: Never commit credentials to repository

## Deployment Architecture

### Development Environment

```bash
# Local sandbox
npx ampx sandbox

# Runs:
# - Local AppSync endpoint
# - DynamoDB Local
# - S3 Local (LocalStack)
# - Hot reload on schema changes
```

### Production Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    CloudFront CDN                        │
│              (Global Edge Locations)                     │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Amplify Hosting (SSR)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js 14 App (Server Components + API Routes) │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 AWS Amplify Backend                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Cognito  │  │ AppSync  │  │ Lambda   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼─────────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼────────┐ ┌─▼──────────┐
│  DynamoDB    │ │     S3     │ │ CloudWatch │
│  (Multi-AZ)  │ │ (Versioned)│ │  (Metrics) │
└──────────────┘ └────────────┘ └────────────┘
```

### Deployment Commands

```bash
# Deploy to production
npx ampx pipeline-deploy --branch main --app-id <app-id>

# Deploy to staging
npx ampx pipeline-deploy --branch develop --app-id <app-id>

# Manual deployment
amplify push
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS Amplify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx ampx pipeline-deploy --branch main
```

## Performance Optimization

### Caching Strategy

1. **CloudFront**: Static assets cached at edge
2. **AppSync**: Query result caching (5 minutes default)
3. **Client-Side**: React Query for data caching
4. **DynamoDB**: DAX for read-heavy workloads (optional)

### Database Indexes

```typescript
// Global Secondary Indexes (GSI)
Invoice:
  - GSI: clientId-issueDate-index (query invoices by client)
  - GSI: status-dueDate-index (query overdue invoices)
  
Expense:
  - GSI: date-category-index (query expenses by date range)
```

## Monitoring & Observability

### CloudWatch Metrics

- API request count and latency
- Error rates and types
- DynamoDB read/write capacity
- Lambda execution duration
- S3 storage usage

### Logging Strategy

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  error: (message: string, error: Error, meta?: object) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message, 
      error: error.message, 
      stack: error.stack,
      ...meta 
    }));
  },
};
```

## Migration from Old System

### Key Architectural Changes

| Old System | New System | Benefit |
|------------|------------|---------|
| Custom auth logic | Cognito + Amplify | Secure, managed auth |
| Hardcoded AWS credentials | IAM roles + Amplify | No credential leaks |
| REST API + manual DynamoDB | GraphQL + AppSync | Type-safe, auto-generated |
| Inconsistent data models | Unified schema | Data integrity |
| Manual S3 permissions | Amplify Storage | Automatic access control |
| Complex deployment | `ampx pipeline-deploy` | One-command deploy |

### Migration Steps

1. Export data from old DynamoDB tables
2. Transform to new schema format
3. Import via GraphQL mutations
4. Migrate S3 files to new bucket structure
5. Update file references in database
6. Verify data integrity
7. Switch DNS to new deployment

## Disaster Recovery

### Backup Strategy

- **DynamoDB**: Point-in-time recovery enabled (35 days)
- **S3**: Versioning enabled + lifecycle policies
- **Code**: Git repository with protected branches

### Recovery Procedures

1. **Data Loss**: Restore from DynamoDB PITR
2. **File Loss**: Restore from S3 versioning
3. **Complete Failure**: Redeploy from Git + restore data

---

**Last Updated**: 2024
**Version**: 1.0
**Maintainer**: CloudPro Invoice Team
