# Skill: UX & Component Architecture Specification

## Objective
Analyze the requested feature or screen and generate a comprehensive UI/UX architecture specification under `.agents/artifacts/UX_Design_Spec.md`.

## Delivery Framework

1. **Design Tokens & Theme Contract**:
   - **Color Palette**: Primary, Surface, Neutral, Status (Success, Warning, Error, Destructive) in Dark & Light modes with exact HEX and CSS variables / Tailwind tokens.
   - **Typography Hierarchy**: Font families (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`), font weights (400, 500, 600, 700, 800), and line heights.
   - **Spacing & Grid Scale**: 8pt grid system, container max-widths, responsive breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`).

2. **Component Hierarchy & Tree (Atomic Design)**:
   - **Atoms**: Buttons, text inputs, badges, pulse dots, icons, tooltips.
   - **Molecules**: Form groups, modal headers, card titles, stat ribbons, table cells.
   - **Organisms**: Data tables, navigation bars, command sidebars, causal DAG graphs, dashboard grids.
   - Define the Props / Interface contract for each component.

3. **State Matrix (6 Essential States)**:
   - For every interactive component or view, explicitly define:
     - `Idle / Default`: Pristine ready state.
     - `Hover / Focus-Visible`: Accessible visual feedback and elevation.
     - `Active / Pressed`: Click state and tactile response.
     - `Loading / Skeleton`: Shimmer effect and non-blocking placeholder.
     - `Empty State`: Informative icon + descriptive copy + primary CTA button.
     - `Error State`: Inline validation message + crimson border + shake/feedback animation.

4. **User Flows & Micro-Interactions**:
   - Modal opening/closing physics, toast notification triggers, smooth transitions, and keyboard accessibility (`ESC`, `Tab`, `Enter`).

## Action
After saving the specification to `.agents/artifacts/UX_Design_Spec.md`, summarize the UI hierarchy in chat and ask the user:
**"Do you approve of the design system and component tree?"** and pause for approval.
