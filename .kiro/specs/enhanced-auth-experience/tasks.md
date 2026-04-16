# Implementation Tasks: Enhanced Auth Experience

## Task 1: Auth Config — TOTP MFA + Branded Email Template

Update `amplify/auth/resource.ts` to enable optional TOTP MFA and add the branded verification email.

### Sub-tasks

- [x] 1.1 Add `multifactor` config with `mode: 'OPTIONAL'` and `totp: true` to `defineAuth` in `amplify/auth/resource.ts`
- [x] 1.2 Create the `brandedEmailTemplate` function in `amplify/auth/resource.ts` that returns the HTML email template with the verification code injected via `createCode()`
- [x] 1.3 Update `loginWith.email` to use `verificationEmailStyle: 'CODE'`, custom `verificationEmailSubject`, and `verificationEmailBody` using the branded template function
- [~] 1.4 Deploy to sandbox and verify: new signup sends branded HTML email with verification code, email renders correctly in Gmail/Outlook

### Acceptance Criteria
- Branded email is sent on signup with CloudPro logo, indigo/purple colors, and large verification code
- TOTP MFA is available but not required (optional mode)
- Existing email/password sign-in still works without MFA

---

## Task 2: Auth Config — Google Social Sign-In

Add Google as an external identity provider in Cognito.

### Sub-tasks

- [~] 2.1 Create Google Cloud OAuth 2.0 credentials (Web application) with correct redirect URIs
- [~] 2.2 Store `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` via `npx ampx secret set`
- [x] 2.3 Add `externalProviders.google` config to `defineAuth` in `amplify/auth/resource.ts` with `secret()` references, scopes `['email', 'profile']`, and attribute mapping for email, givenName, familyName
- [x] 2.4 Add `callbackUrls` and `logoutUrls` arrays to `externalProviders` (localhost + production domain)
- [~] 2.5 Deploy to sandbox and verify: Google OAuth redirect works, user is created in Cognito with mapped attributes

### Acceptance Criteria
- Google sign-in redirects to Google consent screen and back
- New Google users are created in Cognito with email, given_name, family_name mapped
- Existing Google users can sign in without re-registering
- No client secrets are hardcoded in source code

---

## Task 3: Auth Config — WebAuthn/Passkey Support

Enable WebAuthn as a first-factor authentication method via CDK override.

### Sub-tasks

- [x] 3.1 Add CDK override in `amplify/backend.ts` to set `WebAuthnRelyingPartyID` and `WebAuthnUserVerification` on the Cognito User Pool `cfnUserPool`
- [~] 3.2 Deploy to sandbox and verify: Cognito User Pool has WebAuthn enabled in the console
- [~] 3.3 Test passkey registration via `associateWebAuthnCredential()` from `aws-amplify/auth` in a scratch page or browser console
- [~] 3.4 Test passkey sign-in via `signIn({ options: { authFlowType: 'USER_AUTH', preferredChallenge: 'WEB_AUTHN' } })`

### Acceptance Criteria
- WebAuthn is enabled on the Cognito User Pool
- Passkey registration and sign-in work via Amplify JS SDK
- Passkey sign-in does not trigger TOTP challenge

---

## Task 4: Validation Schemas

Add Zod validation schemas for all new auth forms.

### Sub-tasks

- [x] 4.1 Add `signupSchema` to `lib/validation.ts` — validates firstName, lastName, email, password (min 8 chars), confirmPassword (must match)
- [x] 4.2 Add `loginSchema` to `lib/validation.ts` — validates email (valid format), password (non-empty)
- [x] 4.3 Add `totpSchema` to `lib/validation.ts` — validates code as exactly 6 digits
- [x] 4.4 Add `companyProfileStepSchema` to `lib/validation.ts` — validates companyName (required), gstNumber (optional, NZ IRD format 8-9 digits), bankAccount (optional, NZ format XX-XXXX-XXXXXXX-XX/XXX)
- [x] 4.5 Run `getDiagnostics` on `lib/validation.ts` to verify no type errors

### Acceptance Criteria
- All schemas validate correctly with valid and invalid inputs
- GST number accepts both hyphenated (`12-345-678`) and non-hyphenated (`12345678`) formats
- Bank account enforces NZ format with hyphens (`06-0123-0456789-00`)
- Existing schemas (`invoiceSchema`, `expenseSchema`, `clientSchema`, `companySchema`) are unchanged

---

