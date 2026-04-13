# InkVistAR - Complete System Activity Flow

**Last Updated:** 2026-04-10  
**Based On:** Actual codebase implementation (backend/server.js, web-app/, mobile-app/)

---

> **📋 DOCUMENT SECTIONS:**
> - **Part 1: Technical Activity Flow Diagrams** (Phases 1-6) — System-level flowcharts showing component interactions
> - **Part 2: Narrative Customer Journey** (Chapters 1-10) — Story-based walkthrough following "Maria" from booking to review
> - **Part 3: Advanced Flowchart** — Comprehensive state machine with all decision points, error paths, and edge cases

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           InkVistAR System                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Frontend (Web)          │  Backend (API)            │  Mobile (RN/Expo)   │
│  - React 19              │  - Node.js/Express        │  - 41 Screens       │
│  - 69 Pages              │  - MySQL (Aiven)          │  - Customer/Artist  │
│  - Socket.IO Client      │  - PayMongo Integration   │    Admin Portals    │
├─────────────────────────────────────────────────────────────────────────────┤
│  External Services: PayMongo (Payments), Groq AI (Chatbot), Resend (Email) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: User Registration & Authentication

### 1.1 Customer Registration Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │────▶│  Web/Mobile  │────▶│  Backend     │────▶│   Database   │
│              │     │              │     │              │     │              │
│ 1. Enter     │     │ 2. POST      │     │ 3. Validate  │     │ 4. Check     │
│    details   │     │    /api/     │     │    input,    │     │    existing  │
│    (name,    │     │    register  │     │    hash      │     │    user      │
│    email,    │     │              │     │    password  │     │              │
│    password) │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │◀────│  Web/Mobile  │◀────│  Backend     │
│              │     │              │     │              │
│ 9. Receive   │     │ 8. Redirect  │     │ 6. Create    │
│    email     │     │    to login  │     │    user +    │
│    & verify  │     │              │     │    customer  │
│              │     │              │     │    profile   │
│              │     │              │     │ 7. Send      │
│              │     │              │     │    verify    │
│              │     │              │     │    email     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 1.2 Login Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │────▶│  Frontend    │────▶│  Backend     │────▶│   Database   │
│              │     │              │     │              │     │              │
│ 1. Enter     │     │ 2. POST      │     │ 3. Query     │     │ 4. Return    │
│    email/    │     │    /api/     │     │    user by   │     │    user      │
│    password  │     │    login     │     │    email     │     │    record    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │◀────│  Frontend    │◀────│  Backend     │
│              │     │              │     │              │
│ 7. Redirected│     │ 6. Store     │     │ 5. Validate  │
│    to portal │     │    auth      │     │    password  │
│    (role-    │     │    state,    │     │    & check   │
│    specific) │     │    redirect  │     │    is_deleted│
└──────────────┘     └──────────────┘     └──────────────┘
```

**Key Endpoints:**
- `POST /api/register` - User registration (creates users + profile)
- `POST /api/login` - Authentication
- `POST /api/send-otp` / `POST /api/verify-otp` - OTP verification
- `GET /api/verify` - Email verification link

---

## Phase 2: Appointment Booking (Consultation Request)

### 2.1 Customer Booking Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │────▶│  Booking     │────▶│  Backend     │────▶│   Database   │
│              │     │  Wizard      │     │              │     │              │
│ 1. Select    │     │ 2. Fill      │     │ 3. POST      │     │ 4. Insert    │
│    service   │     │    form:     │     │    /api/     │     │    appointment│
│    type &    │     │ - Design     │     │    admin/    │     │    status=   │
│    date/time │     │   title      │     │    appointments│   │    'pending' │
│              │     │ - Placement  │     │              │     │              │
│              │     │ - Notes      │     │              │     │              │
│              │     │ - Reference  │     │              │     │              │
│              │     │   image      │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │◀────│  Frontend    │◀────│  Backend     │
│              │     │              │     │              │
│ 9. Receive   │     │ 8. Show      │     │ 5. Notify    │
│    email     │     │    success   │     │    Admin     │
│    confirm.  │     │    screen    │     │    (notif)   │
│              │     │              │     │ 6. Notify    │
│              │     │              │     │    Customer  │
│              │     │              │     │ 7. Send      │
│              │     │              │     │    email     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 2.2 Admin Review & Pricing Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Admin      │────▶│  Admin       │────▶│  Backend     │────▶│   Database   │
│              │     │  Portal      │     │              │     │              │
│ 1. View      │     │ 2. Open      │     │ 3. GET       │     │ 4. Fetch     │
│    pending   │     │    appointment│    │    /api/     │     │    appointment│
│    requests  │     │    details   │     │    admin/    │     │    + client  │
│              │     │              │     │    appointments│   │    info      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Admin      │◀────│  Frontend    │◀────│  Backend     │
│              │     │              │     │              │
│ 9. Appointment│    │ 8. Update    │     │ 6. PUT       │
│    assigned  │     │    UI shows  │     │    /api/     │
│    to artist │     │    success   │     │    appointments│
│              │     │              │     │    /:id      │
│              │     │              │     │ 7. Notify    │
│              │     │              │     │    Customer  │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Booking States:**
1. `pending` - Awaiting admin review
2. `confirmed` - Approved and scheduled
3. `in_progress` - Session ongoing
4. `completed` - Session finished
5. `cancelled` / `rejected` - Declined

**Key Endpoints:**
- `POST /api/customer/appointments` - Customer creates booking
- `POST /api/admin/appointments` - Admin creates/updates booking
- `PUT /api/admin/appointments/:id` - Admin updates appointment
- `PUT /api/appointments/:id/status` - Update status
- `GET /api/public/calendar-availability` - Check available dates

---

## Phase 3: Payment Processing

### 3.1 Payment Flow (PayMongo Integration)
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │────▶│  Payment     │────▶│  Backend     │────▶│  PayMongo    │
│              │     │  Page        │     │              │     │  API         │
│ 1. Select    │     │ 2. Choose    │     │ 3. POST      │     │ 4. Create    │
│    payment   │     │    payment   │     │    /api/     │     │    checkout  │
│    type:     │     │    type to   │     │    payments/ │     │    session   │
│    - Deposit │     │    backend   │     │    create-   │     │              │
│    - Full    │     │              │     │    checkout- │     │              │
│    - Custom  │     │              │     │    session   │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │◀────│  Frontend    │◀────│  Backend     │◀────│  PayMongo    │
│              │     │              │     │              │     │  Redirect    │
│ 9. Receive   │     │ 8. Redirect  │     │ 6. Webhook   │     │ 5. User     │
│    confirm.  │     │    to portal │     │    receives  │     │    completes │
│    notification│   │              │     │    payment   │     │    payment   │
│              │     │              │     │    success   │     │              │
│              │     │              │     │ 7. Update    │     │              │
│              │     │              │     │    DB +      │     │              │
│              │     │              │     │    notify    │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 3.2 Payment Status States
```
unpaid → downpayment_paid → paid
```

**Deposit Rules:**
- **Piercing:** ₱500 fixed deposit
- **Tattoo:** ₱5,000 fixed deposit
- **Custom:** User enters amount (min: deposit price, max: remaining balance)

**Key Endpoints:**
- `POST /api/payments/create-checkout-session` - Create PayMongo checkout
- `POST /api/payments/webhook` - PayMongo webhook handler
- `GET /api/appointments/:id/payment-status` - Poll payment status
- `POST /api/admin/appointments/:id/manual-payment` - Manual POS payment

---

## Phase 4: Tattoo Session Execution

### 4.1 Session Management Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Artist     │────▶│  Artist      │────▶│  Backend     │────▶│   Database   │
│              │     │  Portal      │     │              │     │              │
│ 1. View      │     │ 2. Open      │     │ 3. GET       │     │ 4. Fetch     │
│    today's   │     │    session   │     │    /api/     │     │    session   │
│    sessions  │     │    details   │     │    artist/   │     │    + materials│
│              │     │              │     │    :id/      │     │              │
│              │     │              │     │    appointments│   │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Artist     │◀────│  Frontend    │◀────│  Backend     │
│              │     │              │     │              │
│ 9. Session   │     │ 8. UI        │     │ 6. Upload    │
│    marked    │     │    confirms  │     │    before/   │
│    complete  │     │    action    │     │    after     │
│              │     │              │     │    photos    │
│              │     │              │     │ 7. Update    │
│              │     │              │     │    status    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 4.2 Material/Inventory Management
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Artist     │────▶│  Session     │────▶│  Backend     │────▶│   Inventory  │
│              │     │  Modal       │     │              │     │  Table       │
│ 1. Select    │     │ 2. Click     │     │ 3. POST      │     │ 4. Create    │
│    service   │     │    "Add Kit" │     │    /api/     │     │    session_  │
│    kit       │     │    or add    │     │    appointments│ │    materials   │
│              │     │    items     │     │    /:id/     │     │    status=   │
│              │     │              │     │    materials │     │    'hold'    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Artist     │◀────│  Frontend    │◀────│  Backend     │
│              │     │              │     │              │
│ 7. Materials │     │ 6. Show      │     │ 5. Deduct    │
│    marked    │     │    success   │     │    from      │
│    consumed  │     │    message   │     │    stock     │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Material States:**
- `hold` - Reserved for session
- `consumed` - Used during session
- `released` - Returned to inventory

**Session Status Flow:**
```
pending → confirmed → in_progress → completed
                                ↓
                          (photo upload,
                          materials log)
