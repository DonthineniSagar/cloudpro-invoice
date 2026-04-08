# Workflow & Development Process

## Before Writing Code
1. Check `BACKLOG.md` for the current task status and requirements
2. Review related existing code to follow established patterns
3. Check `amplify/data/resource.ts` if the feature involves data models

## When Adding a New Page
1. Create `app/<feature>/page.tsx` with `'use client'` directive
2. Wrap content in `<AppLayout>` for authenticated pages
3. Add loading skeleton using `<Skeleton />` component
4. Add empty state for when there's no data
5. Support both light and dark mode
6. Make it responsive (mobile-first)

## When Adding a New Data Model
1. Add the model to `amplify/data/resource.ts`
2. Include `.authorization((allow) => allow.owner())`
3. Add a Zod validation schema in `lib/validation.ts`
4. Let sandbox regenerate types before using in frontend

## When Adding a Lambda Function
1. Create `amplify/functions/<name>/` directory
2. Define resource in `amplify/functions/<name>/resource.ts`
3. Implement handler in `amplify/functions/<name>/handler.ts`
4. Register in `amplify/backend.ts`
5. Use AWS SDK v3, Node.js 20 runtime

## When Modifying UI
1. Follow the design system (`DESIGN_SYSTEM.md`)
2. Use Tailwind classes from `tailwind.config.ts` — no custom CSS
3. Test in both light and dark mode
4. Test on mobile viewport (375px width minimum)

## Commit Practices
- Keep changes focused — one feature/fix per commit
- Test locally before committing
- Don't commit `.env.local`, `amplify_outputs.json`, or `node_modules`
- **ALWAYS run `npm run build` before pushing** — never push code that doesn't compile
- Run `getDiagnostics` on changed files, but also verify with a full build since diagnostics can miss JSX/runtime errors
