# InkVistAR - Updated Activity Diagram

This document contains the corrected UML Activity Diagram for the InkVistAR system, reflecting the actual implementation in the codebase as of April 2026.

## 1. System Discrepancy Report

Below are the primary corrections made from the previous diagram version to align with the current system state:

| Feature Area | Discrepancy in Old Diagram | Corrected System Flow |
| :--- | :--- | :--- |
| **Booking & Pricing** | Separated Consultation and Price determination as linear physical steps. | **Asynchronous Wizard:** Customer shares vision via a 4-step wizard. Admin sets price and assigns artist in one review action. |
| **Registration Fork** | Missing from flow. | **Guest-to-Customer:** Unregistered users generate an "orphan" booking that gets claimed post-registration. |
| **Artist Assignment** | Suggests a manual check for "Artist availability" as a blocking activity. | **Direct Assignment:** Admin identifies availability via calendar and assigns the Artist. Artist sees the task on their specific dashboard. |
| **Payment Layer** | Only shows Full vs. Reservation fee via cards. | **Multi-Tier & Multi-Channel:** Supports Deposit, Full Payment, and Custom Amounts via PayMongo, **PLUS** Admin POS Walk-in Cash settlements. |
| **Rescheduling** | Assumed perfect linear flow. | **Constraints Enforced:** Customers can reschedule (max 2 times, min 7 days prior) or cancel outright. |
| **Material Management** | Misses the inventory lifecycle entirely. | **Hold & Release Pattern:** Artist logs materials which are placed on 'Hold'. Upon completion, unused items are 'Released' and consumed items are deducted from stock. |
| **Session Tracking** | Assumed all tattoos finish in one session. | **Multi-Session Loop:** Artist determines if piece is "Fully Complete" or "Needs Another Session". |
| **Review Moderation** | Implies reviews are logged and immediately visible or hidden. | **Moderation Flow:** Reviews enter a `pending` state. Admin must approve them to make them visible on the public landing page. |

---

## 2. UML Activity Diagram (UML 2.0 Style)

```mermaid
flowchart TD
    %% Global Styles
    classDef startEnd fill:#000,stroke:#000,color:#fff,stroke-width:2px;
    classDef decision fill:#fff,stroke:#000,stroke-width:2px;
    classDef process fill:#f9f9f9,stroke:#333,stroke-width:1px;

    subgraph Customer_Portal ["Customer Portal"]
        Start([●]) ::: startEnd --> Visit[Visit Gallery & Landing Page\n(Chat Support Available)]
        Visit --> BookWizard[Fill 4-Step Booking Wizard]
        BookWizard --> AuthCheck{Is Logged In?}
        AuthCheck -- Yes --> PendingReview{Wait for\nAdmin Review}
        AuthCheck -- No --> OrphanBooking[Create Orphan Booking]
        OrphanBooking --> PromptReg[Prompt Registration]
        PromptReg --> ClaimBooking[Claim Booking to Account]
        ClaimBooking --> PendingReview
        
        PayPrompt[Receive Payment Notification] --> ChoosePayment[Choose Digital Payment Type\n'Deposit, Full, or Custom']
        ChoosePayment --> PayMongo[Process via PayMongo API]
        PayMongo --> PayCheck{Payment\nSuccessful?}
        PayCheck -- No --> ChoosePayment
        
        PostPaymentDecision{Client Choice}
        PayCheck -- Yes --> PostPaymentDecision
        PostPaymentDecision -- "Reschedule\n(<7 days, max 2)" --> WaitSched[Wait for New Date]
        PostPaymentDecision -- "Cancel" --> Cancelled([◎]) ::: startEnd
        PostPaymentDecision -- "Proceed" --> SessionReady[Visit Studio for Session]
        
        SessionReady --> MeetArtist[Final Design Check]
        WaitSched -.-> SessionReady
        
        SettleBalance[Customer Pays Remaining Balance]
        
        AftercareNotif[Receive Daily Aftercare\nNotifications] --> SubmitReview[Submit Experience Review]
        SubmitReview --> End([◎]) ::: startEnd
    end

    subgraph Admin_Portal ["Admin Portal"]
        PendingReview -- "New Request Notif" --> ReviewReq[Review Design & Details]
        ReviewReq --> SetPrice[Set Price & Assign Artist]
        SetPrice --> PayPrompt
        
        AdminPOS[Admin POS Dashboard]
        SettleBalance --> AdminPOS
        AdminPOS --> MarkPaid[Mark Balance as Paid\nGenerate Invoice]
        
        ReviewSubmited[Moderate Review] --> IsApproved{Approve?}
        IsApproved -- Yes --> UpdateGallery[Update Landing Page Gallery]
        IsApproved -- No --> InternalLog[Internal Feedback Log Only]
    end

    subgraph Artist_Portal ["Artist_Portal"]
        PostPaymentDecision -- "Confirmed" --> ViewSchedule[View Session in Artist Dashboard]
        ViewSchedule --> SessionStart[Mark Session 'In Progress']
        SessionStart --> BeforePhoto[Take & Upload Before Photo]
        BeforePhoto --> LogMaterials[Log Materials \n'Set Inventory Items to HOLD']
        
        LogMaterials --> ConductTattoo[Conduct Tattoo Procedure]
        ConductTattoo --> FinishSession[Finish Session & Upload After Photo]
        FinishSession --> ReleaseItems[Release Unused Materials\n'Deduct Consumed from Stock']
        
        ReleaseItems --> IsComplete{Fully Complete?}
        IsComplete -- "No (Multi-session)" --> ScheduleNext[Schedule Next Session]
        IsComplete -- Yes --> StatusComplete[Mark Status: COMPLETED]
        StatusComplete --> ReviewSubmited
    end

    %% Connections
    StatusComplete -.-> SettleBalance
    ScheduleNext -.-> SettleBalance
    StatusComplete -.-> AftercareNotif
```

