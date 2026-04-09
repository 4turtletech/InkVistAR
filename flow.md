# InkVistAR - Improved Tattoo Session Flow

This document outlines the optimized workflow for InkVistAR, refining the process from initial consultation to final review. This flow minimizes customer friction, ensures centralized admin/manager pricing, and leverages automated payment syncing.

## Phase 1: Inbound & Artist Matching
1.  **Customer**: Visits Landing Page -> Uses **Booking Wizard** to submit a "Session Request" (Consultation).
2.  **Admin Portal**: Receives "Pending" request. Admin reviews the vision and
3.  **Artist Portal**: Artist receives notification. Reviews design idea and confirms availability.
4.  **Admin Portal**: Admin/Manager determines the **Price/Timeline** for the procedure and sends the "Payment Requirement" notification to the Customer.

## Phase 2: Commitment & Deposit
5.  **Customer**: Receives notification -> Opens "Booking Details" -> Selects **Payment Option** (Full or Reservation Fee).
6.  **PayMongo API**: Processes transaction. Upon success, triggers **Webhook**.
7.  **System Automation**: Webhook automatically updates the appointment status to "Reserved/Confirmed" and logs the transaction. No manual entry required for digital payments.
8.  **Admin/Artist**: Receives "Confirmed" notification. The appointment is officially set on the schedule.

## Phase 3: The Tattoo Session (Execution & Inventory Control)
9.  **Customer**: Visits Studio. **Check-in** process begins via Admin/Artist dashboard.
10. **Artist**:
    *   Finalizes Design & Placement with Customer.
    *   **Preparation**: Artist selects a **Service Kit** (e.g., "Full Backpiece Kit") from Inventory. The system places these items on "Hold" status for the appointment.
    *   **Marks Session In-Progress**: Triggers automated notification to customer.
    *   **Phase Tracking**: Takes **"Before" Photo** (synced to cloud/admin portal).
    *   **Conducts Tattoo**: (with optional breathers logged in session time).
11. **Inventory Consumption**: 
    *   If the session is time-bound and the tattoo is not finished (Multi-session): Artist finishes session -> Takes Progress Photo -> Logs **Used Consumables** from the hold list. The remaining "Hold" items are released back to stock or kept for the next session.
    *   System generates an **Inventory Transaction** (type: "out") for consumed items.
12. **Completion**: If the tattoo is fully done, the Artist completes the session. All linked materials are marked as "Consumed" in the database.

## Phase 4: Financial Finalization (POS & Billing)
13. **Admin**: Marks the Appointment as "Completed." This action generates a line item in the **Point of Sale (POS) system**.
14. **Customer**: Settlement of the remaining balance + any additional aftercare products purchased.
    *   **Digital (Self-Service)**: Customer pays via their portal (PayMongo).
    *   **On-Site (POS)**: Admin utilizes the **AdminPOS** interface to process cash or manual CC payments. 
    *   **Revenue Split**: The system automatically calculates the **Artist Commission** (as per their profile rate) and studio share based on the final billed amount.
15. **System/Artist**: Notifies selected **Aftercare Plan** based on the tattoo type and size.
16. **Customer**: Receives daily aftercare notifications until healing is complete.

## Phase 5: Engagement & Marketing
17. **Customer**: Receives request to **Review Experience**.
18. **Admin**: Receives Review.
    *   **Option to Showcase**: If toggled "Yes," the review and "After" photo automatically appear on the Public Landing Page gallery.
    *   **Logs**: Review is archived for service quality tracking.
19. **Customer**: Receives personalized "Thank You" and link to their Tattoo Gallery.

---

### Key Improvements over Original Flow:
*   **Single-Record Continuity**: No need for a "Tattoo Session Booking" (Step 7 in the old flow). The Consultation Request simply evolves into the Tattoo Session record once the deposit is paid.
*   **Centralized Pricing**: The Admin or Manager sets the verified price *before* the customer pays, increasing trust and shop accuracy.
*   **Automated Accounting**: Heavy reliance on PayMongo Webhooks to remove manual logging steps for the Admin.
*   **Adaptive Rescheduling**: Rescheduling loops back to the *same* artist's calendar first to maintain session continuity.
