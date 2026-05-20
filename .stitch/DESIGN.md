---
name: HouseMate Harmony
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#424754'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed01b'
  on-secondary-container: '#6f5900'
  tertiary: '#006b2d'
  on-tertiary: '#ffffff'
  tertiary-container: '#00873b'
  on-tertiary-container: '#f7fff3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

The design system for this product is built on a narrative of **shared living, simplified.** It balances the professional reliability required for financial management with a playful, gamified energy that makes household chores feel rewarding rather than burdensome.

The visual style is **Soft-Modernism with Glassmorphism accents**. It utilizes high-quality whitespace to ensure the interface never feels cluttered, even when tracking complex shared expenses. The aesthetic is defined by:
- **Friendly Professionalism:** A clean, systematic foundation that uses vibrant color pops to drive engagement.
- **Visual Tiering:** Functional utility areas (settings, lists) use a flat, clean approach, while emotional centers (financials, gamification) utilize glassmorphism and tactile elements.
- **Optimism:** An interface that celebrates "success" states through color and shape, fostering a positive living environment.

## Colors

The palette is designed to trigger specific emotional responses across different household activities:

- **Harmony Blue (Primary):** Used for navigation, primary actions, and core branding. It represents the foundation of trust between roommates.
- **XP Gold (Secondary):** Reserved exclusively for gamification, rewards, and the "Chore Leaderboard." It creates a high-contrast visual "ping" for achievement.
- **Success Green & Warning Orange:** Functional colors for the financial ledger. Green indicates "Settle Up" completion, while Orange signals pending bills or overdue tasks.
- **Neutral Slate:** A sophisticated range of greys used for typography and subtle borders to prevent the "vibrant" colors from becoming overwhelming.

## Typography

This design system uses a dual-font strategy to balance personality with extreme legibility.

- **Plus Jakarta Sans** is the headline face. Its soft curves and modern geometric construction provide the "playful" spark requested. It is used for page titles, card headers, and large numeric displays (like "Total Balance").
- **Inter** is the workhorse for body text and functional labels. Its high x-height and neutral tone ensure that expense descriptions and chore details are readable at small sizes.

Large display titles should use tighter letter spacing to feel more "designed," while labels use increased letter spacing for clarity in dense information environments.

## Layout & Spacing

The layout philosophy follows a **Fluid-to-Fixed model** with a heavy emphasis on "Generous Breathability." 

- **Grid:** A 12-column grid on desktop and a 4-column grid on mobile. 
- **The "Spreadsheet Antidote":** To avoid the look of a traditional finance app, we use wide `md` (24px) gutters and `lg` (40px) vertical spacing between sections.
- **Card-Centricity:** Information is grouped into cards that span 4, 6, or 12 columns. On mobile, all cards reflow to full width with 16px side margins.
- **Content Stacking:** Related items (like a list of chores) should use "tight" spacing (`sm`), whereas separate functional blocks (Chore List vs. Grocery List) should use "loose" spacing (`lg`).

## Elevation & Depth

Visual hierarchy is established through a mix of tonal layering and physical metaphors:

1.  **Level 0 (Base):** A very light neutral background (#F8FAFC) to provide contrast for white cards.
2.  **Level 1 (Cards):** Pure white surfaces with a soft, diffused shadow (15% opacity, 20px blur) to suggest they are "floating" and interactive.
3.  **Level 2 (Glassmorphism):** Used exclusively for financial summary widgets. These elements feature a semi-transparent white background (60% opacity) with a 12px backdrop blur. This differentiates "Passive Info" from "Active Interactive Cards."
4.  **Level 3 (Active State):** When a card or button is pressed, it uses a subtle inner shadow to feel "pressed" into the interface.

## Shapes

The shape language is consistently "Friendly Geometric." 

- **Standard Elements:** Buttons, cards, and input fields use the `rounded-md` (0.5rem) setting.
- **Gamified Elements:** Progress bars, XP badges, and "Chore Completed" buttons use the `rounded-xl` (1.5rem) setting to feel softer and more toy-like.
- **Interactive Badges:** Status tags (e.g., "Paid," "Pending") use a full pill shape for instant recognition.

## Components

### Buttons
- **Primary:** Harmony Blue background, white text, bold weight. Use a slight scale-up effect on hover.
- **Secondary/Ghost:** Harmony Blue outline with a transparent base. For secondary household actions.
- **Chore CTA:** Extra-rounded (1.5rem) with a subtle gradient of Harmony Blue to feel "inviting."

### Cards
- **Financial Cards:** Feature a subtle 1px border (#E2E8F0) and the Glassmorphism effect described in Section 5.
- **Chore Cards:** Use "XP Gold" accents for icons and a thicker 4px bottom border to feel more substantial and tactile.

### Form Inputs
- Large, 56px height for mobile accessibility.
- Focus state uses a 2px Harmony Blue ring with 20% opacity.

### Progress & Gamification
- **XP Bars:** Thick, rounded tracks with a "Success Green" or "XP Gold" fill.
- **Leaderboard Avatars:** Always circular with a 2px "Status Ring" indicating if the roommate is "On Track" or "Behind."

### Status Badges
- High-contrast, small caps typography. Backgrounds are low-opacity versions of the status color (e.g., 10% Success Green background with 100% Success Green text).

---

## Tailwind / shadcn mapping

| Design token | CSS variable | Tailwind / shadcn |
|--------------|--------------|-------------------|
| `primary` | `--primary` | `bg-primary`, `text-primary` |
| `on-primary` | `--primary-foreground` | shadcn foreground on primary |
| `primary-container` | `--primary-container` | accent containers |
| `secondary` | `--secondary` | XP gold accents |
| `secondary-container` | `--secondary-container` | gamification badges |
| `tertiary` | `--tertiary` | success / settle-up |
| `background` | `--background` | page background |
| `on-background` | `--foreground` | body text |
| `surface-container` | `--card` | card backgrounds |
| `outline` | `--border` | borders |
| `error` | `--destructive` | error states |
| `rounded.DEFAULT` | `--radius` | `0.5rem` base radius |
| `rounded.xl` | `--radius-xl` | `1.5rem` gamified CTAs |

### Utility classes

- `.glass-card` — `bg-white/60 backdrop-blur-md border border-outline-variant/30`
- `.shadow-card` — `shadow-[0_8px_24px_rgba(11,28,48,0.08)]`
- `.btn-press` — `active:scale-[0.98] transition-transform duration-150`
