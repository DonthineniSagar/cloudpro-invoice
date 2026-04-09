# AWS & Security Guidelines

## Authentication
- AWS Cognito handles all auth — never implement custom auth
- Use `useAuth()` hook from `@/lib/auth-context`
- All authenticated pages must be wrapped in `<AppLayout>`
- Never store tokens manually — Amplify manages sessions

## Authorization
- All DynamoDB models use `allow.owner()` — users can only access their own data
- Never bypass owner authorization rules
- Lambda functions verify ownership when accessing data directly

## Data Security
- No hardcoded credentials anywhere — use environment variables
- `amplify_outputs.json` is auto-generated, never commit secrets to it
- S3 paths are scoped by Cognito identity ID (owner isolation)
- SES sender address is controlled server-side via `SES_FROM_EMAIL` env var

## Amplify Gen 2 Conventions
- Schema changes go in `amplify/data/resource.ts` only
- Auth config in `amplify/auth/resource.ts`
- Storage config in `amplify/storage/resource.ts`
- Lambda functions in `amplify/functions/<name>/`
- Backend orchestration in `amplify/backend.ts`
- After schema changes, sandbox auto-regenerates types

## Lambda Functions
- Runtime: Node.js 20
- Use AWS SDK v3 (modular imports: `@aws-sdk/client-dynamodb`, etc.)
- Keep functions focused — one purpose per function
- Environment variables set in `amplify/backend.ts`
- Error responses should be structured: `{ statusCode, body: { error } }`

## Infrastructure Changes
- Never modify AWS resources directly in the console
- All infrastructure is defined as code in the `amplify/` directory
- Test changes in sandbox before deploying to production