## Task 5: Auth Context Rewrite (`lib/auth-context.tsx`)

Rewrite the auth context to support all new auth methods with conditional MFA logic.

### Sub-tasks

- [x] 5.1 Define updated TypeScript interfaces: `AuthMethod` type, `SignInResult` interface, updated `User` interface (add `authMethod`), updated `AuthContextType` interface with all new methods
- [x] 5.2 Rename `handleSignIn` to `handleSignInWithEmail` — returns `SignInResult` with `nextStep` for TOTP or unverified user. Handle `CONFIRM_SIGN_IN_WITH_TOTP_CODE` step by returning `{ isSignedIn: false, nextStep: 'TOTP_REQUIRED' }`
- [x] 5.3 Implement `handleSignInWithGoogle` — calls `signInWithRedirect({ provider: 'Google' })`
- [x] 5.4 Implement `handleSignInWithPasskey` — calls `signIn` with `authFlowType: 'USER_AUTH'` and `preferredChallenge: 'WEB_AUTHN'`, then `checkUser('passkey')`
- [x] 5.5 Implement `handleConfirmTotpCode` — calls `confirmSignIn({ challengeResponse: code })`, then `checkUser('email')`
- [x] 5.6 Implement `handleSetupTotp` — calls `setUpTOTP()` from `aws-amplify/auth`, returns `{ qrUri, secretKey }`
- [x] 5.7 Implement `handleVerifyTotpSetup` — calls `verifyTOTPSetup({ code })` from `aws-amplify/auth`
- [x] 5.8 Add `needsCompanyProfile` state — in `checkUser()`, query `CompanyProfile.list()` via Amplify client, set `true` if empty
- [x] 5.9 Add `clearNeedsCompanyProfile` method to set the flag to `false` after profile creation or skip
- [x] 5.10 Add Hub listener in `useEffect` for `signInWithRedirect` and `signInWithRedirect_failure` events to handle Google sign-in redirect
- [x] 5.11 Update the context provider value to expose all new methods and state
- [x] 5.12 Run `getDiagnostics` on `lib/auth-context.tsx` to verify no type errors

### Acceptance Criteria
- `signInWithEmail` returns TOTP_REQUIRED when MFA is enabled
- `signInWithGoogle` triggers OAuth redirect
- `signInWithPasskey` completes WebAuthn flow without TOTP
- `confirmTotpCode` completes MFA and establishes session
- `needsCompanyProfile` is `true` for new users without a CompanyProfile
- Hub listener handles Google redirect callback
- All methods are properly typed with no `any` types

---

## Task 6: Company Profile Step Component

Create the shared company profile collection component.

### Sub-tasks

- [x] 6.1 Create `components/CompanyProfileStep.tsx` with props `onComplete` and `onSkip`
- [x] 6.2 Implement the form with three fields: Company Name (required text input), GST Number (optional text input with placeholder `12-345-678`), Bank Account (optional text input with placeholder `06-0123-0456789-00`)
- [x] 6.3 Add dark mode support using `useTheme()` — apply conditional styles for card, inputs, labels, buttons following the design system patterns
- [x] 6.4 Validate on submit using `companyProfileStepSchema` from `lib/validation.ts` via the `validate()` helper. Show field-level errors below each input.
- [x] 6.5 On valid submit: create `CompanyProfile` record via Amplify `generateClient()` with defaults (`defaultCurrency: 'NZD'`, `defaultGstRate: 15`, `companyCountry: 'New Zealand'`). Also create `User` record if it doesn't exist.
- [x] 6.6 On submit success: call `onComplete()` callback
- [x] 6.7 Implement "Skip for now" button that calls `onSkip()` without creating any records
- [x] 6.8 Add loading state on submit button ("Setting up..." text, disabled state)
- [x] 6.9 Add error handling with toast notification for API failures
- [x] 6.10 Ensure all inputs have `label` elements with `htmlFor`, keyboard navigation works, and error messages are in ARIA live regions
- [x] 6.11 Run `getDiagnostics` on `components/CompanyProfileStep.tsx`

### Acceptance Criteria
- Form renders with dark mode support
- Company name is required, GST and bank account are optional
- Validation errors show below fields
- Successful submit creates CompanyProfile with NZ defaults
- Skip button works without creating records
- Component is accessible (labels, keyboard nav, ARIA)

---

## Task 7: Login Page Rewrite (`app/auth/login/page.tsx`)

Rewrite the login page with dark mode, passkey, Google sign-in, and TOTP MFA step.

