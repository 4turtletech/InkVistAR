# InkVistAR Business Flows (Point of View)

This document outlines the operational business flow of InkVistAR from the perspective of the three main roles: Customer, Admin, and Artist. These workflows reflect the strict logic and safeguards hardcoded into the system.

---

## 1. Customer POV

1. **Entry & Booking**
   - Goes through the Mobile App or Web App.
   - Logs in or Registers for an account.
   - Submits an Appointment request (selects service type, date, time, and uploads reference ideas).
   - *System Action:* Appointment is created with a `pending` status. Admin is notified.

2. **Consultation & Quoting**
   - Customer receives a message or call from the Admin to discuss the design, sizing, and final pricing.
   - Customer checks their app to see the updated Quoted Price and Assigned Artist.

3. **Financial Clearance (Downpayment)**
   - Customer proceeds to pay via the app (Downpayment, Full Amount, or Custom Amount).
   - *System Rules:* The minimum downpayment tier is strictly hardcoded: **₱500** for Piercings and **₱5,000** for Tattoo Sessions (or mixed services).
   - *System Action:* Upon successful PayMongo checkout, the appointment status automatically flips from `pending` to `confirmed`.

4. **Day of Appointment**
   - Customer goes to the studio on their scheduled date and receives the tattoo/piercing.
   - **Post-Session:** If the customer only paid the downpayment, the Studio Staff will prompt them to pay the remaining balance before leaving.

---

## 2. Admin / Studio Staff POV

1. **Receiving Requests**
   - Admin receives a push/in-app notification of a new `pending` booking.
   - Admin reviews the reference images, placement notes, and customer health profile.

2. **Quoting & Assignment**
   - Admin communicates with the customer to finalize the scope of work.
   - Admin opens the Appointment Modal, inputs the agreed-upon `price`, and selects the appropriate `artist` from the roster. 
   - Admin saves the appointment. It remains `pending` until the customer pays.

3. **Payment Tracking**
   - Admin waits for the financial clearance.
   - *System Action:* When the customer pays the downpayment, the Admin receives a "Payment Received" notification, and the slot is officially locked.

4. **Day of Appointment & Settlement**
   - Admin greets the customer at the studio.
   - Once the Artist finishes the session and marks it as `completed`, the Admin checks the appointment for any outstanding balance.
   - Admin collects the remaining balance via Cash, POS, or manual invoice.
   - Admin manually updates the appointment's `payment_status` to `paid` to finalize the ledger.

---

## 3. Artist POV

1. **Schedule Assignment**
   - Artist receives an "Appointment Scheduled" notification once the Admin assigns them to a confirmed, paid-down booking.
   - Artist views the booking details (Design, Placement, Customer Notes) in their Upcoming Schedule.

2. **Session Start (The Financial Gate)**
   - Day of the appointment: The Artist opens the "Active Session" workspace.
   - *System Rule:* The **"Start Procedure"** button is structurally locked. The Artist CANNOT start the session timer if the customer's payment status is `unpaid`.
   - Once cleared (downpayment received), the Artist clicks "Start Procedure". The status changes to `in_progress` and the audit timer begins.

3. **Execution & Inventory Logging**
   - During the session, the Artist logs the supplies and needles used via the "Material Tracker".
   - *System Action:* Materials are automatically deducted from the Admin's global studio inventory, and the material cost is calculated against the session's profit margin.

4. **Completion & Portfolio**
   - The Artist takes a final "Result Photo" (After photo) and clicks "Complete Session". The status changes to `completed`.
   - If there is an outstanding balance, the app warns the Artist to ensure the Admin collects the final payment at the front desk.
   - The Artist may click "Publish to Portfolio" to showcase the work on their public profile (subject to the customer's marketing consent flag).
   - *System Action:* The Artist's commission (dynamically calculated based on their backend `commission_rate`) is automatically routed to their "Pending Payouts" ledger.
