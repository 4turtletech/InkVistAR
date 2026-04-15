# InkVistAR - Project Reference & AI Guidelines

This document serves as the primary ground truth for the InkVistAR project. When assisting the user, you MUST follow the guidelines and rules outlined in this file to prevent hallucinations and maintain system consistency.

## AI Guidelines & Rules
### 1. Anti-Hallucination Rules
- **Do NOT hallucinate database fields, APIs, or files.** Always refer to the exact Database Tables and API Endpoints documented below.
- **Read Before Modifying:** Always use `view_file` to read the target code before writing an update. Do not guess the structure of a component.
- **Soft Deletes Only:** Never DELETE rows from the database. Always use the `is_deleted` flag for appointments, portfolio_works, inventory, and users. For Admin appointments, the 'Delete' UI action is officially deprecated; strictly use the notification-driven 'Reschedule' workflow.
- **System Flow Accuracy:** Refer to the `Updated_Activity_Diagram.md` for the correct booking, payment, and scheduling flows.
- **Mandatory Guidelines Sync:** Whenever you create or modify database tables, add new API endpoints, change important patterns, or introduce new system features, you **MUST** update this `guidelines.md` file in the same changeset. This ensures this document remains the single source of truth and prevents future hallucinations.

### 2. Theming & UI Standards (Web App)
- **Primary Colors:** 
  - Dark Background: `#171516`
  - Dark Surface/Card: `#262022`
  - Brand Gold: `#b7954e`
  - Slate Dark (Text/Headings): `#1e293b` or `#0f172a`
  - Slate Muted (Subtext): `#64748b`
  - Status Colors: Success (`#10b981`), Warning (`#f59e0b`), Danger (`#ef4444`), Info (`#3b82f6`)
- **Typography:** Use `'Inter', sans-serif`. Use modern font weights (`500`, `600`, `700`, `800`) for visual hierarchy.
- **Design Patterns:**
  - **Glassmorphism (Core Design Language):** The UI must strictly follow a glassmorphic look. Use standard classes like `.glass-card` (which rely on `rgba()`, `backdrop-filter: blur()`, and subtle borders) to achieve this.
  - **Border Radius:** Use soft, modern curves. Standard cards use `16px` or `24px`; generic buttons use `8px` or `10px`.
  - **Icons:** Use `lucide-react` for all UI icons.
- **CSS Strategy:** 
  - **Strict Separation of Concerns:** ALL structural styling and glassmorphism properties MUST be stored in external compiled `.css` files (e.g., `PortalStyles.css`, `AdminStyles.css`, `index.css`). **NEVER** use hardcoded inline `style={{...}}` React props for structural layouts, alignments, or core visual themes.
  - **No Tailwind:** **Do NOT use TailwindCSS** utilities unless the user explicitly introduces it to the project. Use robust semantic class naming instead.
- **Portal Color Identity:** Each portal has a visually distinct color scheme to orient the user at a glance. These MUST be maintained:
  - **Admin Portal:** Sidenav bg `#1a1416`, accent `#be9055` (Bronze-Gold), header bg `#1a1416` with `#be9055` border and headings. Content area bg `#f3f4f6`.
  - **Artist Portal:** Sidenav bg `#1a1416`, accent `#d4af37` (Bright Gold), logo gradient `#d4af37 → #4338ca`. Content area bg `#f3f4f6`.
  - **Customer Portal:** Sidenav bg `#1a1416`, accent `#d4af37` (Bright Gold), same structure as Artist. Content area bg `#f3f4f6`.
  - All sidenav CSS lives in `src/styles/AdminSideNav.css`, `ArtistSideNav.css`, `CustomerSideNav.css`. Do NOT merge or break these per-portal distinctions.

### 3. Input Validation & Sanitization
- **Every input field, dropdown, date picker, textarea, and any other form element that accepts user input MUST include:**
  - **Client-side validation:** Required checks, format validation (email, phone, dates), min/max length, numeric range constraints, and pattern matching where appropriate.
  - **Sanitization:** Strip or escape dangerous characters to prevent XSS. Reject or neutralize SQL-injectable patterns on the backend.
  - **Visual Feedback:** Invalid fields must display clear, inline error messages (red border + helper text). Do NOT use `alert()` for form validation.
  - **Edge-case Handling:** Empty strings, whitespace-only inputs, negative numbers, past dates for future-only fields, and duplicate entries must all be explicitly handled.

---

## Database Tables

| Table | Key Columns |
|-------|-------------|
| **users** | id, name, email, password_hash, user_type (admin/manager/artist/customer), phone, is_verified, is_deleted |
| **artists** | user_id, studio_name, experience_years, specialization, hourly_rate, commission_rate, rating, total_reviews, profile_image, phone |
| **customers** | user_id, phone, location, notes |
| **appointments** | id, booking_code, customer_id, artist_id, appointment_date, start_time, end_time, design_title, price, status, payment_status, before_photo, after_photo, session_duration, audit_log, is_deleted |
| **portfolio_works** | id, artist_id, image_url, title, description, category, price_estimate, is_public |
| **notifications** | id, user_id, title, message, type, related_id, is_read |
| **inventory** | id, name, category, current_stock, min_stock, max_stock, unit, cost, supplier |
| **inventory_transactions** | id, inventory_id, type (in/out), quantity, reason |
| **service_kits** | id, service_type, inventory_id, default_quantity |
| **session_materials** | id, appointment_id, inventory_id, quantity, status (hold/consumed/released) |
| **payments** | id, appointment_id, paymongo_payment_id, amount, status |
| **payouts** | id, artist_id, amount, payout_method, reference_no, status |
| **branches** | id, name, address, operating_hours, current_occupancy, capacity |
| **app_settings** | section (PK), data (JSON) |

