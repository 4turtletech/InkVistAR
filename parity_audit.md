# InkVistAR - Master Parity Audit Roadmap (Web vs Mobile)

# Part I: Admin Portal Parity

**OBJECTIVE:** 
To systematically identify and list down all inconsistencies between the Web App and Mobile App. **Compare to the bone. Nothing missed.**
Specifically, we are tracking missing or mismatched:
- **Pages & Modals** (UI/UX components)
- **Features** (Data payloads, missing buttons)
- **Validation & Sanitization** (Input rules, constraints)
- **Workflows & Logic** (Status updates, approval chains, safeguards)

This document serves as the master checklist to ensure 100% functional, structural, and stylistic parity across the InkVistAR system.

## 1. Admin Dashboard (`AdminDashboard.js` vs `AdminDashboard.jsx`)

### Pending Appointment Actions & Workflow
*   **Web App:** 
    *   Detects if an appointment is a "Consultation". Shows explicit "Approve" (`CheckCircle`) and "Reject" (`AlertTriangle`) icons.
    *   The reject action uses the backend status `rejected`.
    *   Confirmation modal displays custom helper text (*"Confirming this request will notify the client..."* / *"Rejecting this request will mark it as declined..."*).
    *   For non-consultations, only displays a "Details" shortcut button.
*   **Mobile App:** 
    *   Uses generic approval logic. Shows a Cancel (`X`) icon and sets the status to `cancelled` instead of `rejected`.
    *   Confirmation modal text is generic: *"Mark this appointment as [status]?"*
    *   For non-consultations, it includes a quick-action button (`FileText`) that redirects the admin straight to the Bookings list (not present in Web).

### Appointment Details Modal Data Payload
*   **Web App ("Session Intelligence"):** 
    *   Tracks payments strictly using **"Valuation (Total)"** (total price) and **"Financial Clearance (Paid)"** (total amount paid).
    *   *Missing:* Entirely lacks the client's Phone and Email contact information inside the modal.
*   **Mobile App ("Appointment Details"):** 
    *   Displays the client's Phone and Email addresses properly.
    *   *Missing:* Only displays "Total Price" and completely omits the "Paid Amount / Financial Clearance" data, forcing admins to guess if a downpayment was made.

### Missing Feature B (Project Timeline) Integration
*   While the "Feature B" Multi-Session Project Timeline was integrated into `AdminAppointments.js` on the Web, the quick-view Detail Modal located inside `AdminDashboard.js` does not fetch or display the `project_id` timeline.

## 2. User Management (`AdminUsers.js` vs `AdminUserManagement.jsx`)

### User Status & Suspension Workflows
*   **Web App:** Features a dedicated "Manage Status" modal allowing admins to toggle between Active, Deactivated, and Banned. It forces the admin to provide a "Reason" for banning/deactivation and specifies a duration.
*   **Mobile App:** Lacks the "Manage Status" modal entirely. Status (Active/Suspended) can only be toggled for Admins/Managers via the Edit form. Customers and Artists do not have a dedicated status toggle mechanism from the main list.

### Deletion & Data Recovery (Soft vs Permanent)
*   **Web App:** Enforces a two-step deletion process: "Soft Delete" (moves them to a 'deleted' status where they can be "Restored") and "Permanent Delete" (Erase) which includes a mandatory 3-second destructive confirmation countdown.
*   **Mobile App:** Has a single Trash icon that triggers a basic confirmation modal and deletes the user immediately. There is no concept of Soft Delete, Restore, or the 3-second destructive countdown safeguard.

### Advanced Filters & Sorting
*   **Web App:** Includes a premium filter bar with "Filter by Role", "Filter by Status" (All, Active, Deactivated, Banned, Soft Deleted), and a "Sort" dropdown (Newest, Oldest, A-Z).
*   **Mobile App:** Has pill-based filters for Role and Status, but the Status filter only supports "Active" and "Suspended". It entirely lacks the Sorting dropdown.

## 3. Admin Appointments (`AdminAppointments.js` vs `AdminAppointmentManagement.jsx`)

