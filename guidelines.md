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
  - **Browser Tab Branding:** The tab title MUST be `"Inkvictus Tattoo Studio"` and the favicon/tab icon MUST use the custom "V" logo (`public/favicon.ico`, `public/favicon.png`, `public/logo192.png`, `public/logo512.png`). Do NOT revert to the default React logo.
- **CSS Strategy:** 
  - **Button Standards:** All interactive action buttons across all portals MUST use the global `.btn` classes (e.g., `.btn.btn-primary`, `.btn.btn-secondary`, or `.btn.btn-brand-gold`). Do NOT use inline styles to override background colors or use legacy one-off classes like `.btn-indigo`.
  - **Strict Separation of Concerns:** ALL structural styling and glassmorphism properties MUST be stored in external compiled `.css` files (e.g., `PortalStyles.css`, `AdminStyles.css`, `index.css`). **NEVER** use hardcoded inline `style={{...}}` React props for structural layouts, alignments, or core visual themes.
  - **No Tailwind:** **Do NOT use TailwindCSS** utilities unless the user explicitly introduces it to the project. Use robust semantic class naming instead.
- **Portal Color Identity:** Each portal has a visually distinct color scheme to orient the user at a glance. These MUST be maintained:
  - **Admin Portal:** Sidenav bg `#1a1416`, accent `#be9055` (Bronze-Gold), header bg `#1a1416` with `#be9055` border and headings. Content area bg `#f3f4f6`.
  - **Admin Analytics Page:** Uses a dedicated dark glassmorphism theme scoped under `.analytics-dark-page` (gradient `#0f172a → #1e293b`). This class MUST be present on the Analytics page wrapper and MUST NOT be applied to any other admin page. All dark metric/card overrides are scoped under this parent selector to prevent CSS bleeding.
  - **Admin Dashboard:** Uses the standard light bg (`#f8fafc`). Stat cards include embedded mini Recharts (bar charts, pie charts) for at-a-glance data visualization. These cards open the shared `AnalyticsAuditModal` on click.
  - **Artist Portal:** Sidenav bg `#1a1416`, accent `#d4af37` (Bright Gold), logo gradient `#d4af37 → #4338ca`. Content area bg `#f3f4f6`.
  - **Customer Portal:** Sidenav bg `#1a1416`, accent `#d4af37` (Bright Gold), same structure as Artist. Content area bg `#f3f4f6`.
  - All sidenav CSS lives in `src/styles/AdminSideNav.css`, `ArtistSideNav.css`, `CustomerSideNav.css`. Do NOT merge or break these per-portal distinctions.

### 3. Input Validation & Sanitization (Dual-Layer Architecture)
- **Validation Source of Truth:** `src/utils/validation.js` provides the centralized library. All form components MUST import and use these utilities rather than inline regex:
  - `filterName(value)` — Strips non-alpha/space/hyphen characters (for names).
  - `filterDigits(value)` — Strips non-numeric characters (for phone, zip).
  - `clampNumber(value, min, max)` — Constrains numeric inputs to a safe range.
  - `filterMoney(value)` — Formats currency inputs (strips negatives, limits decimal precision).
  - `truncate(str, maxLen)` — Server-side string truncation utility.
- **Client-Side Validation (Layer 1 — UX):** Every input field, dropdown, date picker, textarea, and any other form element that accepts user input MUST include:
  - **`maxLength` HTML attribute** on all text/search inputs (prevents browser-level overflow).
  - **`.slice()` / `.substring()` in `onChange`** for programmatic length enforcement (backup for `maxLength`).
  - **`clampNumber()` wrapping** on all numeric `onChange` handlers (rate fields, quantities, multipliers).
  - **`filterMoney()` wrapping** on all currency/price inputs (invoices, payouts, costs, payments).
  - **`filterName()` / `filterDigits()`** on name and phone fields respectively.
  - **Visual feedback:** Invalid fields must display clear, inline error messages (red border + helper text). Do NOT use `alert()` for form validation.
  - **Edge-case handling:** Empty strings, whitespace-only inputs, negative numbers, past dates for future-only fields, and duplicate entries must all be explicitly handled.
- **Server-Side Sanitization (Layer 2 — Zero-Trust):** The backend (`server.js`) MUST sanitize all incoming data before database insertion, regardless of client validation:
  - **String truncation:** All text fields are truncated to their schema limits (e.g., `name.substring(0, 100)`, `email.substring(0, 254)`).
  - **Numeric clamping:** `Math.min(Math.max(value, MIN), MAX)` on all numeric fields (e.g., `experience_years` clamped 0–100, `commission_split` clamped 1–99).
  - **Endpoints hardened:** `/api/artist/profile/:id`, `/api/admin/broadcast-marketing-email`, `/api/admin/appointments/:id/manual-payment`, and all CRUD endpoints.