### Sub-tasks

- [x] 7.1 Add `useTheme()` hook and apply dark mode conditional styles to the page background, card, headings, body text, inputs, buttons, links, and error alerts following the design system patterns from the design doc
- [x] 7.2 Add CloudPro Invoice brand logo (text-based: "☁ CloudPro Invoice") and tagline ("Professional invoicing. Ridiculously fast.") at the top of the card, styled for both themes
- [x] 7.3 Add WebAuthn feature detection in `useEffect` — check `window.PublicKeyCredential` and `isUserVerifyingPlatformAuthenticatorAvailable`. Store result in `webAuthnSupported` state.
- [x] 7.4 Add "Sign in with Passkey" button (Lucide `Fingerprint` icon) — only rendered when `webAuthnSupported` is `true`. Calls `signInWithPasskey()` from auth context. Style: secondary button with key icon.
- [x] 7.5 Add "Continue with Google" button (Lucide `Chrome` icon as Google substitute, or inline SVG Google "G" logo). Calls `signInWithGoogle()` from auth context. Style: white/light button with Google branding.
- [x] 7.6 Add visual divider between social/passkey buttons and email form: horizontal rule with "or" text centered.
- [x] 7.7 Update email/password form to use `signInWithEmail()` from auth context. Handle the `SignInResult`: if `nextStep === 'TOTP_REQUIRED'`, set `step` to `'totp'`. If `nextStep === 'CONFIRM_SIGN_UP'`, set `step` to `'verification'`.
- [x] 7.8 Implement TOTP step UI: 6-digit code input (auto-focus, `inputMode="numeric"`, `pattern="[0-9]*"`), "Verify" button, "Back to sign in" link. Track consecutive failures — after 3, show support message and disable input for 30 seconds.
- [x] 7.9 Validate email/password form with `loginSchema` from `lib/validation.ts` before calling auth context
- [x] 7.10 Add ARIA `role="alert"` and `aria-live="assertive"` to error message containers so screen readers announce errors
- [x] 7.11 Ensure all buttons show loading state with descriptive text ("Signing in...", "Verifying...", "Connecting...") and are disabled during async operations
- [x] 7.12 Handle passkey errors: show "No passkey found" or "Passkey authentication failed" with fallback guidance
- [x] 7.13 Handle Google errors: catch Hub `signInWithRedirect_failure` and show appropriate message
- [x] 7.14 Test responsive layout: card stacks properly on mobile (375px), inputs are full-width, buttons are touch-friendly (min 44px height)
- [x] 7.15 Run `getDiagnostics` on `app/auth/login/page.tsx`

### Acceptance Criteria
- Page renders correctly in both light and dark mode
- Passkey button only shows when WebAuthn is supported
- Google button initiates OAuth redirect
- Email/password sign-in works, with TOTP step when MFA is enabled
- TOTP step accepts 6-digit code, shows errors, locks after 3 failures
- All errors are announced to screen readers
- Responsive on mobile (375px+)
- Brand logo and tagline are visible

---

## Task 8: Signup Page Rewrite (`app/auth/signup/page.tsx`)

Rewrite the signup page with dark mode, Google sign-up, and company profile step.

### Sub-tasks

- [x] 8.1 Add `useTheme()` hook and apply dark mode conditional styles (same pattern as login page)
- [x] 8.2 Add CloudPro Invoice brand logo and tagline at the top of the card
- [x] 8.3 Add "Continue with Google" button at the top of the form (same style as login page). Calls `signInWithGoogle()`.
- [x] 8.4 Add visual divider ("or") between Google button and registration form
- [x] 8.5 Replace inline password validation with `signupSchema` from `lib/validation.ts`. Show field-level errors below each input using the `validate()` helper.
- [x] 8.6 After email verification succeeds and user is signed in, check `needsCompanyProfile` from auth context. If `true`, set `step` to `'company-profile'`.
- [x] 8.7 Render `<CompanyProfileStep>` when `step === 'company-profile'`. On `onComplete` or `onSkip`, call `clearNeedsCompanyProfile()` and redirect to `/dashboard`.
- [x] 8.8 Add ARIA `role="alert"` and `aria-live="assertive"` to error containers
- [x] 8.9 Ensure loading states on all buttons with descriptive text
- [x] 8.10 Test responsive layout on mobile (375px)
- [ ] 8.11 Run `getDiagnostics` on `app/auth/signup/page.tsx`

