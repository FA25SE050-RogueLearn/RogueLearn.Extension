# RogueLearn Admin Dashboard - Design System

## Project Identity
**Name**: RogueLearn Admin Dashboard  
**Theme**: Minimalist RPG Roguelike with Dark Fantasy Aesthetics  
**Inspiration**: Baldur's Gate 3 meets Modern Admin Interfaces  
**Framework**: Next.js 15 + shadcn/ui + Tailwind CSS

---

## Design Philosophy

### Core Principles
1. **Minimal First** - Start with clean shadcn defaults, add RPG flourishes sparingly
2. **Functional Elegance** - Every visual element serves a purpose
3. **Readable & Accessible** - Dark mode optimized with sufficient contrast
4. **RPG Identity** - Subtle fantasy elements that don't overpower usability
5. **Consistent Hierarchy** - Clear visual structure using typography and spacing

### Visual Balance
- **70% Clean** - Standard shadcn components, minimal styling
- **20% RPG Texture** - Parchment backgrounds, stone textures, aged paper effects
- **10% Fantasy Accent** - Glowing borders, runes, mystical highlights

---

## Color System

### Brand Colors
```css
/* Primary Brand Pink */
--primary-pink: #d23187;         /* Main accent color */
--primary-pink-hover: #b82771;   /* Darker hover state */

/* RPG Gold Accents */
--rpg-gold: hsl(45, 90%, 58%);           /* Warm gold */
--rpg-gold-light: hsl(45, 100%, 65%);    /* Light gold highlights */
--rpg-gold-dark: hsl(45, 80%, 45%);      /* Deep gold shadows */
```

### Base Theme (Dark Mode)
```css
/* Background Layers */
--background: hsl(30, 25%, 13%);         /* Deep warm brown base */
--foreground: hsl(0, 0%, 98%);           /* Near white text */

/* Muted Elements */
--muted: hsl(30, 20%, 20%);              /* Darker brown for cards */
--muted-foreground: hsl(0, 0%, 65%);     /* Medium gray text */

/* Borders & Dividers */
--border: hsl(30, 15%, 25%);             /* Subtle brown border */

/* Card Backgrounds */
--card: hsl(30, 22%, 16%);               /* Slightly lighter than background */
--card-foreground: hsl(0, 0%, 98%);      /* Text on cards */

/* Accents */
--accent: hsl(330, 65%, 51%);            /* Pink accent (matches #d23187) */
--accent-foreground: hsl(0, 0%, 100%);   /* White text on accent */

/* Secondary States */
--secondary: hsl(30, 20%, 22%);          /* Hover/active states */
--secondary-foreground: hsl(0, 0%, 98%); /* Text on secondary */
```

### Semantic Colors
```css
/* Status Colors */
--success: hsl(142, 70%, 45%);           /* Green - approved, completed */
--warning: hsl(45, 95%, 60%);            /* Yellow - pending, needs attention */
--error: hsl(0, 70%, 50%);               /* Red - rejected, error */
--info: hsl(200, 90%, 55%);              /* Blue - informational */

/* RPG-Specific */
--parchment: hsl(40, 35%, 85%);          /* Light parchment for contrast */
--stone: hsl(30, 10%, 35%);              /* Stone gray for textures */
--mystical-glow: hsl(280, 80%, 65%);     /* Purple glow for magic elements */
```

---

## Typography System

### Font Families
```css
/* Primary Font - Clean, Modern */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace for Code/Data */
font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;

/* Optional RPG Headers (if needed) */
font-family: 'Cinzel', 'Serif', Georgia, serif;
```

### Scale
```css
/* Headings */
--text-3xl: 30px / 36px (bold, tracking-tight)
--text-2xl: 24px / 30px (bold, tracking-tight)
--text-xl: 20px / 28px (semibold)
--text-lg: 18px / 26px (semibold)

/* Body */
--text-base: 16px / 24px (normal)
--text-sm: 14px / 20px (normal)
--text-xs: 12px / 16px (normal)

/* Tracking */
--tracking-tight: -0.025em (headings)
--tracking-normal: 0em (body)
--tracking-wide: 0.025em (labels)
```

---

## Component Patterns

### shadcn/ui Components Used
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Primary content containers
- `Button` - All interactive actions
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - Navigation within pages
- `Input`, `Label` - Form elements
- `Badge` - Status indicators

### Custom Component Additions

#### RPG Paper Card
```tsx
className="relative overflow-hidden rounded-lg border-2 border-amber-900/30 
  bg-gradient-to-br from-amber-50/10 via-orange-50/5 to-amber-100/10 
  backdrop-blur-sm shadow-lg 
  before:absolute before:inset-0 
  before:bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] 
  before:opacity-[0.03] before:mix-blend-overlay"
```

