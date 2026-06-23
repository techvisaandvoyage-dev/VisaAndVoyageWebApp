# Controls Redesign Plan

Based on the [Controls Analysis Report](file:///c:/Users/yashr/OneDrive/Desktop/Projects/Meraki%20Movies/VB/docs/controls-analysis.md), this document outlines the proposed layout and structural changes for the Admin Controls section.

## Goal
The primary objective is to replace the existing, monolithic Controls categories with a streamlined, tab-based navigation structure consisting of three distinct sections:

1. **Homepage**
2. **Cards**
3. **Footer**

## Expected Behavior & Categorization

The new layout will redistribute the existing control sections into the following structured tabs:

### 1. Homepage Tab
This tab will centralize all configurations related to the main landing page.
- **Site Logo**: Control for updating the main logo.
- **Landing Highlights**: Configuration for the highlight sections visible on the homepage.

### 2. Cards Tab
This tab will manage content and settings for card-based components across the platform.
- **Destination Pages**: Controls for the destination pages (affecting all countries).
- **Future Card Controls**: Reserved space for any upcoming card-related configurations to ensure scalability.

### 3. Footer Tab
This tab will isolate the footer configurations to avoid cluttering other sections.
- **Footer Manager**: Controls for footer links, social icons, and related descriptions.

## Proposed Structural Changes

To achieve this new layout without disrupting the entire application, the following architectural updates are planned:

1. **Refactoring `Dashboard.jsx`**
   - The current `controlGroups` array in `admin/src/pages/Dashboard.jsx` will be redefined. The existing sub-categories will be replaced with the three new primary categories: `Homepage`, `Cards`, and `Footer`.
   - The UI rendering logic will be updated to display these three new top-level tabs instead of the current sidebar/list implementation.

2. **Component Extraction (Recommended)**
   - Extract the logic for "Site Logo", "Landing Highlights", "Destination Pages", and "Footer Manager" into separate, smaller components.
   - Render these new components conditionally based on the active tab selected within the new Controls layout.

3. **Routing Configuration**
   - Retain the current `/:activeTab?` routing mechanism for reaching the Controls page, but internally manage the state for `Homepage`, `Cards`, and `Footer` within the Controls view itself.

By implementing these changes, the admin interface will become significantly cleaner, easier to navigate, and better prepared for future scalability.
