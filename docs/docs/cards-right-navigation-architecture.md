# Cards Right-Side Navigation Architecture

## Scope

Change only the right-side Controls content navigation.

Do not change:

* Main sidebar
* Sidebar labels
* Sidebar routes
* Backend
* Existing forms
* Existing APIs

---

## Goal

Replace the current confusing multi-row hierarchy with a clean 3-level navigation inside the right content area.

---

## Navigation Structure

### Level 1: Primary Controls Navigation

Display as one horizontal top navigation row:

* Landing Page
* Cards
* Footer

Active item uses blue underline or blue filled state.

---

### Level 2: Cards Groups

Show only when `Cards` is active.

Display as two equal group panels in one row:

1. Visa Details & Fee Manager
2. Card Content Details

---

### Level 3: Section Tabs

Inside **Visa Details & Fee Manager**:

* Visa Details Management
* Fee Update Manager

Inside **Card Content Details**:

* How it works
* Why book now?
* What's included
* FAQs
* Visa Requirements

Use compact pill tabs.

Only the selected tab is blue.

---

## Behaviour

* Clicking `Cards` opens both Level 2 groups and their Level 3 tabs.
* Clicking a Level 3 tab changes only the content panel below.
* No route change.
* No page reload.
* No sidebar change.
* Use state-based tab switching.
* Keep selected primary tab, group, and child tab active.
* Content below navigation renders the existing component for the selected child tab.

---

## Example State

```js
activePrimary = "cards"
activeGroup = "visa-details-fee"
activeTab = "visa-details-management"
```

---

## Layout Rules

* Breadcrumb: `Controls / Cards / [Active Tab]`
* One top primary navigation bar.
* Two grouped navigation cards below it.
* Avoid nested full-width blue bars.
* Do not use horizontal scrolling for normal desktop width.
* On smaller screens, allow grouped panels to stack vertically and tabs to wrap.
* Reuse existing components and functionality.
