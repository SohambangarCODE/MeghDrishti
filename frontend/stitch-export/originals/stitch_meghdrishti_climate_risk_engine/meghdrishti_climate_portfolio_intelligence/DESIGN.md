---
name: MeghDrishti Climate Portfolio Intelligence
colors:
  surface: '#fbf8fc'
  surface-dim: '#dcd9dd'
  surface-bright: '#fbf8fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2f7'
  surface-container: '#f0edf1'
  surface-container-high: '#eae7eb'
  surface-container-highest: '#e4e1e6'
  on-surface: '#1b1b1e'
  on-surface-variant: '#3f4947'
  inverse-surface: '#303033'
  inverse-on-surface: '#f3f0f4'
  outline: '#6f7977'
  outline-variant: '#bec9c6'
  surface-tint: '#216962'
  primary: '#1b645d'
  on-primary: '#ffffff'
  primary-container: '#397d76'
  on-primary-container: '#e0fffa'
  inverse-primary: '#8fd3ca'
  secondary: '#5e5e67'
  on-secondary: '#ffffff'
  secondary-container: '#e0dee9'
  on-secondary-container: '#62626b'
  tertiary: '#944100'
  on-tertiary: '#ffffff'
  tertiary-container: '#b8560d'
  on-tertiary-container: '#fff7f5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#abefe6'
  primary-fixed-dim: '#8fd3ca'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c7c5d0'
  on-secondary-fixed: '#1a1b23'
  on-secondary-fixed-variant: '#46464f'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#763300'
  background: '#fbf8fc'
  on-background: '#1b1b1e'
  surface-variant: '#e4e1e6'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: 0.02em
  tabular-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.02em
  tabular-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-lg: 1rem
  margin: 1rem
  margin-lg: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes an institutional-grade, high-density analytical interface built specifically for investment analysts, risk officers, and institutional fund managers evaluating climate physical risk and capital portfolio dependencies.

The aesthetic follows an **Architectural / Data-Dense Minimalist** philosophy:
- **Tone:** Objective, forensic, rigorously technical, unembellished.
- **Emotion:** Analytical clarity, institutional trust, calm command under complex systemic risk scenarios.
- **Visual Stance:** Zero decorative marketing treatments, no soft consumer gradients, and no opaque, unexplainable aggregate scores. The UI treats data provenance, graph traversals, and monetary exposures (expressed in INR Lakhs / Crores) as first-class citizens. Surfaces are treated like technical parchment: crisp hairline rules, disciplined tabular spacing, and quiet chromatic alerts.

## Colors

The palette is engineered for prolonged analytical sessions requiring prolonged visual endurance across high-information density displays:

- **Canvas & Surfaces:**
  - Background Canvas: `#FAFAFA` (zinc-neutral background preventing retina fatigue).
  - Primary Surface Panels: `#FFFFFF` (pure white surface providing maximum contrast against dark technical text).
  - Subdued Insets / Table Headers: `#F4F4F5` (whisper structural fill).

- **Typography & Structural Inks:**
  - Primary Text / Charcoal Ink: `#18181B` (deep neutral charcoal for primary values and labels).
  - Secondary Text / Muted Zinc: `#52525B` (subdued descriptive text and supporting axes).
  - Tertiary / Muted Meta: `#71717A` (metadata keys, units, secondary timestamps).
  - Hairline Rule / Whisper Border: `#E4E4E7` (subtle structural separation).
  - Structural Divider High-Contrast: `#D4D4D8`.

- **Chromatic Signals & Provenance Semantics:**
  - Primary Action / Teal Signal: `#397D76` (interactive triggers, selected nodes, active dependency paths).
  - Teal Signal Subtle (Tinted Ground): `#EDF5F4`.
  - Amber Warning / High Stress: `#B45309` (water stress thresholds, supply chain disruptions).
  - Crimson Critical: `#DC2626` (direct asset physical hazard exposure).
  - Emerald Verified: `#059669` (regulatory verified filings, audited reports).

- **Provenance Badge Semantics:**
  - *Dataset Reported:* Border `#A7F3D0`, Surface `#ECFDF5`, Text `#065F46`
  - *Sourced:* Border `#BAE6FD`, Surface `#F0F9FF`, Text `#0369A1`
  - *Synthetic:* Border `#DDD6FE`, Surface `#F5F3FF`, Text `#5B21B6`
  - *Assumed:* Border `#FED7AA`, Surface `#FFF7ED`, Text `#9A3412`
  - *Unknown:* Border `#E4E4E7`, Surface `#F4F4F5`, Text `#52525B`

## Typography

The typography uses a bifurcated hierarchy:
1. **Primary Interface & Structural Headings:** Built on `Geist` for rapid legibility, compact line heights, and neutral editorial rhythm. Headings do not exceed 24px desktop scale, maintaining high content density without consuming critical viewport space.
2. **Quantitative & Technical Data:** Built on `JetBrains Mono` (substituting Geist Mono) for currency values (`₹ Lakhs`, `₹ Cr`), asset LEI identifiers, GPS coordinates, geospatial bounding data, confidence intervals, and provenance tags. Tabular figures are enforced to ensure rigid vertical decimal alignment in multi-asset comparison matrices.

## Layout & Spacing

The workspace follows a 2:1 Split-Pane Analytical Layout for institutional desktop screens (≥1440px):
- **Primary Workspace (66.67% Width):** Dedicated to interactive topological dependency graphs, geospatial physical hazard maps, and multi-tier climate stress node visualizers.
- **Forensic Inspector Pane (33.33% Width):** Fixed-width contextual sidebar detailing node dependencies, financial exposure (direct vs. secondary tier), audit trails, and stress test scenarios.

