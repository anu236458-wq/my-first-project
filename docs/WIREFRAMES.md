# Screen List & Wireframes

Mobile-first responsive design tailored for low-end smartphones, slow networks, and non-technical staff.

---

## 1. Teacher Mark Attendance Screen

### Layout & Flow
- Top App Bar with batch selector and date picker (defaults to Today).
- **Sticky Live Counter**: `Present: 14 | Absent: 3 | Unmarked: 8`
- Student rows with Roll Number, Student Name.
- Touch Target: Two large physical buttons per student `[ P ]` and `[ A ]`.
- Visual State:
  - Default: Neutral outline.
  - Tapped `[ P ]`: High-contrast Green (`#16a34a`), text white, bold.
  - Tapped `[ A ]`: High-contrast Red (`#dc2626`), text white, bold.
- **Bottom Fixed Action Bar**: "Submit Attendance" button.
  - Disabled until Unmarked is 0.
  - Shows remaining count badge: "Mark all 25 students (8 left)".

```text
+------------------------------------------------------+
| [≡] Apex Coaching Institute           [Teacher: Rahul]|
+------------------------------------------------------+
| Batch: [Class 10 Physics (4:00 PM) ▼] Date: [2026-11-15] |
+------------------------------------------------------+
| STICKY COUNTER:                                      |
| [ Present: 18 ]     [ Absent: 4 ]    [ Unmarked: 3 ] |
+------------------------------------------------------+
| Roll 01 | Aarav Sharma                               |
|         [  P  (Green)  ]         [     A      ]      |
+------------------------------------------------------+
| Roll 02 | Ananya Verma                               |
|         [      P       ]         [  A  (Red)  ]      |
+------------------------------------------------------+
| Roll 03 | Devendra Patel                             |
|         [      P       ]         [     A      ]      |
+------------------------------------------------------+
| ... (Fast vertical scroll)                           |
+------------------------------------------------------+
| [ SUBMIT ATTENDANCE (Disabled: 1 unmarked)         ] |
+------------------------------------------------------+
```

---

## 2. Absent List Summary & One-Tap WhatsApp Broadcast Modal / Screen

Triggered immediately upon tapping "Submit Attendance".

### Layout & Flow
- Congratulatory / Confirmation Header: "Attendance Saved for Class 10 Physics".
- Summary Pills: `Present: 21` | `Absent: 4`.
- Absent Students List:
  - Name, Roll No., Parent Name, Parent WhatsApp Phone number.
  - WhatsApp status pill: `[ Not Sent ]` / `[ Sent ]` / `[ Failed ]`.
- Primary CTA: **"📲 Send WhatsApp to All 4 Parents"**
  - Tapping opens confirmation: *"Send automated WhatsApp alert to 4 absent students' parents?"*
  - Shows template preview:
    > "Dear {Parent Name}, {Student Name} was absent from Class 10 Physics on 15 Nov 2026. - Apex Coaching"
  - Upon server dispatch: Button becomes disabled ("Messages Dispatched").
  - Each student row displays live status: `[✓ Sent]` or `[⚠ Failed]`.
  - If any message fails:
    - Provides `[ Retry ]` button.
    - Provides Fallback `[ Send via WhatsApp App (wa.me) ]` link that opens direct chat in WhatsApp!

```text
+------------------------------------------------------+
| < Back to Batches             Attendance Summary     |
+------------------------------------------------------+
| Batch: Class 10 Physics           Date: 15 Nov 2026  |
| Total Present: 21        |        Total Absent: 4    |
+------------------------------------------------------+
| ABSENT STUDENTS LIST (4)                             |
|                                                      |
| 1. Ananya Verma (Roll 02)                            |
|    Parent: Ramesh Verma (+919876543210)              |
|    Status: [ Sent ✓ ]                                |
|                                                      |
| 2. Devendra Patel (Roll 05)                          |
|    Parent: Suresh Patel (+919876543212)              |
|    Status: [ Failed ⚠ - Invalid Number ]             |
|    Action: [🔄 Retry] | [💬 Send via WhatsApp App]   |
|                                                      |
| 3. Rohan Gupta (Roll 09)                             |
|    Parent: Manoj Gupta (+919876543215)               |
|    Status: [ Sent ✓ ]                                |
+------------------------------------------------------+
| [ 📲 SEND WHATSAPP TO ALL 4 PARENTS                ] |
+------------------------------------------------------+
```

---

## 3. Admin Dashboard Screen

### Layout & Flow
- Top Header with Date Filter (Defaults to Today).
- **Stat Cards Grid**:
  - `Total Students`: 120
  - `Present Today`: 108
  - `Absent Today`: 12
  - `Attendance Rate`: 90%
- **Batch Attendance Summary Table**:
  - Batch Name | Timing | Teacher | Attendance | Status
  - Class 10 Physics | 4:00 PM | Rahul | 21/25 (84%) | [ Marked ✓ ]
  - Class 11 Chemistry | 5:30 PM | Priya | 0/30 (0%) | [ Pending ⏳ ]
- **Absent Students Grouped by Batch (Accordion Cards)**:
  - Collapsible cards for each batch.
  - Shows list of absent students with parent contact and message dispatch status.
  - One-tap quick reminder button if not yet sent.

```text
+------------------------------------------------------+
| Apex Institute Admin               Date: [Today ▼]   |
+------------------------------------------------------+
| [ Total: 120 ] [ Present: 108 ] [ Absent: 12 ] [ 90%]|
+------------------------------------------------------+
| BATCHES TODAY                                        |
| • Class 10 Physics (4 PM) - 21/25 Marked  [View List]|
| • Class 11 Chemistry (5 PM) - Not Marked Yet         |
| • Class 12 Maths (6:30 PM) - 28/30 Marked [View List]|
+------------------------------------------------------+
| ABSENT STUDENTS TODAY (12)                           |
| ▼ Class 10 Physics (4 absentees)                     |
|   - Ananya Verma | Parent: 9876543210 | [Sent ✓]     |
|   - Devendra Patel | Parent: 9876543212 | [Failed ⚠] |
|                                                      |
| ▶ Class 12 Maths (2 absentees)                       |
+------------------------------------------------------+
| [Quick Navigation: Batches | Students | Settings]   |
+------------------------------------------------------+
```

---

## 4. Student & Batch Management Screens (Admin)

- Fast searchable & filterable table.
- "Add Student" modal with immediate validation:
  - Name, Roll Number, Batch Selector, Parent Name, Parent WhatsApp (+91 format enforced).
- Active/Inactive toggle.
- "Add Batch" modal:
  - Batch Name, Subject, Timing, Assigned Teacher dropdown.
