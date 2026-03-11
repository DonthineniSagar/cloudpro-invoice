# CloudPro Design System v2.0

## 🎨 Brand Identity Refresh

### Current Issues
- Battle green (#4c6a52) feels outdated and corporate
- Dashed borders everywhere create visual clutter
- Inconsistent spacing and typography
- No clear visual hierarchy
- Generic branding with no personality

### New Brand Direction
**Modern, Professional, Trustworthy, Efficient**

---

## Color Palette

### Primary Colors
```css
/* Indigo - Primary Brand Color */
--primary-50: #EEF2FF;
--primary-100: #E0E7FF;
--primary-200: #C7D2FE;
--primary-300: #A5B4FC;
--primary-400: #818CF8;
--primary-500: #6366F1; /* Main */
--primary-600: #4F46E5;
--primary-700: #4338CA;
--primary-800: #3730A3;
--primary-900: #312E81;
--primary-950: #1E1B4B;
```

### Secondary Colors
```css
/* Purple - Accent & CTAs */
--secondary-50: #FAF5FF;
--secondary-100: #F3E8FF;
--secondary-200: #E9D5FF;
--secondary-300: #D8B4FE;
--secondary-400: #C084FC;
--secondary-500: #A855F7; /* Main */
--secondary-600: #9333EA;
--secondary-700: #7E22CE;
--secondary-800: #6B21A8;
--secondary-900: #581C87;
```

### Success, Warning, Error
```css
/* Success - Green */
--success-500: #10B981;
--success-600: #059669;

/* Warning - Amber */
--warning-500: #F59E0B;
--warning-600: #D97706;

/* Error - Red */
--error-500: #EF4444;
--error-600: #DC2626;

/* Info - Blue */
--info-500: #3B82F6;
--info-600: #2563EB;
```

### Neutral Colors
```css
/* Modern Gray Scale */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
--gray-950: #030712;
```

### Background & Surface
```css
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;
--surface: #FFFFFF;
--surface-elevated: #FFFFFF;
```

---

## Typography

### Font Families
```css
/* Primary - Inter (clean, modern, professional) */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Headings - Cal Sans (optional, for impact) */
--font-display: 'Cal Sans', 'Inter', sans-serif;

/* Monospace - JetBrains Mono */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
```css
/* Headings */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */
--text-6xl: 3.75rem;     /* 60px */

/* Line Heights */
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

---

## Spacing System

### Base Unit: 4px
```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

---

## Border Radius

```css
--radius-none: 0;
--radius-sm: 0.25rem;    /* 4px */
--radius-base: 0.5rem;   /* 8px */
--radius-md: 0.75rem;    /* 12px */
--radius-lg: 1rem;       /* 16px */
--radius-xl: 1.5rem;     /* 24px */
--radius-2xl: 2rem;      /* 32px */
--radius-full: 9999px;
```

---

## Shadows

```css
/* Subtle elevation */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-base: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

/* Colored shadows for emphasis */
--shadow-primary: 0 10px 15px -3px rgb(99 102 241 / 0.2);
--shadow-success: 0 10px 15px -3px rgb(16 185 129 / 0.2);
--shadow-error: 0 10px 15px -3px rgb(239 68 68 / 0.2);
```

---

## Component Patterns

### Buttons

#### Primary Button
```tsx
<button className="
  px-6 py-3 
  bg-primary-600 hover:bg-primary-700 
  text-white font-medium 
  rounded-lg 
  shadow-sm hover:shadow-md 
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
">
  Create Invoice
</button>
```

#### Secondary Button
```tsx
<button className="
  px-6 py-3 
  bg-white hover:bg-gray-50 
  text-gray-700 font-medium 
  border border-gray-300 
  rounded-lg 
  shadow-sm hover:shadow 
  transition-all duration-200
">
  Cancel
</button>
```

#### Ghost Button
```tsx
<button className="
  px-4 py-2 
  text-gray-700 hover:text-gray-900 
  hover:bg-gray-100 
  rounded-lg 
  transition-colors duration-200
">
  View Details
</button>
```

### Cards

#### Standard Card
```tsx
<div className="
  bg-white 
  rounded-xl 
  shadow-sm hover:shadow-md 
  border border-gray-200 
  p-6 
  transition-shadow duration-200
">
  {/* Content */}
</div>
```

#### Elevated Card
```tsx
<div className="
  bg-white 
  rounded-2xl 
  shadow-lg 
  p-8
">
  {/* Content */}
</div>
```

### Inputs

#### Text Input
```tsx
<input className="
  w-full 
  px-4 py-3 
  bg-white 
  border border-gray-300 
  rounded-lg 
  text-gray-900 
  placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
  transition-all duration-200
" />
```

#### Select
```tsx
<select className="
  w-full 
  px-4 py-3 
  bg-white 
  border border-gray-300 
  rounded-lg 
  text-gray-900
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
  transition-all duration-200
">
  {/* Options */}
</select>
```

### Badges

```tsx
{/* Status Badges */}
<span className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-sm font-medium">
  Paid
</span>

<span className="px-3 py-1 bg-warning-100 text-warning-700 rounded-full text-sm font-medium">
  Pending
</span>

<span className="px-3 py-1 bg-error-100 text-error-700 rounded-full text-sm font-medium">
  Overdue
</span>

<span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
  Draft
</span>
```

---

## Layout Patterns

### Dashboard Layout
```tsx
<div className="min-h-screen bg-gray-50">
  {/* Sidebar */}
  <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
    {/* Navigation */}
  </aside>
  
  {/* Main Content */}
  <main className="ml-64 p-8">
    {/* Page Header */}
    <header className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600 mt-1">Welcome back, here's what's happening</p>
    </header>
    
    {/* Content Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Cards */}
    </div>
  </main>
</div>
```

### Form Layout
```tsx
<form className="max-w-2xl mx-auto space-y-6">
  {/* Form Section */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h2>
    
    <div className="space-y-4">
      {/* Form Fields */}
    </div>
  </div>
  
  {/* Actions */}
  <div className="flex justify-end gap-3">
    <button type="button" className="secondary-button">Cancel</button>
    <button type="submit" className="primary-button">Save Client</button>
  </div>
</form>
```

---

## Animation & Transitions

### Timing Functions
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Durations
```css
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;
```

### Common Animations
```tsx
{/* Fade In */}
<div className="animate-in fade-in duration-200">

{/* Slide In */}
<div className="animate-in slide-in-from-bottom duration-300">

{/* Scale In */}
<div className="animate-in zoom-in duration-200">
```

---

## Iconography

### Icon Library: Lucide React
- Consistent stroke width (2px)
- 24x24 default size
- Rounded corners
- Modern, minimal style

### Usage
```tsx
import { FileText, Users, TrendingUp, DollarSign } from 'lucide-react';

<FileText className="w-5 h-5 text-gray-600" />
```

---

## Responsive Breakpoints

```css
/* Mobile First */
--screen-sm: 640px;   /* Small devices */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Laptops */
--screen-xl: 1280px;  /* Desktops */
--screen-2xl: 1536px; /* Large screens */
```

---

## Dark Mode Support

### Color Adjustments
```css
@media (prefers-color-scheme: dark) {
  --bg-primary: #111827;
  --bg-secondary: #1F2937;
  --surface: #1F2937;
  --text-primary: #F9FAFB;
  --text-secondary: #D1D5DB;
  --border: #374151;
}
```

---

## Accessibility

### Focus States
- Always visible focus rings
- 2px ring with offset
- High contrast colors
- Keyboard navigation support

### Color Contrast
- WCAG AA minimum (4.5:1 for normal text)
- WCAG AAA preferred (7:1 for normal text)
- Test all color combinations

### Screen Reader Support
- Semantic HTML
- ARIA labels where needed
- Skip navigation links
- Descriptive alt text

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Install Inter font
- [ ] Update Tailwind config with new colors
- [ ] Create design token CSS variables
- [ ] Update global styles

### Phase 2: Components (Week 3-4)
- [ ] Update Button component
- [ ] Update Card component
- [ ] Update Input components
- [ ] Update Badge component
- [ ] Create new component variants

### Phase 3: Layouts (Week 5-6)
- [ ] Redesign dashboard layout
- [ ] Update navigation
- [ ] Improve form layouts
- [ ] Add responsive improvements

### Phase 4: Pages (Week 7-8)
- [ ] Redesign landing page
- [ ] Update dashboard
- [ ] Refresh invoice pages
- [ ] Update client pages
- [ ] Improve settings pages

### Phase 5: Polish (Week 9-10)
- [ ] Add animations
- [ ] Implement dark mode
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] User testing

---

## Design Resources

### Figma File Structure
```
📁 CloudPro Design System
  📁 Foundation
    - Colors
    - Typography
    - Spacing
    - Shadows
  📁 Components
    - Buttons
    - Inputs
    - Cards
    - Badges
    - Navigation
  📁 Patterns
    - Forms
    - Tables
    - Modals
    - Dashboards
  📁 Pages
    - Landing
    - Dashboard
    - Invoices
    - Clients
```

### Tools
- Figma for design
- Storybook for component documentation
- Chromatic for visual testing
- Accessibility Insights for a11y testing

---

## Success Metrics

### Design Quality
- Lighthouse Design score > 95
- Accessibility score (WCAG AA)
- Consistent component usage > 90%
- Design token adoption 100%

### User Experience
- Task completion time reduced by 30%
- User satisfaction score > 4.5/5
- Mobile usability score > 90
- Reduced support tickets for UI issues

### Performance
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Cumulative Layout Shift < 0.1
- Bundle size reduction by 20%

---

**Version:** 2.0  
**Last Updated:** 2026-03-11  
**Status:** Proposal
