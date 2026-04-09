# Design Document: Enhanced Auth Experience

## Overview

This design transforms CloudPro Invoice's authentication from a basic email/password flow into a multi-method, dark-mode-aware, branded experience. The feature adds passkey (WebAuthn) login, Google social sign-in, TOTP MFA for email/password only, branded verification emails, a company profile collection step during signup, and full dark mode support across all auth pages.

### Key Design Principle: MFA Scope

TOTP MFA applies only to email/password sign-in. Passkeys inherently provide multi-factor security (device possession + biometric/PIN). Google enforces its own MFA. The auth context tracks which method was used and skips TOTP challenges for passkey and Google flows.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Auth Pages (UI Layer)                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  ┌───────────┐ │
│  │ Login    │  │ Signup   │  │ Forgot Password│  │ Company   │ │
│  │ Page     │  │ Page     │  │ Page           │  │ Profile   │ │
│  │          │  │          │  │                │  │ Step      │ │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘  └─────┬─────┘ │
│       │              │                │                  │       │
│  ┌────▼──────────────▼────────────────▼──────────────────▼─────┐ │
│  │              Auth Context (lib/auth-context.tsx)             │ │
│  │  - signInWithEmail(email, password) → may return MFA step   │ │
│  │  - signInWithGoogle() → signInWithRedirect                  │ │
│  │  - signInWithPasskey() → WebAuthn flow                      │ │
│  │  - confirmTotpCode(code) → complete MFA                     │ │
│  │  - setupTotp() → returns QR URI + secret                    │ │
│  │  - authMethod: 'email' | 'passkey' | 'google'              │ │
│  │  - needsCompanyProfile: boolean                             │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────────┐ │
│  │           Theme Context (lib/theme-context.tsx)              │ │
│  │  - theme: 'light' | 'dark'                                  │ │
│  │  - All auth pages read theme and apply conditional styles    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Amplify Gen 2 Backend                     │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Cognito User Pool│  │ AppSync      │  │ DynamoDB          │ │
│  │ - Email/password │  │ GraphQL API  │  │ - CompanyProfile  │ │
│  │ - TOTP MFA       │  │              │  │ - User            │ │
│  │ - WebAuthn       │  │              │  │                   │ │
│  │ - Google IDP     │  │              │  │                   │ │
│  │ - Branded email  │  │              │  │                   │ │
│  └──────────────────┘  └──────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Auth Config Changes (`amplify/auth/resource.ts`)

### Current State

```typescript
export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    givenName: { mutable: true, required: false },
    familyName: { mutable: true, required: false },
  },
});
```

### Target State

```typescript
import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Your CloudPro Invoice verification code',
      verificationEmailBody: (createCode) => brandedEmailTemplate(createCode),
    },
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
        },
      },
      callbackUrls: [
        'http://localhost:3000/auth/login',
        'https://cloudpro-digital.co.nz/auth/login',
      ],
      logoutUrls: [
        'http://localhost:3000/auth/login',
        'https://cloudpro-digital.co.nz/auth/login',
      ],
    },
  },
  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
  },
  userAttributes: {
    givenName: { mutable: true, required: false },
    familyName: { mutable: true, required: false },
  },
});
```

### Key Decisions

1. **MFA mode is `OPTIONAL`** — Users opt in via settings. This allows passkey and Google users to bypass TOTP entirely at the Cognito level. The app enforces MFA prompts only for email/password sign-in.
2. **Google IDP secrets** — `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are stored via `ampx secret set` (Amplify Gen 2 secrets management), never hardcoded.
3. **Callback URLs** — Include both localhost (dev) and production domain. Additional sandbox/branch URLs can be added as needed.
4. **WebAuthn** — Amplify Gen 2 does not yet have a first-class `defineAuth` config for WebAuthn/passkeys. Passkey support will be implemented using the Amplify JS `signIn` API with `preferredChallenge: 'WEB_AUTHN'` and `autoSignIn` with WebAuthn. Passkey registration is done via `associateWebAuthnCredential()` from `aws-amplify/auth`. If Amplify Gen 2 adds a `webAuthn` config option, we adopt it. Otherwise, WebAuthn is enabled via CDK override on the Cognito User Pool in `amplify/backend.ts`.
5. **Branded email** — Uses Cognito's custom email verification body. The template is a function that returns HTML with the verification code injected.

---

## 3. WebAuthn CDK Override (`amplify/backend.ts`)

Since Amplify Gen 2 `defineAuth` may not expose WebAuthn configuration directly, we enable it via CDK override:

```typescript
// In amplify/backend.ts, after defineBackend:
const { cfnUserPool } = backend.auth.resources.cfnResources;

