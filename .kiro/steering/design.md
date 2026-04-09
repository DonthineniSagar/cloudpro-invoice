# UI & Design Principles

## Design System
- See `DESIGN_SYSTEM.md` for full reference
- Brand: Modern, Professional, Trustworthy, Efficient
- Font: Inter (300–800 weights)

## Color Usage
- Primary actions (buttons, links, active states): `primary-600` / `primary-500`
- Secondary/accent: `secondary-500` (purple)
- Success states: `success-500` (green)
- Warnings: `warning-500` (amber)
- Errors/destructive: `error-500` (red)
- Dark mode: use slate/black backgrounds with purple accents

## Component Patterns
- Buttons: rounded-lg, font-medium, consistent padding (px-4 py-2 for default, px-6 py-3 for large)
- Cards: rounded-xl with subtle shadow, white bg (dark: slate-900/black with border)
- Forms: labeled inputs with error messages below, consistent spacing (space-y-4)
- Tables: clean headers, hover rows, responsive (stack on mobile)
- Status badges: colored pills with appropriate semantic colors
- Loading: use `<Skeleton />` component from `@/components/Skeleton`
- Empty states: illustration + message + CTA button

## Dark Mode
- Every UI element must work in both light and dark mode
- Read theme from `useTheme()` hook: `const { theme } = useTheme(); const dark = theme === 'dark';`
- Pattern: `className={dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`
- Dark backgrounds: `bg-black`, `bg-slate-900`, `bg-slate-800`
- Dark borders: `border-purple-500/30`, `border-slate-700`
- Dark text: `text-white`, `text-slate-300`, `text-slate-400`

## Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Max content width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Stack layouts on mobile, side-by-side on desktop
- Navigation collapses to hamburger menu on mobile

## Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML (button, nav, main, section, etc.)
- Images require alt text
- Form inputs require labels
- Color is never the only indicator of state
