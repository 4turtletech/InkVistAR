# InkVistAR - Improved Tattoo Session Flow

This document outlines the optimized workflow for InkVistAR, refining the process from initial consultation to final review. This flow minimizes customer friction, ensures artist-led pricing, and leverages automated payment syncing.

## Phase 1: Inbound & Artist Matching
1.  **Customer**: Visits Landing Page -> Uses **Booking Wizard** to submit a "Session Request" (Consultation).
2.  **Admin Portal**: Receives "Pending" request. Admin reviews the vision and **assigns the best-suited Artist** (Step moved up for better accuracy).
3.  **Artist Portal**: Artist receives notification. Reviews design idea, confirms availability, and **determines the Price/Timeline** for the procedure.
4.  **Admin Portal**: Verifies Artist's input and sends the "Payment Requirement" notification to the Customer.

## Phase 2: Commitment & Deposit
5.  **Customer**: Receives notification -> Opens "Booking Details" -> Selects **Payment Option** (Full or Reservation Fee).
6.  **PayMongo API**: Processes transaction. Upon success, triggers **Webhook**.
7.  **System Automation**: Webhook automatically updates the appointment status to "Reserved/Confirmed" and logs the transaction. No manual entry required for digital payments.
8.  **Admin/Artist**: Receives "Confirmed" notification. The appointment is officially set on the schedule.

## Phase 3: The Tattoo Session (Execution)
9.  **Customer**: Visits Studio. **Check-in** process begins.
10. **Artist**:
    *   Finalizes Design & Placement with Customer.
    *   **Marks Session In-Progress**.
    *   Takes **"Before" Photo**.
    *   Conducts the Tattoo (with optional breathers).
11. **Multi-Session Logic**: If the session is time-bound and the tattoo is not finished, the Artist finishes the current session -> Takes **"After" Photo** -> Logs used consumables -> Sets a follow-up date (Reschedule loop).
12. **Completion**: If the tattoo is fully done, the Artist completes the session and logs all final materials.

## Phase 4: Finalization & Aftercare
13. **Admin**: Marks the Appointment as "Completed." 
14. **Customer**: Pays any remaining balance. 
    *   *Digital*: Customer pays via mobile.
    *   *Manual*: Admin logs a cash payment in the "Billing" tab if necessary.
15. **System/Artist**: Notifies selected **Aftercare Plan** based on the tattoo type.
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
*   **Artist-Led Pricing**: The artist who will perform the work sets the price *before* the customer pays, increasing trust and accuracy.
*   **Automated Accounting**: Heavy reliance on PayMongo Webhooks to remove manual logging steps for the Admin.
*   **Adaptive Rescheduling**: Rescheduling loops back to the *same* artist's calendar first to maintain session continuity.