---

## 3. The Step-by-Step Customer Storyline

This narrative follows **Maria**, a typical client, as she interacts with the InkVistAR system from first discovery to final healing.

### Step 1: Discovery & Unregistered Booking
Maria lands on the InkVistAR homepage. She doesn't have an account yet, so she browses the **Public Gallery**. She interacts with the floating Chat Widget to ask a quick question, then clicks **"Book Consultation"**. 
In the **Booking Wizard**, she uploads a photo of her late grandmother's favorite flower and selects Saturday at 2:00 PM. Since she isn't logged in, the system saves her request as an "Orphan Booking" and prompts her to register. She quickly creates an account, and her booking is automatically claimed to her new dashboard. It is now "Pending Admin Review."

### Step 2: The Official Quote
Behind the scenes, the **Studio Manager (Admin)** sees Maria's request. They see the complexity and assign **Artist Juan**, who specializes in fine-line florals. They set the session price at ₱8,000. Maria receives a notification.

### Step 3: Securing the Slot (With Reschedule Options)
Maria logs into her portal and chooses to pay the **₱2,000 Deposit**. She is redirected to **PayMongo** and pays via GCash. The booking is now "Confirmed." 
*(Note: If Maria had a change of plans, the system guarantees her the right to reschedule up to 2 times, provided she does so at least 1 week prior to the session).*

### Step 4: Transformation Day (Hold & Release)
On Saturday, Maria arrives at the studio. **Artist Juan** opens her session on his tablet:
*   He takes a **"Before Photo"** of her wrist.
*   He adds a "Standard Tattoo Kit" to the session materials, which the system marks as **'Hold'** in the inventory.
*   He marks the session **'In Progress'**. 
When finished, Juan takes the **"After Photo"**, marks the needles as consumed, and releases the unused ink back to stock. Because the tattoo is done, he chooses **"Fully Complete"**. *(If it were a large sleeve, he would select "Needs Another Session").*

### Step 5: Final Settlement (Admin POS)
Maria goes to the front desk to pay her remaining ₱6,000 balance in cash. The Admin logs this transaction in the **Admin POS** system, generating a final invoice and marking her appointment financials as fully settled.

### Step 6: Aftercare & Review Moderation
For the next 7 days, Maria receives automated daily aftercare reminders. A week later, she submits a 5-star review. The Admin reviews it in the Moderation portal and clicks **"Approve"**, allowing Maria's beautiful grandmother-tribute flower to be displayed on the studio's public landing page.