---

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/send-otp` / `/api/verify-otp` - OTP verification
- `POST /api/reset-password` - Password reset
- `POST /api/artist/change-password` - Artist password change (requires currentPassword)
- `GET /api/verify` - Verify auth token

### Artist
- `GET /api/artist/dashboard/:artistId` - Dashboard data (includes profile_image, phone, studio_name)
- `GET /api/artist/:artistId/appointments` - Get appointments
- `GET /api/artist/:artistId/clients` - Get clients
- `GET /api/artist/:artistId/portfolio` - Get portfolio
- `GET /api/artist/:artistId/availability` - Check availability
- `GET /api/artist/:id/earnings-ledger` - Earnings history
- `PUT /api/artist/profile/:id` - Update profile (name, phone, studio_name, specialization, hourly_rate, experience_years, commission_rate, profileImage)
- `POST /api/artist/portfolio` - Add work
- `PUT /api/artist/portfolio/:id` - Update work
- `DELETE /api/artist/portfolio/:id` - Soft-delete work
- `POST /api/artist/appointments` - Create appointment

### Customer
- `GET /api/customer/profile/:id` - Get profile
- `PUT /api/customer/profile/:id` - Update profile
- `GET /api/customer/:customerId/appointments` - Get appointments
- `GET /api/customer/:customerId/my-tattoos` - Get tattoo history
- `GET /api/customer/:customerId/dashboard` - Dashboard data
- `GET /api/customer/:customerId/transactions` - Payment history
- `GET /api/customer/artists` - Browse artists
- `POST /api/customer/appointments` - Create appointment
- `POST /api/customer/favorites` - Add favorite
- `GET /api/customer/:userId/favorites` - Get favorites
- `POST /api/payments/create-checkout-session` - PayMongo checkout

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET/POST/PUT/DELETE /api/admin/users` - User management
- `GET/POST/PUT/DELETE /api/admin/appointments` - Appointment management
- `GET/POST /api/admin/service-kits` - Service kits
- `GET/POST/PUT/DELETE /api/admin/inventory` - Inventory CRUD
- `POST /api/admin/inventory/:id/transaction` - Stock transaction
- `GET /api/admin/inventory/transactions` - Transaction history
- `GET/POST/PUT/DELETE /api/admin/branches` - Branch management
- `GET /api/admin/analytics` - Analytics
- `GET/POST /api/admin/payouts` - Payout management
- `GET/POST /api/admin/settings` - App settings
- `GET /api/admin/audit-logs` - Audit trail

### Shared
- `GET /api/gallery/categories` - Gallery categories
- `GET /api/gallery/works` - Gallery works
- `GET /api/gallery/art-of-the-day` - Featured artwork
- `GET /api/notifications/:userId` - User notifications
- `PUT /api/notifications/:id/read` - Mark read/unread
- `GET /api/appointments/:id/materials` - Session materials
- `POST/PUT /api/appointments/:id/materials` - Manage materials
- `PUT /api/appointments/:id/status` - Update status
- `PUT /api/appointments/:id/details` - Update details
- `PUT /api/appointments/:id/after-photo` - Upload after photo
- `POST /api/appointments/:id/release-material` - Release held materials
- `POST /api/chat` - AI chatbot
- `GET /api/ar/config` - AR configuration

---

## Environment Variables

### Backend (.env)
```
DB_HOST=inkvistardb-turtlecapstone.j.aivencloud.com
DB_PORT=28895
DB_USER=avnadmin
DB_PASS=<password>
DB_NAME=defaultdb

EMAIL_USER=eloaltalt@gmail.com
EMAIL_PASS=<app-password>
EMAIL_API_KEY=<resend-key>

GROQ_API_KEY=<key>

PAYMONGO_SECRET_KEY=<key>
PAYMONGO_PUBLIC_KEY=<key>
PAYMONGO_WEBHOOK_SECRET=<secret>
PAYMONGO_MODE=test

FRONTEND_URL=https://inkvistar-web.vercel.app/login
BACKEND_URL=https://inkvistar-api.onrender.com
```

---

## Important Patterns

1. **Auto-Migrations:** Server automatically checks for and adds missing columns on startup (e.g., `profile_image`, `session_duration`, `audit_log`, `commission_rate`).
2. **Image Storage:** Base64/LONGTEXT in database.
3. **Commission:** Artists have `commission_rate` (default 0.30 = 30%).
4. **Material Tracking:** `session_materials` tracks hold→consumed→released lifecycle.
5. **Service Kits:** Predefined material bundles for quick session setup.
6. **Payment Flow:** PayMongo webhook → `/api/payments/webhook` → updates appointments.payment_status.
7. **Booking Code Standardization:** All portals MUST display the formatted booking ID via `src/utils/formatters.js` (e.g., `O-T-0012`). Do NOT use raw numeric IDs. PayMongo checkout strictly enforces the presence of `booking_code`.
8. **Session Tracking:** Artist portal uses real-time stopwatches logging elapsed time to `session_duration` (INT seconds) combined with detailed chrono `audit_log` (JSON text logging pauses/completes/items).
9. **Capacity Pools (Booking):** Schedule validation uses a decoupled three-pool system so that Consultations, Piercings, and Tattoos/Artist bookings calculate distinct concurrent capacities. Combos (e.g., "Tattoo + Piercing") draw from multiple capacity pools simultaneously.

---

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@inkvistar.com | admin123 |
| Artist | artist@inkvistar.com | artist123 |
| Customer | customer@inkvistar.com | customer123 |