```

**Key Endpoints:**
- `GET /api/artist/:artistId/appointments` - Artist's sessions
- `POST /api/appointments/:id/materials` - Add materials to session
- `POST /api/appointments/:id/release-material` - Release held materials
- `PUT /api/appointments/:id/status` - Update session status
- `PUT /api/appointments/:id/after-photo` - Upload after photo

---

## Phase 5: Post-Session & Financial Settlement

### 5.1 Balance Payment Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │────▶│  Customer    │────▶│  Backend     │────▶│   Database   │
│              │     │  Portal      │     │              │     │              │
│ 1. View      │     │ 2. Click     │     │ 3. GET       │     │ 4. Calculate │
│    remaining │     │    "Pay      │     │    /api/     │     │    remaining │
│    balance   │     │    Balance"  │     │    customer/ │     │    balance   │
│              │     │              │     │    :id/      │     │              │
│              │     │              │     │    appointments│   │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │◀────│  Frontend    │◀────│  Backend     │
│              │     │              │     │              │
│ 7. Payment   │     │ 6. Redirect  │     │ 5. Create    │
│    confirmed │     │    to portal │     │    checkout  │
│              │     │              │     │    session   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 5.2 Admin POS Settlement
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Admin      │────▶│  Admin POS   │────▶│  Backend     │────▶│   Database   │
│              │     │  System      │     │              │     │              │
│ 1. View      │     │ 2. Select    │     │ 3. POST      │     │ 4. Update    │
│    completed │     │    customer  │     │    /api/     │     │    inventory │
│    sessions  │     │    & items   │     │    admin/    │     │    stock     │
│              │     │              │     │    inventory/│     │              │
│              │     │              │     │    :id/      │     │              │
│              │     │              │     │    transaction│   │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Admin      │◀────│  Frontend    │◀────│  Backend     │
│              │     │              │     │              │
│ 7. Receipt   │     │ 6. Show      │     │ 5. Create    │
│    sent to   │     │    receipt   │     │    invoice   │
│    customer  │     │    modal     │     │    record    │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Revenue Split Calculation:**
- Artist commission: `appointment.price × commission_rate` (default 60%)
- Studio share: `appointment.price × (1 - commission_rate)`

**Key Endpoints:**
- `POST /api/admin/appointments/:id/manual-payment` - Record manual payment
- `POST /api/admin/inventory/:id/transaction` - Stock transaction
- `POST /api/admin/send-pos-invoice` - Send POS receipt

---

## Phase 6: Review & Aftercare

### 6.1 Review Submission Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │────▶│  Review      │────▶│  Backend     │────▶│   Database   │
│              │     │  Page        │     │              │     │              │
│ 1. Navigate  │     │ 2. Rate      │     │ 3. POST      │     │ 4. Insert    │
│    to review │     │    1-5 stars │     │    /api/     │     │    review    │
│    page      │     │    + comment │     │    reviews   │     │    status=   │
│    (post-    │     │              │     │              │     │    'pending' │
│    session)  │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │◀────│  Frontend    │◀────│  Backend     │
│              │     │              │     │              │
│ 7. Thank you │     │ 6. Show      │     │ 5. Notify    │
│    message   │     │    success   │     │    Admin     │
│              │     │    state     │     │    (review   │
│              │     │              │     │    pending)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 6.2 Review Moderation (Admin)
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Admin      │────▶│  Admin       │────▶│  Backend     │
│              │     │  Reviews     │     │              │
│ 1. View      │     │ 2. Review    │     │ 3. PUT       │
│    pending   │     │    content,  │     │    /api/     │
│    reviews   │     │    toggle    │     │    admin/    │
│              │     │    showcase  │     │    reviews/:id│
└──────────────┘     └──────────────┘     └──────────────┘
```

**Review States:**
- `pending` - Awaiting admin approval
- `approved` - Visible internally
- `showcased` - Displayed on public homepage
- `rejected` - Hidden from view

**Key Endpoints:**
- `POST /api/reviews` - Submit review
- `GET /api/admin/reviews` - Get all reviews (admin)
- `PUT /api/admin/reviews/:id` - Update review status/showcase

---

## Complete End-to-End Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FULL TATTOO JOURNEY                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Customer                          Admin/Staff                        Artist
   │                                  │                                  │
   ├─▶ 1. Register/Login              │                                  │
   │                                  │                                  │
   ├─▶ 2. Book Consultation           │                                  │
   │         (pending)                │                                  │
   │                                  ├─▶ 3. Review Request              │
   │                                  ├─▶ 4. Set Price                   │
   │                                  ├─▶ 5. Assign Artist               │
   │                                  │                                  │
   │◀─ Payment Notification           │                                  │
   ├─▶ 6. Pay Deposit                 │                                  │
   │         (via PayMongo)           │                                  │
   │                                  ├─▶ 7. Confirm Booking             │
   │         (confirmed)              │                                  │
   │                                  │                                  ├─▶ 8. View Schedule
   │                                  │                                  │
   ├─▶ 9. Visit Studio                │                                  │
   │                                  │                                  ├─▶ 10. Take Before Photo
   │                                  │                                  ├─▶ 11. Log Materials
   │                                  │                                  │     (hold → consumed)
   │                                  │                                  ├─▶ 12. Take After Photo
   │                                  │                                  │
   │                                  ├─▶ 13. Mark Complete              │
   │         (completed)              │                                  │
   │                                  │                                  │
   ├─▶ 14. Pay Balance                │                                  │
   │         (if needed)              │◀─ 15. POS Settlement             │
   │                                  │                                  │
   │◀─ Aftercare Notifications        │                                  │
   ├─▶ 16. Submit Review              │                                  │
   │                                  ├─▶ 17. Moderate Review            │
   │                                  │     (showcase on homepage)       │
   │                                  │                                  │
   └─▶ 18. Thank You / Gallery        │                                  │