// Enable WebAuthn as a first-factor
cfnUserPool.addPropertyOverride('WebAuthnRelyingPartyID', 'cloudpro-digital.co.nz');
cfnUserPool.addPropertyOverride('WebAuthnUserVerification', 'preferred');
```

For local development, the relying party ID should match `localhost`. This may require conditional logic or a separate sandbox config. The developer should test WebAuthn in the deployed sandbox environment where the domain matches.

---

## 4. Component Design

### 4.1 Login Page (`app/auth/login/page.tsx`)

The login page is redesigned as a multi-method auth entry point with dark mode support.

#### Layout Structure

```
┌──────────────────────────────────────────┐
│            min-h-screen flex             │
│         items-center justify-center       │
│    bg-gray-50 (light) / bg-black (dark)  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  max-w-md rounded-xl card          │  │
│  │                                    │  │
│  │  [CloudPro Logo + Tagline]         │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ [Sign in with Passkey] 🔑    │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ [Continue with Google] G     │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                    │  │
│  │  ──────── or ────────              │  │
│  │                                    │  │
│  │  Email:    [________________]      │  │
│  │  Password: [________________]      │  │
│  │            [Forgot password?]      │  │
│  │                                    │  │
│  │  [        Sign in          ]       │  │
│  │                                    │  │
│  │  Don't have an account? Sign up    │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

#### View States

The login page manages these states via a `step` state variable:

| State | Trigger | UI |
|---|---|---|
| `credentials` | Default | Email/password form + passkey + Google buttons |
| `totp` | Email/password sign-in returns `CONFIRM_SIGN_IN_WITH_TOTP_CODE` | 6-digit TOTP input + "Verify" button |
| `verification` | Sign-in returns `CONFIRM_SIGN_UP` (unverified user) | Verification code input (existing behavior) |

#### Passkey Button Visibility

```typescript
const [webAuthnSupported, setWebAuthnSupported] = useState(false);

useEffect(() => {
  // Check browser WebAuthn support
  setWebAuthnSupported(
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}, []);
```

The "Sign in with Passkey" button renders only when `webAuthnSupported` is `true`.

#### TOTP Step

When `handleSignIn` returns a result with `nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE'`:

1. Set `step` to `'totp'`
2. Show a 6-digit code input with auto-focus
3. On submit, call `confirmSignIn({ challengeResponse: totpCode })`
4. Track consecutive failures in local state. After 3 failures, show support message.
5. On success, call `checkUser()` and redirect to dashboard.

#### Dark Mode Styling Pattern

All auth pages follow this pattern:

```typescript
const { theme } = useTheme();
const dark = theme === 'dark';

// Card
className={`max-w-md w-full space-y-8 p-8 rounded-xl ${
  dark
    ? 'bg-slate-900 border border-purple-500/30'
    : 'bg-white shadow-sm border border-gray-200'
}`}

// Background
className={`min-h-screen flex items-center justify-center ${
  dark ? 'bg-black' : 'bg-gray-50'
}`}

// Headings
className={dark ? 'text-white' : 'text-gray-900'}

// Body text
className={dark ? 'text-slate-300' : 'text-gray-600'}

// Inputs
className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
  dark
    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
}`}

// Primary button (unchanged — works in both themes)
className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"

// Error alert
className={`p-4 rounded-lg text-sm ${
  dark
    ? 'bg-red-900/30 border border-red-500/30 text-red-300'
    : 'bg-red-50 border border-red-200 text-red-700'
}`}

