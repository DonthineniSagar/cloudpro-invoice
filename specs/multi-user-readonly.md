# Multi-User Phase A: Read-Only Second User (Business Pro)

**Status:** Ready for development
**Phase:** 4 — SaaS & Monetisation
**Priority:** Medium
**Last Updated:** 2026-04-20

---

## Overview

Business Pro plan advertises "2 users." This spec delivers the absolute minimum to make that claim honest: the account owner can invite one additional user who gets read-only access to all data (dashboard, invoices, expenses, clients, reports). The viewer cannot create, edit, or delete anything.

### Scope

- New `CompanyMember` model (invite tracking + role)
- Owner invites viewer by email from Settings → Team
- Viewer signs up / logs in and accepts the invite
- Viewer sees the owner's data via a server-side API route (no schema auth changes to existing models)
- All create/edit/delete UI is hidden for viewers

### Out of Scope

- More than 2 users per account
- Roles beyond OWNER / VIEWER
- Role management UI (owner can only invite or remove, not change roles)
- Viewer editing anything
- Viewer accessing S3 files directly (PDFs served via pre-signed URLs from API route)
- Activity log / audit trail
- Company switcher (viewer belongs to one company only)
- Notifications for the viewer

---

## Data Access Strategy: Option B — Server-Side API Proxy

### Why Not the Other Options

| Option | Approach | Verdict |
|---|---|---|
| A: Add `companyId` to every model + GSI + new auth rules | Touches every model, requires data migration, complex auth rule changes | ❌ Too invasive for MVP |
| B: API route proxies owner's data using admin SDK | New API route, no changes to existing models or auth rules | ✅ Simplest |
| C: Extend `publicApiKey` read access to all models | Opens all data to API key reads (security risk), already used for portal | ❌ Security concern |

### How Option B Works

1. `CompanyMember` model links the viewer's `userId` to the owner's `userId` (called `ownerUserId`).
2. When a viewer loads any page, the frontend detects the viewer role (from `CompanyMember`) and calls a new API route: `GET /api/team/data?model=Invoice&ownerUserId=xxx`.
3. The API route:
   - Validates the caller is authenticated (Cognito session)
   - Looks up `CompanyMember` to confirm the caller has an ACTIVE membership with the given `ownerUserId`
   - Queries DynamoDB directly using AWS SDK v3 (IAM auth, bypasses AppSync owner rules) to fetch the owner's data
   - Returns the data to the viewer
4. Existing `allow.owner()` rules on all models remain untouched. The owner's experience is completely unchanged.

### Security Model

- The API route runs server-side with IAM credentials — it can read any DynamoDB record.
- Authorization is enforced in the API route: it checks `CompanyMember` status before returning data.
- The viewer never gets direct AppSync access to the owner's data — all reads go through the proxy.
- The viewer's own Amplify client still works for their own data (e.g., their own CompanyProfile for subscription checks).

---

## 1. User Stories & Acceptance Criteria

### Story 1: Owner Invites a Team Member

**As an** account owner on the Business Pro plan,
**I want to** invite a second user by email,
**So that** they can view my business data.

**Acceptance Criteria:**

- [ ] New settings tab: "Team" appears in `/settings/layout.tsx` between "Email" and "Security".
- [ ] Team tab only visible when `canAccess(plan, 'multi_user')` returns `true` (Business Pro only).
- [ ] Team page (`/settings/team/page.tsx`) shows:
  - Owner row: current user's name/email with "Owner" badge (always present, not removable).
  - Invited/active member row (if any): email, status badge (Invited / Active), "Remove" button.
  - "Invite Member" button (disabled if already at `maxUsers` limit of 2).
- [ ] Clicking "Invite Member" opens an inline form: email input + "Send Invite" button.
- [ ] On submit:
  - Validate email is not the owner's own email.
  - Validate no existing ACTIVE or INVITED member for this company.
  - Create a `CompanyMember` record with `status: INVITED`, `role: VIEWER`.
  - Show success toast: "Invitation sent to {email}."
- [ ] For MVP, no actual email is sent. The invited user must be told out-of-band (e.g., Slack, text) to sign up and accept. Email notification is a future enhancement.
- [ ] The invite row shows the email and "Invited" status badge (amber).
- [ ] Owner can click "Remove" to delete the `CompanyMember` record (with confirmation dialog).