```

---

## Database Schema Reference

### Core Tables
| Table | Purpose | Key Status Columns |
|-------|---------|-------------------|
| `users` | All user accounts | `user_type`, `is_verified`, `is_deleted` |
| `appointments` | Tattoo sessions | `status`, `payment_status`, `is_deleted` |
| `payments` | PayMongo transactions | `status` (pending/paid) |
| `session_materials` | Inventory tracking | `status` (hold/consumed/released) |
| `inventory` | Stock management | `current_stock`, `is_deleted` |
| `reviews` | Customer feedback | `status`, `is_showcased` |
| `portfolio_works` | Artist gallery | `is_public`, `is_deleted` |
| `notifications` | In-app notifications | `is_read` |

---

## API Endpoint Summary by Role

### Customer
- `POST /api/register`, `POST /api/login` - Auth
- `POST /api/customer/appointments` - Book session
- `GET /api/customer/:customerId/appointments` - View bookings
- `POST /api/payments/create-checkout-session` - Pay
- `POST /api/reviews` - Submit review

### Artist
- `GET /api/artist/dashboard/:artistId` - Dashboard
- `GET /api/artist/:artistId/appointments` - Sessions
- `POST /api/appointments/:id/materials` - Add materials
- `PUT /api/appointments/:id/status` - Update session
- `PUT /api/artist/profile/:id` - Update profile

### Admin
- `GET/POST/PUT/DELETE /api/admin/appointments` - Full appointment CRUD
- `GET/POST/PUT/DELETE /api/admin/inventory` - Inventory CRUD
- `POST /api/admin/inventory/:id/transaction` - Stock movement
- `POST /api/admin/appointments/:id/manual-payment` - Record payment
- `GET/POST/PUT /api/admin/reviews` - Review moderation
- `GET /api/admin/dashboard` - Analytics

---

## Socket.IO Events (Real-time Features)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join_room` | Client → Server | Join notification room |
| `start_support_session` | Client → Server | Begin chat support |
| `send_message` | Client → Server | Send chat message |
| `end_support_session` | Client → Server | End chat |
| `join_admin_tracking` | Client → Server | Admin joins tracking |
| `support_sessions_update` | Server → Client | Broadcast session updates |

---

## External Integrations

| Service | Purpose | Endpoints |
|---------|---------|-----------|
| **PayMongo** | Payment processing | `/api/payments/webhook`, `/api/payments/create-checkout-session` |
| **Groq AI** | Chatbot (llama-3.3-70b) | `/api/chat` |
| **Resend** | Email delivery | Used internally for verification, receipts |
| **Expo Push** | Mobile notifications | `sendPushNotification()` helper |

---

---

## 🔷 PART 1 ENDS HERE — TECHNICAL FLOWCHARTS COMPLETE
---

## Advanced Flowchart: Complete System State Machine