- **Field Constraint Reference (Per Page):**

  | Page | Field | Filter | Max |
  |------|-------|--------|-----|
  | AdminSettings | Studio Name | `filterName` | 100 |
  | AdminSettings | Phone | `filterDigits` | 15 |
  | AdminSettings | Email | `substring` | 254 |
  | AdminSettings | City/State | `filterName` | 100/50 |
  | AdminSettings | Zip | `filterDigits` | 10 |
  | AdminSettings | Policies/Templates | `maxLength` | 500–2000 |
  | AdminSettings | Aftercare | `maxLength` | 3000 |
  | AdminStaff | Name | `filterName` | 100 |
  | AdminStaff | Experience | `clampNumber` | 0–100 |
  | AdminStaff | Work Title | `filterName` | 100 |
  | AdminStaff | Work Description | `substring` | 500 |
  | AdminStaff | Price Estimate | `filterMoney` | — |
  | AdminBilling | Client Name | `filterName` | 100 |
  | AdminBilling | Invoice/Payout Amount | `filterMoney` | — |
  | AdminBilling | Base Rate | `clampNumber` | 0–100000 |
  | AdminBilling | Deposit/Tax Rate | `clampNumber` | 0–100 |
  | AdminBilling | Complexity/Style Multipliers | `clampNumber` | 0.1–10 |
  | AdminBilling | Payout Reference | `substring` | 100 |
  | AdminInventory | Item Name | `substring` | 150 |
  | AdminInventory | Unit | `substring` | 30 |
  | AdminInventory | Cost/Retail | `filterMoney` | — |
  | AdminInventory | Stock/Min/Max | `clampNumber` | 0–999999 |
  | AdminPOS | Custom Discount | `clampNumber` | 0–100 |
  | AdminPOS | Cash Tendered | `filterMoney` | — |
  | AdminAppointments | Design Title | `filterName` | 50 |
  | AdminAppointments | Commission Split | `clampNumber` | 1–99 |
  | AdminUsers | Name | `filterName` | 50 |
  | AdminUsers | Phone | `filterDigits` | 11 |
  | AdminUsers | Client Notes | `substring` | 2000 |
  | AdminUsers | Create: First/Last Name | `filterName` | 50 |
  | AdminUsers | Create: Suffix | `filterName` | 5 |
  | AdminUsers | Create: Email | `substring` | 254 |
  | AdminUsers | Create: Password | `substring` | 128 |
  | AdminUsers | Create: Age | `filterDigits` | 3 chars |
  | MarketingEmailModal | Subject | `substring` | 150 |
  | MarketingEmailModal | Body | `substring` | 5000 |
  | PaymentAlertOverlay | Amount/Cash | `filterMoney` | — |
  | All Search Inputs | Search text | `maxLength` | 100 |
  | All Select Elements | N/A (fixed options) | Safe | — |
  | All Time/Date Inputs | N/A (browser-native) | Safe | — |

### 4. Payment Resolution Flow
- **When an artist marks a session as `completed`, the backend MUST check if the appointment has an outstanding balance** (`total_paid < price` or `price <= 0` meaning unquoted).
- If an outstanding balance exists, a `payment_action_required` notification is fired to **all admin/manager users**.
- **Admins receive an immediate popup modal** (via `PaymentAlertOverlay` component) on whatever page they are currently on.
- The popup shows the appointment's financial summary (Total Quoted, Collected, Remaining) and allows inline "Record Payment" or navigation to the appointment.
- **Dismissing the popup** does NOT resolve the alert — a persistent **toast notification** remains at bottom-right, and a **pulsing red dot** persists on the sidebar's Notifications menu item.
- The alert fully resolves only when the outstanding balance reaches ₱0.00 (i.e., payment is fully collected).
- **Artist compensation** (automatic commission payout) is not blocked but the alert ensures admins act immediately.
- The artist sees an **informational banner** after completing the session, stating the admin has been notified.

### 5. Notification Polling Standard
- **All sidebar notification polling** (Admin, Artist, Customer `SideNav` components) MUST use a **10-second interval** (`setInterval(fn, 10000)`).
- **All notification page polling** (`AdminNotifications`, `ArtistNotifications`, `CustomerNotifications`) MUST also use a **10-second interval**.
- **Refreshes MUST be subtle/silent:** Use a silent merge pattern that compares the incoming notification set against the current state. Only update React state if data has actually changed. Never reset loading spinners, scroll positions, filter states, or open modals during background polls.
- On initial page load, the first fetch may show a loading spinner. Subsequent polls must be invisible to the user (like receiving a new message in a messaging app).

### 6. Urgent Notification Patterns
- **Pulsing Red Dot (`.urgent-pulse-dot`):** A 10px red circle with a `@keyframes urgentPulse` animation (scale 1→1.3→1 with expanding box-shadow). Used on the sidebar's Notifications menu item to indicate critical unresolved alerts. It persists until the underlying condition is resolved.
- **Global Overlay Pattern (`PaymentAlertOverlay`):** A fixed-position overlay component mounted inside `AdminSideNav` (via React fragment) so it renders on every admin page automatically. Listens for `payment-alert` custom events dispatched by the sidebar's polling logic.
- **Secondary Toast:** When an overlay popup is dismissed, a persistent bottom-right toast remains visible. Clicking the toast re-opens the popup.
- **Notification Type `payment_action_required`:** Styled with red alert icon (`ShieldAlert`), red background tint, labeled "⚠️ Urgent" in the notification center.

