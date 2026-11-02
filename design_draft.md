# Role-Based Authorization and Hardcoded PIN Retirement

*   **Author:** EGM Drafting Engine & Antigravity
*   **Status:** Draft
*   **Date:** 2026-11-02

--------------------------------------------------------------------------------

## Overview

This project transitions the Zenith / Wosandi Grade 9 Study Tracker from static client-side PIN checks (`3408` and `340800`) to a multi-tenant role-based authorization model. The core design ensures that platform master curriculum data (`canonical_syllabus`) is strictly restricted to verified platform administrators, while regular students and guests retain complete independence to customize their personal syllabus and track progress without repetitive, disruptive password barriers. Accidental historical data loss is prevented through typed confirmation words (`"RESET"`), while routine tracking actions utilize standard confirmation dialogs with explicit cancellation controls.

## The Problem

1. **False Security & Exposure of Secrets:** Hardcoded PINs (`3408` and `340800`) are embedded directly in client-side JavaScript, HTML source code, and error messages. Any user who inspects client assets can read the PIN, providing no real security.
2. **Master Curriculum Vulnerability:** Canonical syllabus mutations in `sidebar.html` previously relied solely on knowledge of PIN `3408`. Any student or guest who entered this number could modify or delete shared master units for all students.
3. **Severe Study Flow Interruption:** Routine, daily student actions (e.g., ticking homework done, logging a paper mark, marking a printed paper collected, or completing a spaced repetition stage) were repeatedly interrupted by password prompts, discouraging consistent daily tracking.
4. **Contractual Inconsistency:** Project documentation and EGM contracts mandated maintaining PIN `3408`, conflicting with the multi-tenant role model established by `ZenithAuth`.

## Goals

*   **Eliminate Static Secrets:** Completely remove hardcoded checks for `3408` and `340800` across all application forms, modals, and JavaScript logic.
*   **Guaranteed Master Syllabus Protection:** Restrict all write operations (`INSERT`, `UPDATE`, `DELETE`) on `canonical_syllabus` strictly to authenticated administrators validated via `ZenithAuth.isAdminUser()`. Ensure zero code paths allow non-admin users to modify `canonical_syllabus`.
*   **Tenant-Scoped Customizations for Students and Guests:** Allow students and guests to add, edit, and toggle subjects and units freely, persisting changes exclusively to their tenant scope (`user_subjects_config`, `user_custom_units`, or guest local storage).
*   **Deliberate Destruction Guards:** Safeguard cumulative historical resets (Spaced Repetition cycle reset and default subjects restoration) behind a typed phrase confirmation (`"RESET"`), normalized with `.trim().toUpperCase() === 'RESET'`, with clear bilingual Sinhala/English instructions.
*   **Frictionless Daily Tracking:** Provide standard confirmation modals with clearly visible affirmative and cancel buttons for routine tracking and individual record modifications (e.g., activity undo, deleting an exam record).
*   **Contract Alignment:** Update `GEMINI.md` and both EGM blueprint contracts to codify the role-based authorization model without recording secret values.

## Non-Goals

*   **No Schema Alterations:** Modifying database table definitions or altering Supabase column definitions (`user_custom_units` and `user_subjects_config` already exist in `schema_multitenant_zenith.sql`).
*   **No Disruption of 1-Level Hierarchy:** Changing the strict 1-level unit hierarchy rule (main units only, no sub-units).
*   **No Compulsory Login for Tracking:** Requiring account registration or login for daily study tracking; Guest Mode (`wosandi_legacy_user`) remains fully functional.
*   **No Complex Token/Session Architecture:** Introducing server-side session cookies or OAuth token refresh workflows beyond existing Supabase authentication.

## Open Questions

