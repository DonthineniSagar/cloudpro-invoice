# Spec: Landing Page

**Feature:** Public marketing landing page at `app/page.tsx`
**Status:** Ready for development
**Backlog ref:** Phase 4 → "Landing Page & Marketing"
**Priority:** High — this is the front door to the product

---

## Overview

Replace the current `app/page.tsx` (which just redirects to `/auth/login`) with a proper marketing landing page that converts visitors into signups. This is a static, public-facing page — no authentication required, no data fetching.

The page must work in both light and dark mode, be fully responsive (mobile-first), and follow the existing design system (Indigo/Purple palette, Inter font, Tailwind only, Lucide icons).

---

## Page Sections (top to bottom)

### 1. Navigation Bar (sticky)

- CloudPro logo (`/cloudpro-logo.png` via `next/image`) + "CloudPro" wordmark on the left.
- Nav links on the right (desktop): Features, Pricing, Contact.
  - These are anchor links that smooth-scroll to the corresponding section on the same page.
- "Sign In" text link and "Get Started" primary button (links to `/auth/signup`).
- On mobile (< md): collapse nav links + auth links into a hamburger menu (☰) that toggles a dropdown/slide-down panel.
- Sticky (`sticky top-0 z-50`) with a subtle backdrop blur and bottom border so content scrolls behind it.

### 2. Hero Section

- Headline: **"Professional invoicing. Ridiculously fast."** (from brand tagline in PRODUCT_VISION.md).
- Subheadline: "Create GST-compliant tax invoices, track expenses, and get paid faster. Built for New Zealand freelancers and small businesses."
- Primary CTA button: **"Start Free Trial"** → links to `/auth/signup`. Large size (`px-8 py-4 text-lg`), primary-600 bg with hover shadow.
- Secondary CTA: **"Sign In"** → links to `/auth/login`. Ghost/outline style.
- Visual: a decorative gradient background (indigo-to-purple) or abstract SVG pattern. No product screenshot required for MVP — use a CSS gradient hero with subtle animated shapes or a simple illustration using CSS/SVG.
- "Made in New Zealand 🇳🇿" badge below the CTAs.

### 3. Features Section

Display 6 feature cards in a responsive grid (1 col mobile, 2 col tablet, 3 col desktop).

Each card: Lucide icon + title + short description. Cards use the standard card pattern (rounded-xl, shadow-sm, border).

| Icon | Title | Description |
|------|-------|-------------|
| `FileText` | GST Tax Invoices | Create compliant NZ tax invoices with automatic GST calculation at 15%. |
| `Users` | Client Management | Store client details, track invoice history, and manage relationships in one place. |
| `TrendingUp` | Financial Dashboard | Real-time visibility into revenue, expenses, and outstanding payments. |
| `Receipt` | Expense Tracking | Log expenses, snap receipts with OCR, and import bank statements. |
| `RefreshCw` | Recurring Invoices | Set up automatic billing for retainer clients — weekly, monthly, or quarterly. |
| `Send` | Email & PDF Delivery | Generate professional PDFs and email invoices directly to clients. |

### 4. How It Works Section

Three-step horizontal flow (stacks vertically on mobile):

1. **Sign Up** — "Create your free account in 30 seconds."
2. **Create Invoice** — "Add your client, line items, and hit send."
3. **Get Paid** — "Track payments and send reminders automatically."

Each step: a numbered circle (1, 2, 3) with indigo/purple gradient, a title, and a one-line description. Connect steps with a horizontal line/arrow on desktop.

### 5. Social Proof / Trust Section

Since the product is new and has no testimonials yet, use trust signals instead:

- "Built on AWS" — secure, reliable infrastructure.
- "GST Compliant" — meets IRD requirements for NZ tax invoices.
- "Bank-Grade Security" — Cognito authentication, encrypted data.
- "Made in NZ 🇳🇿" — built by a New Zealand team for NZ businesses.

Display as a row of 4 badges/pills with icons, centered. Use a subtle background color to differentiate this section.

### 6. Pricing Section

- Section heading: "Simple, transparent pricing"
- Single card (centered, elevated shadow) with:
  - "We're currently in early access."
  - "Contact us for pricing details and to discuss your needs."
  - Email link: **info@cloudpro-digital.co.nz** (note: this is the stakeholder-provided email — use exactly as given, including the typo "digital").
  - CTA button: **"Get in Touch"** → `mailto:info@cloudpro-dgital.co.nz`
  - Secondary CTA: **"Start Free Trial"** → `/auth/signup`
- Do NOT display pricing tiers. The stakeholder explicitly said "Contact for pricing".

### 7. FAQ Section

