# EGM Stage 7 Critic Review Resolution Report

* **Target Document:** [`docs/designs/role_based_auth_pin_retirement.md`](file:///home/anjana/Documents/Wosandi-Study-Tracker%20/docs/designs/role_based_auth_pin_retirement.md)
* **Date:** 2026-11-02
* **Resolution Mode:** Agent Remediation (`egm-resolve`)

---

## Findings Evaluation & Action Matrix

| # | Severity | Lens | Finding Title | Decision | Resolution Strategy |
|---|---|---|---|:---:|---|
| 1 | 🔴 Blocker | `egm-design` | Missing Offline Cache for Authenticated Student Custom Units | **PROPOSE FIX** | Specify `zenith_user_custom_units_cache_${userId}` in `localStorage` to cache student custom units offline, loading locally first and syncing in background. |
| 2 | 🔴 Blocker | `egm-design` | Custom Unit Progress Tracking & Foreign Key Integrity | **PROPOSE FIX** | Clarify that `tracker_progress.syllabus_id` is nullable. Custom units without canonical IDs store progress with `syllabus_id = null` and match by `(user_id, subject, sub_lesson_code)` in Supabase and IndexedDB. |
| 3 | 🟡 Major | `egm-design` | Unsafe Property Access on Guest Session Detection | **PROPOSE FIX** | Update code snippet to use safe optional chaining: `ZenithAuth.getCurrentUser()?.isGuest === true`. |
| 4 | 🟡 Major | `egm-design` | Undefined Guest-to-Student Syllabus Migration Path | **PROPOSE FIX** | Add an onboarding migration hook in `auth-manager.js`: upon initial sign-in, any existing `zenith_guest_custom_units` are merged into `user_custom_units` for the new account, then cleared from guest storage. |
| 5 | 🟡 Major | `egm-structural` | Master Syllabus Authorization Boundary (Client vs RLS) | **PROPOSE FIX** | Detail defense-in-depth: client UI gating via `ZenithAuth.isAdminUser()` backed by database RLS using `public.is_current_user_admin()`. |
| 6 | 🟡 Major | `egm-structural` | Missing Cancellation Edge in Mermaid Diagram | **PROPOSE FIX** | Add `StandardModal -->|"Cancel"| DismissAction["Dismiss Modal (No State Change)"]` to the Mermaid diagram. |
| 7 | 🟢 Nit | `egm-style` | Document Status Header Accuracy | **PROPOSE FIX** | Set `Status: Under Review (Stage 7 Critic Review)`. |
| 8 | 🟢 Nit | `egm-style` | Admin Email Normalization | **PROPOSE FIX** | Explicitly define case-insensitive comparison (`session.user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()`). |
| 9 | 🟢 Nit | `egm-style` | Bilingual Confirmation Placeholder Consistency | **PROPOSE FIX** | Standardize placeholder to `"තහවුරු කිරීමට RESET ලෙස ටයිප් කරන්න / Type RESET to confirm"`. |
| 10 | 🟢 Nit | `egm-design` | Re-Addition of Tombstoned Custom Units Semantics | **PROPOSE FIX** | Explicitly specify that adding a unit with a tombstoned key (`is_deleted === true`) un-tombstones the record (`is_deleted = false`) and updates titles. |
