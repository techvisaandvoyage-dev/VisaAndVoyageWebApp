# Current Controls Analysis Report

This document analyzes the current implementation of the Admin Controls section and maps out the existing components, forms, and routes against the newly proposed flyout navigation structure.

## Existing Navigation

The current controls navigation relies on a left-side `<aside>` list rendered within `Dashboard.jsx`. The existing top-level categories are:
1. **Website Content**
2. **Documents**
3. **Fees**
4. **Visa Settings**
5. **Authentication & OTP**
6. **System / Display**

Additionally, some items planned for the new Controls structure currently exist as entirely separate top-level global dashboard navigation items (managed via `Sidebar.jsx`):
- **Blog** (`/blogs`)
- **Website Content / Static Pages** (`/pages`)

## Existing Forms

Every control form currently available within the application:

**Website Content (Controls Tab)**
- Site Logo
- Landing Highlights
- Destination pages (all countries)
  - Sub-tabs: Why book now?, What's included, How it works, FAQs, Visa Requirements
- Footer Manager

**Documents (Controls Tab)**
- Document Upload Methods
- Documents Required (global)
- Optional Documents Catalog (global)

**Fees (Controls Tab)**
- Update Service Fee (universal)
- Update Government Fee (universal)
- Fee Update Manager

**Visa Settings (Controls Tab)**
- Update Visa Type (universal)
- Manage Visa Types
- Update Length of Stay (universal)
- Update Entry (universal)
- Update Validity (universal)
- Update Processing Days (universal)

**Authentication & OTP (Controls Tab)**
- Login Methods
- OTP Settings
- SMS OTP, WhatsApp OTP, Email OTP, OTP Priority
- Google Login, Google OAuth

**System / Display (Controls Tab)**
- Site maintenance mode
- Customer Support Widget

**Global Tabs**
- Blog Management (`BlogAdminPanel`)
- Static Pages Management (`StaticPagesManager`)

## Existing Components

- **Sidebar components**: 
  - `admin/src/components/layout/Sidebar.jsx` (The global application sidebar mapping top-level URLs).
  - The `<aside>` element inside `Dashboard.jsx` (Acts as the inner sidebar for switching `activeControlGroup`).
- **Controls page components**: 
  - `admin/src/pages/Dashboard.jsx` (A monolithic file containing all the Controls UI, state, and form saving logic).
- **Tab components**: 
  - Routed tabs handled by `/:activeTab?` in `AppRoutes.jsx`.
  - Horizontal pill buttons inside `Dashboard.jsx` for toggling specific `controlSections` and `destinationPageSectionTabs`.
- **Form components**: 
  - Various inline components in `Dashboard.jsx` such as `SettingsSectionCard`, `AuthControlToggle`.
  - Standalone imported components like `StaticPagesManager` and `BlogAdminPanel` currently assigned to their own top-level tabs.

## Existing Routes

- `/:activeTab?`: A dynamic catch-all route mapped to `<Dashboard />` in `AppRoutes.jsx`.
  - `/controls` (loads the Controls interface)
  - `/blogs` (loads the Blog interface)
  - `/pages` (loads the Static Pages interface)

## Migration Mapping

Below is the mapping for every existing control from its current location to the requested new architecture.

### Landing Page
- Site Logo (Controls > Website Content) → **Landing Page**
- Blog (Top-level `/blogs` Tab) → **Landing Page**
- Landing Highlights (Controls > Website Content) → **Landing Page**

### Cards
- Update Visa Type (Controls > Visa Settings) → **Cards**
- Manage Visa Type (Controls > Visa Settings) → **Cards**
- Update Length Of Stay (Controls > Visa Settings) → **Cards**
- Update Entry (Controls > Visa Settings) → **Cards**
- Update Validity (Controls > Visa Settings) → **Cards**
- Update Processing Days (Controls > Visa Settings) → **Cards**
- Fees Section (Controls > Fees) → **Cards**
- How It Works (Controls > Website Content > Destination Pages) → **Cards**
- Document Required (Controls > Documents / Destination Pages) → **Cards**
- Why Book Now (Controls > Website Content > Destination Pages) → **Cards**
- Whats Included (Controls > Website Content > Destination Pages) → **Cards**
- FAQ (Controls > Website Content > Destination Pages) → **Cards**

### Footer
- Static Pages (Top-level `/pages` Tab) → **Footer**
- Footer Control (Controls > Website Content) → **Footer**

---

### Unmapped / Remaining Items
*These items currently exist in the Controls section but were not explicitly placed in the new `Landing Page`, `Cards`, or `Footer` requirements. Per the critical requirements, they must not be deleted and should be preserved in the final implementation.*
- **Authentication & OTP** (All 8 login and OTP forms)
- **System / Display** (Maintenance mode, Customer support widget)
- **Documents** (Document Upload Methods, Optional Documents Catalog)
- **Destination Pages (All Countries)** (The parent wrapper setting global fallbacks for the inner sections mapped above)