Collapsible accordion (click to expand/collapse). No external library — implement with `useState` toggling `hidden`/`block` or `max-height` transitions.

| Question | Answer |
|----------|--------|
| What is CloudPro Invoice? | A modern invoicing platform built for NZ freelancers and small businesses. Create GST-compliant tax invoices, track expenses, manage clients, and get paid faster. |
| Is CloudPro Invoice GST compliant? | Yes. All invoices include GST at the standard NZ rate of 15%. Invoices follow the IRD requirements for valid tax invoices. |
| How does invoice numbering work? | Invoices are automatically numbered using the format INV-YYMM-XXX (e.g., INV-2604-001), so you never have to worry about duplicates. |
| Can I track expenses too? | Yes. Log expenses manually, snap receipts for automatic OCR extraction, or import bank statements via CSV. |
| Is my data secure? | Absolutely. CloudPro Invoice runs on AWS with Cognito authentication, encrypted storage, and owner-scoped data isolation. Your data is never accessible to other users. |
| How do I get started? | Sign up for a free account — it takes less than a minute. You can start creating invoices immediately. |

### 8. Footer

- Left: "© 2026 CloudPro Digital. Made with ❤️ in New Zealand 🇳🇿"
- Center/right: Links — Features, Pricing, Contact, Sign In, Sign Up.
- Contact email: info@cloudpro-dgital.co.nz (as a `mailto:` link).
- Keep it simple. No social media links for now.

---

## User Stories & Acceptance Criteria

### Story 1: Visitor views the landing page

**As a** visitor arriving at the root URL,
**I want to** see a professional marketing page explaining what CloudPro Invoice does,
**so that** I can decide whether to sign up.

**Acceptance Criteria:**
- [ ] Visiting `/` renders the landing page (not a redirect to `/auth/login`).
- [ ] The page loads without requiring authentication.
- [ ] All 8 sections are visible: Nav, Hero, Features, How It Works, Trust, Pricing, FAQ, Footer.
- [ ] The page is a `'use client'` component (needed for useState in FAQ accordion and mobile menu toggle).
- [ ] The page does NOT use `<AppLayout>` (it is a public page, not an authenticated page).
- [ ] The page does NOT import or use `useAuth()` or `useTheme()` — it is self-contained.

### Story 2: Visitor navigates to signup

**As a** visitor who wants to try CloudPro Invoice,
**I want to** click a clear call-to-action,
**so that** I am taken to the signup page.

**Acceptance Criteria:**
- [ ] The hero section has a "Start Free Trial" button linking to `/auth/signup`.
- [ ] The pricing section has a "Start Free Trial" button linking to `/auth/signup`.
- [ ] The nav bar has a "Get Started" button linking to `/auth/signup`.
- [ ] All signup links use `next/link` (not raw `<a>` tags) for client-side navigation.

### Story 3: Visitor navigates to sign in

**As a** returning user,
**I want to** find a sign-in link on the landing page,
**so that** I can access my account.

**Acceptance Criteria:**
- [ ] The nav bar has a "Sign In" link to `/auth/login`.
- [ ] The footer has a "Sign In" link to `/auth/login`.
- [ ] Links use `next/link`.

### Story 4: Visitor contacts the team

**As a** visitor interested in pricing,
**I want to** find a way to contact CloudPro,
**so that** I can discuss my needs.

**Acceptance Criteria:**
- [ ] The pricing section displays the email `info@cloudpro-dgital.co.nz`.
- [ ] The email is a clickable `mailto:` link.
- [ ] The footer also displays the contact email as a `mailto:` link.
- [ ] The "Get in Touch" button in the pricing section opens the user's email client.

### Story 5: Visitor uses the page on mobile

**As a** visitor on a phone,
**I want to** view and navigate the landing page comfortably,
**so that** I can learn about the product and sign up.

**Acceptance Criteria:**
- [ ] Nav links collapse into a hamburger menu on screens < 768px (md breakpoint).
- [ ] Tapping the hamburger toggles a dropdown with all nav links + Sign In + Get Started.
- [ ] Feature cards stack to 1 column on mobile.
- [ ] "How It Works" steps stack vertically on mobile.
- [ ] Trust badges wrap to 2×2 grid on mobile.
- [ ] All tap targets are at least 44×44px.
- [ ] No horizontal scrolling at 375px viewport width.

### Story 6: Visitor uses FAQ accordion

**As a** visitor with questions,
**I want to** expand FAQ items to read answers,
**so that** I can get my questions answered without leaving the page.