---

## Database Tables

| Table | Key Columns |
|-------|-------------|
| **users** | id, name, email, password_hash, user_type (admin/manager/artist/customer), phone, is_verified, is_deleted |
| **artists** | user_id, studio_name, experience_years, specialization, hourly_rate, commission_rate, rating, total_reviews, profile_image, phone |
| **customers** | user_id, phone, location, notes |
| **appointments** | id, booking_code, customer_id, artist_id, secondary_artist_id, commission_split, appointment_date, start_time, end_time, design_title, price, status, payment_status, before_photo, after_photo, session_duration, audit_log, is_deleted, guest_email, guest_phone |
| **portfolio_works** | id, artist_id, image_url, title, description, category, price_estimate, is_public |

### Commission & Revenue Split Rules
- **Studio Cut:** 70% of the customer's total payment goes to the studio.
- **Artist Commission Pool:** 30% of the customer's total payment is the "Artist Commission Pool."
- **Material Costs:** Covered entirely by the studio; they do NOT affect artist earnings.
- **Solo Sessions:** 100% of the Artist Commission Pool goes to the primary artist.
- **Collaborative Sessions (Dual-Artist):** The Artist Commission Pool is split between the primary and secondary artist based on `commission_split` (default: 50/50). The primary artist receives `commission_split`% and the collaborator receives `(100 - commission_split)`%.
- **Lock Rule:** The `secondary_artist_id` and `commission_split` fields become **read-only** once an appointment reaches `completed` status. The admin cannot modify the split after finalization.

### Admin User Verification Flow
- **Admin-Created Users:** Users created via the Admin "Create New User" modal are created with `is_verified = 0`. No OTP is sent at creation time.
- **First-Login Verification:** Upon first login attempt, if a user's credentials are correct but `is_verified = 0`, the system generates and sends an OTP to the user's email. The user is routed to an OTP verification screen. Upon successful verification, `is_verified` is set to `1` and the user is redirected to login.
- **Applies to All Roles:** The first-login OTP verification applies to all user types (Customer, Artist, Admin) equally.
- **Password Requirements:** All user creation (admin or self-register) enforces: minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character (`@$!%*?&#`).
| **notifications** | id, user_id, title, message, type, related_id, is_read |
| **inventory** | id, name, category, current_stock, min_stock, max_stock, unit, cost, supplier |
| **inventory_transactions** | id, inventory_id, type (in/out), quantity, reason |
| **service_kits** | id, service_type, inventory_id, default_quantity |
| **session_materials** | id, appointment_id, inventory_id, quantity, status (hold/consumed/released) |
| **payments** | id, appointment_id, paymongo_payment_id, amount, status |
| **invoices** | id, invoice_number (INV-XXXXXX), customer_id, appointment_id, client_name, service_type, amount, payment_method, change_given, discount_amount, discount_type, status, items (JSON), created_at |
| **payouts** | id, artist_id, amount, payout_method, reference_no, status |
| **studio_expenses** | id, category (Inventory/Marketing/Bills/Payouts/Equipment/Licensing/Maintenance/Extras), description, amount, reference_id, created_by, created_at |
| **branches** | id, name, address, operating_hours, current_occupancy, capacity |
| **app_settings** | section (PK), data (JSON) |
| **contact_messages** | id, name, email, phone, subject, message, is_read, created_at |

---

## API Endpoints