### Acceptance Criteria
- Page renders correctly in both light and dark mode
- Google sign-up button initiates OAuth redirect
- Registration form validates with Zod schema, shows field-level errors
- After verification, company profile step is shown
- Skip and complete both redirect to dashboard
- Responsive on mobile (375px+)

---

## Task 9: Forgot Password Page Dark Mode (`app/auth/forgot-password/page.tsx`)

Add dark mode support to the forgot password page.

### Sub-tasks

- [x] 9.1 Add `useTheme()` hook and `dark` variable
- [x] 9.2 Apply dark mode conditional styles to: page background, card, headings, body text, inputs, buttons, links, error alerts, success state — following the same pattern as login/signup
- [x] 9.3 Add CloudPro Invoice brand logo at the top of the card
- [x] 9.4 Add ARIA `role="alert"` to error container
- [x] 9.5 Run `getDiagnostics` on `app/auth/forgot-password/page.tsx`

### Acceptance Criteria
- Page renders correctly in both light and dark mode
- All existing functionality (send code, reset password, success state) still works
- Brand logo is visible
- No functional changes — styling only

---

## Task 10: Integration Testing & Polish

End-to-end verification of all auth flows.

### Sub-tasks

- [ ] 10.1 Test email/password signup → verification → company profile → dashboard flow
- [ ] 10.2 Test email/password signup → verification → skip company profile → dashboard flow
- [ ] 10.3 Test email/password login (no MFA) → dashboard flow
- [ ] 10.4 Test email/password login (with TOTP MFA) → TOTP step → dashboard flow
- [ ] 10.5 Test TOTP invalid code → error message → retry → success
- [ ] 10.6 Test TOTP 3 consecutive failures → lockout message
- [ ] 10.7 Test Google sign-in (new user) → company profile step → dashboard
- [ ] 10.8 Test Google sign-in (existing user) → dashboard (no company profile step)
- [ ] 10.9 Test Google sign-in cancelled → error message on login page
- [ ] 10.10 Test passkey sign-in → dashboard (no TOTP step)
- [ ] 10.11 Test passkey button hidden when WebAuthn not supported (test in a browser without WebAuthn)
- [ ] 10.12 Test forgot password flow in dark mode
- [ ] 10.13 Test all auth pages on mobile viewport (375px width)
- [ ] 10.14 Test all auth pages in both light and dark mode
- [ ] 10.15 Test keyboard navigation through all forms (Tab, Enter, Escape)
- [ ] 10.16 Run `npm run build` to verify no compile errors across the project

### Acceptance Criteria
- All auth flows complete successfully
- No console errors during any flow
- Dark mode renders correctly on all auth pages
- Mobile layout is usable at 375px width
- Keyboard navigation works for all interactive elements
- Build succeeds with no errors

---

## Task Dependency Order

```
Task 1 (TOTP + Email) ──┐
Task 2 (Google IDP)  ────┤
Task 3 (WebAuthn)    ────┤──→ Task 5 (Auth Context) ──→ Task 7 (Login Page) ──┐
Task 4 (Validation)  ────┘                          ──→ Task 8 (Signup Page) ──┤──→ Task 10 (Testing)
                                                        Task 9 (Forgot Pwd)  ──┘
                          Task 6 (CompanyProfileStep) ──→ Task 8 (Signup Page)
```

Tasks 1–4 and 6 can be worked on in parallel. Task 5 depends on Tasks 1–3 being deployed. Tasks 7–9 depend on Tasks 4–6. Task 10 is the final integration pass.

---

## Estimated Effort

| Task | Effort | Notes |
|---|---|---|
| Task 1: TOTP + Email Template | Small | Config change + HTML template |
| Task 2: Google IDP | Small | Config + secret setup (requires Google Cloud console) |
| Task 3: WebAuthn | Small | CDK override + verification |
| Task 4: Validation Schemas | Small | 4 new Zod schemas |
| Task 5: Auth Context Rewrite | Large | Core logic, multiple methods, Hub listener |
| Task 6: CompanyProfileStep | Medium | New component with form, validation, API calls |
| Task 7: Login Page Rewrite | Large | Multi-state UI, 3 auth methods, TOTP step, dark mode |
| Task 8: Signup Page Rewrite | Large | Multi-step flow, Google, company profile, dark mode |
| Task 9: Forgot Password Dark Mode | Small | Styling only |
| Task 10: Integration Testing | Medium | Manual testing of all flows |
