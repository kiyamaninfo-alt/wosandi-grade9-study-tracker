# Frontend Web & PWA Presentation Layer

## Overview
Standalone multi-page HTML5, Vanilla JavaScript, and CSS3 Progressive Web Application (PWA) client interface for the Zenith / Wosandi Study Tracker. Delivers the primary student dashboard, syllabus management with role-based authorization, study analytics with Chart.js visualization, spaced repetition radar, offline service worker caching, and multi-tenant authentication with an administrator portal.

## Interface
- `[curriculum-catalog.js:ZenithCurriculum]`: Global curriculum catalog managing grade stages (6–11), master subject dictionaries, and bilingual localized metadata.
- `[curriculum-catalog.js:ZenithCurriculum.GRADES_CATALOG]`: Grade tier metadata array spanning Grade 6 to Grade 11.
- `[curriculum-catalog.js:ZenithCurriculum.MASTER_SUBJECT_DICTIONARY]`: Master dictionary mapping subject codes (MATH, SCI, SIN, ENG, BUD, HIST, GEO, CIV, HLTH, ICT, TAM, PTS, AES, etc.) to bilingual titles and category tags.
- `[curriculum-catalog.js:ZenithCurriculum.DEFAULT_SUBJECTS_BY_GRADE]`: Default subject code mappings per grade level.
- `[curriculum-catalog.js:ZenithCurriculum.getGradeInfo(gradeNum)]`: Retrieves grade configuration object by numeric grade.
- `[curriculum-catalog.js:ZenithCurriculum.getActiveGrade()]`: Resolves current active grade from localStorage (defaults to 9).
- `[curriculum-catalog.js:ZenithCurriculum.setActiveGrade(gradeNum)]`: Clamps (6–11) and persists active grade.
- `[curriculum-catalog.js:ZenithCurriculum.getSubjectMetaByCode(code)]`: Resolves subject metadata by code, synthesising custom definitions when unmapped.
- `[curriculum-catalog.js:ZenithCurriculum.getDefaultSubjectsForGrade(gradeNum)]`: Resolves default subject metadata list for a given grade.
- `[curriculum-catalog.js:ZenithCurriculum.getActiveSubjectsForUser(userId, targetGrade)]`: Resolves active subjects configuration for a tenant from scoped localStorage.
- `[curriculum-catalog.js:ZenithCurriculum.saveActiveSubjectsForUser(userId, subjectsArray, targetGrade)]`: Persists active subject configurations for a tenant.
- `[auth-manager.js:ZenithAuth]`: Multi-tenant user authentication and session management module.
- `[auth-manager.js:ZenithAuth.ADMIN_EMAIL]`: Platform administrator email constant designating the root platform administrator.
- `[auth-manager.js:ZenithAuth.getCurrentUser()]`: Returns active user profile object or guest user fallback.
- `[auth-manager.js:ZenithAuth.getUserId()]`: Returns authenticated Supabase user UUID or `null` for guest/legacy users.
- `[auth-manager.js:ZenithAuth.isAdminUser()]`: Validates if the active session matches `ADMIN_EMAIL` or contains the `admin` role.
- `[auth-manager.js:ZenithAuth.getScopedKey(baseKey)]`: Generates tenant-scoped localStorage keys, preserving un-suffixed keys for guest/legacy users.
- `[auth-manager.js:ZenithAuth.scopeQuery(query)]`: Scopes Supabase database queries by `user_id` or `null`.
- `[auth-manager.js:ZenithAuth.attachUser(payload)]`: Attaches active `user_id` to database mutation payloads.
- `[auth-manager.js:ZenithAuth.getSupabaseClient()]`: Resolves initialized Supabase client instance.
- `[auth-manager.js:ZenithAuth.initAuth()]`: Initializes auth session, listens for `onAuthStateChange`, and syncs user profiles.
- `[auth-manager.js:ZenithAuth.signInWithGoogle()]`: Initiates Supabase Google OAuth workflow.
- `[auth-manager.js:ZenithAuth.signInWithEmail(email, password)]`: Authenticates student via email and password.
- `[auth-manager.js:ZenithAuth.signUpWithEmail(email, password, fullName, grade)]`: Registers new student account.
- `[auth-manager.js:ZenithAuth.signOut()]`: Signs out active session and restores guest user mode.
- `[auth-manager.js:ZenithAuth.continueAsGuest(name, grade)]`: Configures guest session using legacy profile ID `wosandi_legacy_user`.
- `[auth-manager.js:ZenithAuth.openAdminPortal()]`: Lazily loads `admin-portal.js` and opens the admin interface for verified administrators.
- `[admin-portal.js:ZenithAdmin]`: Global administrative portal controller.
- `[admin-portal.js:ZenithAdmin.init()]`: Injects admin styling, DOM modal markup, and event handlers.
- `[admin-portal.js:ZenithAdmin.openModal()]`: Opens the administrative management overlay.
- `[admin-portal.js:ZenithAdmin.close()]`: Closes the administrative management overlay.
- `[admin-portal.js:ZenithAdmin.loadAll()]`: Asynchronously loads overview metrics, users, sessions, and papers.
- `[admin-portal.js:ZenithAdmin.deleteUser(userId, userEmail)]`: Removes user profile from database after confirmation.
- `[admin-portal.js:ZenithAdmin.deleteSession(sessionId)]`: Deletes logged study session from database.
- `[admin-portal.js:ZenithAdmin.deletePaper(tableName, paperId)]`: Moderates and deletes paper record.
- `[admin-portal.js:ZenithAdmin.postAnnouncement()]`: Publishes system broadcast announcement to students.
- `[admin-portal.js:ZenithAdmin.exportSnapshot()]`: Generates and downloads full JSON snapshot of platform telemetry and data.
- `[sw.js:CACHE_NAME]`: Service Worker cache storage identifier (`al-study-tracker-v12`).
- `[sw.js:PRECACHE_ASSETS]`: Core PWA static files cached on service worker installation.
- `[index.html]`: Primary student dashboard covering 1-level unit hierarchy, unit paper logging, timer, and offline sync.
- `[sidebar.html]`: Syllabus and subject catalog manager with role-based authorization (admin master updates vs student/guest tenant data).
- `[study-analytics.html]`: Chart.js progress tracking, score trends, and overall average calculations.
- `[study-radar.html]`: Spaced repetition radar and urgent revision priority queue (Supabase client initialized as `supabaseClient`).

