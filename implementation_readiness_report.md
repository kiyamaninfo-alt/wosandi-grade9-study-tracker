# Stage 9 Implementation Readiness Test Report

**Target:** `docs/designs/role_based_auth_pin_retirement.md` (DetailedRange Lines 253..341)  
**Standard:** `implementation-readiness-standard`  
**Overall Determination:** 🛑 **FAIL** (3 Blockers, 4 Majors, 2 Nits)

> [!CAUTION]
> **Implementation Halt**: The Detailed Implementation Plan in `role_based_auth_pin_retirement.md` cannot proceed to execution in its current state. Attempting to implement Section 4 (`sidebar.html`) and Section 7 (`study-radar.html`) as currently written will cause unhandled JavaScript `TypeError` / `ReferenceError` exceptions at runtime, break subject management, and leave phantom/orphaned function references.

---

## 1. Reviewer Status

| Reviewer Lens | Status | Findings Contributed |
| :--- | :--- | :--- |
| `egm-implementation-readiness` | **Completed** | 2 Blockers, 2 Majors, 1 Nit |
| `egm-codebase-details` | **Completed** | 1 Blocker, 2 Majors, 1 Nit |
| `egm-style` | **Completed** | Security & Invariant Verification (Zero literal PINs confirmed) |

---

## 2. Executive Summary of Findings

- **🔴 Blockers (3)**:
  1. `submitSubjectForm(e)` and `cancelEditSubject()` in `sidebar.html` are omitted from the refactoring plan despite directly reading `#subjPassword`, which the plan instructs deleting. This causes an immediate `TypeError` / form submission failure.
  2. `promptPin()` deletion in `sidebar.html` will throw `ReferenceError` inside `toggleSubjectActive()` and `deleteSubject()`, as these callers were omitted from the refactoring specification.
  3. `study-radar.html` prescribes editing password logic in phantom/non-existent functions (`executeConfirmedUnitPaper`, `executeResetRepetitionConfirmed`, and `submitFullPaper`).
- **🟡 Majors (4)**:
  4. Non-existent DOM container IDs referenced in `index.html` (`#confirmDialogModal` and `#undoConfirmModal`).
  5. Inaccurate function name in `study-analytics.html` (`submitManualSession` vs `saveManualSession`).
  6. Orphaned `window` global exports and keyboard listeners in `study-analytics.html` following `confirmPinModal` removal.
  7. Missing DOM deletion UI specification for unit deletion in `sidebar.html`.
- **🟢 Nits (2)**:
  8. Incomplete enumeration of corresponding `#*PasswordError` UI alert containers in `index.html`.
  9. Ambiguity regarding multi-tenant overlay precedence and key synchronization between guest and authenticated modes.

---

## 3. Prioritized Findings

### 🔴 Blocker 1: Missing Refactoring of `submitSubjectForm(e)` & `cancelEditSubject()` in `sidebar.html`
* **Reviewer Lens:** `egm-codebase-details` / `egm-implementation-readiness`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L280-L281`, targeting `sidebar.html#L902-L934`
* **Discrepancy Description:**
  The plan specifies removing the DOM inputs `#subjPassword` and `#subjPasswordError` on line 280. However, `sidebar.html`:
  - `submitSubjectForm(e)` (lines 921–932) directly queries `document.getElementById('subjPassword')` and performs `if (passVal !== '[LEGACY_PIN]')`. If the input is removed from HTML without altering this function, `passVal` evaluates to `""`, the check permanently fails, and no subject can ever be added or updated.
  - `cancelEditSubject()` (line 912) executes `document.getElementById('subjPassword').value = ''`, which will throw an unhandled `Uncaught TypeError: Cannot read properties of null (reading 'value')`.
* **Rationale & Recommendation:**
  Explicitly specify the removal of password validation from `submitSubjectForm(e)` and the removal of `#subjPassword` resets from `cancelEditSubject()`. Specify role check: if `ZenithAuth.isAdminUser()` is true, update the master config; if false or guest, save to user/guest scoped storage.

