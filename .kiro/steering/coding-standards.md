# Coding Standards

## TypeScript
- Strict mode enabled — no `any` types (use proper types or `unknown`)
- Use `interface` for object shapes, `type` for unions/intersections
- Export types alongside their components/functions
- Prefer `const` over `let`, never use `var`

## React / Next.js
- Use functional components only (no class components)
- Add `'use client'` directive on any component using hooks, state, or browser APIs
- Keep components focused — one responsibility per file
- Colocate page-specific components in the page directory; shared ones go in `components/`
- Use `next/image` for all images (never raw `<img>`)
- Use `next/link` for all internal navigation (never raw `<a>`)

## Styling
- Tailwind CSS only — no inline styles, no CSS modules, no styled-components
- Follow the design system colors defined in `tailwind.config.ts`:
  - Primary: Indigo (`primary-500: #6366F1`)
  - Secondary: Purple (`secondary-500: #A855F7`)
  - Success: `success-500`, Warning: `warning-500`, Error: `error-500`
- Support dark mode: always provide both light and dark variants using the `dark` variable from `useTheme()`
- Use conditional classes: `dark ? 'dark-class' : 'light-class'`
- Spacing: use Tailwind's scale (p-4, gap-6, etc.) — base unit is 4px

## Validation
- Use Zod schemas for all form validation (`lib/validation.ts`)
- Validate on submit, show field-level errors
- Use the `validate()` helper function from `lib/validation.ts`

## Error Handling
- Wrap async operations in try/catch
- Show user-friendly errors via `useToast()` — never expose raw error messages
- Log errors to console in development

## File Naming
- Pages: `page.tsx` (Next.js convention)
- Components: PascalCase (`NotificationBell.tsx`)
- Utilities: kebab-case (`gst-calculations.ts`)
- Contexts: kebab-case with `-context` suffix (`auth-context.tsx`)

## Imports
- Use `@/` path alias for all imports (e.g., `@/lib/auth-context`)
- Group imports: React/Next → third-party → local modules → types
- No circular imports