// Links
className={dark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}
```

### 4.2 Signup Page (`app/auth/signup/page.tsx`)

#### Layout Structure

Same card layout as login. The signup page has these steps:

```
Step 1: Registration Form          Step 2: Email Verification       Step 3: Company Profile
┌──────────────────────────┐      ┌──────────────────────────┐     ┌──────────────────────────┐
│ [Continue with Google] G │      │ Verify your email        │     │ Set up your business     │
│ ──────── or ────────     │      │                          │     │                          │
│ First Name: [________]   │      │ We sent a code to        │     │ Company Name*: [_______] │
│ Last Name:  [________]   │      │ user@example.com         │     │ GST Number:    [_______] │
│ Email:      [________]   │      │                          │     │ Bank Account:  [_______] │
│ Password:   [________]   │      │ Code: [______]           │     │                          │
│ Confirm:    [________]   │      │                          │     │ [  Complete Setup  ]     │
│                          │      │ [  Verify & Continue  ]  │     │ [  Skip for now    ]     │
│ [  Create account  ]     │      │ [  Resend code  ]        │     │                          │
│                          │      │ [  Back  ]               │     │                          │
│ Already have an account? │      └──────────────────────────┘     └──────────────────────────┘
│ Sign in                  │
└──────────────────────────┘
```

#### View States

| State | Trigger | UI |
|---|---|---|
| `register` | Default | Registration form + Google button |
| `verification` | After successful `signUp()` | 6-digit verification code input |
| `company-profile` | After verification OR first Google sign-in | Company profile collection form |

#### Google Sign-Up Flow

The "Continue with Google" button on the signup page calls the same `signInWithGoogle()` method. After redirect back:
1. Auth context detects new user (no CompanyProfile record exists)
2. Sets `needsCompanyProfile = true`
3. Login/signup page checks this flag and shows the company profile step

### 4.3 Company Profile Step Component

This is a shared component used by both signup and the Google sign-in redirect flow.

#### File Location

`components/CompanyProfileStep.tsx` — shared component, since it's used from both signup page and potentially the login redirect.

#### Props

```typescript
interface CompanyProfileStepProps {
  onComplete: () => void;  // Called after save or skip
  onSkip: () => void;      // Called when user clicks "Skip for now"
}
```

#### Fields

| Field | Type | Required | Validation |
|---|---|---|---|
| Company Name | text input | Yes | Min 1 character |
| GST Number | text input | No | NZ IRD format: 8 or 9 digits (with or without hyphens, e.g., `12-345-678` or `123456789`) |
| Bank Account | text input | No | NZ format: `XX-XXXX-XXXXXXX-XXX` (2-4-7-3 digits with hyphens) |

#### Behavior

1. On submit: validate with Zod schema, create CompanyProfile record via Amplify `generateClient()` with defaults:
   - `defaultCurrency: 'NZD'`
   - `defaultGstRate: 15`
   - `companyCountry: 'New Zealand'`
2. On skip: redirect to dashboard without creating a record. User can fill this in later via Settings.
3. Also creates the `User` record if it doesn't exist (for Google sign-in users who bypass the normal signup flow).

### 4.4 TOTP Setup Component (Settings Page — Out of Scope for Auth Pages)

TOTP setup happens in the existing settings/security page, not during signup. The auth context exposes `setupTotp()` and `verifyTotpSetup()` methods. The settings page implementation is a separate task but the auth context methods are part of this feature.

---

## 5. Data Model Changes

### No Schema Changes Required for `amplify/data/resource.ts`

The existing `CompanyProfile` model already has all the fields needed:
- `companyName` (required)
- `gstNumber` (optional)
- `bankAccount` (optional)
- `defaultCurrency` (default 'NZD')
- `defaultGstRate` (default 15)
- `companyCountry` (default 'New Zealand')
- `userId` (required, links to User)

The existing `User` model already has:
- `email` (required)
- `firstName` (optional)
- `lastName` (optional)
- `companyProfile` (hasOne relationship)

No new models or fields are needed. The company profile step during signup simply creates records in these existing models.

### Authorization

Both models use `.authorization((allow) => allow.owner())` — no changes needed. Google sign-in users get an owner identity from Cognito just like email/password users.

---

## 6. Auth Context Updates (`lib/auth-context.tsx`)

### Updated Interface

```typescript
type AuthMethod = 'email' | 'passkey' | 'google';