---

### 🔴 Blocker 2: Broken Call Chains via `promptPin()` Deletion in `sidebar.html`
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L281,L286`, targeting `sidebar.html#L843-L865`
* **Discrepancy Description:**
  The plan instructs: "Delete `promptPin()` JavaScript function" (line 281) and only updates `resetSubjectsToDefault()` (line 286). However, in `sidebar.html`:
  - `toggleSubjectActive(code)` (line 844) starts with `if (!promptPin()) return;`.
  - `deleteSubject(code)` (line 858) starts with `if (!promptPin()) return;`.
  Deleting `promptPin()` without refactoring `toggleSubjectActive` and `deleteSubject` will immediately trigger `Uncaught ReferenceError: promptPin is not defined` when any user attempts to toggle or delete a subject.
* **Rationale & Recommendation:**
  Add explicit instructions for `toggleSubjectActive(code)` and `deleteSubject(code)`: remove the `promptPin()` call, replace it with a standard bilingual confirmation dialog (`confirm(...)`), and persist subject changes according to user role/tenant scope.

---

### 🔴 Blocker 3: Phantom Code Touchpoints & Orphaned Handlers in `study-radar.html`
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L321-L322`, targeting `study-radar.html#L7490,L7592,L9269-L9301`
* **Discrepancy Description:**
  1. The plan directs implementers: "In `submitFullPaper()` ... remove password checks". In reality, `submitFullPaper(event)` in `study-radar.html` (lines 9269–9301) already has **zero password checks** in JavaScript; it only has an HTML `required` input attribute in the form `#fpPasswordInput` (line 7380).
  2. The plan directs implementers: "In `executeConfirmedUnitPaper()`: remove password checks". However, `executeConfirmedUnitPaper()` **does not exist** anywhere in `<script>` in `study-radar.html`. It is an orphaned inline HTML attribute on line 7490.
  3. The plan directs implementers: "In `executeResetRepetitionConfirmed()`: Repurpose `#resetRepetitionPasswordInput` ... Validate `inputVal.trim().toUpperCase() === 'RESET'`". However, `executeResetRepetitionConfirmed()` **does not exist** in `<script>` in `study-radar.html` (it is an orphaned inline HTML attribute on lines 7592 and 7598). Instructing an implementer to edit non-existent functions guarantees confusion and failed implementation.
* **Rationale & Recommendation:**
  Differentiate between `index.html` and `study-radar.html`. For `study-radar.html`:
  - Clarify that `submitFullPaper()` only requires removing the DOM input group in HTML.
  - Implement or hook the missing unit paper and reset repetition modal handlers properly in `study-radar.html`, or remove the orphaned modal HTML if those workflows are exclusively handled by `index.html`.

---

### 🟡 Major 4: Inaccurate Modal & Container Element IDs in `index.html`
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L295,L298`, targeting `index.html#L8318,L20122`
* **Discrepancy Description:**
  - Line 295 references removing "`#upPasswordInput` from `#confirmDialogModal`". The modal container is actually `#unitPaperModal`, and the specific wrapper is `#upConfirmCard` (line 8318). `#confirmDialogModal` does not exist in `index.html`.
  - Line 298 references removing "`#undoPasswordInput` from `#undoConfirmModal`". The actual modal element ID is `#undoConfirmPopup` (line 20122).
* **Rationale & Recommendation:**
  Update the element IDs in the plan to `#upConfirmCard` (inside `#unitPaperModal`) and `#undoConfirmPopup` to avoid DOM query misses during automated or manual search-and-replace.

---

### 🟡 Major 5: Inaccurate Function Name in `study-analytics.html`
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L310`, targeting `study-analytics.html#L4506`
* **Discrepancy Description:**
  The plan instructs: "In `submitManualSession()`: remove PIN verification requirement."
  The function in `study-analytics.html` (lines 4506–4639) is named `saveManualSession()`. `submitManualSession()` does not exist.
* **Rationale & Recommendation:**
  Correct the target function name to `saveManualSession()`.