### Breakpoints & Adaptations
- **Desktop Extra-Wide (≥1680px):** Fixed 220px Left Utility Rail (Portfolios, Scenarios, Filings), Fluid 2:1 Graph-to-Detail workspace.
- **Desktop Standard (1280px - 1679px):** 2:1 Graph-to-Detail pane ratio with collapsible 56px icon rail.
- **Laptop / Tablet Landscape (1024px - 1279px):** 50:50 side-by-side pane or tabbed graph/inspector toggle.
- **Tablet Portrait & Mobile (<1024px):** Vertically stacked layout. The graph panel locks to a 400px height viewport; the detail inspector transforms into an expandable bottom drawer.

Component gaps enforce a strict 4px base rhythm (`space-xs`: 4px, `space-sm`: 8px, `space-md`: 12px, `space-lg`: 16px, `space-xl`: 24px) to retain maximum data visibility without vertical bloating.

## Elevation & Depth

This design system avoids soft consumer drop shadows or faux-3D layering. Depth is communicated strictly via **Tonal Planar Stacking and Hairline Ghost Outlines**:

- **Ground Level (Base Canvas):** `#FAFAFA`. Houses canvas grid backgrounds, graph canvas nodes, and top-level navigation rails.
- **Surface Level 1 (Work Panels & Cards):** `#FFFFFF` paired with a sharp 1px solid border (`#E4E4E7`). No ambient shadow is applied during standard states.
- **Surface Level 2 (Inspection Drawers & Popovers):** `#FFFFFF` enclosed by a 1px solid border (`#D4D4D8`) with an ultra-subdued architectural contact shadow: `box-shadow: 0 1px 3px 0 rgba(24, 24, 27, 0.05), 0 4px 12px 0 rgba(24, 24, 27, 0.04)`.
- **Active Node / Interactive Focus:** Retains zero shadow elevation; instead, uses a 1px solid stroke in Teal Signal (`#397D76`) flanked by an outer 2px translucent focus ring (`rgba(57, 125, 118, 0.2)`).

## Shapes

The geometric framework is categorized as **Soft / Precision Engineering** (`roundedness: 1`):
- Standard control elements, inputs, buttons, and provenance chips use a tight `0.25rem` (4px) corner radius.
- Cards, modal containers, and workspace panels use `0.375rem` (6px) up to a maximum of `0.5rem` (8px).
- Graph nodes and interactive data pill markers maintain rectangular or micro-beveled forms to reinforce systematic, quantitative precision. Circular geometry is reserved strictly for status presence indicators (e.g., 6px operational indicator dots).

## Components

### 1. Action Triggers & Buttons
- **Primary Action:** Solid Teal Signal (`#397D76`) background, text `#FFFFFF`, border `1px solid transparent`. Height: 32px (compact) or 36px (standard). Padding: 8px 12px. Font: Geist Body Medium (13px, weight 500). Hover: `#2E6560`. Focus: 2px offset ring in `#397D76`.
- **Secondary / Outline:** Background `#FFFFFF`, text `#18181B`, border `1px solid #E4E4E7`. Hover: `#F4F4F5`, border `#D4D4D8`.
- **Tertiary Ghost:** Background `transparent`, text `#52525B`. Hover: `#F4F4F5`, text `#18181B`.

### 2. Provenance Badges & Micro Chips
Badges use `JetBrains Mono` at 10px (`label-xs`), uppercase tracking, 2px vertical / 6px horizontal padding, and a 4px corner radius:
- **Dataset Reported:** Background `#ECFDF5`, Border `#A7F3D0`, Text `#065F46`
- **Sourced:** Background `#F0F9FF`, Border `#BAE6FD`, Text `#0369A1`
- **Synthetic:** Background `#F5F3FF`, Border `#DDD6FE`, Text `#5B21B6`
- **Assumed:** Background `#FFF7ED`, Border `#FED7AA`, Text `#9A3412`
- **Unknown:** Background `#F4F4F5`, Border `#E4E4E7`, Text `#52525B`

### 3. Data Tables & Portfolio Matrices
- **Table Container:** Pure white background, `1px solid #E4E4E7` outer frame.
- **Header Row:** Background `#FAFAFA`, height 32px, text `#71717A` (11px Mono, uppercase, weight 500), border bottom `1px solid #E4E4E7`.
- **Data Rows:** Height 36px, border bottom `1px solid #F4F4F5`. Hover state: `#FAFAFA`.
- **Numeric Cells:** Right-aligned `JetBrains Mono` tabular text with explicit currency indicators (`₹ 450.00 L` or `₹ 12.80 Cr`).

### 4. Form Inputs & Metric Sliders
- **Text Inputs:** Height 32px, background `#FFFFFF`, border `1px solid #E4E4E7`, text `#18181B` (13px Geist). Placeholder: `#A1A1AA`. Active/Focus: Border `#397D76`, outline `2px solid rgba(57, 125, 118, 0.15)`.
- **Scenario Stress Slider:** Track height 4px in `#E4E4E7`, filled path `#397D76`. Slider thumb: 14px circle, background `#FFFFFF`, border `2px solid #397D76`.

### 5. Dependency Graph Nodes & Canvas Connectors
- **Entity Node:** `#FFFFFF` fill, 1px border `#E4E4E7`, min-width 180px, padding 8px 12px. Displays Entity Name (Geist 12px bold), Sector (Geist 11px muted), and Exposure in INR Lakhs (Mono 12px).
- **Affected Path Edge:** Non-affected edges render in `#E4E4E7` with 1px width. Affected/stressed paths render in Teal Signal `#397D76` (or Amber `#B45309` if direct hazard risk) with 2px stroke width and directed chevron indicators.