interface SignInResult {
  isSignedIn: boolean;
  nextStep?: 'TOTP_REQUIRED' | 'CONFIRM_SIGN_UP';
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  authMethod?: AuthMethod;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsCompanyProfile: boolean;
  // Sign-in methods
  signInWithEmail: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<void>;
  signInWithPasskey: () => Promise<void>;
  confirmTotpCode: (code: string) => Promise<void>;
  // Sign-up
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  // Sign-out
  signOut: () => Promise<void>;
  // TOTP management (for settings page)
  setupTotp: () => Promise<{ qrUri: string; secretKey: string }>;
  verifyTotpSetup: (code: string) => Promise<void>;
  // Company profile flag
  clearNeedsCompanyProfile: () => void;
}
```

### Key Implementation Details

#### `signInWithEmail`

```typescript
async function handleSignInWithEmail(email: string, password: string): Promise<SignInResult> {
  try { await amplifySignOut(); } catch {}

  const result = await amplifySignIn({ username: email, password });

  if (!result.isSignedIn) {
    if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
      return { isSignedIn: false, nextStep: 'CONFIRM_SIGN_UP' };
    }
    if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
      return { isSignedIn: false, nextStep: 'TOTP_REQUIRED' };
    }
  }

  await checkUser('email');
  return { isSignedIn: true };
}
```

#### `signInWithGoogle`

```typescript
async function handleSignInWithGoogle(): Promise<void> {
  await signInWithRedirect({ provider: 'Google' });
  // Redirect happens — user returns to callback URL
  // Hub listener or checkUser on mount handles the rest
}
```

#### `signInWithPasskey`

```typescript
async function handleSignInWithPasskey(): Promise<void> {
  const result = await amplifySignIn({
    options: { authFlowType: 'USER_AUTH', preferredChallenge: 'WEB_AUTHN' },
  });

  if (result.isSignedIn) {
    await checkUser('passkey');
  }
}
```

#### `confirmTotpCode`

```typescript
async function handleConfirmTotpCode(code: string): Promise<void> {
  const result = await confirmSignIn({ challengeResponse: code });
  if (result.isSignedIn) {
    await checkUser('email'); // TOTP only applies to email/password
  }
}
```

#### `needsCompanyProfile` Detection

On `checkUser()`, after fetching the user, query for an existing CompanyProfile:

```typescript
async function checkUser(method?: AuthMethod) {
  const currentUser = await getCurrentUser();
  const attributes = await fetchUserAttributes();

  setUser({
    id: currentUser.userId,
    email: attributes.email || '',
    firstName: attributes.given_name,
    lastName: attributes.family_name,
    authMethod: method,
  });

  // Check if company profile exists
  const client = generateClient<Schema>();
  const { data: profiles } = await client.models.CompanyProfile.list();
  setNeedsCompanyProfile(profiles.length === 0);
}
```

#### Hub Listener for Social Sign-In Redirect

```typescript
useEffect(() => {
  const hubListener = Hub.listen('auth', async ({ payload }) => {
    if (payload.event === 'signInWithRedirect') {
      await checkUser('google');
    }
    if (payload.event === 'signInWithRedirect_failure') {
      console.error('Social sign-in failed');
    }
  });

  return () => hubListener();
}, []);
```

### Backward Compatibility

The existing `signIn` method name changes to `signInWithEmail`. To avoid breaking existing code, we can either:
- **Option A**: Rename all call sites (login page, signup page) — preferred since there are only 2 call sites.
- **Option B**: Keep `signIn` as an alias. Not recommended — creates confusion.

We go with Option A. The login and signup pages are being rewritten anyway.

---

## 7. Validation Schema Additions (`lib/validation.ts`)

### New Schemas

```typescript
// Signup form validation
export const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