### View Modes & Navigation
*   **Web App:** Features a robust dual-view system (List View vs. Interactive Calendar Grid) complete with keyboard navigation for browsing scheduled days.
*   **Mobile App:** Only offers a vertical `FlatList` with swipe-to-delete cards. There is no visual Calendar Grid view available for browsing the queue.

### Advanced Filtering & Sorting
*   **Web App:** Features a comprehensive filter matrix including: Status, Service Type, Quick Filters (Upcoming/Latest), Time Period (Weekly/Monthly/Yearly), and distinct Sorting rules.
*   **Mobile App:** Limited to basic horizontal pill filters strictly for Status. Completely lacks Service Type filtering, Time Period ranges, and Sorting mechanisms.

### Archive Mode & Material Cost Tracking (Completed Sessions)
*   **Web App:** When opening a "completed" appointment, the system enters a read-only "Archive Mode" that fetches and displays the `session_materials` consumed and calculates the `total_material_cost`.
*   **Mobile App:** Fails to trigger a read-only Archive Mode for completed sessions. It opens the standard editable form and completely omits all Material Cost and Inventory consumption data.

### Reschedule Requests & Project Timelines
*   **Web App:** Integrates a dedicated "Reschedule Request" decision panel allowing admins to approve/reject client reschedule requests. It also embeds "Feature B" (Multi-Session Project Timelines).
*   **Mobile App:** Entirely lacks the Reschedule decision panel (admins cannot handle client reschedule requests from this screen) and does not support rendering multi-session project linkages.

## 4. Admin Inventory (`AdminInventory.js` vs `AdminInventory.jsx`)

### Report Generation (Print & CSV Export)
*   **Web App:** Features fully functional Print and CSV Export utilities that generate dynamic, formatted inventory reports.
*   **Mobile App:** The UI contains Print and Export buttons, but they are purely decorative placeholders that trigger an alert stating these features are "optimized for the web portal."

### Data Deletion Workflows (Soft Delete vs Permanent)
*   **Web App:** Utilizes a two-tier deletion architecture. Items can be soft-deleted (moved to a "Deleted Items" filter where they can be restored) or Permanently Deleted.
*   **Mobile App:** Only possesses a single destructive delete action. There is no concept of a "Deleted Items" filter, and recovery/restoration is impossible from the mobile interface.

### Advanced Filtering & Sorting
*   **Web App:** Features an advanced filtering matrix that includes a dedicated Sort dropdown (Sort by Name, Stock Level, Category).
*   **Mobile App:** Relies strictly on simple pill filters for Category and Stock Status. It completely lacks any Sorting logic or dropdown.

### Service Kits Management
*   **Web App:** Admins can actively view, create, edit, and delete Service Kits via a comprehensive management modal.
*   **Mobile App:** The Service Kits modal is strictly read-only. It successfully fetches and lists existing kits but offers no UI or API hooks to create, edit, or delete them.

## 5. Admin Analytics (`AdminAnalytics.js` vs `AdminAnalytics.jsx`)

### Report Export Capabilities
*   **Web App:** Features robust CSV export and PDF/HTML print generation capabilities that format complex metric breakdowns into physical/digital reports.
*   **Mobile App:** Completely lacks both the Print and CSV Export buttons and their underlying logic within the Analytics dashboard.

### Dashboard Layout Customization
*   **Web App:** Includes a sophisticated "Dashboard Layout" customizer allowing admins to toggle the visibility of 15 distinct charts and metrics, saving preferences locally.
*   **Mobile App:** The dashboard layout is hardcoded and fixed. There is no customizer or capability to hide/show specific widgets.

### Overhead/Expense Management
*   **Web App:** The Analytics Audit modal allows admins to actively add, edit, and delete manual studio overhead expenses.
*   **Mobile App:** The breakdown modal is strictly read-only. Admins can view overhead summaries but cannot add or manage expenses from the mobile app.

### Custom Date Filtering
*   **Web App:** Supports granular filtering via a "Custom Range" option, providing explicit Start Date and End Date pickers.
*   **Mobile App:** Limited strictly to predefined periods (`This Week`, `This Month`, `This Year`, `All Time`). It lacks support for custom date range selections.