This section provides a **comprehensive flowchart** with all decision points, branching logic, error handling, and edge cases. Use this for understanding the complete system behavior.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INKVISTAR COMPLETE SYSTEM FLOWCHART                                                   │
│                                         (All Decision Points & State Transitions)                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   START: User   │
                                    │  Visits Website │
                                    └────────┬────────┘
                                             │
                                             ▼
                              ┌──────────────────────────────┐
                              │  Landing Page / Gallery      │
                              │  - Browse artworks           │
                              │  - View artist profiles      │
                              │  - Read testimonials         │
                              └──────────────┬───────────────┘
                                             │
                                             │ Clicks "Book Now"
                                             ▼
                              ┌──────────────────────────────┐
                              │   Is User Logged In?         │─────────────┐
                              └──────────────┬───────────────┘             │
                                     │                                     │
                          ┌──────────┘                                     │
                          │ NO                                             │ YES
                          ▼                                                ▼
              ┌────────────────────────┐                     ┌────────────────────────┐
              │   Registration Flow    │                     │   Login Flow           │
              │                        │                     │                        │
              │ 1. Enter Details       │                     │ 1. Enter email/pass    │
              │ 2. POST /api/register  │                     │ 2. POST /api/login     │
              │ 3. Receive email       │                     │ 3. Validate password   │
              │ 4. Click verify link   │                     │ 4. Check is_deleted    │
              │ 5. Account activated   │                     │ 5. Return user + token │
              └────────────┬───────────┘                     └────────────┬───────────┘
                           │                                              │
                           └──────────────────┬───────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Booking Wizard (4 Steps)    │
                              │                               │
                              │  Step 1: Share Vision         │
                              │    - Design title             │
                              │    - Placement & size         │
                              │    - Reference image upload   │
                              │                               │
                              │  Step 2: Select Date          │
                              │    - Calendar availability    │
                              │    - Check /api/public/       │
                              │      calendar-availability    │
                              │    - Green/Yellow/Red status  │
                              │                               │
                              │  Step 3: Select Time          │
                              │    - Slots: 1PM-8PM           │
                              │    - Validate against booked  │
                              │    - Prevent double-booking   │
                              │                               │
                              │  Step 4: Review & Submit      │
                              │    - Confirm all details      │
                              │    - POST /api/admin/         │
                              │      appointments             │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Appointment Created         │
                              │   Status: 'pending'           │
                              │   Price: 0 (consultation)     │
                              │   Artist: 'admin' (unassigned)│
                              └───────────────┬───────────────┘
                                              │
                                              │ Notifications Sent:
                                              │ - Customer: "Request received"
                                              │ - All Admins: "New booking request"
                                              ▼
                    ┌───────────────────────────────────────────────────┐
                    │            ADMIN PORTAL (Parallel Track)          │
                    │                                                   │
                    │  Admin logs in → Views pending appointments       │
                    │       │                                           │
                    │       ▼                                           │
                    │  ┌─────────────────────────────────┐              │
                    │  │ Review Appointment Details      │              │
                    │  │ - Design idea & reference       │              │
                    │  │ - Requested date/time           │              │
                    │  │ - Customer info                 │              │
                    │  └──────────────┬──────────────────┘              │
                    │                 │                                  │
                    │                 ▼                                  │
                    │  ┌─────────────────────────────────┐              │
                    │  │ Decision: Approve or Reject?    │              │
                    │  └──────────────┬──────────────────┘              │
                    │                 │                                  │
                    │        ┌────────┴────────┐                         │
                    │        │                 │                         │
                    │        ▼                 ▼                         │
                    │   REJECT            APPROVE                        │
                    │   │                 │                              │
                    │   ▼                 ▼                              │
                    │  Set status:     ┌─────────────────────────┐      │
                    │  'rejected'      │ Set Price & Assign      │      │
                    │  Notify customer │ - serviceType: Tattoo   │      │
                    │  Flow ends       │ - price: ₱15,000        │      │
                    │                  │ - artistId: 15          │      │
                    │                  │ - status: 'confirmed'   │      │
                    │                  └────────────┬────────────┘      │
                    │                               │                    │
                    │                               ▼                    │
                    │                  ┌─────────────────────────┐      │
                    │                  │ PUT /api/admin/         │      │
                    │                  │ appointments/:id        │      │
                    │                  └────────────┬────────────┘      │
                    │                               │                    │
                    │                               ▼                    │
                    │                  Notifications Sent:               │
                    │                  - Customer: "Confirmed + Price"   │
                    │                  - Artist: "New appointment"       │
                    └───────────────────────────────────────────────────┘
                                            │
                                            │ Customer Receives Notification
                                            ▼
                              ┌───────────────────────────────┐
                              │   Customer Portal             │
                              │                               │
                              │  Sees: "Payment Required"     │
                              │  Appointment details:         │
                              │  - Total: ₱15,000             │
                              │  - Artist: Juan Dela Cruz     │
                              │  - Date/Time confirmed        │
                              │                               │
                              │  Clicks "Pay Now"             │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Payment Selection Page      │
                              │                               │
                              │  ┌─────────────────────────┐  │
                              │  │ Option A: Downpayment   │  │
                              │  │ ₱5,000 (tattoo)         │  │
                              │  │ ₱500 (piercing)         │  │
                              │  └─────────────────────────┘  │
                              │                               │
                              │  ┌─────────────────────────┐  │
                              │  │ Option B: Full Payment  │  │
                              │  │ ₱15,000 (total)         │  │
                              │  └─────────────────────────┘  │
                              │                               │
                              │  ┌─────────────────────────┐  │
                              │  │ Option C: Custom Amount │  │
                              │  │ Min: deposit, Max: bal. │  │
                              │  └─────────────────────────┘  │
                              │                               │
                              │  Selects option → Confirms    │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Create Checkout Session     │
                              │   POST /api/payments/         │
                              │   create-checkout-session     │
                              │                               │
                              │   Payload:                    │
                              │   - appointmentId: 127        │
                              │   - paymentType: 'deposit'    │
                              │   - price: 15000              │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   PayMongo Gateway            │
                              │   (External Redirect)         │
                              │                               │
                              │  Customer chooses:            │
                              │  - Credit/Debit Card          │
                              │  - GCash                      │
                              │  - Maya                       │
                              │  - GrabPay                    │
                              │                               │
                              │  Completes payment            │
                              └───────────────┬───────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         │                                         │
                         ▼                                         ▼
              ┌──────────────────┐                    ┌──────────────────┐
              │   Payment        │                    │   Payment        │
              │   SUCCESS        │                    │   FAILED         │
              └────────┬─────────┘                    └────────┬─────────┘
                       │                                       │
                       │ POST /api/payments/webhook            │ Redirected back
                       │ (Automatic)                           │ with error
                       ▼                                       │
              ┌──────────────────┐                             │
              │ Webhook Handler  │                             │
              │                  │                             │
              │ 1. Verify HMAC   │                             │
              │    signature     │                             │
              │ 2. Parse event   │                             │
              │ 3. Extract:      │                             │
              │    - appointment │                             │
              │    - amount      │                             │
              │    - paymentType │                             │
              └────────┬─────────┘                             │
                       │                                       │
                       ▼                                       │
              ┌──────────────────────────────────┐             │
              │ Database Updates (Transaction)   │             │
              │                                  │             │
              │ INSERT INTO payments:            │             │
              │   - appointment_id: 127          │             │
              │   - paymongo_payment_id          │             │
              │   - amount: 500000 (centavos)    │             │
              │   - status: 'paid'               │             │
              │                                  │             │
              │ UPDATE appointments:             │             │
              │   - payment_status: 'downpayment_│             │
              │   - status: 'confirmed'          │             │
              └────────┬─────────────────────────┘             │
                       │                                       │
                       │ Notifications:                        │
                       │ - Customer: "Payment confirmed"       │
                       │ - Admin: "₱5,000 received"            │
                       │ - Artist: "Payment confirmed"         │
                       │                                       │
                       │ Email: Receipt sent                   │
                       ▼                                       │
              ┌──────────────────────────────────┐             │
              │   Customer Portal                │             │
              │   Shows: Payment Success         │             │
              │   Appointment: "Confirmed"       │             │
              └────────────────┬─────────────────┘             │
                               │                               │
                               └──────────────┬────────────────┘
                                              │
                                              │ Time passes...
                                              │ (Days/Weeks until appointment)
                                              ▼
                    ┌───────────────────────────────────────────────────┐
                    │           PRE-SESSION NOTIFICATIONS               │
                    │                                                   │
                    │  3 Days Before: "Reminder: Session in 3 days"     │
                    │  1 Day Before: "See you tomorrow at 2PM!"         │
                    │  Day Of: "Ready for transformation today!"        │
                    └───────────────────────────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   SESSION DAY: Studio Visit   │
                              │                               │
                              │  1. Customer arrives (1:45PM) │
                              │  2. Check-in at reception     │
                              │  3. Meet artist for consult   │
                              │  4. Finalize design/placement │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                    ┌───────────────────────────────────────────────────┐
                    │            ARTIST PORTAL (Parallel Track)         │
                    │                                                   │
                    │  Artist logs in → Views "Today's Sessions"        │
                    │       │                                           │
                    │       ▼                                           │
                    │  ┌─────────────────────────────────┐              │
                    │  │ Click on Customer's Session     │              │
                    │  │ Opens Session Modal             │              │
                    │  └──────────────┬──────────────────┘              │
                    │                 │                                  │
                    │                 ▼                                  │
                    │  ┌─────────────────────────────────┐              │
                    │  │ Step A: Upload Before Photo     │              │
                    │  │ - Take photo of bare skin       │              │
                    │  │ - System compresses (800px)     │              │
                    │  │ - Saves as base64               │              │
                    │  │ - PUT /appointments/:id/        │              │
                    │  │   before-photo                  │              │
                    │  └──────────────┬──────────────────┘              │
                    │                 │                                  │
                    │                 ▼                                  │
                    │  ┌─────────────────────────────────┐              │
                    │  │ Step B: Add Service Kit         │              │
                    │  │ - Select kit from dropdown      │              │
                    │  │ - System adds to session_       │              │
                    │  │   materials (status: 'hold')    │              │
                    │  │ - POST /appointments/:id/       │              │
                    │  │   materials                     │              │
                    │  │                                 │              │
                    │  │ Example items:                  │              │
                    │  │ - Numbing cream ×2 (hold)       │              │
                    │  │ - Ink cartridges ×3 (hold)      │              │
                    │  │ - Needle packs ×5 (hold)        │              │
                    │  │ - Aftercare ointment ×1 (hold)  │              │
                    │  └──────────────┬──────────────────┘              │
                    │                 │                                  │
                    │                 ▼                                  │
                    │  ┌─────────────────────────────────┐              │
                    │  │ Step C: Mark "In Progress"      │              │
                    │  │ - PUT /appointments/:id/status  │              │
                    │  │ - status: 'in_progress'         │              │
                    │  │ - Triggers notification         │              │
                    │  └──────────────┬──────────────────┘              │
                    │                 │                                  │
                    │                 ▼                                  │
                    │  ┌─────────────────────────────────┐              │
                    │  │ Step D: Tattoo Session          │              │
                    │  │ - Numbing (15 min)              │              │
                    │  │ - Outlining (30 min)            │              │
                    │  │ - Shading (45 min)              │              │
                    │  │ - Breather (10 min, optional)   │              │
                    │  │ - Details (20 min)              │              │
                    │  │ Total: ~2 hours                 │              │
                    │  └──────────────┬──────────────────┘              │
                    │                 │                                  │
                    │                 ▼                                  │
                    │  ┌─────────────────────────────────┐              │
                    │  │ Step E: Session Complete        │              │
                    │  │ - Take After Photo              │              │
                    │  │ - Log consumed materials        │              │
                    │  │   (hold → consumed)             │              │
                    │  │ - Release unused items          │              │
                    │  │   (hold → released)             │              │
                    │  │ - Mark status: 'completed'      │              │
                    │  └──────────────┬──────────────────┘              │
                    │                 │                                  │
                    │                 ▼                                  │
                    │  ┌─────────────────────────────────┐              │
                    │  │ System Updates:                 │              │
                    │  │ - Deduct consumed from stock    │              │
                    │  │ - Notify Admin: "Session done"  │              │
                    │  │ - Notify Customer: "Pay balance"│              │
                    │  └─────────────────────────────────┘              │
                    └───────────────────────────────────────────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────────┐
                              │   Balance Payment Required    │
                              │                               │
                              │  Breakdown:                   │
                              │  - Total:      ₱15,000        │
                              │  - Deposit:    ₱ 5,000        │
                              │  ─────────────────────        │
                              │  - Remaining:  ₱10,000        │
                              │                               │
                              │  Two payment options:         │
                              └───────────────┬───────────────┘
                                              │
                        ┌─────────────────────┴─────────────────────┐
                        │                                           │
                        ▼                                           ▼
              ┌──────────────────────┐                  ┌──────────────────────┐
              │ OPTION A:            │                  │ OPTION B:            │
              │ Digital Payment      │                  │ In-Studio POS        │
              │ (Customer Portal)    │                  │ (Admin Counter)      │
              │                      │                  │                      │
              │ 1. Open portal       │                  │ 1. Admin opens POS   │
              │ 2. Click "Pay        │                  │ 2. Search customer   │
              │    Balance"          │                  │ 3. See balance:      │
              │ 3. Select amount     │                  │    ₱10,000           │
              │ 4. Pay via PayMongo  │                  │ 4. Customer pays     │
              │    (GCash/Card)      │                  │    cash/card         │
              │ 5. Auto-update DB    │                  │ 5. Admin records:    │
              │                      │                  │    POST /manual-     │
              │                      │                  │    payment           │
              └──────────┬───────────┘                  └──────────┬───────────┘
                         │                                         │
                         │ System Updates:                         │
                         │ - payment_status: 'paid'                │
                         │ - manual_paid_amount: 10000             │
                         │ - manual_payment_method: 'Cash'         │
                         ▼                                         │
              ┌─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    REVENUE SPLIT CALCULATION (Automatic)                │