## Invariants
- `[curriculum-catalog.js:setActiveGrade]`: Grade values must strictly clamp between 6 and 11 (`Math.min(11, Math.max(6, Number(gradeNum) || 9))`).
- `[curriculum-catalog.js:saveActiveSubjectsForUser]`: Grade 9 subject configurations always mirror to legacy key `g9_subjects_config` for backward compatibility.
- `[auth-manager.js:isAdminUser]`: Administrative privileges strictly require verified admin status (matching the designated administrator email or role 'admin').
- `[auth-manager.js:getScopedKey]`: Guest or legacy user ID `wosandi_legacy_user` must never receive a storage key suffix, ensuring legacy local data remains intact.
- `[admin-portal.js:IIFE Guard]`: Module execution aborts immediately if `ZenithAuth.isAdminUser()` returns `false`.
- `[sw.js:fetch]`: Service Worker fetch handler strictly ignores requests to `supabase.co` REST/Realtime endpoints to avoid caching live database mutations.
- `[sidebar.html:Role-Based Authorization & Confirmation Guards]`: Master curriculum definitions in `canonical_syllabus` can only be modified by authenticated administrators (`ZenithAuth.isAdminUser()`). Normal students and guests add, edit, and delete their own subjects and units saved strictly to their own tenant data (`user_custom_units` and `user_subjects_config`, or `localStorage` for guests) and never to `canonical_syllabus`. Routine destructive actions use a standard confirm dialog with a clearly visible Cancel button; wiping spaced repetition history or restoring default subjects requires typing `RESET`, validated with `.trim().toUpperCase() === 'RESET'`.

## Side Effects
- `[auth-manager.js:handleAuthenticatedUser]`: Upserts user profiles into Supabase table `public.user_profiles`.
- `[auth-manager.js:initAuth]`: Fires browser CustomEvent `ZENITH_USER_CHANGED` on `window`.
- `[curriculum-catalog.js:saveActiveSubjectsForUser]`: Modifies browser `localStorage` entries for subject configurations.
- `[admin-portal.js:delete*]`: Mutates Supabase tables `user_profiles`, `study_sessions`, `sub_unit_papers`, `full_unit_papers`, and `platform_announcements`.
- `[admin-portal.js:exportSnapshot]`: Triggers client-side browser file download for JSON platform snapshots.
- `[sw.js:fetch]`: Intercepts network requests and populates or evicts entries in CacheStorage.

## Verification
- Run: `<test-command>` (verify UI via `node server.js`)