### Authentication
- `POST /api/login` - User login (response includes `migratedAppointments` count for guest-to-account migration detection)
- `POST /api/register` - User registration (auto-migrates orphan appointments where `guest_email` matches; response includes `migratedCount`)
- `POST /api/send-otp` / `/api/verify-otp` - OTP verification
- `POST /api/reset-password` - Password reset
- `POST /api/customer/change-password` - Customer password change (requires currentPassword)
- `POST /api/artist/change-password` - Artist password change (requires currentPassword)
- `POST /api/request-email-change` - Request email change OTP (sends code to current email)
- `POST /api/confirm-email-change` - Confirm email change with OTP (updates email, revokes session, triggers re-verification)
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
- `GET /api/admin/analytics?timeframe=monthly|yearly|all` - Analytics (timeframe filters revenue scope; response includes: revenue, appointments, expenses, overhead, artists, styles, inventory, users stats, and raw audit logs for all widget types)
- `GET/POST /api/admin/payouts` - Payout management
- `GET/POST /api/admin/settings` - App settings
- `GET /api/admin/audit-logs` - Audit trail
- `GET /api/admin/pending-payment-alerts` - Completed sessions with outstanding balance (powers PaymentAlertOverlay polling)
- `POST /api/admin/appointments/:id/manual-payment` - Record manual payment (Cash, GCash, Bank Transfer, etc.)

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
- `GET /api/verify` - Email verification landing page (token + email query params)
- `GET /api/invoices/by-number/:invoiceNumber` - Get invoice by invoice number (for customer invoice view)
- `GET /api/admin/expenses` - List all studio expenses (audit ledger)
- `POST /api/admin/expenses` - Create a studio expense entry (category, description, amount)
- `DELETE /api/admin/expenses/:id` - Delete a studio expense entry
- `POST /api/contact` - Public contact form submission (stores message + sends email to studio)

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
10. **Phone Input Standardization:** All phone number inputs across all portals MUST use the reusable `CountryCodeSelect` component (`src/components/CountryCodeSelect.js`) paired with `getPhoneParts()` from `src/constants/countryCodes.js`. The component displays only the dial code (e.g., `+63`) when collapsed and a searchable list of 200+ countries when expanded. Do NOT use native `<select>` elements with hardcoded country lists for phone inputs.
11. **Valid Service Types:** The only valid `service_type` values stored in `appointments` are: `"Tattoo Session"`, `"Consultation"`, `"Piercing"`, and `"Tattoo + Piercing"`. The obsolete values `"Follow-up"` and `"Touch-up"` have been removed from the booking flow.
12. **Booking Flow (Customer Portal):** The "Book New Session" modal in `CustomerBookings.js` uses a two-phase Step 1:
    - **Phase A:** Customer selects "New Booking" or "Follow-Up". Follow-ups require selecting a past completed appointment for traceability (embedded in notes as `📋 Follow-up of Booking INK-XXXX`).
    - **Phase B:** Three checkbox-based service options appear: Tattoo Session, Consultation, Piercing. **Consultation is exclusive** — selecting it grays out Tattoo/Piercing, and vice versa. Tattoo + Piercing can be combined (stored as `"Tattoo + Piercing"` for backend compatibility).
    - The `CustomerBookingWizard.js` (public/anonymous wizard) is NOT affected — it remains a consultation-only flow.
13. **Email Change Flow (Profile Pages):** Both `CustomerProfile.js` and `ArtistProfile.js` implement a consistent two-step modal for email changes:
    - **Step 1 (Enter Email):** User clicks the `Edit2` pencil icon inside the email field → modal opens → user enters new email → client-side validates format and checks it's different from the current email → calls `POST /api/request-email-change` which checks uniqueness and sends an OTP to the **current** email.
    - **Step 2 (Verify OTP):** User enters the 6-digit code using individual input slots (see OTP Input Standards below) → calls `POST /api/confirm-email-change` → on success, email is updated, session is revoked (`localStorage` cleared), and a re-verification email is sent to the **new** address.
    - **State Management:** All modal state is unified into a single `emailModal` object: `{ open, step, newEmail, emailError, otp, otpError, sending, confirming, resendTimer, resendAttempts, resending }`.
14. **OTP Input UI Standards:** All OTP/verification code inputs across the platform (Login, Registration, Email Change) MUST use the **6-slot individual digit input** pattern:
    - 6 separate `<input>` elements, each accepting a single digit (`maxLength={1}`).
    - **Auto-advance:** Focus moves to the next input automatically on entry.
    - **Backspace navigation:** Pressing Backspace on an empty slot clears and focuses the previous slot.
    - **Clipboard paste support:** Pasting a 6-digit code distributes digits across all slots and focuses the last one.
    - Managed via `useRef` array (`otpRefs`) for focus control.
    - Slots turn gold (`#daa520`) border on focus, red (`#ef4444`) border on error.
    - Do NOT use a single text input for OTP entry.
15. **Resend OTP Logic:** The OTP verification step (email change modal) includes a resend mechanism:
    - **Cooldown Timer:** 5-minute (300 seconds) countdown starts when the OTP step is entered. Displayed as `"Resend code in M:SS"`.
    - **Resend Button:** Appears only after the timer reaches zero. Clicking it re-calls `POST /api/request-email-change`, resets the timer to 300s, and increments `resendAttempts`.
    - **Max Attempts:** After 3 resend attempts, the button is permanently replaced with `"Maximum resend attempts reached. Please try again later."` in red.
    - **Reset:** Going "Back" to Step 1 or closing the modal resets both `resendTimer` and `resendAttempts`.
16. **Email Template Standards (Backend):** ALL outbound emails MUST use the `buildEmailHtml(contentHtml)` wrapper function. This ensures:
    - **Dark Luxury Theme:** `#0a0a0a` background, `#111111` card, gold accent bar (`linear-gradient #C19A6B`), `rgba(193,154,107,0.2)` border.
    - **Logo:** Centered company "V" logo loaded from `${FRONTEND_URL}/images/logo.png` at the top of every email.
    - **Typography:** Body text in `#e2e8f0`, subtext in `#888` or `#94a3b8`, headings in `#C19A6B`.
    - **Footer:** "InkVictus Tattoo Studio • BGC, Taguig" + automated message disclaimer.
    - **Content Patterns:** OTP codes use a dark box (`#1a1a1a`) with gold monospace text. Session/booking details use a bordered detail card with labeled rows (Service, Date, Time). CTA buttons use `linear-gradient(135deg, #C19A6B, #8a6c4a)` with uppercase text.
    - Do NOT use inline `<div>` wrapper HTML for email bodies. Always pass content through `buildEmailHtml()`.