// Login form validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// TOTP code validation
export const totpSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// Company profile step validation (signup flow)
export const companyProfileStepSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  gstNumber: z
    .string()
    .regex(/^\d{2,3}-?\d{3}-?\d{3}$/, 'Invalid NZ GST number (e.g., 12-345-678 or 123-456-789)')
    .or(z.literal(''))
    .optional(),
  bankAccount: z
    .string()
    .regex(/^\d{2}-\d{4}-\d{7}-\d{2,3}$/, 'Invalid NZ bank account (e.g., 06-0123-0456789-00)')
    .or(z.literal(''))
    .optional(),
});
```

### Note on Existing `companySchema`

The existing `companySchema` in `validation.ts` is used by the settings page and includes `companyEmail`. The new `companyProfileStepSchema` is intentionally separate — it collects only the minimal fields needed during signup. The settings page continues to use the full `companySchema`.

---

## 8. Branded Verification Email Template

### Template Design

The email uses table-based HTML for maximum email client compatibility. No external CSS — all styles are inline.

```
┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │  CloudPro Invoice logo (text)     │  │  ← Indigo header bar
│  └───────────────────────────────────┘  │
│                                         │
│  Hi there,                              │
│                                         │
│  Your verification code is:             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │         1 2 3 4 5 6               │  │  ← Large, bold code
│  └───────────────────────────────────┘  │
│                                         │
│  This code expires in 24 hours.         │
│  If you didn't request this, you can    │
│  safely ignore this email.              │
│                                         │
│  ─────────────────────────────────────  │
│  © 2026 CloudPro Invoice                │
│  Professional invoicing. Ridiculously   │
│  fast.                                  │
└─────────────────────────────────────────┘
```

### Implementation

The template is defined as a function in `amplify/auth/resource.ts`:

```typescript
function brandedEmailTemplate(createCode: () => string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f9fafb;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;">☁ CloudPro Invoice</span>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:32px;">
              <p style="color:#111827;font-size:16px;margin:0 0 16px;">Hi there,</p>
              <p style="color:#4B5563;font-size:14px;margin:0 0 24px;">Your verification code is:</p>
              <div style="background-color:#EEF2FF;border:2px solid #C7D2FE;border-radius:8px;padding:16px;text-align:center;margin:0 0 24px;">
                <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4F46E5;">${createCode()}</span>
              </div>
              <p style="color:#6B7280;font-size:13px;margin:0 0 8px;">This code expires in 24 hours.</p>
              <p style="color:#6B7280;font-size:13px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
            </td></tr>
            <!-- Footer -->
            <tr><td style="padding:16px 32px;border-top:1px solid #E5E7EB;">
              <p style="color:#9CA3AF;font-size:12px;margin:0;">© 2026 CloudPro Invoice · Professional invoicing. Ridiculously fast.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}
```

### Sender Display Name

Cognito's email configuration should use `CloudPro Invoice` as the sender name. This is configured via the `senderFromEmail` property if using SES, or via the Cognito default email settings. For Amplify Gen 2, the sender name is set in the SES identity configuration, not in `defineAuth`.

---

## 9. Sequence Diagrams

### 9.1 Email/Password Sign-In (with TOTP MFA)

```
User              Login Page           Auth Context          Cognito
 │                    │                     │                   │
 │  Enter email/pwd   │                     │                   │
 │───────────────────>│                     │                   │
 │                    │  signInWithEmail()   │                   │
 │                    │────────────────────>│                   │
 │                    │                     │  signIn(email,pwd) │
 │                    │                     │──────────────────>│
 │                    │                     │                   │
 │                    │                     │  CONFIRM_SIGN_IN_ │
 │                    │                     │  WITH_TOTP_CODE   │
 │                    │                     │<──────────────────│
 │                    │  { nextStep: TOTP } │                   │
 │                    │<────────────────────│                   │
 │                    │                     │                   │
 │  Show TOTP input   │                     │                   │
 │<───────────────────│                     │                   │
 │                    │                     │                   │
 │  Enter 6-digit code│                     │                   │
 │───────────────────>│                     │                   │
 │                    │  confirmTotpCode()   │                   │
 │                    │────────────────────>│                   │
 │                    │                     │  confirmSignIn()   │
 │                    │                     │──────────────────>│
 │                    │                     │  isSignedIn: true  │
 │                    │                     │<──────────────────│
 │                    │                     │  checkUser('email')│
 │                    │                     │──────────────────>│
 │                    │  user + redirect    │                   │
 │                    │<────────────────────│                   │
 │  Redirect /dashboard                    │                   │
 │<───────────────────│                     │                   │