---

### Story 2: Viewer Accepts Invite and Gets Linked

**As an** invited user,
**I want to** sign up (or log in) and get linked to the owner's account,
**So that** I can view their business data.

**Acceptance Criteria:**

- [ ] When any authenticated user loads the app (in `AppLayout`), check for a `CompanyMember` record where `email` matches the user's email and `status` is `INVITED`.
- [ ] If found, show an accept/decline banner at the top of the page:
  - "You've been invited to view {companyName}'s account. [Accept] [Decline]"
  - Accept: updates `CompanyMember` with `userId` (the viewer's Cognito user ID) and `status: ACTIVE`.
  - Decline: deletes the `CompanyMember` record.
- [ ] After accepting, the page reloads and the viewer sees the owner's data.
- [ ] The invite lookup uses the viewer's email address (from Cognito attributes) to find pending invites.
- [ ] If the viewer already has their own CompanyProfile with data, they can still accept — their own data remains accessible when they're not viewing the shared account. **For MVP simplicity:** accepting the invite switches the viewer's context to the owner's data. The viewer's own CompanyProfile (if any) is not affected but is not shown while they're a member.

---

### Story 3: Viewer Sees Owner's Data (Read-Only)

**As a** viewer (active CompanyMember),
**I want to** see the owner's dashboard, invoices, expenses, clients, and reports,
**So that** I can help manage the business without needing my own account.

**Acceptance Criteria:**

- [ ] When a viewer is logged in and has an ACTIVE `CompanyMember` record, all data-fetching pages use the team data API route instead of direct Amplify client queries.
- [ ] Dashboard: shows the owner's revenue, expenses, recent invoices, charts — all read-only.
- [ ] Invoices list: shows the owner's invoices. No "New Invoice" button. No edit/delete actions.
- [ ] Invoice detail: shows full invoice details. No "Edit", "Send", "Delete", or "Mark as Paid" buttons. "Download PDF" is allowed (via API route that returns pre-signed URL).
- [ ] Clients list: shows the owner's clients. No "New Client" button. No edit/delete actions.
- [ ] Expenses list: shows the owner's expenses. No "New Expense" button. No edit/delete/approve actions.
- [ ] Reports: shows the owner's reports. CSV export is allowed (data is already loaded client-side).
- [ ] Settings: viewer can access their own Profile and Security settings. They cannot access Company, Email, or Team settings (those belong to the owner).
- [ ] All "New", "Edit", "Delete", "Send" buttons/links are hidden when `role === 'VIEWER'`.
- [ ] If a viewer navigates directly to a create/edit URL (e.g., `/invoices/new`), show a message: "You have view-only access to this account."

---

### Story 4: Team Data API Route

**As the** system,
**I want** a server-side API route that returns the owner's data to authorized viewers,
**So that** existing AppSync auth rules don't need to change.

**Acceptance Criteria:**

- [ ] New API route: `GET /api/team/data`
- [ ] Query parameters:
  - `model` (required): one of `Invoice`, `InvoiceItem`, `Client`, `Expense`, `CompanyProfile`, `RecurringInvoice`, `Notification`
  - `ownerUserId` (required): the owner's Cognito user ID
  - `filter` (optional): JSON-encoded filter object (for queries like "invoices for client X")
  - `id` (optional): specific record ID (for detail pages)
- [ ] Authentication: validates Cognito session from the request (using Amplify server-side auth).
- [ ] Authorization: queries `CompanyMember` table to confirm the caller's userId has an ACTIVE membership with the given `ownerUserId`. If not, return 403.
- [ ] Data fetch: uses AWS SDK v3 `DynamoDBClient` to query the appropriate table, filtering by `owner` field = `{ownerUserId}::${ownerUserId}` (Amplify owner field format).
- [ ] Returns JSON array of records (or single record if `id` is provided).
- [ ] Strips sensitive fields before returning: `owner` field is removed from all responses.
- [ ] Rate limited: max 60 requests per minute per user (enforced via simple in-memory counter for MVP).

**DynamoDB Query Pattern:**

Amplify Gen 2 stores the owner field as `{sub}::{sub}` format. The API route queries using a DynamoDB scan with filter expression `#owner = :ownerValue` where `:ownerValue` is the owner's sub in Amplify's format.

For models with a `userId` field (which all our models have), we can filter on `userId = ownerUserId` instead, which is simpler and works with existing GSIs.

```
// Pseudocode
const params = {
  TableName: getTableName(model),
  FilterExpression: 'userId = :uid',
  ExpressionAttributeValues: { ':uid': { S: ownerUserId } },
};
```

**Note:** Table names are derived from `amplify_outputs.json` or environment variables. The API route needs the DynamoDB table name mapping configured.

---

### Story 5: Viewer Context in Frontend

**As a** developer,
**I want** a clean way to detect viewer mode and switch data fetching,
**So that** pages work for both owners and viewers without duplicating code.

**Acceptance Criteria:**

- [ ] New context: `lib/team-context.tsx` provides:
  ```typescript
  interface TeamContext {
    role: 'OWNER' | 'VIEWER' | null;  // null = no team membership (solo user)
    ownerUserId: string | null;         // the owner's userId (for API route calls)
    ownerCompanyName: string | null;    // for display in banner
    isViewer: boolean;                  // convenience: role === 'VIEWER'
    loading: boolean;
  }
  ```
- [ ] `TeamProvider` wraps the app inside `AppLayout` (or at root level).
- [ ] On mount, it checks:
  1. Does the current user own any `CompanyMember` records? → `role: 'OWNER'`
  2. Is the current user listed as an ACTIVE member in someone else's `CompanyMember`? → `role: 'VIEWER'`, set `ownerUserId`
  3. Neither → `role: null` (solo user, existing behaviour)
- [ ] New hook: `useTeam()` returns the `TeamContext`.
- [ ] New data-fetching hook: `useTeamData(model, options?)` that:
  - If `role === 'VIEWER'`: calls `/api/team/data?model=X&ownerUserId=Y`
  - If `role === 'OWNER'` or `null`: uses the normal Amplify `generateClient()` queries (existing behaviour)
  - Returns `{ data, loading, error }` with the same shape regardless of mode.
- [ ] Pages that currently call `client.models.X.list()` are updated to use `useTeamData('X')` instead.

---

### Story 6: Viewer UI Restrictions

**As a** viewer,
**I want** a clear indication that I'm in view-only mode,
**So that** I understand why I can't create or edit things.

**Acceptance Criteria:**

- [ ] When `isViewer` is true, show a persistent banner below the nav:
  - Light: pale blue background. Dark: slate-800 with blue border.
  - Text: "Viewing {companyName}'s account (read-only)"
  - Small "Switch to my account" link (if the viewer has their own CompanyProfile). For MVP, this link is not needed — just show the banner.
- [ ] Nav links for viewers:
  - Show: Dashboard, Invoices, Clients, Expenses, Reports, Settings (profile + security only)
  - Hide: Recurring (viewers don't need to see templates), Settings → Company/Email/Team
- [ ] All pages check `isViewer` before rendering action buttons:
  - Hide: "New Invoice", "New Client", "New Expense", "Edit", "Delete", "Send", "Mark as Paid", "Send Reminder"
  - Show: "Download PDF", "Copy Portal Link" (read-only actions), CSV export on reports
- [ ] Keyboard shortcuts for create actions (if any) are disabled for viewers.

---

## 2. Data Model Changes

### New Model: CompanyMember

Add to `amplify/data/resource.ts`:

```typescript
CompanyMember: a
  .model({
    ownerUserId: a.string().required(),    // the account owner's Cognito userId
    companyName: a.string(),               // denormalized for display in invite banner
    email: a.string().required(),          // invited user's email
    role: a.enum(['OWNER', 'VIEWER']),
    status: a.enum(['INVITED', 'ACTIVE', 'REMOVED']),
    memberUserId: a.string(),              // set when invite is accepted (viewer's Cognito userId)
  })
  .secondaryIndexes((index) => [
    index('email'),          // lookup pending invites by email
    index('memberUserId'),   // lookup active memberships by viewer userId
    index('ownerUserId'),    // lookup members for an owner
  ])
  .authorization((allow) => [
    allow.owner(),                          // owner (inviter) can CRUD
    allow.authenticated().to(['read']),     // viewer needs to read their own invite
  ]),
```

### Authorization Notes

- `allow.owner()` — the owner who created the invite can manage it.
- `allow.authenticated().to(['read'])` — any authenticated user can read CompanyMember records. This is needed so the viewer can find their own pending invite by email. The frontend filters by the viewer's email, so they only see records relevant to them.
- **Security consideration:** This means any authenticated user could theoretically list all CompanyMember records. Mitigation: the records contain only email, role, status, and ownerUserId — no sensitive business data. The actual business data is protected behind the API route authorization check. For a tighter approach, we could use a Lambda resolver, but that's over-engineering for 2-user MVP.

### No Changes to Existing Models

All existing models (Invoice, Client, Expense, etc.) remain unchanged. No new fields, no auth rule changes, no GSIs. This is the key advantage of Option B.

---

## 3. New Files

| File | Purpose |
|---|---|
| `amplify/data/resource.ts` | Add `CompanyMember` model (schema change) |
| `app/settings/team/page.tsx` | Team management page (invite, view members, remove) |
| `app/api/team/data/route.ts` | Server-side API route — proxies owner's data to authorized viewers |
| `lib/team-context.tsx` | React context for team role detection + data fetching hook |

### Modified Files

| File | Changes |
|---|---|
| `app/settings/layout.tsx` | Add "Team" tab (gated to Business Pro) |
| `components/AppLayout.tsx` | Wrap children in `TeamProvider`, show viewer banner, hide nav items for viewers |
| `app/dashboard/page.tsx` | Use `useTeamData` instead of direct Amplify queries |
| `app/invoices/page.tsx` | Use `useTeamData`, hide "New Invoice" for viewers |
| `app/invoices/[id]/page.tsx` | Use `useTeamData`, hide action buttons for viewers |
| `app/clients/page.tsx` | Use `useTeamData`, hide "New Client" for viewers |
| `app/expenses/page.tsx` | Use `useTeamData`, hide "New Expense" for viewers |
| `app/reports/page.tsx` | Use `useTeamData` |
| `lib/subscription.ts` | Already has `multi_user` feature — no changes needed |

---

## 4. API Route Detail

### `GET /api/team/data`

```typescript
// app/api/team/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Supported models and their DynamoDB table name env vars
const MODEL_TABLES: Record<string, string> = {
  Invoice: 'INVOICE_TABLE_NAME',
  InvoiceItem: 'INVOICE_ITEM_TABLE_NAME',
  Client: 'CLIENT_TABLE_NAME',
  Expense: 'EXPENSE_TABLE_NAME',
  CompanyProfile: 'COMPANY_PROFILE_TABLE_NAME',
  RecurringInvoice: 'RECURRING_INVOICE_TABLE_NAME',
  Notification: 'NOTIFICATION_TABLE_NAME',
};

// Fields to strip from responses (internal/sensitive)
const STRIP_FIELDS = ['owner', '__typename'];

// 1. Validate Cognito session (server-side Amplify auth)
// 2. Extract caller's userId from session
// 3. Query CompanyMember table: memberUserId = callerUserId, ownerUserId = param, status = ACTIVE
// 4. If no match → 403
// 5. Query the requested model's table: filter by userId = ownerUserId
// 6. Strip sensitive fields
// 7. Return JSON
```

### Table Name Configuration

DynamoDB table names are auto-generated by Amplify and not predictable. Two approaches:

**Approach A (recommended for MVP):** Use Amplify Data client with API key auth server-side (similar to the portal route pattern). This avoids needing table name env vars entirely.

```typescript
// In the API route:
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });
const dataClient = generateClient<Schema>({ authMode: 'apiKey' });
```

**But wait** — this requires adding `allow.publicApiKey().to(['read'])` to every model, which is the Option C we rejected.

**Approach B (actual recommendation):** Use Amplify Data client with **IAM auth** server-side. The API route runs in a Node.js server context where IAM credentials are available from the Amplify environment. This bypasses owner rules without opening API key access.

```typescript
const dataClient = generateClient<Schema>({ authMode: 'iam' });
```

This requires adding `allow.resource(...)` or `allow.guest()` IAM rules — which is also invasive.

**Approach C (simplest, actually):** Use the Amplify Data client authenticated **as the owner**. But we don't have the owner's session.

**Final recommendation — Approach D: API key with read-only on needed models.**

After analysis, the cleanest MVP approach is:

1. Add `allow.publicApiKey().to(['read'])` to the models the viewer needs: `Client`, `Expense`, `CompanyProfile`, `RecurringInvoice`, `Notification`. (Invoice and InvoiceItem already have this for the portal.)
2. The API route uses API key auth to read data, filtered by `userId = ownerUserId`.
3. The API route still validates the caller's Cognito session and CompanyMember status before making the query.
4. The API key is never exposed to the browser — it's only used server-side in the API route.

This is a pragmatic middle ground: the API key read rule is low-risk because:
- The API key is server-side only (not prefixed with `NEXT_PUBLIC_`)
- All reads are filtered by userId — you can't enumerate all users' data without knowing their userId
- The API key already has read access to Invoice and InvoiceItem (for portal)
- The actual authorization check (CompanyMember lookup) happens before any data is returned

### Updated Auth Rules

```typescript
// Models that need publicApiKey read access added:
Client: a.model({...}).authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),
Expense: a.model({...}).authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),
CompanyProfile: a.model({...}).authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),
RecurringInvoice: a.model({...}).authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),
Notification: a.model({...}).authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),

// Already have it:
Invoice: a.model({...}).authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),
InvoiceItem: a.model({...}).authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),
```

---

## 5. Edge Cases & Error Scenarios

### Invite Flow

| Scenario | Handling |
|---|---|
| Owner invites their own email | Reject with validation error: "You can't invite yourself." |
| Owner invites an email that's already invited/active | Reject: "This email already has a pending invite or is already a member." |
| Owner tries to invite a 3rd user (already at maxUsers=2) | Reject: "Your plan allows up to 2 users. Remove the existing member to invite someone new." |
| Owner is not on Business Pro plan | Team tab is hidden. If they navigate to `/settings/team` directly, show `UpgradePrompt`. |
| Owner downgrades from Business Pro | Existing CompanyMember records remain but viewer loses access (team context checks owner's plan). Viewer sees: "The account owner's plan no longer supports team members." |
| Invited email never signs up | Invite stays in INVITED status indefinitely. Owner can remove it. No expiry for MVP. |
| Invited user signs up with a different email | They won't see the invite. Owner must remove and re-invite with the correct email. |

### Viewer Access

| Scenario | Handling |
|---|---|
| Viewer tries to access `/invoices/new` directly | Show read-only message: "You have view-only access to this account." |
| Viewer tries to call Amplify mutations directly (API tampering) | Amplify `allow.owner()` rules block it — the viewer doesn't own the data. No server-side risk. |
| Viewer tries to call `/api/team/data` with a different ownerUserId | CompanyMember check fails → 403. |
| Owner deletes/removes the viewer's CompanyMember record | Viewer's next page load detects no active membership → falls back to solo mode (their own data, if any). |
| Viewer has their own CompanyProfile with invoices | For MVP, when acting as a viewer, they see the owner's data. Their own data is not shown. They can be "removed" from the team to go back to their own account. Future: account switcher. |
| Owner's subscription expires | Viewer loses access (team context checks `isSubscriptionActive` on the owner's CompanyProfile). |

### Data Integrity

| Scenario | Handling |
|---|---|
| API route returns stale data | Acceptable for MVP. Data is fetched fresh on each page load. No caching. |
| Owner and viewer load dashboard simultaneously | No conflict — viewer is read-only. Owner's writes go through normal Amplify client. |
| CompanyMember record is orphaned (owner deletes account) | Viewer's team context finds no valid owner → falls back to solo mode. Orphaned records can be cleaned up later. |

### Security

| Scenario | Handling |
|---|---|
| Unauthenticated request to `/api/team/data` | Return 401. Cognito session validation fails. |
| Authenticated user without CompanyMember tries `/api/team/data` | Return 403. CompanyMember check fails. |
| API key leaked | Risk is read-only access filtered by userId. Attacker would need a valid userId to get data. Rotate key if compromised. Same risk as existing portal feature. |
| Viewer tries to use API key directly from browser | API key is not exposed to the browser (not in `NEXT_PUBLIC_` env vars). It's only available server-side. However, `amplify_outputs.json` does contain the API key for the portal feature. **Mitigation:** The API key only grants read access, and all reads require knowing the owner's userId. This is acceptable for MVP. |

---

## 6. Impact on Existing Features

### Schema Changes (amplify/data/resource.ts)

- New `CompanyMember` model added.
- `Client`, `Expense`, `CompanyProfile`, `RecurringInvoice`, `Notification` models get `allow.publicApiKey().to(['read'])` added to their authorization rules.
- **No breaking changes.** Existing `allow.owner()` rules remain. Owner experience is unchanged.

### Settings Layout

- New "Team" tab added. Only visible for Business Pro users.
- No changes to existing tabs.

### Data-Fetching Pages

- Dashboard, invoices, clients, expenses, reports pages are modified to use `useTeamData()` hook.
- For owners and solo users, `useTeamData()` delegates to the existing Amplify client — **zero behaviour change**.
- For viewers, `useTeamData()` calls the API route.
- This is the largest code change surface area but is mechanical (swap data source).

### AppLayout

- `TeamProvider` added.
- Viewer banner added.
- Nav filtering extended to hide items for viewers.

### No Impact On

- Auth flow (login/signup) — unchanged.
- Invoice PDF generation — unchanged (viewer can't trigger it).
- Email sending — unchanged (viewer can't send).
- Stripe billing — unchanged (viewer has no billing access).
- Client portal — unchanged (public, token-based).
- Receipt OCR — unchanged (viewer can't upload).
- Expense email ingest — unchanged.

---

## 7. Implementation Order

Recommended build sequence (each step is independently deployable):

1. **Schema:** Add `CompanyMember` model + update auth rules on existing models. Deploy to sandbox.
2. **Settings → Team page:** Owner can invite/remove. No viewer functionality yet.
3. **API route:** `/api/team/data` with auth checks and data proxying.
4. **Team context:** `lib/team-context.tsx` with role detection and `useTeamData` hook.
5. **Invite acceptance:** Banner in AppLayout for pending invites.
6. **Page updates:** Swap data fetching on dashboard, invoices, clients, expenses, reports.
7. **UI restrictions:** Hide action buttons for viewers, add viewer banner.

---

## 8. Environment Variables

No new environment variables required. The API route uses:
- `amplify_outputs.json` for Amplify configuration (already available)
- Cognito session from request headers (already available in API routes)

---

## 9. Testing Checklist

### Manual Testing

- [ ] Business Pro owner sees "Team" tab in settings
- [ ] Non-Business Pro user does NOT see "Team" tab
- [ ] Owner can invite a user by email → CompanyMember created with INVITED status
- [ ] Owner cannot invite their own email
- [ ] Owner cannot invite when already at 2 users
- [ ] Owner can remove an invited/active member
- [ ] Invited user logs in → sees invite banner
- [ ] Invited user accepts → CompanyMember updated to ACTIVE
- [ ] Invited user declines → CompanyMember deleted
- [ ] Viewer sees owner's dashboard data
- [ ] Viewer sees owner's invoices list
- [ ] Viewer sees owner's invoice detail (no action buttons)
- [ ] Viewer sees owner's clients list (no "New Client")
- [ ] Viewer sees owner's expenses list (no "New Expense")
- [ ] Viewer sees owner's reports
- [ ] Viewer cannot navigate to `/invoices/new` (shows read-only message)
- [ ] Viewer banner shows "{companyName}'s account (read-only)"
- [ ] Owner removes viewer → viewer's next page load shows solo mode
- [ ] Owner downgrades plan → viewer loses access
- [ ] Dark mode: all new UI elements render correctly
- [ ] Mobile: team page and viewer banner are responsive

### Security Testing

- [ ] Unauthenticated request to `/api/team/data` → 401
- [ ] Authenticated user without membership → 403
- [ ] Viewer cannot create/edit/delete via Amplify client (owner rules block it)
- [ ] Viewer cannot access `/api/team/data` with a different ownerUserId → 403