│                                                                         │
│  Total Price:        ₱15,000                                            │
│  Artist Commission:  60% (from artist profile)                          │
│                                                                         │
│  ┌─────────────────────────────┐   ┌─────────────────────────────┐     │
│  │ Artist Earnings (Juan)      │   │ Studio Share                │     │
│  │ ₱15,000 × 0.60 = ₱9,000     │   │ ₱15,000 × 0.40 = ₱6,000     │     │
│  │                             │   │                             │     │
│  │ Logged in payouts table:    │   │ Studio revenue recorded     │     │
│  │ INSERT INTO payouts:        │   │ (for accounting)            │     │
│  │ - artist_id: 15             │   │                             │     │
│  │ - amount: 9000              │   │                             │     │
│  │ - status: 'pending'         │   │                             │     │
│  │ (paid bi-weekly)            │   │                             │     │
│  └─────────────────────────────┘   └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────────┐
                              │   Aftercare Phase             │
                              │                               │
                              │  Automated daily notifications│
                              │  sent to customer:            │
                              │                               │
                              │  Day 1:   "Keep bandage on"   │
                              │  Day 2-3: "Wash & ointment"   │
                              │  Day 4-7: "Peeling is normal" │
                              │  Week 2:  "Itching = healing" │
                              │  Week 4:  "Mostly healed!"    │
                              └───────────────┬───────────────┘
                                              │
                                              │ 1 week after session
                                              ▼
                              ┌───────────────────────────────┐
                              │   Review Request              │
                              │                               │
                              │  Notification sent:           │
                              │  "Rate your experience!"      │
                              │                               │
                              │  Customer clicks → Review Page│
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Submit Review               │
                              │                               │
                              │  1. Rate 1-5 stars            │
                              │  2. Select quick phrases:     │
                              │     ☑ Great Experience        │
                              │     ☑ Professional            │
                              │     ☑ Clean Studio            │
                              │  3. Optional comment          │
                              │  4. POST /api/reviews         │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Review Record Created       │
                              │                               │
                              │  INSERT INTO reviews:         │
                              │  - customer_id: 42            │
                              │  - artist_id: 15              │
                              │  - appointment_id: 127        │
                              │  - rating: 5                  │
                              │  - comment: "Amazing!"        │
                              │  - status: 'pending'          │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Admin Moderation            │
                              │                               │
                              │  Admin views pending reviews  │
                              │       │                       │
                              │       ▼                       │
                              │  ┌─────────────────────────┐  │
                              │  │ Decision: Showcase?     │  │
                              │  └───────────┬─────────────┘  │
                              │              │                │
                              │     ┌────────┴────────┐       │
                              │     │                 │       │
                              │     ▼                 ▼       │
                              │   YES               NO        │
                              │   │                 │         │
                              │   ▼                 ▼         │
                              │  is_showcased:   status:      │
                              │  true            'approved'   │
                              │  status:         (internal    │
                              │  'approved'       only)       │
                              │  (public on                  │
                              │   homepage)                  │
                              └───────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Journey Complete!           │
                              │                               │
                              │  Customer receives:           │
                              │  "Thank You" message          │
                              │  Link to personal gallery     │
                              │                               │
                              │  Final State:                 │
                              │  ✅ Appointment: completed    │
                              │  ✅ Payment: paid             │
                              │  ✅ Review: showcased         │
                              │  ✅ Artist: paid out (later)  │
                              │                               │
                              │  Customer is now "returning"  │
                              │  - 1 tattoo in history        │
                              │  - Favorite artist set        │
                              │  - Review brings new clients  │
                              └───────────────────────────────┘
```

---

## Error Handling & Edge Cases Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ERROR HANDLING & EDGE CASES                                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ERROR: Payment Failed                    │
├──────────────────────────────────────────┤
│ Cause: Card declined / Insufficient funds│
│                                          │
│ Flow:                                    │
│ 1. PayMongo returns error                │
│ 2. Redirect to payment page with error   │
│ 3. Customer can:                         │
│    - Try different payment method        │
│    - Try different card                  │
│    - Contact support                     │
│                                          │
│ System State:                            │
│ - appointment.status: 'confirmed'        │
│ - appointment.payment_status: 'unpaid'   │
│ - No payment record created              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ERROR: Double Booking Attempt            │
├──────────────────────────────────────────┤
│ Cause: Customer picks already booked slot│
│                                          │
│ Flow:                                    │
│ 1. POST /api/admin/appointments          │
│ 2. Backend checks:                       │
│    SELECT * FROM appointments            │
│    WHERE appointment_date = ? AND        │
│          start_time = ? AND              │
│          status != 'cancelled'           │
│ 3. If conflict found:                    │
│    - Return 400: "Time slot taken"       │
│    - Frontend shows error                │
│    - Customer picks different time       │
│                                          │
│ System State:                            │
│ - No appointment created                 │
│ - Original booking unchanged             │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ERROR: Artist Unavailable (Emergency)    │
├──────────────────────────────────────────┤
│ Cause: Artist cancels last-minute        │
│                                          │
│ Flow:                                    │
│ 1. Admin notified of artist cancellation │
│ 2. Admin reassigns to different artist:  │
│    - PUT /api/admin/appointments/:id     │
│    - Change artist_id                    │
│ 3. Notifications sent:                   │
│    - Customer: "Artist changed"          │
│    - New artist: "New appointment"       │
│    - Old artist: "Appointment removed"   │
│                                          │
│ System State:                            │
│ - appointment.artist_id: updated         │
│ - appointment.status: 'confirmed'        │
│ - Notifications logged                   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ERROR: Customer No-Show                  │
├──────────────────────────────────────────┤
│ Cause: Customer doesn't arrive           │
│                                          │
│ Flow:                                    │
│ 1. Artist marks session as 'no_show'     │
│    (or admin does)                       │
│ 2. System updates:                       │
│    - appointment.status: 'cancelled'     │
│    - Release all held materials          │
│ 3. Notifications:                        │
│    - Admin: "Customer no-show"           │
│    - Customer: "Session cancelled"       │
│                                          │
│ Financial Impact:                        │
│ - Deposit forfeited (non-refundable)     │
│ - Artist still gets commission %         │
│ - Studio keeps deposit for lost time     │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ERROR: Payment Webhook Failed            │
├──────────────────────────────────────────┤
│ Cause: Network issue / Signature mismatch│
│                                          │
│ Flow:                                    │
│ 1. Webhook fails to process              │
│ 2. Fallback: Polling endpoint            │
│    GET /api/appointments/:id/payment-    │
│        status                            │
│ 3. Frontend polls every 5 seconds        │
│ 4. If still unpaid after 30 min:         │
│    - Show "Contact support" message      │
│    - Admin manually verifies payment     │
│                                          │
│ System State:                            │
│ - appointment.payment_status: 'unpaid'   │
│ - payment record may exist (pending)     │
│ - Manual intervention required           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ EDGE CASE: Multi-Session Tattoo          │
├──────────────────────────────────────────┤
│ Cause: Large piece needs multiple visits │
│                                          │
│ Flow:                                    │
│ 1. First session:                        │
│    - Artist marks 'in_progress'          │
│    - Takes progress photo                │
│    - Logs consumed materials             │
│ 2. Between sessions:                     │
│    - appointment.status: 'in_progress'   │
│    - Customer heals (4+ weeks)           │
│ 3. Second session booked:                │
│    - New appointment linked to original  │
│    - parent_appointment_id: 127          │
│ 4. Final session:                        │
│    - Mark 'completed'                    │
│    - All materials consumed              │
│    - Final after photo                   │
│                                          │
│ System State:                            │
│ - Multiple appointments linked           │
│ - Materials tracked per session          │
│ - Total price split across sessions      │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ EDGE CASE: Walk-in Customer (No Account) │
├──────────────────────────────────────────┤
│ Cause: Customer walks in without booking │
│                                          │
│ Flow:                                    │
│ 1. Admin creates appointment:            │
│    - POST /api/admin/appointments        │
│    - customerId: 'admin' (placeholder)   │
│ 2. Session completed                     │
│ 3. Payment via POS                       │
│ 4. Admin can later:                      │
│    - Create customer account             │
│    - Link appointment to real customer   │
│                                          │
│ System State:                            │
│ - appointment.customer_id: 1 (admin)     │
│ - Notes field contains customer info     │
│ - Can be claimed later by registered user│
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ EDGE CASE: Reschedule Request            │
├──────────────────────────────────────────┤
│ Cause: Customer needs different date     │
│                                          │
│ Flow:                                    │
│ 1. Customer requests reschedule:         │
│    - PUT /api/customer/appointments/:id/ │
│        reschedule                        │
│ 2. System validates:                     │
│    - Max 2 reschedules allowed           │
│    - Not within 1 week of appointment    │
│    - New date > current date             │
│ 3. If valid:                             │
│    - Update appointment_date             │
│    - Increment reschedule_count          │
│    - Notify artist                       │
│ 4. If invalid:                           │
│    - Return error message                │
│    - Customer contacts admin             │
│                                          │
│ System State:                            │
│ - appointment.reschedule_count: +1       │
│ - appointment.appointment_date: updated  │
│ - Notifications sent                     │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ EDGE CASE: Refund Request                │
├──────────────────────────────────────────┤
│ Cause: Customer cancels, wants refund    │
│                                          │
│ Flow:                                    │
│ 1. Admin receives refund request         │
│ 2. Admin reviews cancellation policy:    │
│    - < 48hrs: No refund                  │
│    - 48hrs+: Partial/full refund         │
│ 3. Admin processes via PayMongo dashboard│
│    (external to system)                  │
│ 4. Admin updates system:                 │
│    - appointment.status: 'cancelled'     │
│    - appointment.refund_amount: 5000     │
│                                          │
│ System State:                            │
│ - appointment.status: 'cancelled'        │
│ - payment record unchanged               │
│ - Manual refund tracked in notes         │
└──────────────────────────────────────────┘
```