#### Glowing Border (Active States)
```tsx
className="border-2 border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
```

#### Stone Texture Background
```tsx
className="bg-gradient-to-br from-stone-900 to-stone-950 
  bg-[url('https://www.transparenttextures.com/patterns/45-degree-fabric-dark.png')]"
```

#### Parchment Alert Box
```tsx
className="border-2 border-amber-700/40 bg-amber-50/5 
  backdrop-blur-sm 
  shadow-[inset_0_1px_10px_rgba(251,191,36,0.1)]"
```

---

## Layout Structure

### Admin Layout
```
┌─────────────────────────────────────────────┐
│  Sidebar (240px)      │  Main Content       │
│                       │                     │
│  • Logo + Title       │  • Page Header      │
│  • Navigation         │  • Breadcrumbs      │
│    - Dashboard        │  • Content Cards    │
│    - Events           │  • Data Tables      │
│    - Content          │  • Forms            │
│    - Settings         │                     │
│                       │                     │
│  • RPG Decorations    │  • Footer/Actions   │
│    (subtle)           │                     │
└─────────────────────────────────────────────┘
```

### Spacing Scale
```css
/* Consistent spacing using Tailwind */
gap-2: 8px   (tight elements)
gap-4: 16px  (related items)
gap-6: 24px  (sections)
gap-8: 32px  (major sections)

/* Padding */
p-4: 16px   (card content)
p-6: 24px   (card headers, major containers)
p-8: 32px   (page containers)
```

---

## Interactive States

### Button States
```css
/* Default */
bg-primary text-primary-foreground

/* Hover */
hover:bg-primary/90

/* Active/Pressed */
active:scale-[0.98]

/* Disabled */
disabled:opacity-50 disabled:cursor-not-allowed

/* RPG Variant - Gold Button */
bg-gradient-to-b from-amber-600 to-amber-700
hover:from-amber-500 hover:to-amber-600
shadow-lg shadow-amber-900/50
```

### Card Hover States
```css
/* Minimal Hover */
hover:shadow-md transition-shadow

/* RPG Hover - Glow Effect */
hover:border-amber-500/50 
hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]
transition-all duration-300
```

### Link/Navigation States
```css
/* Default */
text-muted-foreground hover:text-foreground

/* Active */
bg-secondary text-foreground border-l-4 border-accent

/* RPG Active - Gold Highlight */
bg-amber-900/20 text-amber-400 border-l-4 border-amber-500
```

---

## Texture & Pattern Assets