17. **Verification Landing Page (`/api/verify`):** The email verification success and error pages use the Dark Luxury theme:
    - **Success:** Dark background (`#050505`), gold border card, Playfair Display serif heading "Verified", checkmark SVG icon in gold-tinted circle, "Continue to Login" button with gold outline.
    - **Error:** Same layout but with red (`#ef4444`) accents, alert icon, "Link Expired" heading.
    - Google Fonts imported: `Playfair Display` (headings) + `Inter` (body).
18. **Notification Types for Account Changes:** When a user changes their email or password, the backend MUST call `createNotification()` with these types:
    - `'email_change'` — Title: "Email Changed", routed to `/customer/profile` or `/artist/profile` on click.
    - `'password_change'` — Title: "Password Changed", routed to `/customer/profile` or `/artist/profile` on click.
    - Both `CustomerNotifications.js` and `ArtistNotifications.js` have `getNotificationStyle` entries: `email_change` uses `Mail` icon (blue), `password_change` uses `ShieldAlert` icon (amber).
    - Clicking these notifications navigates directly to the user's profile page instead of opening the notification detail modal.
19. **Gallery UI Standards (Cross-Portal):** All portfolio/gallery grids across `Gallery.js`, `ArtistGallery.js`, and `AdminUsers.js` (portfolio tab) MUST follow these rules:
    - **Aspect Ratio:** `4/5` portrait ratio enforced via CSS `aspect-ratio: 4/5` with `object-fit: cover`.
    - **Hover Effects:** Gold glow (`box-shadow: 0 0 20px rgba(190, 144, 85, 0.35)`, `border-color: rgba(190, 144, 85, 0.7)`), subtle image scale (`transform: scale(1.04)`), gradient overlay deepening on hover.
    - **Watermark:** Uses `font-family: 'Playfair Display', serif` at `0.7rem`, matching the header typography. Color remains `rgba(255, 255, 255, 0.4)`.
    - **Public Gallery Pricing:** The public `Gallery.js` does NOT display pricing (no "Est. ₱X" and no "Price upon request"). Pricing is only visible in admin/artist portals.
    - **Overlay Title Typography:** Title text uses `color: #C19A6B` with `font-family: 'Playfair Display', serif`. Subtitle/category uses `rgba(255,255,255,0.6)` at `0.72rem`.
    - **Delete Button Animation:** Delete icons are hidden by default (`opacity: 0, transform: scale(0.8)`) and smoothly appear on hover (`opacity: 1, transform: scale(1)`), using a circular red pill button positioned top-right.
20. **Email Spam/Junk Advisory:** Any modal, confirmation dialog, or UI element that triggers an outbound email (OTP, invoice, booking confirmation, status update) MUST include a subtle advisory message visible to the user: *"Please also check your Spam/Junk folder for OTPs, invoices, and booking status emails."* This appears as muted helper text below the primary action or in the confirmation footer.
21. **Payment Resolution Modal Behavior:**
    - The `PaymentAlertOverlay` popup **appears front-and-center only once** per admin session (on the first page load after the alert is detected).
    - After the initial popup is dismissed, it transitions to a **persistent bottom-right toast** that stays visible across page navigations but does NOT re-show the full modal on every page switch.
    - The payment resolution alert also appears as a **notification card** in `AdminNotifications.js` at the top of the list with a light-red tint and a red "Take Action" button that re-opens the full payment modal.
    - The header styling uses a **solid red** background, NOT a gradient.
22. **Shared Analytics Components:** The analytics widget system uses two shared components that are imported by both `AdminAnalytics.js` and `AdminDashboard.js`:
    - **`AnalyticsMetricCards.js`** (`src/components/`): Renders the 9 clickable metric cards (Revenue, Ops Expenses, Overhead, Appointments, Total Users, Active Artists, Inventory Used, Completion Rate, Avg Duration). Accepts `showAll` (boolean) and `variant` ('dark'|'light') props.
    - **`AnalyticsAuditModal.js`** (`src/components/`): Renders the full audit modal overlay when any metric card is clicked. Contains a pie chart + summary table at top, and a **searchable, paginated Transaction Log** table below. Exports shared constants (`RAINBOW_PALETTE`, `EXPENSE_CATEGORIES`, `renderPieLabel`).
    - Both pages MUST open the same audit modal with the same data source. The Dashboard fetches from `/api/admin/analytics?timeframe=monthly` and Analytics supports a dropdown to switch between Monthly/Yearly/All-Time.
    - **CSS Scoping Rule:** Dark-themed metric card styles (`.metric-card`, `.glass-card`, `.metric-label`, `.metric-value`) default to light mode colors. Dark overrides are scoped under `.analytics-dark-page` parent.
