# Controls Migration Plan

After analysis is complete:

Create a migration strategy.

## Phase 1

Create new sidebar structure:

* Landing Page
* Cards
* Footer

Do not move content yet.

---

## Phase 2

Implement flyout submenu navigation.

Landing Page >
Site Logo
Blog
Landing Highlights

Cards >
Update Visa Type
Manage Visa Type
Update Length Of Stay
Update Entry
Update Validity
Update Processing Days
Fees Section
How It Works
Document Required
Why Book Now
Whats Included
FAQ

Footer >
Static Pages
Footer Control

---

## Phase 3

Connect submenu items to existing forms.

Reuse existing components whenever possible.

Do not rebuild existing forms.

---

## Phase 4

Verify that every old control has been migrated.

Generate:

docs/controls-migration-report.md

Include:

* Migrated Items
* Remaining Items
* Unmapped Items

---

## Critical Rules

* Do not delete Controls page.
* Do not delete existing sections.
* Do not create duplicate forms.
* Reuse existing components.
* Preserve backend logic.
* Preserve routes.
* Preserve database integrations.

Only reorganize navigation and UI structure.