## 6. Admin Settings & Studio Command (`AdminStudio.js` vs `AdminSettings.jsx`)

### Module Architecture & Scope
*   **Web App:** Uses `AdminStudio.js` as a unified, tabbed command center managing System Settings, Physical Branches, Reviews, Aftercare Schedules, and Marketing Emails.
*   **Mobile App:** Splits navigation via a grid menu (`AdminStudio.jsx`), but entirely lacks screens or logic for managing Physical Branches, Aftercare Schedules, and Marketing Emails.

### Role-Based Access Control (RBAC)
*   **Web App:** Strictly enforces a `is_superadmin` check for system settings. Non-superadmins see a locked "Access Restricted" screen.
*   **Mobile App:** Lacks this Super Admin guard. Any admin who navigates to `AdminSettings.jsx` can view and potentially edit the configurations.

### Configuration Depth (Settings Tab)
*   **Web App:** Supports deep configuration including dynamic Policy Sections (adding/removing bullet points), Gallery Category filters, and a dedicated Backup & Restore module with auto-backup toggles.
*   **Mobile App:** Only supports a very limited subset of settings (a single Studio Name field, two toggles, and basic text areas for Terms/Cancellation). It completely lacks Backup & Restore, Gallery Categories, and dynamic Policy builder tools.

## 7. Admin POS (`AdminPOS.js` vs `AdminPOS.jsx`)

### Discount Controls
*   **Web App:** Provides full UI controls during checkout to apply discounts (PWD/Senior 20%, Promo 10%, or a Custom Percentage).
*   **Mobile App:** Completely lacks the UI to apply discounts. The logic exists in the code, but there are no buttons or dropdowns in the checkout modal to trigger them.

### Receipt Delivery & Printing
*   **Web App:** After a successful transaction, the modal offers options to Print, Download (Save as PDF), or Send the receipt to the customer's app inbox via push notification.
*   **Mobile App:** Only displays a basic success screen with the transaction summary. Lacks any functionality to print, download, or digitally send the receipt.

## 8. Admin Billing & Payouts (`AdminBilling.js` vs `AdminBilling.jsx`)

### Manual Invoice Creation
*   **Web App:** Features a primary "Create Invoice" button that allows admins to manually record a payment for a specific customer and appointment.
*   **Mobile App:** Lacks the "Create Invoice" capability entirely. Admins can only view and edit existing invoices, or record payouts to artists.

### Transaction Filtering
*   **Web App:** Includes a "Source" filter to differentiate between "Session Payments" and "POS Sales". Also includes a "Custom Range" period filter.
*   **Mobile App:** Missing the "Source" filter, blending POS sales and Session payments together. Also missing the Custom Date Range picker.

### Receipt Preview
*   **Web App:** Features a dedicated "View/Print Invoice" modal that formats the data into a professional receipt view for exporting.
*   **Mobile App:** Features a simple, read-only "Invoice Detail" list. No print formatting or export features are available.

---

# Part II: Artist Portal Parity

## 1. Artist Dashboard (`ArtistPortal.js` vs `ArtistDashboard.jsx`)

### Analytical Charts & Data Visualization
*   **Web App:** Features three distinct analytical charts: a "Week Ahead" BarChart (showing sessions booked per day for the next 7 days), and two mini AreaCharts embedded inside the "Total Earnings" and "This Month's Earnings" metric cards.
*   **Mobile App:** Completely missing the "Week Ahead" breakdown chart and the mini AreaCharts for earnings. It relies on a static text-based "Hero Card" for metrics, though it does preserve the 6-month Earnings Trend bar chart at the bottom.

### Upcoming Schedule Visibility
*   **Web App:** Displays two distinct schedule lists on the dashboard: "Today's Schedule" and a paginated "Upcoming Sessions" table that shows all future bookings.
*   **Mobile App:** Only shows a swipeable carousel for "Today's Schedule". The "Upcoming Sessions" list is missing entirely from the dashboard; the user must tap out to the full "Schedule" screen to see future bookings.