23. **Dual-Layer Expense System:** The analytics page tracks two independent expense categories:
    - **Ops Expenses (Automated):** Sum of inventory procurements (`inventory_transactions WHERE type='in'`) + artist payouts (`payouts` table). These are system-generated and cannot be manually edited.
    - **Overhead / Manual Expenses:** Logged by admins via the `studio_expenses` table using the overhead audit modal. Categories: Inventory, Marketing, Bills, Payouts, Equipment, Licensing, Maintenance, Extras. Full CRUD via `GET/POST/DELETE /api/admin/expenses`.
    - These two categories MUST remain strictly separated in the analytics response (`response.expenses` vs `response.overhead`) to prevent double-counting.
24. **Chart Color Standards (Analytics):** All Recharts charts MUST use the `RAINBOW_PALETTE` array of high-contrast, opposing colors: `['#3b82f6', '#ef4444', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6']`. Adjacent chart segments must be visually distinct (no two adjacent warm/cool colors). The old brand-gold-dominant palette is deprecated.
25. **Guest Booking Notifications (SMS + Email):** When a guest (non-logged-in user) books a consultation via the public `CustomerBookingWizard`, the backend sends external confirmations:
    - **SMS:** Sent via `sendSMS()` (Semaphore API) if `guestPhone` is provided. Includes booking code, design idea, date/time.
    - **Email:** Sent via `sendResendEmail()` using `buildEmailHtml()` if `guestEmail` is provided. Uses the dark luxury branded template with full booking details (Ref Code, Design Idea, Date, Time, Method) and a tip encouraging account creation.
    - **Both are sent** if both contact methods are provided. If only one is available, only that channel is used.
    - **Admin Notification:** All admin/manager users receive an in-app notification (`createNotification`) with the guest's name, design idea, contact info, and booking code. No emojis in notification titles.
    - **Data Storage:** Guest contact info is stored in dedicated `guest_email` and `guest_phone` columns on the `appointments` table (not just inside the `notes` field).
26. **Guest Account Migration Flow:** When a guest later creates an InkVistAR account with the same email they used for a prior booking:
    - **Registration (`/api/register`):** After user creation, the backend runs `UPDATE appointments SET customer_id = ? WHERE guest_email = ? AND customer_id != ?` to migrate all orphan appointments to the new account. Returns `migratedCount` in the response.
    - **Login (`/api/login`):** On successful login, the backend checks `COUNT(*) FROM appointments WHERE guest_email = user.email AND customer_id = user.id` and returns `migratedAppointments` in the response.
    - **Frontend (`Login.js`):** Stores `migratedAppointments` in `localStorage` when > 0.
    - **Migration Modal (`CustomerBookings.js`):** On mount, checks `localStorage` for `migratedAppointments`. If present, shows a one-time branded modal titled "Prior Consultation Data Found!" with the count of migrated bookings. The flag is cleared immediately so the modal only appears once.
27. **Guest Avatar Initials Pattern:** In `AdminAppointments.js`, when a client has no profile image (`clientAvatar` is null/empty), their initials are displayed instead of a generic `<User>` icon:
    - **`getInitials(name)` helper:** Strips `(Guest)` suffix, splits by space, takes first letter of first and last name. Single names use the first two characters. Returns `?` for null/empty input.
    - Applied in: list view cards (14px, `#94a3b8`), edit modal avatar (24px, brand gold `#C19A6B`), and the `onError` fallback when avatar images fail to load.

---

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@inkvistar.com | admin123 |
| Artist | artist@inkvistar.com | artist123 |
| Customer | customer@inkvistar.com | customer123 |

---

Full country code list:

