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
  - **Button Standards:** All interactive action buttons across all portals MUST use the global `.btn` classes (e.g., `.btn.btn-primary`, `.btn.btn-secondary`, or `.btn.btn-brand-gold`). Do NOT use inline styles to override background colors or use legacy one-off classes like `.btn-indigo`.
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
| **appointments** | id, booking_code, customer_id, artist_id, secondary_artist_id, commission_split, appointment_date, start_time, end_time, design_title, price, status, payment_status, before_photo, after_photo, session_duration, audit_log, is_deleted |
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