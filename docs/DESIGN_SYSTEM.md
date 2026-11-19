# Orbit Design System

This document defines the visual identity and UI engineering rules for **Orbit**. All UI components must strictly conform to these tokens and constraints.

---

## 1. Design Philosophy

- **Style:** Minimal, high-contrast, utility-first developer workspace.
- **Reference Aesthetic:** `nhatprx.com` — sharp geometry, restrained dark surfaces, crisp green accents, zero visual clutter.
- **Geometry:** **100% square borders (`0px` border radius)**. No soft/pill corners anywhere in the interface.
- **Density:** Optimized for long developer sessions across Git, Mail, and Document editors without eye strain.

---

## 2. Color Palette (Black + Green)

Orbit is **dark-first**. All surfaces are built from pure/near-black neutrals, separated by hairline `1px` borders, with green reserved for primary actions, active states, and semantic highlights.

| Token | Hex (Recommended) | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#050505` | App root background |
| `--bg-surface` | `#0A0A0A` | Sidebars, panels, cards, editors |
| `--bg-elevated` | `#111111` | Hover states, dropdowns, modals, active rows |
| `--border-subtle` | `#1F1F1F` | Default `1px solid` structural dividers |
| `--border-strong` | `#2E2E2E` | Focused inputs, active panel borders |
| `--text-primary` | `#F5F5F5` | Headings, primary body text |
| `--text-secondary` | `#A3A3A3` | Metadata, timestamps, secondary labels |
| `--text-muted` | `#666666` | Placeholders, disabled text |
| `--accent-primary` | `#22C55E` | Primary CTA, active nav indicator, focus ring |
| `--accent-bright` | `#4ADE80` | Hover on primary CTA, key metrics |
| `--accent-dim` | `#052E16` | Subtle green tinted backgrounds (selected row, badges) |
| `--status-danger` | `#EF4444` | Destructive actions, git deletions, errors |
| `--status-warning` | `#EAB308` | Warnings, pending checks |

### Color Usage Rules
- Never use gradients on buttons, cards, or backgrounds.
- Use `1px` solid borders (`--border-subtle`) instead of drop shadows to define hierarchy.
- Green (`--accent-primary`) should occupy **< 10%** of the viewport so it remains a sharp focal signal.

---

## 3. Typography

- **Primary UI Font:** **`Outfit`** (Google Fonts)
  - Load weights: `300`, `400`, `500`, `600`, `700`.
  - Apply `font-family: 'Outfit', sans-serif;` globally on `html, body`.
- **Monospace Font:** `JetBrains Mono` (fallback: `ui-monospace, SFMono-Regular, monospace`)
  - Permitted **only** for: code blocks, technical identifiers, and tabular numeric data where aligned columns are required.

### Type Scale
| Role | Size | Weight | Tracking |
| :--- | :--- | :--- | :--- |
| Page Title | `20px` (`text-xl`) | `600` | `-0.02em` |
| Section Header | `15px` (`text-sm` / `15px`) | `600` | `-0.01em` |
| Body / UI Default | `14px` (`text-sm`) | `400` | `0` |
| Compact / Table / Meta | `12px` (`text-xs`) | `400` / `500` | `0.01em` |

---

## 4. Borders & Elevation

- **Border Radius:** `0px` everywhere (`rounded-none` in Tailwind).
  - Applies to: buttons, inputs, textareas, cards, modals, context menus, tooltips, tabs, avatars/workspace icons, checkboxes, and scrollbars.
- **Shadows:** Avoid blurred drop shadows (`shadow-lg`, `shadow-xl`). Use `1px solid` borders and background contrast (`--bg-elevated`) for floating menus/modals.
- **Focus States:** `1px solid #22C55E` (or `outline: 1px solid #22C55E; outline-offset: -1px;`) — sharp and unmistakable.

---

## 5. Iconography & Zero-Emoji Policy

- **NO EMOJIS:** Emojis are strictly prohibited in all UI text, button labels, navigation items, status indicators, empty states, and mock content.
- **Approved Icon Library:** `lucide-react`
  - Default stroke width: `1.5` (`strokeWidth={1.5}`) for clean minimal lines.
  - Default sizes: `16px` (`w-4 h-4`) for inline/buttons, `18px` (`w-[18px] h-[18px]`) for sidebar navigation.
- **Status Indicators:** Use crisp `6px x 6px` square blocks (not circles, not emojis) with semantic colors (`#22C55E`, `#EAB308`, `#EF4444`).

---

## 6. Layout Architecture

- **App Shell:** Fixed left primary rail (workspace & module switcher) + collapsible secondary context sidebar + main workspace canvas.
- **Spacing Grid:** `4px` base unit (`4, 8, 12, 16, 24, 32`).
- **Responsive Target:** Desktop-first (`1280px+` optimal for IDE/Git/Sheets/Docs), cleanly adaptable down to `1024px` and mobile drawer navigation.
