# Requirements Document

## Introduction

CloudPro Invoice currently uses a basic email/password authentication flow with a light-themed UI. This feature enhances the authentication experience with a polished dark-mode-aware login/signup UI, branded verification emails, multi-factor authentication (TOTP), passkey (WebAuthn) support, Google social sign-in, and an enhanced signup flow that collects initial company profile information during registration.

## Glossary

- **Auth_Pages**: The set of authentication-related pages including login, signup, forgot-password, and verification screens located under `app/auth/`
- **Login_Page**: The page at `app/auth/login/page.tsx` where users authenticate with credentials, passkeys, or social providers
- **Signup_Page**: The page at `app/auth/signup/page.tsx` where new users create an account and provide initial company details
- **Auth_Config**: The Amplify Gen 2 authentication resource defined in `amplify/auth/resource.ts`
- **Auth_Context**: The React context at `lib/auth-context.tsx` providing authentication state and methods to the application
- **Verification_Email**: The HTML email sent to users during signup to confirm their email address
- **MFA**: Multi-Factor Authentication using Time-based One-Time Passwords (TOTP) via authenticator apps
- **Passkey**: A WebAuthn/FIDO2 credential stored on the user's device enabling passwordless authentication
- **Google_IDP**: Google as an external identity provider for OAuth 2.0 social sign-in
- **Company_Profile_Step**: An additional step in the signup flow that collects basic business information (company name, GST number, bank account)
- **Theme_Context**: The React context at `lib/theme-context.tsx` providing light/dark mode state via `useTheme()` hook
- **CompanyProfile_Model**: The DynamoDB model storing business details, defined in `amplify/data/resource.ts`

## Requirements

### Requirement 1: Dark Mode Support for Auth Pages

**User Story:** As a user, I want the authentication pages to respect my theme preference, so that I have a consistent visual experience across the application.

#### Acceptance Criteria

1. THE Auth_Pages SHALL render using the current theme from Theme_Context, applying dark backgrounds (`bg-black`, `bg-slate-900`), light text (`text-white`, `text-slate-300`), and purple accent borders in dark mode
2. THE Auth_Pages SHALL render using light backgrounds (`bg-white`, `bg-gray-50`), dark text (`text-gray-900`), and indigo accent colors in light mode
3. WHEN the user toggles the theme, THE Auth_Pages SHALL update styling without requiring a page reload
4. THE Login_Page SHALL display the CloudPro Invoice brand logo and tagline styled appropriately for the active theme
5. THE Auth_Pages SHALL use `rounded-xl` cards with subtle shadows in light mode and `border-purple-500/30` borders in dark mode

### Requirement 2: Branded Verification Email Template

**User Story:** As a product owner, I want verification emails to use a branded HTML template, so that users receive a professional and trustworthy email during signup.

#### Acceptance Criteria

1. THE Auth_Config SHALL define a custom email verification message using a branded HTML template
2. THE Verification_Email SHALL include the CloudPro Invoice logo, brand colors (indigo primary, purple secondary), and a clear call-to-action displaying the verification code
3. THE Verification_Email SHALL render correctly in major email clients (Gmail, Outlook, Apple Mail) by using table-based HTML layout
4. THE Verification_Email SHALL include the text "CloudPro Invoice" as the sender display name
5. IF the verification code expires, THEN THE Verification_Email SHALL instruct the user to request a new code from the Login_Page

### Requirement 3: Multi-Factor Authentication (TOTP)

**User Story:** As a security-conscious user, I want to enable TOTP-based multi-factor authentication, so that my account has an additional layer of protection.

#### Acceptance Criteria

1. THE Auth_Config SHALL support TOTP as an MFA method
2. WHEN a user enables MFA in account settings, THE Auth_Context SHALL initiate TOTP setup by providing a QR code and secret key
3. WHEN a user signs in with MFA enabled, THE Login_Page SHALL display a TOTP code input step after successful credential verification
4. THE Login_Page SHALL accept a 6-digit TOTP code and submit it for verification
5. IF the TOTP code is invalid, THEN THE Login_Page SHALL display an error message "Invalid verification code. Please try again." and allow re-entry
6. IF the TOTP code entry fails three consecutive times, THEN THE Login_Page SHALL display a message directing the user to contact support

### Requirement 4: Passkey (WebAuthn) Support

**User Story:** As a user, I want to sign in using a passkey stored on my device, so that I can authenticate quickly without typing a password.

#### Acceptance Criteria