**Acceptance Criteria:**
- [ ] Each FAQ item shows the question with a chevron/plus icon.
- [ ] Clicking a question toggles the answer visibility.
- [ ] Only one answer is open at a time (accordion behavior) OR multiple can be open (either is acceptable).
- [ ] The toggle is keyboard accessible (Enter/Space on focused item).
- [ ] Chevron/icon rotates or changes to indicate open/closed state.

### Story 7: Dark mode support

**As a** visitor whose OS is set to dark mode,
**I want to** see the landing page in a dark theme,
**so that** it's comfortable to read.

**Acceptance Criteria:**
- [ ] The page respects `prefers-color-scheme: dark` via CSS media query OR uses a simple dark mode detection approach.
- [ ] Since this is a public page that does NOT use `useTheme()` (which requires AuthProvider context), dark mode should be handled via Tailwind's `dark:` variant with the `class` strategy, OR via CSS media queries in the component, OR by reading `prefers-color-scheme` with a local useState/useEffect.
- [ ] All text is readable against its background in both modes.
- [ ] Cards, nav, and footer have appropriate dark backgrounds.

---

## Edge Cases & Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Authenticated user visits `/` | They see the landing page (not auto-redirected). They can click "Sign In" to go to login, which will redirect them to dashboard if already authenticated. The landing page itself does not check auth state. |
| JavaScript disabled | The page should render its static content via SSR. The FAQ accordion and mobile menu won't work, but all content and links remain visible. Consider rendering FAQ answers as visible by default in the HTML (progressive enhancement). |
| Slow connection | The page is self-contained (no API calls, no data fetching). Only the logo image needs to load. Use `next/image` with appropriate `width`/`height` to prevent layout shift. |
| Very long screen (4K) | Content should be centered with `max-w-7xl` and not stretch edge-to-edge. |
| Screen reader | All sections use semantic HTML (`<nav>`, `<main>`, `<section>`, `<footer>`). Images have alt text. Interactive elements (hamburger, FAQ) have `aria-label` or `aria-expanded` attributes. |
| Contact email typo | The stakeholder provided `info@cloudpro-dgital.co.nz` (missing an "i" in "digital"). Use this exactly as given. Do not "fix" it. |

---

## Data Model Changes

None. This is a purely frontend, static page. No schema changes required.

---

## Impact on Existing Features

| Area | Impact |
|------|--------|
| `app/page.tsx` | **Replaced entirely.** The current redirect-to-login behavior is removed. Authenticated users who want to reach the dashboard should use `/dashboard` directly or click "Sign In" on the landing page. |
| `app/layout.tsx` | No changes needed. The landing page renders inside the existing root layout (which provides `ThemeProvider`, `AuthProvider`, etc.), but the landing page component itself should not consume those contexts. |
| Auth flow | No changes. `/auth/login` and `/auth/signup` remain as-is. The landing page simply links to them. |
| SEO / Meta tags | The existing `metadata` in `app/layout.tsx` already has good OG tags for the landing page. No changes needed. |
| Navigation | The `<AppLayout>` sidebar nav is not affected. The landing page has its own standalone nav bar. |

---

## Technical Notes

- **No external dependencies.** Use only what's already installed: `next/link`, `next/image`, `lucide-react`, Tailwind CSS.
- **No `<AppLayout>` wrapper.** This is a public page with its own layout.
- **`'use client'` directive required** for `useState` (FAQ accordion, mobile menu toggle).
- **Smooth scrolling:** Use `scroll-behavior: smooth` on the html element (add to `globals.css`) or use `element.scrollIntoView({ behavior: 'smooth' })` in onClick handlers for anchor links. Prefer the CSS approach for simplicity.
- **Section IDs:** Each section needs an `id` attribute for anchor navigation: `id="features"`, `id="pricing"`, `id="contact"`, `id="faq"`.
- **Logo:** Use `next/image` with `src="/cloudpro-logo.png"` and appropriate dimensions. The file already exists in `/public/`.
- **Icons from Lucide:** `FileText`, `Users`, `TrendingUp`, `Receipt`, `RefreshCw`, `Send`, `Menu`, `X`, `ChevronDown`, `Shield`, `Globe`, `Zap`, `CheckCircle`.
- **No analytics or tracking for MVP.** Can be added later.
- **File size:** This is a single-file page component. Keep it in `app/page.tsx`. If it exceeds ~400 lines, extract the FAQ data and feature data into const arrays at the top of the file, but don't create separate component files unless truly necessary.

---

## Out of Scope

- Product screenshots or demo video (no assets available yet).
- Blog or content pages.
- Pricing tiers (stakeholder said "Contact for pricing").
- Cookie consent banner.
- Analytics integration.
- A/B testing.
- Animations beyond basic CSS transitions (no Framer Motion).