---

## State Transition Matrix

| Entity | Initial State | Trigger | Next State | Final State |
|--------|--------------|---------|------------|-------------|
| **Appointment** | `pending` | Admin approves | `confirmed` | `completed` |
| **Appointment** | `pending` | Admin rejects | `rejected` | (terminal) |
| **Appointment** | `confirmed` | Customer no-show | `cancelled` | (terminal) |
| **Appointment** | `confirmed` | Artist starts | `in_progress` | `completed` |
| **Appointment** | `in_progress` | Multi-session | `in_progress` | `completed` |
| **Payment** | `unpaid` | PayMongo success | `downpayment_paid` | `paid` |
| **Payment** | `unpaid` | Full payment | `paid` | (terminal) |
| **Payment** | `unpaid` | Manual POS | `paid` | (terminal) |
| **Material** | `available` | Added to session | `hold` | `consumed`/`released` |
| **Material** | `hold` | Used in session | `consumed` | (terminal) |
| **Material** | `hold` | Not used | `released` | `available` |
| **Review** | (none) | Customer submits | `pending` | `approved`/`showcased` |
| **Review** | `pending` | Admin approves | `approved` | `showcased` (optional) |
| **User** | `unverified` | Email verify | `verified` | `active` |
| **User** | `active` | Soft delete | `is_deleted=1` | (terminal) |

---

## Decision Tree: Payment Flow

```
Payment Required
       │
       ▼
┌──────────────────────────────────┐
│ Does customer have account?      │
└───────────────┬──────────────────┘
        │                       │
       YES                     NO
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ Login            │   │ Register         │
│ → Portal         │   │ → Verify email   │
└────────┬─────────┘   │ → Portal         │
         │             └────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌─────────────────────────┐
         │ Select Payment Type     │
         └───────────┬─────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌──────────┐  ┌──────────┐
   │Deposit │  │ Full Pay │  │ Custom   │
   │ ₱5,000 │  │ ₱15,000  │  │ Amount   │
   └───┬────┘  └────┬─────┘  └────┬─────┘
       │            │             │
       └────────────┴─────────────┘
                    │
                    ▼
         ┌─────────────────────────┐
         │ PayMongo Gateway        │
         └───────────┬─────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
       SUCCESS                   FAIL
        │                         │
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│ Webhook      │         │ Show error   │
│ → Update DB  │         │ → Retry      │
│ → Notify     │         │              │
└──────────────┘         └──────────────┘
```

---

*This document reflects the actual implementation as of 2026-04-10. Refer to `backend/server.js` for endpoint implementations and `web-app/src/pages/` for frontend flows.*, detailing every touchpoint, system interaction, and stakeholder involved from the moment they decide to get a tattoo until their journey is complete.

---

### Chapter 1: The Decision — "I Want a Tattoo"

**Meet Maria**, a 25-year-old marketing professional who has been considering getting her first tattoo—a meaningful design honoring her grandmother. She discovers InkVistAR through social media or a friend's recommendation.

#### Step 1: First Contact (Homepage Exploration)
```
Maria visits inkvistar.com
    │
    ├──▶ Browses the public Gallery (sees showcased reviews & artist work)
    ├──▶ Reads customer testimonials (approved & showcased by Admin)
    ├──▶ Explores Artist Directory (views profiles, specializations, ratings)
    │
    └──▶ Clicks "Book Consultation" button
```

**System Actions:**
- `GET /api/gallery/works` - Fetches public portfolio pieces
- `GET /api/gallery/art-of-the-day` - Displays featured artwork
- `GET /api/customer/artists` - Lists available artists with ratings

---

### Chapter 2: The Booking — "Let Me Share My Vision"

#### Step 2: Authentication (If Not Logged In)
```
Maria clicks "Book Consultation"
    │
    ├──▶ If new user: Redirected to Registration
    │       │
    │       ├──▶ Enters: Name, Email, Password, Phone
    │       ├──▶ Submits form → POST /api/register
    │       ├──▶ Receives verification email (Resend API)
    │       ├──▶ Clicks verification link → Account activated
    │       └──▶ Returns to booking flow
    │
    └──▶ If existing user: Login
            │
            ├──▶ Enters email + password
            ├──▶ POST /api/login
            └──▶ Redirected to booking wizard
```

**Database Changes:**
```sql
INSERT INTO users (name, email, password_hash, user_type, is_verified, verification_token)
VALUES ('Maria Santos', 'maria@email.com', '$2a$10$...', 'customer', 0, 'abc123token');

INSERT INTO customers (user_id, phone, location, notes)
VALUES (42, '+639171234567', 'Manila, PH', 'First tattoo client');
```

#### Step 3: The Booking Wizard — Sharing Her Vision
```
Maria enters the 4-step Booking Wizard:
│
├── Step 1: Share Your Vision
│   ├── Design Title: "Filipino Sun & Stars Tribute"
│   ├── Placement: "Left forearm, inner side"
│   ├── Size: "Approximately 4 inches"
│   └── Reference Image: Uploads inspiration photo (base64 encoded)
│
├── Step 2: Select Preferred Date
│   ├── Calendar shows availability (green = available, yellow = busy, red = full)
│   ├── System checks: /api/public/calendar-availability
│   └── Maria picks: Saturday, May 15, 2026
│
├── Step 3: Choose Time Slot
│   ├── Available slots: 1:00 PM, 2:00 PM, 3:00 PM... (until 8:00 PM)
│   └── Maria selects: 2:00 PM
│
└── Step 4: Review & Submit
    ├── Sees summary of her request
    └── Clicks "Submit Booking Request"
```