1. THE Auth_Config SHALL enable WebAuthn as a first-factor authentication method
2. WHEN a user visits the Login_Page and has a registered passkey, THE Login_Page SHALL display a "Sign in with Passkey" button
3. WHEN the user activates the "Sign in with Passkey" button, THE Login_Page SHALL invoke the browser WebAuthn API to authenticate using the stored credential
4. WHEN passkey authentication succeeds, THE Auth_Context SHALL establish the user session and redirect to the dashboard
5. IF the browser does not support WebAuthn, THEN THE Login_Page SHALL hide the "Sign in with Passkey" button
6. IF passkey authentication fails, THEN THE Login_Page SHALL display an error message and allow the user to fall back to email/password sign-in

### Requirement 5: Google Social Sign-In

**User Story:** As a user, I want to sign in with my Google account, so that I can access CloudPro Invoice without creating a separate password.

#### Acceptance Criteria

1. THE Auth_Config SHALL configure Google as an external identity provider using OAuth 2.0
2. THE Login_Page SHALL display a "Continue with Google" button with the Google logo, visually separated from the email/password form by a divider with "or" text
3. WHEN the user activates the "Continue with Google" button, THE Auth_Context SHALL initiate the Google OAuth flow via Amplify
4. WHEN Google authentication succeeds for a new user, THE Auth_Context SHALL create the user account and redirect to the Company_Profile_Step
5. WHEN Google authentication succeeds for an existing user, THE Auth_Context SHALL establish the session and redirect to the dashboard
6. IF Google authentication fails or the user cancels, THEN THE Login_Page SHALL display an appropriate error message and remain on the login screen
7. THE Signup_Page SHALL display the same "Continue with Google" button to allow social sign-up

### Requirement 6: Enhanced Signup with Company Profile Collection

**User Story:** As a new user, I want to provide my basic company details during signup, so that I can start invoicing immediately after account creation.

#### Acceptance Criteria

1. WHEN the user completes email verification during signup, THE Signup_Page SHALL display the Company_Profile_Step before redirecting to the dashboard
2. THE Company_Profile_Step SHALL collect: company name (required), GST number (optional), and bank account number (optional)
3. THE Company_Profile_Step SHALL validate the GST number format as a valid NZ IRD number (8 or 9 digits) when provided
4. THE Company_Profile_Step SHALL validate the bank account number format as a valid NZ bank account (XX-XXXX-XXXXXXX-XXX) when provided
5. WHEN the user submits the Company_Profile_Step, THE Signup_Page SHALL create a CompanyProfile_Model record with the provided details and default values (currency: NZD, GST rate: 15%, country: New Zealand)
6. THE Company_Profile_Step SHALL provide a "Skip for now" option that redirects to the dashboard without creating a CompanyProfile_Model record
7. WHEN a user signs up via Google_IDP, THE Signup_Page SHALL display the Company_Profile_Step after the first successful Google authentication

### Requirement 7: Auth Context Updates for New Auth Methods

**User Story:** As a developer, I want the auth context to support all new authentication methods, so that the application can handle MFA, passkeys, and social sign-in flows consistently.

#### Acceptance Criteria

1. THE Auth_Context SHALL expose a method to initiate Google social sign-in via Amplify `signInWithRedirect`
2. THE Auth_Context SHALL handle the `CONFIRM_SIGN_IN_WITH_TOTP_CODE` sign-in step by surfacing the MFA requirement to the calling component
3. THE Auth_Context SHALL handle the `CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION` step to support passkey authentication flows
4. WHEN a social sign-in creates a new user, THE Auth_Context SHALL detect the new account and set a flag indicating the Company_Profile_Step is needed
5. THE Auth_Context SHALL populate the User object with attributes from both Cognito user pool and social identity provider tokens

### Requirement 8: Responsive and Accessible Auth UI

**User Story:** As a user on any device, I want the authentication pages to be fully responsive and accessible, so that I can sign in comfortably from mobile or desktop using assistive technologies.

#### Acceptance Criteria

1. THE Auth_Pages SHALL use a mobile-first layout that stacks form elements vertically on screens narrower than 640px
2. THE Auth_Pages SHALL center the auth card with a maximum width of 448px (`max-w-md`) on desktop viewports
3. THE Auth_Pages SHALL ensure all interactive elements (buttons, inputs, links) are reachable via keyboard navigation using Tab and Enter keys
4. THE Auth_Pages SHALL use semantic HTML elements (`form`, `label`, `button`, `main`) and associate labels with inputs via `htmlFor` attributes
5. THE Auth_Pages SHALL display loading states using disabled buttons with spinner text (e.g., "Signing in...") during async operations
6. IF a form submission fails, THEN THE Auth_Pages SHALL display the error message in an ARIA live region so screen readers announce the error