```

### 9.2 Email/Password Sign-In (no MFA)

```
User              Login Page           Auth Context          Cognito
 │                    │                     │                   │
 │  Enter email/pwd   │                     │                   │
 │───────────────────>│                     │                   │
 │                    │  signInWithEmail()   │                   │
 │                    │────────────────────>│                   │
 │                    │                     │  signIn(email,pwd) │
 │                    │                     │──────────────────>│
 │                    │                     │  isSignedIn: true  │
 │                    │                     │<──────────────────│
 │                    │                     │  checkUser('email')│
 │                    │  { isSignedIn }     │                   │
 │                    │<────────────────────│                   │
 │  Redirect /dashboard                    │                   │
 │<───────────────────│                     │                   │
```

### 9.3 Passkey Sign-In

```
User              Login Page           Auth Context          Cognito       Browser WebAuthn
 │                    │                     │                   │                │
 │  Click "Passkey"   │                     │                   │                │
 │───────────────────>│                     │                   │                │
 │                    │  signInWithPasskey() │                   │                │
 │                    │────────────────────>│                   │                │
 │                    │                     │  signIn(USER_AUTH, │                │
 │                    │                     │  WEB_AUTHN)        │                │
 │                    │                     │──────────────────>│                │
 │                    │                     │                   │  Challenge     │
 │                    │                     │                   │───────────────>│
 │                    │                     │                   │                │
 │  Biometric/PIN prompt                   │                   │                │
 │<─────────────────────────────────────────────────────────────────────────────│
 │  Approve           │                     │                   │                │
 │──────────────────────────────────────────────────────────────────────────────>│
 │                    │                     │                   │  Assertion     │
 │                    │                     │                   │<───────────────│
 │                    │                     │  isSignedIn: true  │                │
 │                    │                     │<──────────────────│                │
 │                    │                     │  checkUser('passkey')              │
 │                    │  user + redirect    │                   │                │
 │                    │<────────────────────│                   │                │
 │  Redirect /dashboard (NO TOTP)          │                   │                │
 │<───────────────────│                     │                   │                │
```

### 9.4 Google Sign-In (New User)

```
User              Login Page        Auth Context       Cognito        Google       DynamoDB
 │                    │                  │                │              │             │
 │  Click "Google"    │                  │                │              │             │
 │───────────────────>│                  │                │              │             │
 │                    │ signInWithGoogle()│                │              │             │
 │                    │─────────────────>│                │              │             │
 │                    │                  │ signInWithRedirect('Google')  │             │
 │                    │                  │───────────────>│              │             │
 │                    │                  │                │  OAuth redirect             │
 │  Redirect to Google consent screen   │                │─────────────>│             │
 │<──────────────────────────────────────────────────────────────────────│             │
 │  Approve consent   │                  │                │              │             │
 │──────────────────────────────────────────────────────────────────────>│             │
 │                    │                  │                │  tokens       │             │
 │  Redirect back to app                │                │<─────────────│             │
 │───────────────────>│                  │                │              │             │
 │                    │  Hub: signInWithRedirect          │              │             │
 │                    │─────────────────>│                │              │             │
 │                    │                  │ checkUser('google')           │             │
 │                    │                  │───────────────>│              │             │
 │                    │                  │ query CompanyProfile          │             │
 │                    │                  │──────────────────────────────────────────── >│
 │                    │                  │ (empty — new user)            │             │
 │                    │                  │<─────────────────────────────────────────── │
 │                    │                  │ needsCompanyProfile = true    │             │
 │                    │  Show Company Profile Step (NO TOTP)            │             │
 │<───────────────────│                  │                │              │             │
 │                    │                  │                │              │             │
 │  Fill company info │                  │                │              │             │
 │───────────────────>│                  │                │              │             │
 │                    │  Create CompanyProfile + User     │              │             │
 │                    │──────────────────────────────────────────────── >│             │
 │                    │                  │                │              │             │
 │  Redirect /dashboard                 │                │              │             │
 │<───────────────────│                  │                │              │             │
