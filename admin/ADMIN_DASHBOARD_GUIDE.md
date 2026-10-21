# Admin Dashboard Functionality & Layout Guide

This document explains the architecture, layout, and functionality of the Visa & Voyage admin dashboard located in the `admin` directory.

## 1. Overview & Tech Stack

The admin dashboard is a Single Page Application (SPA) built to manage the visa application platform. 
- **Framework:** React 18 with Vite
- **Routing:** React Router (`react-router-dom`)
- **State Management:** Zustand (`store/authStore`, `store/uiStore`, etc.)
- **Styling:** Tailwind CSS + custom UI components
- **Icons:** Lucide React & Remix Icons
- **Charts:** Recharts for analytics

## 2. Layout Architecture

The application layout is built around the `AdminLayout` wrapper component, ensuring a consistent interface across different admin sections.

- **`AdminLayout.jsx`:** The core wrapper that sets up a full-screen layout containing the `Sidebar` on the left and the main content area on the right. It dynamically handles standard views vs. wide views (like the chat interface).
- **`Sidebar.jsx`:** A collapsible, hierarchical navigation menu on the left. It intelligently groups sections into dropdowns and handles responsive states (sliding drawer on mobile). It uses `useAuthStore` to determine role-based access.
- **`Topbar.jsx`:** (Located in the main content area) Provides context about the current page, displaying the title, description, and occasionally tabs for sub-navigation.

## 3. Core Routing & Protected Paths

Routing is defined in `routes/AppRoutes.jsx` and utilizes lazy loading to improve performance.

- **`/login`:** Authentication page.
- **`/application/:id`:** Detail view for a specific visa application.
- **`/:activeTab?`:** The main entry point mapped to the `Dashboard` component. The dashboard acts as a universal view that renders different functional panels based on URL query parameters (`?section=...`) or the active tab.
- All core routes are wrapped in a `<ProtectedRoute requiredRole="admin">` component, ensuring only authorized administrators can access them.

## 4. Main Functionality & Features

Based on the sidebar configuration, the admin panel is divided into logical management zones. Most of these sections are handled within the massive `Dashboard.jsx` file, which orchestrates various manager components (e.g., `StaticPagesManager`, `VisaTypesManager`, `BlogAdminPanel`).

### 📊 Activity Center
- **Analytics:** Visual charts and statistics (powered by Recharts) showing revenue, visits, and application counts.
- **Applications:** A comprehensive table to search, filter, and update the status of user visa applications.
- **Transactions:** Oversight of financial records and payment histories.

### 🏠 Header Management
- **Navbar & Logo:** Controls for updating the site logo and primary navigation settings.
- **Blogs:** A CMS panel for writing, editing, and publishing blog posts.
- **User Notifications:** Configurations for automated or manual alerts sent to users.

### 💳 Body Content Management
- **Hero & Searchbar:** Modify the main landing highlights and search functionality.
- **Visa Details & Fee Update:** A robust module to manage visa pricing (service fees, scopes), entry types, validities, and processing days for different countries.
- **Country Thumbnails & Payments:** Manage Unsplash images for destination cards and Razorpay integration settings.
- **Visa Information Pages:** Control copy for "How it works", "Why book now?", "What's included", FAQs, and specific visa requirements.
- **Application Flow Control:** Manage the traveler form fields, document upload methods, and calendar logic.
- **Testimonials:** Interface to approve and manage user reviews/testimonials.

### 📑 Footer & Pages
- **Left Side (Info):** Edit the footer description, legal links, and social media icons/URLs.
- **Static & Dynamic Pages:** A dedicated CMS (`StaticPagesManager`) for editing hardcoded pages (like Terms of Service) and generating new dynamic content pages.

### 💬 Chat & Support
- **Customer Support Widget:** Settings for the frontend support widget.
- **Live Chat:** An interface for admins to respond to user inquiries in real-time. Unread message counts are polled and displayed directly in the sidebar.

### ⚙️ Settings
- **Security:** Password update functionality.
- **System Display:** Toggles for Site Maintenance mode.
- **SEO Manager:** Panel to update meta tags, descriptions, and keywords for better search engine indexing.

## 5. Key State Management

- **`useAuthStore`:** Handles user authentication, token storage, and role verification.
- **`useUIStore`:** Manages UI states like global toast notifications (success/error popups), sidebar toggle status, and modal visibility.
- **`useDataStore`:** Fetches and caches core data needed across multiple admin views.

## 6. How the Dashboard Renders Sections
Instead of having 20 different route files, the application mostly stays on the `/` (Dashboard) route and uses query parameters like `?section=visa-details-table`. The `Dashboard.jsx` file reads this parameter and conditionally renders the appropriate component card (e.g., `<SettingsSectionCard>`, `<VisaDetailsTable>`, etc.) while keeping the user in a seamless SPA experience.
