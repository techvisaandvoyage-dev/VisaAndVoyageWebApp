# Admin Nested Navigation Organization

This document explains the UI-only organization process used for nested Admin Dashboard navigation.

## Goal

The old admin navigation showed related controls as flat items. The new structure groups those controls under clear parent-child hierarchies so admins can understand where each control belongs.

## Sidebar Structure

The admin sidebar displays the `Header` section as a nested tree:

```text
Header
  Navbar
    Site Logo
    Blog
    Register Page
```

The `Body` section follows the same nested tree pattern:

```text
Body
  Hero
    Landing Highlights
  Section Cards
    Visa Details and Fee Manager
      Visa Details Management
      Fee Update Manager
    Card Content Details
      How it works
      Why book now?
      What's included
      FAQs
      Visa Requirements
  Travel Details
    Document Upload Methods
```

Important behavior:

- `Header` and `Body` are parent sidebar items.
- Nested groups are expandable/collapsible.
- Leaf items remain section links.
- Existing routes and section keys are preserved.
- This is a display/navigation change only.

## Right Content Tabs

Inside the Header controls page, the right content area uses a matching nested tab structure:

```text
Navbar
  Site Logo
  Blog Manager
  Register Page
```

Inside the Body controls page, the right content area uses:

```text
Hero
  Landing Highlights
Section Cards
  Visa Details and Fee Manager
    Visa Details Management
    Fee Update Manager
  Card Content Details
    How it works
    Why book now?
    What's included
    FAQs
    Visa Requirements
Travel Details
  Document Upload Methods
```

Behavior:

- Initial state shows parent tabs only.
- Clicking a parent tab expands the child tabs.
- Clicking the same parent again collapses the child tabs.
- Child tabs continue to render their existing control panels.
- Existing section keys and functionality are unchanged.

## Route And Section Mapping

No routes were changed. Header section navigation is still based on `/landing-page` with query params:

```text
/landing-page?section=site-logo
/landing-page?section=blog-manager
/landing-page?section=register-page
```

Body section navigation uses the existing `/cards` route with query params:

```text
/cards?section=landing-highlights
/cards?section=visa-details-table
/cards?section=fee-update-manager
/cards?section=how-it-works
/cards?section=why-book-now
/cards?section=whats-included
/cards?section=faqs
/cards?section=visa-requirements
/cards?section=upload-methods
```

## Files Involved

### Sidebar Navigation

```text
admin/src/components/layout/Sidebar.jsx
```

Owns:

- Sidebar menu hierarchy.
- Expand/collapse behavior for the sidebar tree.
- Active child highlighting.
- Collapsed-sidebar flyout behavior.
- Header and Body nested sidebar labels.

### Admin Menu Labels

```text
admin/src/constants/adminMenu.js
```

Owns:

- Shared admin tab labels.
- `Landing Page` was renamed to `Header` for display consistency.
- `Cards` was renamed to `Body` for display consistency.

### Right Content Tabs

```text
admin/src/pages/Dashboard.jsx
```

Owns:

- Header and Body control group metadata.
- Right content tab rendering.
- Expandable parent tabs.
- Child tabs that continue to render existing control panels.

## Implementation Rules Followed

- No folder structure changes.
- No file renames.
- No component renames.
- No API changes.
- No database changes.
- No route changes.
- Existing section behavior was reused.
- Only UI navigation structure and labels were updated.

## Mental Model

Think of the sidebar as the main navigation tree:

```text
Header -> Navbar -> Header controls
Body -> Body groups -> Body controls
```

Think of the right content tabs as local navigation trees:

```text
Parent tab -> nested group -> individual editable control
```

This keeps the Admin Dashboard easier to scan without changing how the underlying controls work.