```

### 9.5 Email/Password Signup (with Company Profile)

```
User              Signup Page       Auth Context       Cognito          DynamoDB
 │                    │                  │                │                 │
 │  Fill form + submit│                  │                │                 │
 │───────────────────>│                  │                │                 │
 │                    │  signUp()        │                │                 │
 │                    │─────────────────>│                │                 │
 │                    │                  │  signUp(email, │                 │
 │                    │                  │  pwd, attrs)   │                 │
 │                    │                  │───────────────>│                 │
 │                    │                  │  CONFIRM_SIGN_UP                │
 │                    │                  │<───────────────│                 │
 │  Show verification │                  │                │                 │
 │<───────────────────│                  │                │                 │
 │                    │                  │                │                 │
 │  Enter code        │                  │                │                 │
 │───────────────────>│                  │                │                 │
 │                    │  confirmSignUp() │                │                 │
 │                    │─────────────────>│                │                 │
 │                    │                  │───────────────>│                 │
 │                    │  signInWithEmail()│                │                 │
 │                    │─────────────────>│                │                 │
 │                    │                  │  (signs in, checks profile)     │
 │                    │                  │  needsCompanyProfile = true     │
 │  Show Company Profile Step           │                │                 │
 │<───────────────────│                  │                │                 │
 │                    │                  │                │                 │
 │  Fill or Skip      │                  │                │                 │
 │───────────────────>│                  │                │                 │
 │                    │  create CompanyProfile (if filled)│                 │
 │                    │────────────────────────────────────────────────────>│
 │  Redirect /dashboard                 │                │                 │
 │<───────────────────│                  │                │                 │