### Portfolio Integration
*   **Web App:** Does not display portfolio items or artist metadata on the dashboard.
*   **Mobile App:** Features a custom "Recent Works" carousel and an "Artist Info Card" (Specialization, Experience, Commission rate) natively on the dashboard. *(Note: This is a mobile-first feature enhancement rather than a missing gap, but breaks strict 1:1 parity).*

## 2. Artist Schedule & Appointments (`ArtistAppointments.js` vs `ArtistSchedule.jsx`)

### Views & Layout
*   **Web App:** Features a clean toggle between "List View" (a searchable, tabbed table with autocomplete) and "Calendar View" (a split-pane interface showing the calendar and the selected day's bookings).
*   **Mobile App:** Uses a unified vertical layout (Calendar widget on top, list below). Notably, it lacks the search bar and autocomplete functionality found in the web version.

### Portfolio Publishing & Audit (Critical Gap)
*   **Web App:** When viewing a completed session, the modal displays the final "Session Audit" photo. It cross-references the customer's marketing consent flag; if approved, it provides a one-click "Publish to Portfolio" button.
*   **Mobile App:** Missing the Session Audit view, customer consent checking, and the portfolio publishing workflow entirely within the schedule modal.

### Artist Scheduling Controls
*   **Web App:** Read-only scheduling; relies on customers or admins to generate bookings. Artists cannot manually block dates or originate bookings from this screen.
*   **Mobile App:** Introduces an active "Action Toolbar" allowing artists to manually "Block Date" (preventing new bookings) and create a "New Appointment" directly from the app. *(Mobile enhancement over Web).*

### Commission Calculation
*   **Web App:** Modal calculates the artist's cut dynamically, factoring in `commission_split` if there are secondary artists involved.
*   **Mobile App:** Hardcodes the display cut to a static 30% (`price * 0.3`), ignoring potential dual-artist commission splits.

## 3. Artist Sessions & Active Queue (`ArtistSessions.js` vs `ArtistSessions.jsx` / `ArtistActiveSession.jsx`)

### Queue Layout & Upcoming Visibility
*   **Web App:** Displays a standard table for "Today's Queue" and features a dedicated "Upcoming Sessions" banner summarizing the next 3 scheduled appointments at the bottom of the page.
*   **Mobile App:** Uses animated cards for today's queue but lacks the "Upcoming Sessions" preview entirely.

### Active Session UI Structure
*   **Web App:** Organizes the complex active session data into clean tabs: Overview, Documentation, Supplies, and Audit Log.
*   **Mobile App:** Uses a single, long scrolling view (`ScrollView`) for all data. Materials are pushed into a separate slide-up modal (Material Tracker).

### Session Audit Trail & Workflow (Critical Gap)
*   **Web App:** Features a robust real-time **Audit Log** tab. It tracks timestamps for "Session Started", "Session Paused", "Session Resumed", "Material Logged", and "Session Completed/Aborted". It supports pausing the session timer.
*   **Mobile App:** Completely missing the Audit Log, Pause/Resume functionality, and detailed event tracking. The timer is a simple visual counter.

### Session Abort Protocol (Critical Gap)
*   **Web App:** Includes an active "Abort" button for in-progress sessions. It opens a strict modal requiring a 10+ character explanation, marking the session as `incomplete` and notifying the studio.
*   **Mobile App:** Missing the Abort functionality entirely. Once a session is started on mobile, it must be "Completed". 

### Payment & Billing Banners
*   **Web App:** Upon session completion, if there is a remaining balance or the session is unquoted, a prominent "Outstanding Balance Detected" warning banner appears to remind the artist that the admin must handle payment collection.
*   **Mobile App:** Shows basic Paid/Unpaid badges, but lacks the detailed post-completion payment collection warning banners.

## 4. Artist Earnings & Ledger (`ArtistEarnings.js` vs `ArtistEarnings.jsx`)

### Data Visualizations (Missing on Mobile)
*   **Web App:** Features extensive `recharts` data visualizations, including an "Earnings Trend" bar chart, a "Payment Status" Donut chart, and a "Payout Disbursements" bar chart.
*   **Mobile App:** Completely lacks charts and graphical data visualization.

### CSV Export
*   **Web App:** Fully functional "Export CSV" button that generates a formatted report of earnings and payouts.
*   **Mobile App:** The UI contains a Download icon in the header, but it is currently a decorative `<View>` with no onPress handler or export logic.

### Filter Granularity
*   **Web App:** Filtering includes a dropdown with "Custom Range", utilizing `<input type="date">` for exact period searches.
*   **Mobile App:** Filtering is restricted to basic pills (All, Week, Month, Year). No custom date range capability.

## 5. Artist Portfolio / Gallery (`ArtistGallery.js` vs `ArtistWorks.jsx`)

### Search, Sort, and Filter Functionality
*   **Web App (Gap):** Currently lacks any UI controls to search, sort, or filter the portfolio grid. It simply renders all works.
*   **Mobile App:** Features a robust search bar with autocomplete suggestions, a sort toggle (Newest, Oldest, A-Z), and a horizontal scrolling row of category chips to actively filter the portfolio view.

### Portfolio Summary Statistics
*   **Web App:** Does not display high-level metrics about the portfolio.
*   **Mobile App:** Includes a "Stats Row" at the top of the screen summarizing "Total Works," "Public" count, and "Private" count.

### Image Upload & Cropping Workflow
*   **Web App:** Utilizes a custom `ImageCropper` component, forcing the user into a strict cropping flow before the base64 image is finalized.
*   **Mobile App:** Relies on the native OS image picker's basic cropping (`allowsEditing: true`) and also provides a segmented control tab allowing the artist to input an external image `URL` directly, a feature missing on the web.

### View & Edit Modals
*   **Web App:** Uses a large desktop-optimized side-by-side modal (Image on left, details on right) for viewing and editing. Includes a dedicated "Archive/Unarchive Work" toggle button.
## 6. Artist Profile & Settings (`ArtistProfile.js` vs `ArtistProfile.jsx`)

### Email Update & OTP Flow
*   **Web App:** Provides a secure modal specifically for changing the artist's email address, requiring a 6-digit OTP verification code.
*   **Mobile App:** Completely lacks email editing functionality. The `editForm` omits the email field entirely.

### Artist Bio / About Me
*   **Web App:** Includes a 1000-character "About Me / Bio" textarea for the public profile.
*   **Mobile App (Gap):** The Bio field is entirely missing from the mobile profile view and edit modal.

### Password Security UX
*   **Web App:** Features a real-time `PasswordStrengthMeter` component that visually checks off security requirements (length, uppercase, number, symbol).
*   **Mobile App:** Uses basic password inputs with no visual strength indicator.

### App Settings (Mobile Exclusive)
*   **Web App:** Does not include local app settings.
*   **Mobile App:** Includes a dedicated "App Settings" section at the bottom of the profile to toggle "Dark Mode" and "Haptic Feedback".

### Image Cropping
*   **Web App:** Enforces a strict aspect-ratio crop via `ImageCropper` before the profile picture is saved.
## 7. Artist Notifications (`ArtistNotifications.js` vs `ArtistNotifications.jsx`)

### Action UX & Modals
*   **Web App:** Provides an explicit action column for Mark Read/Unread. Clicking a notification opens a detailed View Modal with time metadata and specific deep-link buttons (e.g., "View Appointment").
*   **Mobile App:** Replaces click-modals with direct deep-linking on tap. Uses native `PanResponder` gestures for actions (Swipe Right to Toggle Read status, Swipe Left to Delete).

### Search & Granular Filtering
*   **Web App:** Features a text-based search bar with autocomplete dropdown to find specific notifications by title or message. Only supports broad filtering (All, Read, Unread).
*   **Mobile App (Gap):** Lacks text-based search capabilities. However, it introduces an advanced `TYPE_FILTERS` dropdown to filter by specific event types (e.g., Requests, Payments, Cancellations), which is missing on the web.

### Polling & Refreshing
*   **Web App:** Utilizes a silent `setInterval` to auto-poll for new notifications every 10 seconds, plus an explicit "Refresh" button.
*   **Mobile App:** Relies strictly on native `RefreshControl` (Pull-to-Refresh) with no background auto-polling.

### Data Pagination
*   **Web App:** Uses a structured, numbered `<Pagination>` component at the bottom of the list.
*   **Mobile App:** Uses a `FlatList` with an infinite-scroll "Load More" mechanism (`hasMore`).

## 8. Client Management & Details (`none` vs `ArtistClientDetails.jsx`)

### Dedicated Client Profile View
*   **Web App (Gap):** The web artist portal lacks a dedicated "Client Details" page. Artists interact with clients strictly through the context of an appointment or session modal.
*   **Mobile App:** Features a dedicated `ArtistClientDetails.jsx` profile card for clients. When an artist taps a client from today's queue, they see a full profile containing:
    *   Total historical sessions and total lifetime paid.
    *   Quick-action buttons to instantly Call, Email, or SMS the client.
    *   A dedicated "Client Notes" text area allowing the artist to maintain historical service notes across multiple sessions.
    *   A "Create New Appointment" direct call-to-action button for that specific client.

---

# Part 3: Customer Portal Parity Audit

This section compares the Customer web application (`web-app/src/pages`) with the React Native mobile application (`mobile-app/screens`) for the end-user facing features.

## 1. Customer Dashboard (`CustomerPortal.js` vs `CustomerDashboard.jsx`)

### Core Metrics & Quick Actions
*   **Web App:** Displays three primary stat cards (Upcoming Sessions, Saved Designs, My Tattoos). Features a 3-column quick action grid and a large "Tattoo Inspiration" banner.
*   **Mobile App:** Replicates the three primary stat cards as modern "pills". Replaces the action grid with a 2x2 "Bento Grid" that introduces a mobile-exclusive **AR Preview** quick action. 

### Appointment Handling (Hero vs Table)
*   **Web App:** Displays upcoming appointments in a traditional data table view (`premium-table`). Clicking a row opens a simple Session Details Modal.
*   **Mobile App:** Prioritizes the immediate next appointment as a massive "Hero Card". Secondary upcoming appointments are rendered as standard list items.

### Notifications UI
*   **Web App:** Clicking the bell icon opens an inline dropdown modal (`notif-dropdown-v2`) to read and refresh notifications without leaving the dashboard.
*   **Mobile App:** The bell icon strictly navigates the user to a dedicated full-screen Notifications route.

### Pre-Care & Aftercare Widgets
*   **Web & Mobile Parity:** Both platforms successfully implement the "Healing Journey Tracker" and the "Pre-Session Conditioning Plan" modal (6-step guide) using near-identical data mapping.

## 2. Customer Appointments (`CustomerBookings.js` vs `CustomerAppointments.jsx`)

### Creation Workflow
*   **Web App:** Handles new appointment creation via a massive, multi-step inline modal directly within the page, including complex validations for body placement and reference image uploads.
*   **Mobile App:** Uses a dedicated "Book Session" floating action button (FAB) that delegates creation to a separate route (`CustomerBooking.jsx`).

### Project Timeline (Multi-Session Tattoos)
*   **Web App (Gap):** Only displays standard session details and transaction history in the view modal.
*   **Mobile App:** Introduces a dynamic "Project Timeline" rail inside the appointment detail modal. For multi-session projects, it renders a visual node map showing completed vs. planned sessions.

### Rescheduling & Cancellations
*   **Web App:** Features a robust, native self-service Reschedule Modal, including a "Reschedule Request" fallback for appointments less than 7 days away.
*   **Mobile App (Gap):** Lacks native rescheduling UI. Tapping "Reschedule" currently triggers a fallback alert instructing the user to message the studio via the Chat portal.

### Payment Integration
*   **Web App:** Redirects the user's browser window to a dedicated `/pay-mongo` route for checkout.
*   **Mobile App:** Keeps the user strictly in-app by rendering the PayMongo checkout gateway inside a native `WebView` modal.

## 3. Customer Gallery (`CustomerGallery.js` vs `CustomerGallery.jsx`)

### Layout & Presentation
*   **Web App:** Renders artwork using a standard, uniform CSS Grid (`gallery-grid`).
*   **Mobile App:** Implements a dynamic **Masonry Grid** layout. It calculates staggered column heights natively to provide a Pinterest-style, premium browsing experience.

### Search & Filtering
*   **Web App:** Uses a standard text input for searching and a basic HTML `<select>` dropdown for category filtering.
*   **Mobile App:** Features a highly interactive "Autocomplete Waterfall" dropdown that categorizes search suggestions (Artist, Style, Title) as the user types. Categories are handled via a horizontally scrollable row of multi-select chips.

### AR Integration
*   **Web App (Gap):** No Augmented Reality features are present or referenced.
*   **Mobile App:** The detail modal includes a dedicated **"Try in AR"** action button (currently a placeholder) positioned alongside the primary "Book Similar" call-to-action.

## 4. Customer Profile (`CustomerProfile.js` vs `CustomerProfilePage.jsx`)

### Layout & Gamification
*   **Web App:** Utilizes a standard, linear vertical form layout separated by logical headers (Personal Info, Health & Safety, Password).
*   **Mobile App:** Implements gamified profile elements including an **Activity Overview** bento box (showing Tattoos and Designs) and a visual **Profile Strength** progress bar calculating completion percentage.

### Health & Safety Tracking
*   **Web & Mobile Parity:** Both platforms successfully implement the unified array-based tagging system for `health_conditions` and `allergens`. Both feature identical preset lists and support custom manual entry.

### App Settings (Platform Specific)
*   **Web App:** Standard profile management only.
*   **Mobile App:** Features a dedicated **App Settings** section with native toggles for **Dark Mode (Gilded Noir)** and **Haptic Feedback (Vibration)**.

### Security Workflows (OTP)
*   **Web App:** Uses an OTP verification modal specifically for Email Changes. Features an inline dynamic Password Strength Meter for password updates.
*   **Mobile App:** Implements an OTP verification requirement for *Password Changes*. Includes UI for selecting an OTP Delivery Method (Email vs SMS, though SMS is currently stubbed as "Coming Soon").

## 5. Customer Notifications (`CustomerNotifications.js` vs `CustomerNotifications.jsx`)

### Layout & Interaction
*   **Web App:** Standard list view with page-based pagination. Action buttons (e.g., "View Invoice", "Leave Review") are rendered explicitly inside the expanded notification card.
*   **Mobile App:** Uses an Infinite Scroll (`FlatList` with "Load More"). Introduces native gesture controls (`PanResponder`) allowing users to **Swipe Right** to mark read/unread, and **Swipe Left** to delete.

### Filtering & Search
*   **Web App:** Offers basic read/unread toggles and features a global text search box to find specific notifications.
*   **Mobile App:** Replaces text search with a structured **Type Filter Dropdown** (Requests, Confirmed, Cancelled, Payments) combined with horizontal scrolling filter chips.

### Routing & Action Handling
*   **Web App:** Requires explicit clicks on action buttons embedded within the notification card.
*   **Mobile App:** Implements an auto-routing architecture. Tapping the entire notification card automatically redirects the user to the relevant screen (`customer-transactions`, `CustomerAftercare`, etc.) based on the notification's internal `type` payload.

## 6. Customer Transactions (`CustomerTransactions.js` vs `CustomerTransactions.jsx`)

### Layout & Data Presentation
*   **Web App:** Utilizes a standard responsive data table (`<table className="portal-table">`) displaying Date, Reference, Service, Amount, Status, and Action. Features page-based pagination.
*   **Mobile App:** Utilizes a vertical scroll of `ExpandableTransactionCard` components. Tapping a card triggers a smooth accordion animation revealing a detailed receipt breakdown (Materials Cost, Downpayment, Total Paid).

### Search & Filtering
*   **Web App:** Includes a text search bar capable of filtering by design title, PayMongo reference ID, or appointment ID.
*   **Mobile App (Gap):** Lacks text search or filtering capabilities for transactions.

## 7. Customer Reports & Feedback (`CustomerReports.js` vs `CustomerReports.jsx`)

### Feature Scope Disparity
*   **Web App:** Acts as a complete Customer Support Hub. Displays a list of past reports with their current resolution statuses (Open, Investigating, Resolved). Expanded reports show threaded conversations where users can reply to Admin messages. Includes support for image attachments and "Steps to Reproduce".
*   **Mobile App (Gap):** Functions strictly as a "Submit New Report" utility screen. It features a basic category selector (Bug, Feedback, Other) and a text area. It **does not** display past reports, statuses, or conversation threads.

## 8. Customer Aftercare (`CustomerAftercare.js` vs `CustomerAftercare.jsx`)

### Tracking & Visualization
*   **Web App:** Uses an intricate SVG-based progress ring (`strokeDasharray`) to dynamically visualize the 30-day timeline completion percentage.
*   **Mobile App:** Replaces the SVG ring with a simpler, native-friendly `View` container leveraging heavy border styling (`borderRadius`, `borderWidth: 2`).
*   **Web & Mobile Parity:** Both platforms utilize the identical core `PHASE_CONFIG` logic (Initial Healing, Peeling, Final Healing) and successfully render the day-by-day template messaging. The core functionality is synchronized.

---

## Part 4: Actionable Synchronization Roadmap

Based on the parity audit above, the following is the prioritized roadmap to synchronize the Web and Mobile Portals (Admin, Artist, and Customer). The goal is to ensure consistent workflows, robust data integrity, and a unified UX across all touchpoints.

### Priority 1: High (Critical Data & Integrity)
1. **Commission Logic Synchronization (Mobile - Artist):** Refactor `ArtistActiveSession.jsx` and `ArtistEarnings.jsx` to dynamically fetch and calculate the artist's `commission_rate` (and split logic) from the backend, removing the hardcoded 30% bucket.
2. **Session Audit & Abort Protocol (Mobile - Artist):** Implement the `handleAbortSession` API call within `ArtistActiveSession.jsx`. Introduce an "Audit Log" timeline view inside the active session to display tracking events (start, pause, complete).
3. **Publish to Portfolio Auth Checks (Mobile - Artist):** Add the pre-publish consent check (verifying if the customer allowed marketing) before allowing an artist to publish a completed session to their portfolio.
4. **Rescheduling & Cancellation Engine (Mobile - Customer):** Port the native self-service Reschedule Modal (and fallback request logic) from the web `CustomerBookings.js` to the mobile `CustomerAppointments.jsx` so customers don't have to rely on chat.
5. **Customer Reports Support Hub (Mobile - Customer):** Expand `CustomerReports.jsx` from a basic submission form to a full support hub that fetches and displays past reports, status updates, and conversation threads matching the web experience.

### Priority 2: Medium (Analytics & UX Parity)
1. **Recharts Integration (Mobile - Artist):** Evaluate and integrate a lightweight React Native charting library (e.g., `react-native-gifted-charts`) into `ArtistEarnings.jsx` to visually map the 6-month earnings trend to match the web.
2. **CSV Export Fix (Mobile - Artist/Admin):** Connect the existing "Download CSV" icons in `ArtistEarnings.jsx` and Admin Analytics/Inventory to functional export utilities using `expo-file-system`.
3. **Custom Date Range Filter (Mobile - Artist/Admin):** Introduce a custom Date Picker modal to allow granular queries beyond basic pills.
4. **Client Profiles for Web (Web - Artist):** Design and implement a dedicated "Client Roster" tab in the Web Artist Portal to match the `ArtistClientDetails.jsx` mobile feature.
5. **Project Timelines (Web - Customer):** Introduce the dynamic "Project Timeline" node map for multi-session tattoos from mobile into the web appointment details modal.

### Priority 3: Low (Quality of Life)
1. **Password Strength & Bio (Mobile - Artist/Customer):** Add the visual password strength meter and Bio editor to mobile profiles.
2. **Email OTP Modal (Mobile - Artist/Customer):** Implement the secure 6-digit OTP verification flow for changing email addresses on mobile.
3. **Advanced Filtering & Gamification Backports (Web - Customer/Artist):** Back-port the autocomplete waterfall search to Web Gallery. Introduce the Gamified "Profile Strength" and Bento Grid UI concepts to the web Customer Dashboard.
