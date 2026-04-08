# InkVistAR - Project Reference

## System Architecture

```
InkVistAR/
├── backend/           # Node.js/Express API (Render)
├── web-app/           # React frontend (Vercel)
└── mobile-app/        # React Native/Expo
```

**Tech Stack:** React 19, Node.js, Express, MySQL (Aiven), Socket.IO, PayMongo, Groq AI

---

## Database Tables

| Table | Key Columns |
|-------|-------------|
| **users** | id, name, email, password_hash, user_type (admin/manager/artist/customer), phone, is_verified, is_deleted |
| **artists** | user_id, studio_name, experience_years, specialization, hourly_rate, commission_rate, rating, total_reviews, profile_image, phone |
| **customers** | user_id, phone, location, notes |
| **appointments** | id, customer_id, artist_id, appointment_date, start_time, end_time, design_title, price, status, payment_status, before_photo, after_photo, is_deleted |
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
- `GET /api/customer/artists` - Browse artists (filters: specialization, min_rate, max_rate)
- `POST /api/customer/appointments` - Create appointment
- `POST /api/customer/favorites` - Add favorite
- `GET /api/customer/:userId/favorites` - Get favorites
- `POST /api/payments/create-checkout-session` - PayMongo checkout

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET/POST/PUT/DELETE /api/admin/users` - User management (soft-delete supported)
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
- `GET /api/gallery/works` - Gallery works (filters: category, artist_id, is_public)
- `GET /api/gallery/art-of-the-day` - Featured artwork
- `GET /api/notifications/:userId` - User notifications
- `PUT /api/notifications/:id/read` - Mark read/unread
- `GET /api/appointments/:id/materials` - Session materials
- `POST/PUT /api/appointments/:id/materials` - Manage materials
- `PUT /api/appointments/:id/status` - Update status
- `PUT /api/appointments/:id/details` - Update details
- `PUT /api/appointments/:id/after-photo` - Upload after photo
- `POST /api/appointments/:id/release-material` - Release held materials
- `POST /api/chat` - AI chatbot (Groq: llama-3.3-70b-versatile)
- `GET /api/ar/config` - AR configuration

### Socket.IO Events
- `join_room`, `start_support_session`, `send_message`, `end_support_session`, `join_admin_tracking`, `support_sessions_update`

---

## Key Files

### Frontend (web-app/src/)
- **Routing:** `App.js`
- **Config:** `config.js` (API_URL)
- **Components (15 files):** `ChatWidget.js`, `ConfirmModal.js`, `CustomerBookingWizard.js`, `Footer.js`, `Navbar.js`, `Pagination.js`, `*SideNav.js` (Admin, Artist, Customer, Manager)
- **Pages (69 files):**
  - **Auth:** `Login.js`, `Register.js`, `ResetPassword.js`, `AdminLogin.js`
  - **Admin:** `AdminAnalytics.js`, `AdminAppointments.js`, `AdminBilling.js`, `AdminChat.js`, `AdminClients.js`, `AdminCompletedSessions.js`, `AdminDashboard.js`, `AdminInventory.js`, `AdminNotifications.js`, `AdminPOS.js`, `AdminReviews.js`, `AdminSettings.js`, `AdminStaff.js`, `AdminStudio.js`, `AdminUsers.js`
  - **Artist:** `ArtistAppointments.js`, `ArtistEarnings.js`, `ArtistGallery.js`, `ArtistNotifications.js`, `ArtistPortal.js`, `ArtistProfile.js`, `ArtistSessions.js`
  - **Customer:** `CustomerBookingCreate.js`, `CustomerBookings.js`, `CustomerGallery.js`, `CustomerNotifications.js`, `CustomerPortal.js`, `CustomerProfile.js`, `CustomerReview.js`, `CustomerTransactions.js`
  - **Public/Shared:** `Appointments.js`, `Artists.js`, `BookingConfirmation.js`, `Contact.js`, `Gallery.js`, `Home.js`, `PayMongoPayment.js`, `PaymentSimulation.js`, `PublicArtistProfile.js`, `PublicBooking.js`, `TryOn.js`
  - **Manager:** `ManagerAnalytics.js`, `ManagerAppointments.js`, `ManagerPortal.js`, `ManagerUsers.js`

### Mobile (mobile-app/)
- **Navigation:** `App.js`
- **Screens (41 files):**
  - **Auth:** `LoginPage.jsx`, `RegisterPage.jsx`, `ResetPasswordPage.jsx`
  - **Admin:** `AdminAnalytics.jsx`, `AdminAppointmentManagement.jsx`, `AdminAuditLogs.jsx`, `AdminChat.jsx`, `AdminDashboard.jsx`, `AdminFeatures.jsx`, `AdminInventory.jsx`, `AdminNotifications.jsx`, `AdminPOS.jsx`, `AdminServices.jsx`, `AdminSettings.jsx`, `AdminStaffScheduling.jsx`, `AdminStudio.jsx`, `AdminSystemHealth.jsx`, `AdminTasks.jsx`, `AdminUserManagement.jsx`
  - **Artist:** `ArtistActiveSession.jsx`, `ArtistClientDetails.jsx`, `ArtistClients.jsx`, `ArtistDashboard.jsx`, `ArtistEarnings.jsx`, `ArtistNotifications.jsx`, `ArtistProfile.jsx`, `ArtistSchedule.jsx`, `ArtistSessions.jsx`, `ArtistWorks.jsx`
  - **Customer:** `CustomerARPage.jsx`, `CustomerAppointments.jsx`, `CustomerArtistDirectory.jsx`, `CustomerArtistProfile.jsx`, `CustomerBooking.jsx`, `CustomerChatbotPage.jsx`, `CustomerDashboard.jsx`, `CustomerGallery.jsx`, `CustomerNotifications.jsx`, `CustomerProfilePage.jsx`
  - **Shared:** `ChatScreen.jsx`
- **Components:** `OTPVerification.jsx`, `PlaceholderScreen.jsx`, `Mobile/*` directory

### Backend (backend/)
- **Main Server:** `server.js` (all-in-one, ~200KB)
- **Config:** `.env` (DB, Email, Groq, PayMongo)
- **AI Model:** `model.nlp`
- **Utils:** `utils/emailService.js`
- **Misc:** `AdminFeatures.jsx` (accidental copy from mobile-app)

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

1. **Soft Delete:** `is_deleted` flag on appointments, portfolio_works, inventory, users
2. **Auto-Migrations:** Server adds missing columns on startup (profile_image, studio_name, phone, commission_rate)
3. **Image Storage:** Base64/LONGTEXT in database
4. **Commission:** Artists have `commission_rate` (default 0.60 = 60%)
5. **Material Tracking:** `session_materials` tracks hold→consumed→released lifecycle
6. **Service Kits:** Predefined material bundles for quick session setup
7. **Payment Flow:** PayMongo webhook → `/api/payments/webhook` → updates appointments.payment_status

---

## Tattoo Session Activity Diagram Flowchart

### Flow Sequence
1. **Customer**: Visit Landing Page -> Homepage -> Tattoo Consultation Booking.
2. **Admin**: Confirmation of Booking (Reject/Accept). If Rejected, Customer is notified.
3. **Admin**: Consultation on Schedule -> Consultation with Customer -> Determine the Price of the Tattoo Procedure -> Sends Payment Requirement. If Customer declines, flow ends.
4. **Customer**: Receives Payment Options.
5. **PayMongo API**: Payment Gateway (Full 100% or Down Reservation Fee). Success or Error.
6. **Admin**: Notifies of Payment for Tattoo Session.
7. **Customer**: Tattoo Session Booking.
8. **Admin**: Confirmation of Booking -> Search for Artist.
9. **Artist**: Notifies of being Selected -> Reads & Reviews Task Given by Manager. If Rejected, Admin searches for a new Artist.
10. **Artist**: Schedule Assigned.
11. **Admin**: Tattoo Session Set on Schedule.
12. **Customer**: Commit Before Assigned Schedule. Cancel & Reschedule (goes back to Admin Search for Artist) or Yes.
13. **Customer**: Visit Studio -> Meet Staff & Manager -> Final Design & Placement Decision.
14. **Artist**: Sets Up for Session & Design Reference.
15. **Customer**: Readies for Tattoo Session.
16. **Admin**: Marks Session In-Progress.
17. **Artist**: Take Before Session Photo -> Conducts Tattoo.
18. **Customer/Artist**: Takes Breather (optional) -> Continue on Session.
19. **Artist**: Check if Session is Time Bound. If Yes, Finishes Tattoo -> Takes After Session Photo & Logs Used Consumables. If No, Reschedule for another.
20. **Admin**: Mark Session Completed -> Check Customer Payment Status.
21. **Customer**: Pays Full Tattoo Amount (if Not Paid).
22. **Admin**: Manual Logs Payment (if necessary/manual) -> Sets Notification of Selected Aftercare.
23. **Artist**: Configures Best Aftercare Plan.
24. **Customer**: Receives Daily Aftercare Notification until Healing is Complete -> Review Experience.
25. **Admin**: Receives Review & Option to Showcase. Shows at Landing Page (Yes) or Hide & Logs Customer Review (No).
26. **Customer**: Receives Thanks Message. Flow ends.

---

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@inkvistar.com | admin123 |
| Artist | artist@inkvistar.com | artist123 |
| Customer | customer@inkvistar.com | customer123 |

---

## Recent Changes (2026-03-26)
- ArtistProfile: Fixed profile_image not persisting after refresh (backend now returns profile_image in dashboard response)
- ArtistProfile: Added phone, studio_name, commission_rate fields with improved UI
- ArtistProfile: Password change now requires current password verification
- Backend: Added `/api/artist/change-password` endpoint with bcrypt validation
- Backend: Added studio_name migration for artists table