**Backend Processing:**
```javascript
POST /api/admin/appointments
{
  customerId: 42,
  artistId: 'admin',  // Unassigned - goes to studio pool
  date: '2026-05-15',
  startTime: '14:00:00',
  serviceType: 'Consultation',
  designTitle: 'Filipino Sun & Stars Tribute',
  notes: 'DESIGN DETAILS\nIdea: Filipino Sun & Stars...\nPlacement: Left forearm...',
  referenceImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  status: 'pending',
  price: 0  // Consultation is free
}
```

**Notifications Triggered:**
1. **Customer (Maria):** "Your request for a Filipino Sun & Stars Tribute session on May 15, 2026 at 2:00 PM has been received. We will review it shortly!"
2. **All Admins/Managers:** "New Consultation request: 'Filipino Sun & Stars Tribute' for 2026-05-15. Please review and assign pricing."

---

### Chapter 3: The Admin Review — "Let's Make This Official"

#### Step 4: Admin Reviews the Request
```
Admin (Studio Manager) logs into Admin Portal
    │
    ├──▶ Opens Admin Appointments page
    ├──▶ Sees Maria's request in "Pending" status
    ├──▶ Reviews:
    │   ├── Design idea & reference image
    │   ├── Requested date/time
    │   └── Client info (first-time customer)
    │
    └──▶ Decides: This needs a price quote before confirmation
```

#### Step 5: Admin Sets Price & Assigns Artist
```
Admin clicks "Edit" on Maria's appointment
    │
    ├──▶ Changes Service Type: "Consultation" → "Tattoo Session"
    ├──▶ Sets Price: ₱15,000 (based on size, complexity, artist rate)
    ├──▶ Assigns Artist: Selects "Juan Dela Cruz" from dropdown
    │       (Juan specializes in geometric/Filipino patterns)
    ├──▶ Adds internal notes: "Client wants bold lines, black & grey shading"
    └──▶ Clicks "Save Changes"
```

**Backend Update:**
```javascript
PUT /api/admin/appointments/:id
{
  serviceType: 'Tattoo Session',
  artistId: 15,  // Juan's user ID
  price: 15000,
  status: 'confirmed',  // Now confirmed (was pending)
  notes: '...updated notes...'
}
```

**Notifications Triggered:**
1. **Customer (Maria):** "Great news! Your tattoo session has been confirmed for May 15, 2026 at 2:00 PM with artist Juan Dela Cruz. Total price: ₱15,000. Please proceed with payment to secure your slot."
2. **Artist (Juan):** "You have a new appointment scheduled for May 15, 2026 at 2:00 PM. Design: Filipino Sun & Stars Tribute."

---

### Chapter 4: The Payment — "Securing My Slot"

#### Step 6: Maria Receives Payment Notification
```
Maria logs into Customer Portal
    │
    ├──▶ Sees notification: "Payment Required for Appointment #127"
    ├──▶ Clicks notification → Redirected to Payment Page
    └──▶ Sees payment options:
        ├── Option A: Downpayment (₱5,000) - Secure your slot now
        ├── Option B: Full Payment (₱15,000) - Pay everything now
        └── Option C: Custom Amount - Enter specific amount (min ₱5,000)
```

#### Step 7: Maria Chooses Downpayment
```
Maria selects "Downpayment" (₱5,000)
    │
    ├──▶ Clicks "Confirm Selection"
    ├──▶ Backend creates PayMongo checkout session
    │       POST /api/payments/create-checkout-session
    │       { appointmentId: 127, paymentType: 'deposit', price: 15000 }
    │
    ├──▶ Redirected to PayMongo payment gateway
    │       ├── Chooses payment method: Credit Card / GCash / Maya
    │       └── Completes payment: ₱5,000
    │
    └──▶ PayMongo webhook triggers backend update
            POST /api/payments/webhook
```

**Database Updates (Automatic via Webhook):**
```sql
-- Insert payment record
INSERT INTO payments (appointment_id, paymongo_payment_id, amount, status)
VALUES (127, 'pm_abc123', 500000, 'paid');  -- Amount in centavos

-- Update appointment
UPDATE appointments
SET payment_status = 'downpayment_paid',
    status = 'confirmed'
WHERE id = 127;
```

**Notifications Triggered:**
1. **Customer (Maria):** "Your deposit of ₱5,000 for appointment #127 is confirmed. Your slot is secured!"
2. **Admin:** "Payment of ₱5,000 received from Maria Santos for appointment #127 (Downpayment)."
3. **Artist (Juan):** "Payment for appointment #127 is confirmed. See you on May 15!"

**Email Sent:**
- Receipt emailed to maria@email.com with payment details

---

### Chapter 5: The Waiting Period — "Counting Down the Days"

#### Step 8: Pre-Session Notifications
```
Days leading up to the appointment:
│
├── 3 Days Before:
│   └── Maria receives: "Reminder: Your tattoo session is in 3 days!
│                        Please ensure the area is clean and moisturized."
│
├── 1 Day Before:
│   └── Maria receives: "See you tomorrow at 2:00 PM!
│                        Location: InkVistAR Studio, BGC, Taguig"
│
└── Day Of (Morning):
    └── Maria receives: "Ready for your transformation today!
                        See you at 2:00 PM. - Artist Juan"
```

**System:** Automated notifications via `createNotification()` helper

---

### Chapter 6: The Session — "Transformation Day"

#### Step 9: Maria Arrives at the Studio
```
Maria arrives at InkVistAR Studio (1:45 PM)
    │
    ├──▶ Check-in at reception (Admin marks arrival)
    ├──▶ Meets Artist Juan for final consultation
    │   ├── Discusses final design adjustments
    │   ├── Confirms placement on forearm
    │   └── Reviews aftercare expectations
    │
    └──▶ Artist opens session in system
```

#### Step 10: Artist Begins Session Management
```
Juan logs into Artist Portal → Opens "Today's Sessions"
    │
    ├──▶ Clicks on Maria's session (Appointment #127)
    ├──▶ Session Modal opens
    │
    ├──▶ Step A: Upload Before Photo
    │   ├── Takes photo of Maria's bare forearm
    │   ├── System compresses & saves as base64
    │   └── PUT /api/appointments/127/before-photo
    │
    ├──▶ Step B: Add Materials (Service Kit)
    │   ├── Selects "Full Arm Session Kit" from dropdown
    │   ├── System adds items to session_materials:
    │   │   ├── Numbing cream × 2 tubes (status: 'hold')
    │   │   ├── Ink cartridges (Black, Grey) × 3 (status: 'hold')
    │   │   ├── Needle packs (various sizes) × 5 (status: 'hold')
    │   │   └── Aftercare ointment × 1 (status: 'hold')
    │   └── POST /api/appointments/127/materials (bulk add)
    │
    ├──▶ Step C: Mark Session "In Progress"
    │   └── PUT /api/appointments/127/status { status: 'in_progress' }
    │
    └──▶ Step D: Begin Tattooing
            ├── Maria gets numbing cream applied (15 min wait)
            ├── Juan begins outlining (30 min)
            ├── Juan does shading (45 min)
            ├── Short breather (10 min)
            └── Final details & cleanup (20 min)
            Total time: ~2 hours
```

**Material Tracking (Database):**
```sql
INSERT INTO session_materials (appointment_id, inventory_id, quantity, status)
VALUES
  (127, 45, 2, 'hold'),  -- Numbing cream
  (127, 12, 3, 'hold'),  -- Ink cartridges
  (127, 8, 5, 'hold'),   -- Needle packs
  (127, 67, 1, 'hold');  -- Aftercare ointment
```