### Online Resources Used
1. **Transparent Textures** (https://www.transparenttextures.com/)
   - `old-map.png` - Parchment cards
   - `45-degree-fabric-dark.png` - Subtle backgrounds
   - `dark-leather.png` - Sidebar texture

2. **Hero Patterns** (https://heropatterns.com/)
   - Custom geometric patterns for backgrounds

3. **Placeholder Images**
   - `https://images.unsplash.com/photo-[id]?w=400` - Event/content images
   - Use keywords: medieval, fantasy, rpg, dungeon, scroll, map

### Usage Guidelines
- **Opacity**: Keep textures at 3-5% opacity (`opacity-[0.03]`)
- **Blend Mode**: Use `mix-blend-overlay` or `mix-blend-soft-light`
- **Position**: Apply textures via `::before` pseudo-elements to avoid content interference
- **Performance**: Use CSS background patterns over images when possible

---

## Iconography

### Icon Library
**Lucide React** - Primary icon set (already in project)

### Common Icons
```tsx
import { 
  LayoutDashboard,  // Dashboard
  Calendar,         // Events
  Database,         // Content
  Settings,         // Settings
  CheckCircle,      // Approved
  XCircle,          // Rejected
  AlertCircle,      // Warning
  Sparkles,         // AI/Magic
  Sword,            // Combat/Competition (RPG)
  Trophy,           // Achievements
  Users,            // Guild/Team
  ChevronRight,     // Navigation arrows
} from "lucide-react";
```

### Icon Sizing
```css
h-4 w-4: 16px (inline text)
h-5 w-5: 20px (buttons, badges)
h-6 w-6: 24px (card headers)
h-8 w-8: 32px (feature icons)
h-12 w-12: 48px (hero icons)
```

---

## Animation Principles

### Micro-interactions
```css
/* Button Press */
active:scale-[0.98] transition-transform

/* Card Hover */
hover:-translate-y-1 transition-all duration-300

/* Glow Effect */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px rgba(251,191,36,0.5); }
  50% { box-shadow: 0 0 20px rgba(251,191,36,0.8); }
}
animation: glow 2s ease-in-out infinite;
```

### Page Transitions
- **None** - Keep admin interface snappy and instant
- **Loading States** - Use skeleton loaders or spinners, no elaborate animations

---

## Accessibility Standards

### Contrast Requirements
- **Normal Text**: Minimum 4.5:1 ratio
- **Large Text (18px+)**: Minimum 3:1 ratio
- **Interactive Elements**: Minimum 3:1 ratio for borders/focus states

### Focus States
```css
focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 
focus:ring-offset-background
```

### Screen Reader Support
- Use semantic HTML (`<nav>`, `<main>`, `<article>`)
- Include `aria-label` for icon-only buttons
- Maintain logical heading hierarchy (h1 → h2 → h3)

---

## Responsive Breakpoints

```css
/* Tailwind defaults */
sm: 640px   (mobile landscape)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (large desktop)
2xl: 1536px (ultra-wide)

/* Admin Layout Behavior */
< 768px: Sidebar collapses to hamburger menu
≥ 768px: Sidebar always visible (240px fixed width)
```

---

## Code Style Conventions

### Component Structure
```tsx
"use client"; // Only if using hooks/interactivity

import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PageName() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
          <p className="text-muted-foreground">Description</p>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Section</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Content here */}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
```

### Class Name Ordering
1. Layout (flex, grid, block)
2. Positioning (relative, absolute)
3. Sizing (w-, h-, p-, m-)
4. Typography (text-, font-)
5. Colors (bg-, text-, border-)
6. Effects (shadow-, rounded-, opacity-)
7. Responsive (sm:, md:, lg:)
8. States (hover:, focus:, active:)

### Example
```tsx
className="
  relative flex items-center gap-4 
  w-full p-6 
  text-lg font-semibold 
  bg-card text-foreground border-2 border-border 
  rounded-lg shadow-md 
  hover:bg-secondary hover:shadow-lg 
  transition-all duration-300
"
```

---

## File Structure

```
src/
├── app/
│   └── admin/
│       ├── page.tsx                 # Dashboard overview
│       ├── events/
│       │   ├── page.tsx            # Events list
│       │   └── [eventId]/
│       │       └── page.tsx        # Event detail
│       ├── content/
│       │   ├── page.tsx            # Content hub
│       │   ├── courses/
│       │   ├── games/
│       │   ├── problems/
│       │   └── ai-generator/
│       └── settings/
│           └── page.tsx
├── components/
│   ├── admin/
│   │   └── AdminSidebarNav.tsx    # Navigation component
│   ├── layout/
│   │   └── AdminLayout.tsx        # Main layout wrapper
│   └── ui/                        # shadcn components
│       ├── button.tsx
│       ├── card.tsx
│       ├── tabs.tsx
│       └── ...
└── lib/
    └── utils.ts                   # cn() utility
```

---

## Quick Reference - RPG Elements

### When to Use RPG Styling
✅ **DO USE:**
- Sidebar navigation (stone texture background)
- Important cards (parchment effect)
- Success/achievement states (gold glow)
- Headers for major sections (subtle flourishes)
- Alert boxes (aged paper look)

❌ **DON'T USE:**
- Form inputs (keep standard for usability)
- Data tables (readability priority)
- Small text or dense information
- Loading states or temporary UI
- Error messages (clarity over style)

### RPG Color Usage
```css
/* Primary Actions - Gold */
Approve buttons, success states, active navigation

/* Warnings - Amber */
Pending approvals, sync alerts, attention needed

/* Mystical - Purple/Pink */
AI features, special abilities, premium actions

/* Neutral - Stone/Brown */
Default states, backgrounds, borders
```

---

## Implementation Checklist

When creating new admin pages:
- [ ] Use `AdminLayout` wrapper
- [ ] Start with shadcn `Card` components
- [ ] Apply consistent spacing (`space-y-8` for sections)
- [ ] Use semantic color tokens (not hardcoded values)
- [ ] Add RPG textures only to major containers
- [ ] Keep text high-contrast for readability
- [ ] Test hover/focus states
- [ ] Ensure responsive behavior
- [ ] Include loading states
- [ ] Add proper TypeScript types

---

## Version History
- **v1.0** - Initial minimalist shadcn design (2025-01-29)
- **v1.1** - Added RPG roguelike elements (2025-01-29)
  - Parchment card backgrounds
  - Stone texture sidebar
  - Gold accent system
  - Mystical glow effects

---

## Resources & Links

- **shadcn/ui Docs**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev/
- **Color Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Transparent Textures**: https://www.transparenttextures.com/
- **Baldur's Gate 3 UI Reference**: (search for official game screenshots)

---

*This design system balances modern admin interface best practices with immersive RPG aesthetics. Prioritize usability over decoration when in doubt.*
