# Controls Section Redesign Requirements

## Objective

Redesign the Controls section navigation without changing existing functionality.

Important:

* Do NOT remove the existing Controls page.
* Do NOT delete any existing sections.
* Do NOT remove any forms or settings.
* Existing functionality must continue to work.

The goal is only to reorganize the Controls navigation and move existing sections into a cleaner structure.

---

## New Navigation Structure

### Landing Page

Contains:

* Site Logo
* Blog
* Landing Highlights

---

### Cards

Contains:

* Update Visa Type
* Manage Visa Type
* Update Length Of Stay
* Update Entry
* Update Validity
* Update Processing Days
* Fees Section
* How It Works
* Document Required
* Why Book Now
* Whats Included
* FAQ

---

### Footer

Contains:

* Static Pages
* Footer Control

---

## Interaction Requirement

Navigation must use a flyout submenu.

Example:

Landing Page >

Cards >

Footer >

When user hovers or clicks a parent item, a floating submenu should appear beside the sidebar.

Example:

Landing Page >
Site Logo
Blog
Landing Highlights

Cards >
Update Visa Type
Manage Visa Type
Update Length Of Stay
...

Footer >
Static Pages
Footer Control

---

## Design Requirements

* Modern SaaS dashboard style
* Smooth fade animation
* Smooth slide animation
* Floating submenu panel
* Similar UX to ChatGPT sidebar popup menus
* Responsive behaviour
* Maintain existing design system

---

## Critical Requirement

Keep the existing Controls tab visible during migration.

Do not delete anything until every existing control has been mapped into the new structure.
