# Role-Based Authorization and Hardcoded PIN Retirement

* **Author:** EGM Synthesizer Subagent & Antigravity
* **Date:** 2026-11-02

## Overview

Retire all hardcoded client-side PIN and password checks (`3408` and `340800`) across the Zenith / Wosandi Study Tracker application. Establish a clean, multi-tenant role-based authorization model where:
1. **Master Curriculum Protection:** Only verified platform administrators (`ZenithAuth.isAdminUser()`) may mutate `canonical_syllabus` (the shared master curriculum).
2. **User & Guest Freedom:** Regular authenticated students and guest users retain complete freedom to add, edit, and customize subjects and units. These changes persist strictly to their own tenant scope (`user_subjects_config`, `user_custom_units`, or local guest storage) and never affect `canonical_syllabus`.
3. **Accidental Destruction Prevention:** High-impact cumulative resets (e.g. Spaced Repetition engine cycle wipe, restoring default subjects) require typing the confirmation phrase `"RESET"` (validated via `.trim().toUpperCase() === 'RESET'` with clear bilingual instructions). Routine actions (Lesson/HW Done, paper score logging, print tracking, activity undo) use standard confirmation dialogs with clearly visible cancel buttons.

## Analysis

### 1. Codebase Inventory and Touchpoints
An exhaustive code inspection identified 23 distinct occurrences across 4 core application files and specification contracts:
* **`sidebar.html` (Syllabus & Master Catalog Management):**
  - Input fields `#addPassword`, `#editPassword`, and `#subjPassword` validate against `3408` on unit addition, unit edit, and custom subject addition.
  - Function `promptPin()` enforces `3408` on `toggleSubjectActive()`, `deleteSubject()`, and `resetSubjectsToDefault()`.
  - Lines 1288, 1293, 1299 (`canonical_syllabus.insert`) and lines 1416, 1418 (`canonical_syllabus.update`) were previously reachable by anyone entering PIN `3408`.
  - *Resolution:* 
    - Remove all password input elements and error containers.
    - If `ZenithAuth.isAdminUser()` is `true`: mutations write directly to `canonical_syllabus`.
    - If `ZenithAuth.isAdminUser()` is `false` (regular student or guest): mutations are saved strictly to the user's isolated data (`user_custom_units` in Supabase for logged-in students, or local storage for guests). Zero paths exist for non-admins to write to `canonical_syllabus`.
    - `resetSubjectsToDefault()` replaces `promptPin()` with a typed `"RESET"` confirmation.
* **`index.html` (Main Study Tracker PWA):**
  - Constant `PRINT_PAPER_PASSWORD = '340800'` and `#printPaperPasswordInput` in `#printPaperConfirmPopup` gate print paper completion tracking.
  - `#fpPasswordInput` gates Full/Term Paper submission (`submitFullPaper()`).
  - `#upPasswordInput` gates Unit Paper score execution (`executeConfirmedUnitPaper()`).
  - `#fupPasswordInput` gates Full Unit Paper score execution (`submitFullUnitPaper()`).
  - `#ebbPasswordInput` gates Spaced Repetition review completion (`confirmEbbDone()`).
  - `#resetRepetitionPasswordInput` gates Spaced Repetition engine cycle reset (`executeResetRepetitionConfirmed()`).
  - `#undoPasswordInput` gates Activity Log undo execution (`executeUndoConfirmed()`).
  - `#urgentRadarPasswordInput` gates Urgent Radar revision completion (`confirmUrgentRadarDone()`).
  - *Resolution:* Remove all password inputs and validation branches. Routine tracking actions execute via standard confirmation modals with clearly visible cancel buttons. The Spaced Repetition reset input transforms into a typed `"RESET"` verification field with `.trim().toUpperCase()` validation.
* **`study-analytics.html` (Analytics Dashboard):**
  - Function `requestPinVerification()` and modal `#securityPinModal` enforce `3408` for manual session logging and session deletion (`deleteSession()`).
  - *Resolution:* Remove PIN verification from manual study logging; convert session deletion to a standard confirmation dialog.
* **Documentation & Contracts (`GEMINI.md`, `README.md`, `html index sidebar both/README.md`):**
  - Specifications currently mandate `Maintain password 3408 for all protected write/edit actions`.
  - *Resolution:* Revise rules and EGM blueprints to document the role-based authorization model, user-scoped customizations, standard confirmation modals, and typed `"RESET"` requirements without embedding secret strings.

