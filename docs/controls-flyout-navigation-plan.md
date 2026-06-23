# Controls Flyout Navigation Architecture

This document outlines the architectural plan to redesign the Controls section's navigation. The current category cards will be replaced with a modern, SaaS-style flyout menu system while preserving existing routes, backend logic, and functionality.

## 1. Top-Level Structure
The navigation will feature three main top-level items:
1. **Homepage**
2. **Cards**
3. **Footer**

## 2. Interaction & Behavior
- **Trigger Mechanisms**: Hovering or clicking a top-level item will trigger the flyout. Clicking an active item may toggle it off or keep it open depending on UX preference (standard click-to-toggle or hover-to-open).
- **Flyout Display**: The submenu will render as a floating overlay positioned directly beside the sidebar item.
- **Animations**: Utilizing `framer-motion` (already in the project stack), the flyout will feature a smooth fade-in and slide-in-from-left animation, mimicking modern SaaS interfaces (e.g., the ChatGPT "More" popup).
- **Active State Handling**: The flyout will keep the active child item highlighted, and the top-level parent will also display an active state when its corresponding child is selected.

## 3. Navigation Mapping
The current `controlSections` inside the massive `Dashboard.jsx` file will be remapped to this new hierarchy:

**Homepage**
- Site Logo (`activeControlSection === "site-logo"`)
- Landing Highlights (`activeControlSection === "landing-highlights"`)

**Cards**
- Destination Pages (`activeControlSection === "destination-pages"`)
- Visa Cards (Reserved for future/existing card controls)

**Footer**
- Footer Manager (`activeControlSection === "footer-social-icons"`)

## 4. UI Architecture & Components

To achieve this without changing backend logic or routes, the redesign will focus purely on the front-end rendering inside the Controls tab of `Dashboard.jsx`.

### A. Data Structure Update
Redefine the internal state mapping in `Dashboard.jsx` (or extract it to a constant) to match the new flyout groups:
```javascript
const FLYOUT_MENU_GROUPS = [
  {
    id: "homepage",
    label: "Homepage",
    icon: HomeIcon, // Example lucide-react icon
    items: [
      { key: "site-logo", label: "Site Logo" },
      { key: "landing-highlights", label: "Landing Highlights" }
    ]
  },
  // ... Cards, Footer
]
```

### B. The Flyout Navigation Component
We will introduce a new functional component (e.g., `ControlsFlyoutSidebar`) inside `Dashboard.jsx` (or adjacent to it) that:
1. Iterates over `FLYOUT_MENU_GROUPS`.
2. Uses relative/absolute positioning to anchor the submenus.
3. Uses `AnimatePresence` and `motion.div` from `framer-motion` for the fade-and-slide effect.
4. Uses `onMouseEnter`, `onMouseLeave`, and `onClick` handlers to manage the active flyout state.
5. Calls the existing `selectControlSection(key)` function to switch the active form on the right side.

### C. Layout Integration
The current `Dashboard.jsx` has a layout structure for the controls:
```jsx
// Before
<div className="flex gap-6">
   <ControlCategoriesSidebar />
   <ActiveControlForm />
</div>

// After
<div className="flex gap-6 relative">
   <ControlsFlyoutSidebar /> 
   <ActiveControlForm />
</div>
```
The right side (`ActiveControlForm`) remains completely untouched in terms of form logic, `saveSettings` functions, and state bindings. Only the left-side navigation UI is swapped out.

## 5. Constraints Addressed
- **No Route Changes**: The route remains `/:activeTab?` (`/controls`).
- **No Backend Changes**: APIs and payloads remain exactly the same.
- **Form Integrity**: The actual forms for "Site Logo", "Footer Manager", etc., are unchanged.
- **Modern UI**: The flyout will use the existing color variables (e.g., `bg-surface-2`, `border-border`, shadows) to match the premium dark theme.