*   **Question 1**: How should unit conflict resolution behave when an administrator updates a unit in `canonical_syllabus` that a student has previously customized in `user_custom_units`? (Resolution: Student's personal customization takes precedence in their own view, leaving `canonical_syllabus` intact for others).

--------------------------------------------------------------------------------

## Critical User Journeys (CUJs)

### CUJ 1: Daily Student Study & Review Tracking
*   **Given**: An authenticated student or guest user is viewing the dashboard in `index.html`.
*   **When**: The user clicks to complete a Spaced Repetition stage, logs a Unit Paper score, marks an urgent radar unit revised, or marks a printed test paper collected.
*   **Then**: The action executes immediately or presents a standard confirmation dialog with an explicit "Confirm" and "Cancel" button. No password or PIN prompt is displayed. The record is persisted and visual feedback is rendered.

### CUJ 2: Student Syllabus Customization
*   **Given**: An authenticated student (non-admin) or guest opens `sidebar.html` to add a new unit or modify an existing unit name to match their school curriculum.
*   **When**: The student submits the "Add Unit" or "Edit Unit" form without entering any password.
*   **Then**: The application detects `ZenithAuth.isAdminUser() === false`. The modification is written to `user_custom_units` in Supabase (if logged in) or local storage (if guest). `canonical_syllabus` is never touched, and other users see no change to the master syllabus.

### CUJ 3: Platform Administrator Master Syllabus Update
*   **Given**: An administrator authenticated as `krishaja@gmail.com` opens `sidebar.html`.
*   **When**: The administrator adds a new unit or edits a unit title.
*   **Then**: `ZenithAuth.isAdminUser()` evaluates to `true`. The change is committed directly to `canonical_syllabus` in Supabase and propagates to all students who have not overridden that unit.

### CUJ 4: High-Impact Reset (Spaced Repetition / Default Subjects)
*   **Given**: A user clicks the "Reset Spaced Repetition Cycle" button in `index.html` or "Reset to Default Subjects" in `sidebar.html`.
*   **When**: The confirmation modal opens, instructing the user in Sinhala and English to type `"RESET"`.
*   **Then**: If the user types `"reset"`, `"RESET"`, or `" RESET "` (evaluated via `.trim().toUpperCase() === 'RESET'`), the reset executes. If any other input is submitted, the reset is blocked and a validation error is displayed.

--------------------------------------------------------------------------------

## Technical Plan (Architecture)

### 1. Authorization & Data Routing Architecture

The core architectural change decouples administrative curriculum authority from individual student syllabus tailoring, replacing static PIN matching with identity-based routing and explicit typed confirmations:

```mermaid
flowchart TD
    UserAction["User Action in UI"] --> ActionType{"Action Category"}
    
    ActionType -->|"Curriculum Mutation (sidebar.html)"| AdminCheck{"ZenithAuth.isAdminUser()?"}
    AdminCheck -->|"Yes (Admin)"| WriteCanonical["Write to canonical_syllabus in Supabase"]
    AdminCheck -->|"No (Student/Guest)"| ScopeCheck{"User Authenticated?"}
    ScopeCheck -->|"Yes (Student)"| WriteCustom["Upsert to user_custom_units table"]
    ScopeCheck -->|"No (Guest)"| WriteLocal["Save to g9_canonical_units_cache in localStorage"]

    ActionType -->|"High-Impact Wipe (SR / Subject Reset)"| TypedCheck{"Input .trim().toUpperCase() === 'RESET'?"}
    TypedCheck -->|"Yes"| ExecWipe["Execute Cumulative Reset"]
    TypedCheck -->|"No"| BlockWipe["Display Validation Error"]

    ActionType -->|"Routine Study Tracking (index.html)"| StandardModal["Standard Confirm Modal (Confirm / Cancel)"]
    StandardModal --> ExecRoutine["Persist to user progress tables (tracker_progress, etc.)"]
```

### 2. Syllabus Loading & Merging Pipeline

When `sidebar.html`, `index.html`, or `study-radar.html` loads units:
1. **Master Base Query:** Fetch `canonical_syllabus` ordered by `sort_order`.
2. **Tenant Overlay Query:**
   - If user is authenticated (`user.id` exists): Query `user_custom_units` where `user_id = user.id`.
   - If user is guest: Read custom units from `localStorage` key `zenith_guest_custom_units`.
3. **Merge Algorithm:**
   - Map master units by composite key `${subject}_${unit_number}`.
   - For each custom unit, if `is_deleted === true`, exclude from display list; otherwise, override matching master unit title or append as a custom unit.
   - Sort by unit number and render.

### 3. Component Modifications and Code Touchpoints

#### A. `sidebar.html` (Syllabus & Subject Management)
*   **DOM Removals:**
    - Remove `<input id="addPassword">` and `<div id="addPasswordError">`.
    - Remove `<input id="editPassword">` and `<div id="editPasswordError">`.
    - Remove `<input id="subjPassword">` and `<div id="subjPasswordError">`.
*   **Function Refactoring:**
    - Remove `promptPin()` entirely.
    - `submitNewLesson()`: Remove password check. Check `if (ZenithAuth.isAdminUser()) { supabase.from('canonical_syllabus').insert(...) } else { saveUserCustomUnit(...) }`.
    - `submitEditLesson()`: Remove password check. Check `if (ZenithAuth.isAdminUser()) { supabase.from('canonical_syllabus').update(...) } else { saveUserCustomUnit(...) }`.
    - `toggleSubjectActive()`, `deleteSubject()`: Remove `promptPin()`. Subject changes persist to `user_subjects_config` (authenticated) or `localStorage` (guest) via `saveSubjects()`.
    - `resetSubjectsToDefault()`: Replace `promptPin()` with typed `"RESET"` prompt:
      ```javascript
      const phrase = prompt("පෙරනිමි විෂයයන් 13 යථා තත්ත්වයට පත් කිරීමට RESET ලෙස ටයිප් කරන්න / Type RESET to restore:");
      if (!phrase || phrase.trim().toUpperCase() !== 'RESET') {
        alert("⚠️ තහවුරු කිරීම අසාර්ථක විය. RESET ලෙස ටයිප් කළ යුතුය.");
        return;
      }
      ```

#### B. `index.html` (Main Dashboard PWA)
*   **DOM Removals:**
    - Remove `#printPaperPasswordInput` from `#printPaperConfirmPopup`.
    - Remove `#fpPasswordInput` from `#fullPaperModal`.
    - Remove `#upPasswordInput` from `#confirmDialogModal`.
    - Remove `#fupPasswordInput` from `#fullUnitPaperModal`.
    - Remove `#ebbPasswordInput` from `#ebbConfirmPopup`.
    - Remove `#undoPasswordInput` from `#undoConfirmModal`.
    - Remove `#urgentRadarPasswordInput` from `#urgentRadarConfirmPopup`.
*   **Constant & Function Refactoring:**
    - Delete `const PRINT_PAPER_PASSWORD = '340800'`.
    - In `confirmPrintPaperDone()`, execute print state update immediately on affirmative click.
    - In `submitFullPaper()`, `executeConfirmedUnitPaper()`, `submitFullUnitPaper()`, `confirmEbbDone()`, `executeUndoConfirmed()`, `confirmUrgentRadarDone()`: remove password checks and execute upon user confirmation.
    - In `executeResetRepetitionConfirmed()`: Repurpose `#resetRepetitionPasswordInput` into a text input with placeholder `"RESET ලෙස ටයිප් කරන්න..."`. Validate `if (inputVal.trim().toUpperCase() !== 'RESET')`.

#### C. `study-analytics.html` (Analytics)
*   **DOM & Helper Removal:**
    - Delete `#securityPinModal` markup.
    - Delete `confirmPinModal()` and `requestPinVerification()`.
    - In `submitManualSession()`: remove PIN verification requirement.
    - In `deleteSession()`: replace PIN verification with standard confirmation dialog: `if (!confirm("මෙම අධ්‍යයන සැසිය ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්නද?")) return;`.

#### D. Project Rules & Documentation
*   Update `GEMINI.md`: Replace rule 1 ("Maintain password 3408") with Role-Based Authorization rule.
*   Update `README.md` and `html index sidebar both/README.md`: Document admin vs student syllabus boundaries, typed `"RESET"` requirement, and standard confirmations without secret values.

--------------------------------------------------------------------------------

## Alternatives Considered

### Alternative A: Restricting Students & Guests to Read-Only View of Syllabus

*   **Pros**: 
    - Eliminates any risk of syllabus mutation by non-administrative users.
    - Simplifies `sidebar.html` logic by disabling editing forms completely for non-admins.
*   **Cons**: 
    - Completely locks students out of adjusting unit titles or adding missing units for custom school curricula or provincial variations.
    - Frustrates motivated learners who need the study tracker to mirror their actual classroom sequence.
*   **Reason for Rejection**: 
    - Discarded in favor of tenant-scoped overlays. Persisting user customizations to `user_custom_units` (or guest local storage) provides complete personal freedom while keeping `canonical_syllabus` 100% read-only and uncorrupted for all other students.

### Alternative B: Retaining PIN as a Configurable Parental Control Setting

*   **Pros**: 
    - Allows parents or tutors to set a custom PIN if they wish to restrict their child from making accidental modifications.
*   **Cons**: 
    - Introduces significant state management, password recovery flows, and cross-device sync complexity in a lightweight PWA.
    - Re-establishes daily cognitive friction on single-user student devices.
    - Client-side PINs in unminified web code provide no cryptographic protection.
*   **Reason for Rejection**: 
    - The complexity and friction far outweigh any marginal parental control benefit. True multi-tenancy and role checks via `ZenithAuth` provide the correct architectural boundary.

### Alternative C: Using Native `window.confirm()` for All Destructive Actions

*   **Pros**: 
    - Zero custom HTML dialog markup, styling, or text validation inputs required.
    - Minimal code footprint.
*   **Cons**: 
    - Native browser `confirm()` dialogs are frequently clicked past via unconscious muscle memory or accidental screen taps on mobile devices.
    - Tapping "OK" accidentally on a cumulative action like resetting Spaced Repetition wipes weeks of historical review intervals irreversibly.
*   **Reason for Rejection**: 
    - High-consequence cumulative wipes require deliberate, focused intent. Requiring the user to type the word `"RESET"` (normalized via `.trim().toUpperCase()`) guarantees conscious consent and prevents accidental mobile misfires.

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Security & Authorization
*   **Master Data Integrity**: Direct SQL mutations on `canonical_syllabus` (`INSERT`, `UPDATE`, `DELETE`) are strictly forbidden unless `ZenithAuth.isAdminUser()` returns `true`.
*   **No Static Secrets in Source Code**: No hardcoded passwords, PINs, or backdoor codes (`3408`, `340800`, or equivalents) may exist anywhere in JavaScript, HTML, CSS, or documentation.
*   **Tenant Data Isolation**: User customizations must be scoped strictly by `user_id` in Supabase (`user_custom_units`, `user_subjects_config`) or by guest-isolated local storage keys (`wosandi_legacy_user`), preventing cross-tenant leakage.

### Usability & Accessibility
*   **Mobile Touch Ergonomics**: Standard confirmation dialogs must present large, visually distinct affirmative and cancel buttons with sufficient touch padding to prevent accidental misclicks.
*   **Bilingual Sinhala/English Guidance**: The typed `"RESET"` confirmation must display clear dual-language explanations indicating the permanent nature of the action and the exact string to type.
*   **Input Normalization**: The typed input validation must normalize string comparisons using `.trim().toUpperCase() === 'RESET'` to avoid false rejections caused by mobile keyboard auto-capitalization or leading/trailing whitespace.

### Offline & Resilience
*   **Zero Network Dependency for Student Actions**: All routine student tracking, custom unit saving in guest mode, and offline queueing in IndexedDB must continue operating without requiring online administrator verification.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `GEMINI.md` (Modify)
*   **Type / Scope**: Workspace Architectural Rules & Directives.
*   **Proposed Changes**:
    - Under Section 1, replace rule `- **Security PIN**: Maintain password 3408 for all protected write/edit actions` with:
      > `- **Role-Based Authorization & Zero Static PINs**: All hardcoded PINs (3408, 340800) are retired. Mutations to canonical_syllabus in sidebar.html are strictly restricted to verified administrators (ZenithAuth.isAdminUser()). Students and guests may customize subjects and units freely, persisted exclusively to their own tenant scope (user_subjects_config, user_custom_units, or local storage). Routine tracking actions use standard confirmation dialogs with cancel buttons. High-impact cumulative resets (Spaced Repetition engine and default subjects) require typing the confirmation phrase "RESET" (normalized via .trim().toUpperCase() === 'RESET').`
    - Under Section 2, update the dynamic subject configuration rule to state that subject customizations by regular users save to their personal config, while canonical subject defaults can only be changed by verified administrators.

#### 2. `README.md` (Modify)
*   **Type / Scope**: Repository Root Blueprint Contract (EGM Hay).
*   **Proposed Changes**:
    - Under `## Local Interface & Invariants` and `## Global Invariants`: Remove references to PIN `3408`.
    - Document the authorization boundary: `ZenithAuth.isAdminUser()` guards `canonical_syllabus`, while regular users and guests save customizations to `user_custom_units` and `user_subjects_config`.
    - Document the typed `"RESET"` requirement for Spaced Repetition engine cycle resets and default subject restoration.

#### 3. `html index sidebar both/README.md` (Modify)
*   **Type / Scope**: Component Package Contract (EGM Peanut).
*   **Proposed Changes**:
    - Under `## Invariants`: Remove invariant `[sidebar.html:Security PIN]`.
    - Add role-based syllabus mutation invariants (`canonical_syllabus` write access restricted to `ZenithAuth.isAdminUser()`), user-scoped customization invariants, and typed `"RESET"` validation invariants.

#### 4. `html index sidebar both/sidebar.html` (Modify)
*   **Type / Scope**: Syllabus and Subject Management PWA Page.
*   **Proposed Changes**:
    - Remove HTML password form groups: `#addPassword`, `#addPasswordError`, `#editPassword`, `#editPasswordError`, `#subjPassword`, and `#subjPasswordError`.
    - Delete `promptPin()` JavaScript function.
    - In `submitNewLesson()`: Remove PIN check. Check `ZenithAuth.isAdminUser()`. If true, execute `supabase.from('canonical_syllabus').insert([payload])`. If false, execute upsert to `user_custom_units` (or local storage for guest).
    - In `submitEditLesson()`: Remove PIN check. Check `ZenithAuth.isAdminUser()`. If true, update `canonical_syllabus`. If false, upsert modified unit to `user_custom_units` (or local storage for guest).
    - In `loadSyllabus()`: After fetching `canonical_syllabus`, fetch active user's `user_custom_units` (or guest local storage), overlaying customized unit titles and omitting marked-as-deleted units before rendering.
    - In `resetSubjectsToDefault()`: Replace `promptPin()` with prompt requiring typed `"RESET"` (evaluated via `.trim().toUpperCase() === 'RESET'`).

#### 5. `html index sidebar both/index.html` (Modify)
*   **Type / Scope**: Main Dashboard PWA Interface.
*   **Proposed Changes**:
    - Remove constant `PRINT_PAPER_PASSWORD = '340800'`.
    - Remove password input DOM fields:
      - `#printPaperPasswordInput` from `#printPaperConfirmPopup`.
      - `#fpPasswordInput` from `#fullPaperModal`.
      - `#upPasswordInput` from `#confirmDialogModal`.
      - `#fupPasswordInput` from `#fullUnitPaperModal`.
      - `#ebbPasswordInput` from `#ebbConfirmPopup`.
      - `#undoPasswordInput` from `#undoConfirmModal`.
      - `#urgentRadarPasswordInput` from `#urgentRadarConfirmPopup`.
    - In functions `confirmPrintPaperDone()`, `submitFullPaper()`, `executeConfirmedUnitPaper()`, `submitFullUnitPaper()`, `confirmEbbDone()`, `executeUndoConfirmed()`, and `confirmUrgentRadarDone()`: remove password checks and execute upon user confirmation.
    - In `executeResetRepetitionConfirmed()`: Change input placeholder to `"තහවුරු කිරීමට RESET ලෙස ටයිප් කරන්න..."`. Validate `inputVal.trim().toUpperCase() === 'RESET'`.
    - In syllabus data fetching, ensure `user_custom_units` overlays on `canonical_syllabus` for the current user.

#### 6. `html index sidebar both/study-analytics.html` (Modify)
*   **Type / Scope**: Analytics and Telemetry Visualization UI.
*   **Proposed Changes**:
    - Remove DOM modal `#securityPinModal`.
    - Remove functions `confirmPinModal()` and `requestPinVerification()`.
    - In `submitManualSession()`: remove PIN verification requirement.
    - In `deleteSession()`: replace PIN verification with standard `confirm()` or modal confirmation dialog with an explicit cancel button.

### Verification Plan

*   **Syntax & Static Integrity**:
    - Verify all HTML files parse without unclosed tags or broken inline script blocks.
    - Run regex search across all files to confirm zero occurrences of `3408`, `340800`, `#addPassword`, `#editPassword`, `#subjPassword`, `#fpPasswordInput`, `#upPasswordInput`, `#fupPasswordInput`, `#ebbPasswordInput`, `#undoPasswordInput`, and `#urgentRadarPasswordInput`.
*   **Local Server Execution**:
    - Run `node server.js` to ensure static server and `/env.js` start without error.
*   **Manual End-to-End Verification Scenarios**:
    1. *Student Tracking*: As a guest / regular student in `index.html`, tick Lesson Done, Homework Done, Unit Paper score, and print paper status. Verify zero password dialogs appear.
    2. *Spaced Repetition Reset*: Click reset repetition in `index.html`. Type lowercase `"reset"`, mixed `"ReSeT"`, and `"RESET"`. Verify all variations succeed. Type `"1234"` or click submit empty; verify action is blocked with error message.
    3. *Student Custom Unit*: In `sidebar.html` as regular student / guest, add a custom unit. Verify it saves to `user_custom_units` (or local storage), displays in their syllabus, and `canonical_syllabus` remains unmodified.
    4. *Admin Master Unit*: In `sidebar.html` logged in as `krishaja@gmail.com`, edit a unit. Verify `canonical_syllabus` in Supabase updates and propagates.
    5. *Analytics Session Delete*: In `study-analytics.html`, delete a logged study session. Verify standard confirmation dialog appears without PIN prompt.