### 2. Multi-Lens Synthesis
* **Security & Tenancy Boundary:** Hardcoded PINs provided zero actual security while exposing master data to accidental corruption. Under the new model, write operations to `canonical_syllabus` are strictly guarded by `ZenithAuth.isAdminUser()`. User customizations are completely isolated in `user_custom_units` and `user_subjects_config`, guaranteeing tenant isolation.
* **UX & Ergonomics:** Eliminating PIN prompts removes cognitive fatigue from daily study tracking. Routine logging becomes instantaneous and frictionless. For destructive actions, the typed `"RESET"` phrase prevents automated or accidental misclicks without requiring passwords.
* **Offline Resilience:** For guests and offline students, progress tracking and unit customizations queue cleanly in browser local storage and IndexedDB without encountering credential barriers.

## Goals vs. Non-Goals

### In-Scope Goals
* Remove all hardcoded instances of `3408` and `340800` from JavaScript logic and HTML forms.
* Remove password input elements and error containers from modals across `index.html`, `sidebar.html`, and `study-analytics.html`.
* Enforce that write operations (`insert`, `update`, `delete`) to `canonical_syllabus` occur ONLY if `ZenithAuth.isAdminUser()` is `true`.
* Allow regular students and guests to add, edit, and toggle subjects and units, routing their modifications exclusively to `user_custom_units` and `user_subjects_config` (or local storage for guests).
* Protect Spaced Repetition cycle reset and default subject restoration with a typed `"RESET"` confirmation, validated via `.trim().toUpperCase() === 'RESET'`, with bilingual instructions.
* Provide standard confirmation modals with clearly visible affirmative and cancel buttons for all other destructive actions (e.g. undo, paper score delete, session delete).
* Update [GEMINI.md](file:///home/anjana/Documents/Wosandi-Study-Tracker%20/GEMINI.md), root [README.md](file:///home/anjana/Documents/Wosandi-Study-Tracker%20/README.md), and [html index sidebar both/README.md](file:///home/anjana/Documents/Wosandi-Study-Tracker%20/html%20index%20sidebar%20both/README.md) to codify the new authorization model.

### Out-of-Scope Non-Goals
* Modifying the core 1-level unit hierarchy or dynamic multi-subject configuration structure.
* Altering the existing Supabase tables schema (`user_custom_units` and `user_subjects_config` already exist in `schema_multitenant_zenith.sql`).
* Requiring typing `"RESET"` on non-destructive or routine study tracking actions.

## Alternatives Weighed

1. **Restricting Students & Guests to Read-Only View of Syllabus:**
   * *Rejected:* Students with customized school curricula need the flexibility to adjust their unit lists. Persisting custom units to `user_custom_units` allows full customization without polluting `canonical_syllabus`.
2. **Retaining PIN as a Configurable Local Setting:**
   * *Rejected:* Adds unnecessary state management and recovery complexity for zero real security benefit.
3. **Using Native `window.confirm()` Everywhere:**
   * *Rejected for High-Impact Resets:* Browser `confirm()` dialogs are easily clicked past by muscle memory. The typed `"RESET"` requirement ensures deliberate student intent.

## Key Decisions & Staging for Next Steps

1. **Authorization & Storage Routing Matrix:**
   * **Admin Session (`ZenithAuth.isAdminUser() === true`):** Writes directly to `canonical_syllabus` and global configs.
   * **Authenticated Student Session:** Writes custom subjects to `user_subjects_config` and custom units to `user_custom_units`.
   * **Guest Session (`wosandi_legacy_user`):** Writes custom subjects and units to local storage.
2. **Destructive Interaction Tiers:**
   * *Tier 1 (Frictionless / Standard Confirm):* Lesson/HW Done, Paper Score Logging, Print Status, Activity Undo. Dialogs always show explicit Cancel button.
   * *Tier 2 (Typed `"RESET"`):* Spaced Repetition engine cycle reset, Restore default subjects. Normalized with `.trim().toUpperCase() === 'RESET'`.
3. **Execution Plan for `/egm-draft`:**
   * Phase 1: Update contracts ([GEMINI.md](file:///home/anjana/Documents/Wosandi-Study-Tracker%20/GEMINI.md), [README.md](file:///home/anjana/Documents/Wosandi-Study-Tracker%20/README.md), [html index sidebar both/README.md](file:///home/anjana/Documents/Wosandi-Study-Tracker%20/html%20index%20sidebar%20both/README.md)).
   * Phase 2: Refactor `sidebar.html` (route `canonical_syllabus` strictly to admin, route user edits to `user_custom_units` / local storage, remove PIN inputs, add typed `"RESET"`).
   * Phase 3: Refactor `index.html` (retire `3408` / `340800`, convert modals, typed `"RESET"` for repetition reset).
   * Phase 4: Refactor `study-analytics.html` (remove `securityPinModal`, streamline session deletion).