---

### 🟡 Major 6: Dangling Window Exports & Keyboard Listener in `study-analytics.html`
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L309`, targeting `study-analytics.html#L4675-L4695`
* **Discrepancy Description:**
  The plan instructs removing `confirmPinModal()` and `requestPinVerification()`. However, `study-analytics.html` explicitly exposes these on `window` (lines 4675, 4678) and attaches a document-level `keydown` listener (lines 4685–4695) that calls `confirmPinModal()` on `Enter` and `cancelPinModal()` on `Escape`. Removing the functions without removing these bindings will leave dangling references or throw runtime errors when users press keys while modals are displayed.
* **Rationale & Recommendation:**
  Add explicit instructions to remove `window.confirmPinModal`, `window.cancelPinModal`, `window.closePinModal`, `window.requestPinVerification` from lines 4675–4678, and update/remove the keyboard listener in lines 4685–4695 to bind to the new `#deleteSessionConfirmModal`.

---

### 🟡 Major 7: Missing DOM Unit Deletion UI in `sidebar.html`
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L284`, targeting `sidebar.html#L1152-L1156`
* **Discrepancy Description:**
  The plan instructs adding a `deleteLesson()` handler. However, `sidebar.html` currently renders only Jump (`🎯 පනින්න`) and Edit (`✏️ Edit`) buttons in `handleSearch()` (lines 1152–1156). It does not have a delete button in the syllabus search results, nor does `#editForm` have a delete button. The plan omits specifying where the delete trigger UI must be injected into the DOM.
* **Rationale & Recommendation:**
  Specify the exact HTML injection: add a `🗑️ මකන්න` button to `.res-actions` in `renderSearchResults()` / `handleSearch()` and/or a secondary delete button inside `#editForm`.

---

### 🟢 Nit 8: Incomplete Enumeration of Password Error Divs in `index.html`
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L292-L300`
* **Discrepancy Description:**
  The plan explicitly lists removing `#subLessonPasswordError` (line 300) along with its input, but omits mentioning the corresponding error divs for the other password inputs: `#printPaperPasswordError` (line 7977), `#fpPasswordError` (line 8235), `#upPasswordError` (line 8326), `#fupPasswordError` (line 8507), `#ebbPasswordError` (line 20050), `#undoPasswordError` (line 20130), `#urgentRadarPasswordError` (line 19990), and `#resetRepetitionPasswordError` (line 20104).
* **Rationale & Recommendation:**
  List the error containers for all removed password fields to ensure clean DOM cleanup and avoid orphaned CSS styles.

---

### 🟢 Nit 9: Ambiguity in Cache Key Initialization for Guest vs Tenant
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** `role_based_auth_pin_retirement.md#L282,L285`
* **Discrepancy Description:**
  Lines 282 and 285 mention `ZenithAuth.getScopedKey('zenith_custom_units_cache')` and `zenith_guest_custom_units` in `localStorage`. Per `auth-manager.js`, `ZenithAuth.getScopedKey` automatically handles guest fallback by returning unsuffixed keys for guest profiles. Having two separate keys mentioned without defining precedence creates ambiguity for implementers.
* **Rationale & Recommendation:**
  Standardize on `ZenithAuth.getScopedKey('zenith_custom_units_cache')` as the single unified API for both guest and authenticated users.

---

## 4. Verification & Security Invariant Audit

- **Static Secret Integrity**: Verified. There are **zero** literal PIN strings or passwords anywhere in `role_based_auth_pin_retirement.md` lines 253..341.
- **Architectural Guardrails**: Aligns with `GEMINI.md` and `README.md` (no React/Vite, preserves vanilla HTML/PWA architecture, respects guest mode isolation).

---

## 5. Required Action for Pass

The design document `docs/designs/role_based_auth_pin_retirement.md` must be updated to address Blockers 1–3 and Majors 4–7. Once the touchpoint definitions and function names are surgically corrected, Stage 9 Implementation Readiness can be re-tested for a PASS determination.