```

---

## 10. Impact on Existing Features

### 10.1 Login Page (`app/auth/login/page.tsx`) — Full Rewrite

The login page is rewritten to support:
- Dark mode via `useTheme()`
- Passkey button (conditional on WebAuthn support)
- Google sign-in button
- TOTP step after email/password sign-in
- Updated auth context method names (`signIn` → `signInWithEmail`)
- Brand logo and tagline
- ARIA live region for errors

### 10.2 Signup Page (`app/auth/signup/page.tsx`) — Full Rewrite

The signup page is rewritten to support:
- Dark mode via `useTheme()`
- Google sign-up button
- Company profile step after verification
- Updated auth context method names
- Zod validation via `signupSchema`
- Brand logo and tagline

### 10.3 Forgot Password Page (`app/auth/forgot-password/page.tsx`) — Styling Update Only

- Add dark mode support (same pattern as login/signup)
- Add brand logo
- No functional changes

### 10.4 Auth Context (`lib/auth-context.tsx`) — Major Update

- New methods: `signInWithEmail`, `signInWithGoogle`, `signInWithPasskey`, `confirmTotpCode`, `setupTotp`, `verifyTotpSetup`
- Old `signIn` method renamed to `signInWithEmail`
- New state: `needsCompanyProfile`, `authMethod` on User
- Hub listener for social sign-in redirect
- CompanyProfile existence check on user load

### 10.5 Auth Config (`amplify/auth/resource.ts`) — Major Update

- Google IDP configuration
- TOTP MFA (optional mode)
- Branded verification email template
- WebAuthn enabled via CDK override in `backend.ts`

### 10.6 Backend Config (`amplify/backend.ts`) — Minor Addition

- CDK override for WebAuthn on Cognito User Pool
- No other changes

### 10.7 Validation (`lib/validation.ts`) — Additions Only

- New schemas: `signupSchema`, `loginSchema`, `totpSchema`, `companyProfileStepSchema`
- Existing schemas unchanged

### 10.8 No Breaking Changes to Data Models

The `CompanyProfile` and `User` models in `amplify/data/resource.ts` are unchanged. The signup flow creates records in these existing models.

### 10.9 No Impact on Authenticated Pages

All pages behind `<AppLayout>` are unaffected. The auth context interface changes are additive — the `user` object gains an optional `authMethod` field, and new methods are added. No existing method signatures change (only `signIn` is renamed to `signInWithEmail`, and both call sites are being rewritten).

---

## 11. Edge Cases and Error Scenarios

### 11.1 Authentication Edge Cases

| Scenario | Handling |
|---|---|
| Browser doesn't support WebAuthn | Hide passkey button entirely (feature detection) |
| User has no registered passkey but clicks passkey button | Cognito returns error → show "No passkey found. Sign in with email/password to register one in Settings." |
| Google OAuth popup blocked | Show error: "Pop-up was blocked. Please allow pop-ups for this site." |
| Google OAuth cancelled by user | Hub fires `signInWithRedirect_failure` → show "Sign-in was cancelled." |
| TOTP code expired (>30 seconds window) | Cognito rejects → show "Invalid code. Please wait for a new code on your authenticator app." |
| 3 consecutive TOTP failures | Show "Too many failed attempts. Please contact support or try again later." Disable input for 30 seconds. |
| User signs in with Google but already has email/password account with same email | Cognito handles account linking based on email. If auto-linking is not configured, show error and guide user to sign in with their original method. |
| Network failure during OAuth redirect | User returns to login page with no session → show generic error |
| Verification code expired during signup | Show "Code expired" error with "Resend code" button |

### 11.2 Company Profile Edge Cases

| Scenario | Handling |
|---|---|
| User skips company profile, then signs out and back in | `needsCompanyProfile` is re-evaluated on every `checkUser()`. If still no profile, show the step again. |
| User already has a CompanyProfile (e.g., created via settings) | `needsCompanyProfile` is `false` → skip the step, go to dashboard |
| GST number entered without hyphens (e.g., `12345678`) | Zod regex accepts both `12-345-678` and `12345678` formats |
| Bank account with wrong segment lengths | Zod regex enforces `XX-XXXX-XXXXXXX-XX` or `XX-XXXX-XXXXXXX-XXX` format |
| Concurrent profile creation (race condition) | DynamoDB owner-scoped write — if a profile already exists, the second write creates a duplicate. The `list()` query returns the first one. Low risk for single-user scenario. |

### 11.3 Dark Mode Edge Cases

| Scenario | Handling |
|---|---|
| Theme not yet loaded from localStorage | Default to `'dark'` (current ThemeProvider default). Auth pages render in dark mode initially. |
| Flash of wrong theme on page load | Acceptable for MVP. The ThemeProvider loads from localStorage in `useEffect`, so there may be a brief flash. A future enhancement could use a `<script>` in `<head>` to set theme before React hydrates. |

### 11.4 Security Considerations

| Concern | Mitigation |
|---|---|
| Google client secret exposure | Stored via `ampx secret set`, never in code or `.env` files committed to git |
| TOTP brute force | Cognito has built-in rate limiting. UI adds 30-second cooldown after 3 failures. |
| Passkey replay attacks | WebAuthn protocol includes challenge-response with nonce — handled by Cognito + browser |
| Social sign-in token theft | Tokens are managed by Amplify, stored in secure browser storage, never exposed to app code |
| Cross-user data access via social sign-in | Owner-based authorization on all models. Social sign-in users get a unique Cognito identity. |

---

## 12. Google OAuth Setup Prerequisites

Before development can begin on Google sign-in, the following must be configured:

1. Create a Google Cloud project at console.cloud.google.com
2. Enable the Google Identity API
3. Create OAuth 2.0 credentials (Web application type)
4. Add authorized redirect URIs:
   - `https://<cognito-domain>.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse`
5. Store credentials via Amplify secrets:
   ```bash
   npx ampx secret set GOOGLE_CLIENT_ID
   npx ampx secret set GOOGLE_CLIENT_SECRET
   ```
6. The Cognito domain is auto-created by Amplify when `externalProviders` is configured.

---

## 13. Files Changed Summary

| File | Change Type | Description |
|---|---|---|
| `amplify/auth/resource.ts` | Major update | Add Google IDP, TOTP MFA, branded email template |
| `amplify/backend.ts` | Minor addition | CDK override for WebAuthn on User Pool |
| `lib/auth-context.tsx` | Major rewrite | New auth methods, Hub listener, company profile check |
| `lib/validation.ts` | Addition | New schemas for signup, login, TOTP, company profile step |
| `app/auth/login/page.tsx` | Full rewrite | Dark mode, passkey, Google, TOTP step |
| `app/auth/signup/page.tsx` | Full rewrite | Dark mode, Google, company profile step |
| `app/auth/forgot-password/page.tsx` | Styling update | Dark mode support |
| `components/CompanyProfileStep.tsx` | New file | Company profile collection form |
| `amplify/data/resource.ts` | No changes | Existing models sufficient |
