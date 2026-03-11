# Testing Setup Guide

## Overview

CloudPro Invoice uses **Jest** for unit/integration tests and **LocalStack** for local AWS service testing.

---

## Quick Start

### 1. Run Unit Tests
```bash
npm test
```

### 2. Run Tests with Coverage
```bash
npm run test:coverage
```

### 3. Run Tests in Watch Mode
```bash
npm run test:watch
```

---

## LocalStack Setup

### Prerequisites
- Docker installed and running
- AWS CLI installed

### Start LocalStack
```bash
npm run localstack:start
```

### Setup LocalStack (Create tables & buckets)
```bash
npm run localstack:setup
```

### Run Integration Tests
```bash
npm run test:integration
```

### Stop LocalStack
```bash
npm run localstack:stop
```

---

## Test Structure

```
__tests__/
├── unit/              # Unit tests
│   ├── components/    # Component tests
│   ├── lib/          # Utility function tests
│   └── hooks/        # Custom hook tests
├── integration/       # Integration tests with LocalStack
│   ├── dynamodb.test.ts
│   ├── s3.test.ts
│   └── auth.test.ts
└── e2e/              # End-to-end tests (future)
```

---

## Writing Tests

### Unit Test Example
```typescript
// __tests__/unit/lib/calculations.test.ts
import { calculateGST } from '@/lib/calculations';

describe('calculateGST', () => {
  it('should calculate 15% GST correctly', () => {
    const subtotal = 100;
    const gst = calculateGST(subtotal);
    expect(gst).toBe(15);
  });
});
```

### Component Test Example
```typescript
// __tests__/unit/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render button text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Integration Test Example
```typescript
// __tests__/integration/invoice.test.ts
import { getDynamoDBClient } from '@/lib/aws-clients';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

describe('Invoice Integration', () => {
  it('should create invoice in DynamoDB', async () => {
    const client = getDynamoDBClient();
    const result = await client.send(
      new PutItemCommand({
        TableName: 'Invoice',
        Item: {
          id: { S: 'INV-001' },
          total: { N: '115' },
        },
      })
    );
    expect(result).toBeDefined();
  });
});
```

---

## LocalStack Services

### Available Services
- **DynamoDB** - Database tables
- **S3** - File storage (PDFs, receipts)
- **Cognito** - User authentication

### Accessing LocalStack
- **Endpoint:** http://localhost:4566
- **Region:** us-east-1
- **Access Key:** test
- **Secret Key:** test

### AWS CLI with LocalStack
```bash
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
aws --endpoint-url=http://localhost:4566 s3 ls
```

---

## Coverage Goals

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** Critical paths covered
- **E2E Tests:** User flows (post-MVP)

---

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Pre-deployment

---

## Troubleshooting

### LocalStack not starting
```bash
docker-compose down
docker-compose up -d
```

### Tests failing with AWS errors
```bash
# Ensure LocalStack is running
docker ps | grep localstack

# Re-run setup
npm run localstack:setup
```

### Port 4566 already in use
```bash
# Stop existing LocalStack
docker stop $(docker ps -q --filter ancestor=localstack/localstack)
```

---

## Next Steps

1. ✅ Testing framework set up
2. ⏳ Write tests for Sprint 1 features
3. ⏳ Add E2E tests with Playwright (post-MVP)
4. ⏳ Set up CI/CD pipeline