#### Step 11: Session Completion
```
Juan finishes the tattoo
    │
    ├──▶ Takes After Photo
    │   ├── Clean, well-lit photo of completed tattoo
    │   └── PUT /api/appointments/127/after-photo
    │
    ├──▶ Logs Consumed Materials
    │   ├── Marks used items: 1 numbing cream, 2 ink cartridges, 3 needles
    │   ├── Releases unused items back to inventory
    │   └── POST /api/appointments/127/release-material (for unused)
    │
    ├──▶ Marks Session Complete
    │   └── PUT /api/appointments/127/status { status: 'completed' }
    │
    └──▶ System triggers:
        ├── Inventory deduction (consumed items)
        ├── Notification to Admin: "Session #127 completed"
        └── Notification to Maria: "Your session is complete! Please proceed to payment for any remaining balance."
```

**Material Status Update:**
```sql
-- Consumed items
UPDATE session_materials SET status = 'consumed'
WHERE appointment_id = 127 AND inventory_id IN (45, 12, 8);

-- Released items (unused)
UPDATE session_materials SET status = 'released'
WHERE appointment_id = 127 AND inventory_id = 67;  -- Aftercare (given as freebie)

-- Inventory stock deduction
UPDATE inventory SET current_stock = current_stock - 1 WHERE id = 45;
UPDATE inventory SET current_stock = current_stock - 2 WHERE id = 12;
UPDATE inventory SET current_stock = current_stock - 3 WHERE id = 8;
```

---

### Chapter 7: The Settlement — "Paying the Balance"

#### Step 12: Balance Payment
```
Maria's payment breakdown:
│
├── Total Session Price:        ₱15,000
├── Less: Deposit Paid:         ₱ 5,000
└── Remaining Balance:          ₱10,000
```

**Option A: Digital Payment (Customer Portal)**
```
Maria opens Customer Portal → "My Appointments"
    │
    ├──▶ Sees Appointment #127 with "Pay Balance" button
    ├──▶ Clicks button → Redirected to payment page
    ├──▶ Selects "Full Payment" (₱10,000)
    ├──▶ Completes via PayMongo (GCash)
    └──▶ System updates:
        ├── payment_status = 'paid'
        └── Sends receipt email
```

**Option B: In-Studio POS (Admin Handles)**
```
Admin opens Admin POS System
    │
    ├──▶ Searches for Maria's appointment
    ├──▶ Sees remaining balance: ₱10,000
    ├──▶ Maria pays cash/card at counter
    ├──▶ Admin records payment:
    │   └── POST /api/admin/appointments/127/manual-payment
    │       { amount: 10000, method: 'Cash' }
    │
    └──▶ System updates:
        ├── appointments.manual_paid_amount = 10000
        ├── appointments.manual_payment_method = 'Cash'
        └── appointments.payment_status = 'paid'
```

**Revenue Split Calculation (Automatic):**
```javascript
const totalPrice = 15000;
const artistCommissionRate = 0.60;  // 60% (from Juan's profile)

const artistEarnings = 15000 * 0.60;  // ₱9,000
const studioShare = 15000 * 0.40;     // ₱6,000

// Artist earnings logged for future payout
INSERT INTO payouts (artist_id, amount, status)
VALUES (15, 9000, 'pending');  // Paid bi-weekly
```

---

### Chapter 8: The Aftercare — "Healing Journey"

#### Step 13: Aftercare Notifications
```
System sends automated daily aftercare reminders:
│
├── Day 1 (Same day):
│   └── "Keep the bandage on for 2-3 hours. Gently wash with
│        antibacterial soap and pat dry. Apply thin layer of ointment."
│
├── Day 2-3:
│   └── "Wash 2-3x daily. Apply aftercare ointment. Avoid tight clothing
│        on the area. No soaking in water!"
│
├── Day 4-7:
│   └── "Peeling may start - this is normal! Don't pick or scratch.
│        Continue gentle washing and moisturizing."
│
├── Week 2-3:
│   └── "Itching is normal as skin heals. Apply unscented lotion.
│        Avoid direct sunlight and swimming pools."
│
└── Week 4:
    └── "Your tattoo is mostly healed! Continue using sunscreen (SPF 50+)
         to protect the ink. Send us a healed photo!"
```

**System:** Daily scheduled notifications via cron job or notification queue

---

### Chapter 9: The Review — "Sharing My Experience"

#### Step 14: Review Request
```
1 Week After Session
    │
    └── Maria receives notification:
        "How was your experience? Rate your session with Juan
         and help others discover their perfect artist!"
```

#### Step 15: Maria Submits Review
```
Maria clicks notification → Review Page
    │
    ├──▶ Rates: ⭐⭐⭐⭐⭐ (5 stars)
    ├──▶ Quick-select phrases:
    │   ├── ☑️ "Great Experience"
    │   ├── ☑️ "Excellent Hospitality"
    │   ├── ☑️ "Highly Professional"
    │   └── ☑️ "Loved the Result!"
    │
    ├──▶ Comment: "Juan was amazing! He made me feel comfortable
    │              throughout the entire process. The studio was clean,
    │              and the aftercare instructions were clear. My tattoo
    │              healed perfectly! Highly recommend!"
    │
    └──▶ Submits: POST /api/reviews
```

**Review Record Created:**
```sql
INSERT INTO reviews (customer_id, artist_id, appointment_id, rating, comment, status)
VALUES (42, 15, 127, 5, 'Juan was amazing!...', 'pending');
```

#### Step 16: Admin Moderates Review
```
Admin opens Admin Reviews page
    │
    ├──▶ Sees Maria's 5-star review (status: pending)
    ├──▶ Reads comment, views attached after photo
    ├──▶ Toggles "Showcase on Homepage" = YES
    └──▶ Updates: PUT /api/admin/reviews/:id
        { status: 'approved', is_showcased: true }
```

**Result:** Maria's review now appears on the public homepage, inspiring new customers!

---

### Chapter 10: The End (And New Beginning)

#### Step 17: Journey Complete
```
Maria's tattoo journey is now complete:
│
├── ✅ Registered account
├── ✅ Booked consultation
├── ✅ Paid deposit
├── ✅ Completed tattoo session
├── ✅ Paid remaining balance
├── ✅ Received aftercare support
├── ✅ Submitted review (showcased)
│
└──▶ Maria is now a "returning customer"
     ├── Her profile shows 1 completed tattoo
     ├── She has a favorite artist (Juan)
     ├── She's likely to book again (referral source)
     └── Her showcased review brings in new customers
```

**Final Database State:**
```sql
-- Appointment final state
SELECT * FROM appointments WHERE id = 127;
-- status: 'completed', payment_status: 'paid'
-- before_photo: [base64], after_photo: [base64]

-- Artist earnings from this session
SELECT * FROM payouts WHERE artist_id = 15 AND ...;
-- amount: 9000, status: 'pending' (paid bi-weekly)

-- Maria's review (publicly visible)
SELECT * FROM reviews WHERE appointment_id = 127;
-- rating: 5, is_showcased: true

-- Maria's tattoo history
SELECT * FROM appointments WHERE customer_id = 42;
-- 1 row: her Filipino Sun & Stars tattoo
```

---

## Summary: The Full Circle

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE COMPLETE JOURNEY                         │
│                                                                 │
│  1. Discovery     → Maria finds InkVistAR online               │
│  2. Booking       → Shares vision via booking wizard           │
│  3. Admin Review  → Price set, artist assigned                 │
│  4. Deposit       → ₱5,000 via PayMongo secures slot          │
│  5. Waiting       → Pre-session reminders                      │
│  6. Session Day   → Before photo, tattoo, after photo          │
│  7. Materials     → Kit added, consumed items logged           │
│  8. Balance       → ₱10,000 remaining paid (digital/POS)       │
│  9. Aftercare     → Daily healing notifications                │
│ 10. Review        → 5-star review submitted & showcased        │
│ 11. Thank You     → Personalized message + gallery link        │
│                                                                 │
│  RESULT: Happy customer, paid artist, studio revenue,          │
│          and a public testimonial for future growth!           │
└─────────────────────────────────────────────────────────────────┘
```

---

*This document reflects the actual implementation as of 2026-04-10. Refer to `backend/server.js` for endpoint implementations and `web-app/src/pages/` for frontend flows.*