Country,ISO Country Codes,Country Code
Afghanistan ,AF/AFG ,93 
Albania ,AL/ALB ,355 
Algeria ,DZ/DZA ,213 
American Samoa ,AS/ASM ,1 684 
Andorra ,AD / AND ,376 
Angola ,AO/AGO ,244 
Anguilla ,ΑΙ/ΑΙΑ ,1 264 
Antarctica ,AQ/ATA ,"672, 64 "
Antigua and Barbuda ,AG/ATG ,1 268 
Argentina ,AR/ARG ,54 
Armenia ,AM / ARM ,374 
Aruba ,AW/ABW ,297 
Ascension Island ,AC/ASC ,247 
Australia ,AU / AUS ,61 
Austria ,AT/AUT ,43 
Azerbaijan ,AZ/AZE ,994 
Bahamas ,BS/BHS ,1 242 
Bahrain ,BH/BHR ,973 
Bangladesh ,BD/BGD ,880 
Barbados ,BB/BRB ,1 246 
Belarus ,BY / BLR ,375 
Belgium ,BE / BEL ,32 
Belize ,BZ/BLZ ,501 
Benin ,BJ/BEN ,229 
Bermuda ,BM/BMU ,1 441 
Bhutan ,BT/BTN ,975 
Bolivia ,BO/BOL ,591 
Bosnia and Herzegovina ,BA / BIH ,387 
Botswana ,BW/BWA ,267 
Brazil ,BR/BRA ,55 
British Virgin Islands ,VG/VGB ,1 284 
Brunei ,BN/BRN ,673 
Bulgaria ,BG/BGR ,359 
Burkina Faso ,BF/BFA ,226 
Burma (Myanmar) ,MM/MMR ,95 
Burundi ,BI/BDI ,257 
Cambodia ,KH / KHM ,855 
Cameroon ,CM/CMR ,237 
Canada ,CA/CAN ,1 
Cape Verde ,CV/CPV ,238 
Cayman Islands ,KY/CYM ,1 345 
Central African Republic ,CF/CAF ,236 
Chad ,TD/TCD ,235 
Chile ,CL/CHL ,56 
China ,CN/CHN ,86 
Christmas Island ,CX/CXR ,61 
Cocos (Keeling) Islands ,CC/CCK ,61 
Colombia ,CO/COL ,57 
Comoros ,KM/COM ,269 
Congo ,CG/COG ,242 
Cook Islands ,CK/COK ,682 
Costa Rica ,CR/CRC ,506 
Croatia ,HR / HRV ,385 
Cuba ,CU/CUB ,53 
Cyprus ,CY/CYP ,357 
Czech Republic ,CZ/CZE ,420 
Democratic Republic of the Congo ,CD/COD ,243 
Denmark ,DK / DNK ,45 
Diego Garcia ,DG/DGA ,246 
Djibouti ,DJ/DJI ,253 
Dominica ,DM/DMA ,1767 
Dominican Republic ,DO/DOM ,"1 809, 1 829, 1 849 "
Ecuador ,EC/ECU ,593 
Egypt ,EG/EGY ,20 
El Salvador ,SV/SLV ,503 
Equatorial Guinea ,GQ/GNQ ,240 
Eritrea ,ER / ERI ,291 
Estonia ,EE / EST ,372 
Ethiopia ,ET/ETH ,251 
Falkland Islands ,FK/FLK ,500 
Faroe Islands ,FO/ FRO ,298 
Fiji ,FJ/FJI ,679 
Finland ,FI/FIN ,358 
France ,FR/FRA ,33 
French Guiana ,GF/GUF ,594 
French Polynesia ,PF/PYF ,689 
Gabon ,GA/GAB ,241 
Gambia ,GM/GMB ,220 
Georgia ,GE/GEO ,995 
Germany ,DE/DEU ,49 
Ghana ,GH/GHA ,233 
Gibraltar ,GI/GIB ,350 
Greece ,GR/GRC ,30 
Greenland ,GL/GRL ,299 
Grenada ,GD/GRD ,1 473 
Guadeloupe ,GP/GLP ,590 
Guam ,GU/GUM ,1 671 
Guatemala ,GT/GTM ,502 
Guinea ,GN/GIN ,224 
Guinea-Bissau ,GW/GNB ,245 
Guyana ,GY/GUY ,592 
Haiti ,HT/HTI ,509 
Holy See (Vatican City) ,VA/VAT ,39 
Honduras ,HN/HND ,504 
Hong Kong ,HK / HKG ,852 
Hungary ,HU/HUN ,36 
Iceland ,IS/IS ,354 
India ,IN/IND ,91 
Indonesia ,ID/IDN ,62 
Iran ,IR/IRN ,98 
Iraq ,IQ/IRQ ,964 
Ireland ,IE/IRL ,353 
Isle of Man ,IM/IMN ,44 
Israel ,IL/ISR ,972 
Italy ,IT/ITA ,39 
Ivory Coast (Côte d'Ivoire) ,CI/CIV ,225 
Jamaica ,JM/JAM ,1876 
Japan ,JP/JPN ,81 
Jersey ,JE/JEY ,44 
Jordan ,JO/JOR ,962 
Kazakhstan ,KZ/KAZ ,7 
Kenya ,KE / KEN ,254 
Kiribati ,KI/KIR ,686 
Kuwait ,KW/KWT ,965 
Kyrgyzstan ,KG/KGZ ,996 
Laos ,LA/LAO ,856 
Latvia ,LV/LVA ,371 
Lebanon ,LB/LBN ,961 
Lesotho ,LS/LSO ,266 
Liberia ,LR/LBR ,231 
Libya ,LY/LBY ,218 
Liechtenstein ,LI/LIE ,423 
Lithuania ,LT/LTU ,370 
Luxembourg ,LU/LUX ,352 
Macau ,MO/MAC ,853 
Macedonia ,MK/MKD ,389 
Madagascar ,MG/MDG ,261 
Malawi ,MW/MWI ,265 
Malaysia ,MY/MYS ,60 
Maldives ,MV/MDV ,960 
Mali ,ML/MLI ,223 
Malta ,MT/MLT ,356 
Marshall Islands ,MH/MHL ,692 
Martinique ,MQ/MTQ ,596 
Mauritania ,MR/MRT ,222 
Mauritius ,MU/MUS ,230 
Mayotte ,YT/MYT ,262 
Mexico ,MX/MEX ,52 
Micronesia ,FM/FSM ,691 
Moldova ,MD/MDA ,373 
Monaco ,MC/MCO ,377 
Mongolia ,MN/MNG ,976 
Montenegro ,ME/MNE ,382 
Montserrat ,MS/MSR ,1 664 
Morocco ,MA/MAR ,212 
Mozambique ,MZ/MOZ ,258 
Namibia ,NA/NAM ,264 
Nauru ,NR/NRU ,674 
Nepal ,NP/NPL ,977 
Netherlands ,NL/NLD ,31 
Netherlands Antilles ,AN/ANT ,599 
New Caledonia ,NC/NCL ,687 
New Zealand ,NZ/NZL ,64 
Nicaragua ,NI/NIC ,505 
Niger ,NE/NER ,227 
Nigeria ,NG/NGA ,234 
Niue ,NU/NIU ,683 
Norfolk Island ,NF/NFK ,672 
North Korea ,KP/PRK ,850 
Northern Mariana Islands ,MP/MNP ,1 670 
Norway ,NO/NOR ,47 
Oman ,OM/OMN ,968 
Pakistan ,PK/PAK ,92 
Palau ,PW/PLW ,680 
Palestine ,PS/PSE ,970 
Panama ,PA/PAN ,507 
Papua New Guinea ,PG/PNG ,675 
Paraguay ,PY/PRY ,595 
Peru ,PE/PER ,51 
Philippines ,PH/PHL ,63 
Pitcairn Islands ,PN/PCN ,870 
Poland ,PL/POL ,48 
Portugal ,PT/PRT ,351 
Puerto Rico ,PR/PRI ,"1 787, 1939 "
Qatar ,QA/QAT ,974 
Republic of the Congo ,CG/COG ,242 
Reunion Island ,RE / REU ,262 
Romania ,RO/ROU ,40 
Russia ,RU / RUS ,7 
Rwanda ,RW/RWA ,250 
Saint Barthelemy ,BL/BLM ,590 
Saint Helena ,SH/SHN ,290 
Saint Kitts and Nevis ,KN/KNA ,1869 
Saint Lucia ,LC/LCA ,1758 
Saint Martin ,MF/MAF ,590 
Saint Pierre and Miquelon ,PM/SPM ,508 
Saint Vincent and the Grenadines ,VC/VCT ,1784 
Samoa ,WS/WSM ,685 
San Marino ,SM/SMR ,378 
Sao Tome and Principe ,ST/STP ,239 
Saudi Arabia ,SA / SAU ,966 
Senegal ,SN/SEN ,221 
Serbia ,RS/SRB ,381 
Seychelles ,SC/SYC ,248 
Sierra Leone ,SL/SLE ,232 
Singapore ,SG/SGP ,65 
Sint Maarten ,SX/SXM ,1721 
Slovakia ,SK/SVK ,421 
Slovenia ,SI/SVN ,386 
Solomon Islands ,SB/SLB ,677 
Somalia ,SO/SOM ,252 
South Africa ,ZA/ZAF ,27 
South Korea ,KR / KOR ,82 
South Sudan ,SS/SSD ,211 
Spain ,ES / ESP ,34 
Sri Lanka ,LK/LKA ,94 
Sudan ,SD / SDN ,249 
Suriname ,SR/SUR ,597 
Svalbard ,SJ/SJM ,47 
Swaziland ,SZ/SWZ ,268 
Sweden ,SE/SWE ,46 
Switzerland ,CH/CHE ,41 
Syria ,SY/SYR ,963 
Taiwan ,TW/TWN ,886 
Tajikistan ,TJ/TJK ,992 
Tanzania ,TZ/TZA ,255 
Thailand ,TH/THA ,66 
Timor-Leste (East Timor) ,TL/TLS ,670 
Togo ,TG/TGO ,228 
Tokelau ,TK/TKL ,690 
Tonga Islands ,ΤΟ/ΤΟΝ ,676 
Trinidad and Tobago ,TT/TTO ,1868 
Tunisia ,TN/TUN ,216 
Turkey ,TR/TUR ,90 
Turkmenistan ,TM/TKM ,993 
Turks and Caicos Islands ,TC/TCA ,1 649 
Tuvalu ,TV/TUV ,688 
Uganda ,UG/UGA ,256 
Ukraine ,UA / UKR ,380 
United Arab Emirates ,AE / ARE ,971 
United Kingdom ,GB/GBR ,44 
United States ,US/USA ,1 
Uruguay ,UY/URY ,598 
US Virgin Islands ,VI/VIR ,1 340 
Uzbekistan ,UZ/UZB ,998 
Vanuatu ,VU/VUT ,678 
Venezuela ,VE/VEN ,58 
Vietnam ,VN/VNM ,84 
Wallis and Futuna ,WF/WLF ,681 
Western Sahara ,EH/ESH ,212 
Yemen ,YE/YEM ,967 
Zambia ,ZM/ZMB ,260 
Zimbabwe ,ZW/ZWE ,263 