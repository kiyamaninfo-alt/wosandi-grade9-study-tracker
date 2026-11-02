# Zenith & Wosandi Grade 9 Study Tracker Blueprint

## System Overview
Zenith (incorporating the Wosandi Grade 9 Study Tracker) is a standalone, multi-page Progressive Web Application (PWA) and study management engine for Sri Lankan secondary students (Grades 6 to 11, with primary focus on Pre-O/Level Grade 9 and G.C.E. O/L preparation). The architecture is constructed with pure HTML5, modern CSS3, and Vanilla JavaScript, paired with a Supabase PostgreSQL backend and a lightweight Node.js static asset and environment server.

## Local Interface & Invariants
- `[server.js:PORT]`: Network listening port for the development HTTP server (default `process.env.PORT || 3000`).
- `[server.js:PUBLIC_DIR]`: Path pointing to the client application root (`html index sidebar both`).
- `[server.js:loadEnv()]`: Local `.env` parser reading environment variables without external dependencies.
- `[server.js:/env.js]`: Dynamic JavaScript endpoint generating runtime configuration `window.__ENV__` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- `[server.js:server]`: Node HTTP server enforcing clean URLs, security path normalization, and root Service-Worker scope headers.
- `[schema_grade9_complete.sql:canonical_syllabus]`: Relational table cataloging subjects, unit numbers, unit titles, and academic terms.
- `[schema_grade9_complete.sql:tracker_progress]`: Relational table tracking unit-level completion (`lesson_done`, `hw_done`, `confidence_level`).
- `[schema_grade9_complete.sql:unit_papers]`: Relational table logging single-tier unit assessment scores.
- `[schema_grade9_complete.sql:full_papers]`: Relational table logging term and full examination papers.
- `[schema_grade9_complete.sql:spaced_repetition_log]`: Relational table storing Ebbinghaus review intervals (1, 3, 7, 14, 30, 60 days).
- `[schema_grade9_complete.sql:study_timer_sessions]`: Relational table logging Pomodoro / Deep Focus timer intervals.
- `[schema_multitenant_zenith.sql:user_profiles]`: Tenant profile catalog managing authentication, grade level (6–11), and administrative roles.
- `[schema_multitenant_zenith.sql:user_subjects_config]`: Relational table managing per-tenant enabled subjects and custom metadata.
- `[schema_multitenant_zenith.sql:user_custom_units]`: Relational table storing student-specific customized unit definitions.
- `[schema_multitenant_zenith.sql:platform_announcements]`: Broadcast announcements table managed by platform administrators.

### Local Invariants & Security
- `[server.js:safePath]`: Traversal prevention using `path.normalize` and sanitizing `^(\.\.[\/\\])+` to guarantee file access cannot escape `PUBLIC_DIR`.
- `[server.js:Service-Worker-Allowed]`: HTTP response header `Service-Worker-Allowed: /` set on all JavaScript responses to authorize root-level service worker registrations.
- `[schema_multitenant_zenith.sql:user_id]`: Multi-tenant columns `user_id UUID REFERENCES auth.users(id)` remain nullable across all tables to guarantee zero data loss and 100% backward compatibility for legacy unauthenticated Wosandi records.

## Subdirectories & System Boundaries
- [Frontend Presentation Layer](./html%20index%20sidebar%20both/README.md): Client PWA presentation package containing `index.html`, `sidebar.html`, `study-analytics.html`, `study-radar.html`, `auth-manager.js`, `curriculum-catalog.js`, `admin-portal.js`, and `sw.js`.

## Global Invariants
- **Architecture Integrity**: The system strictly maintains a standalone HTML5/CSS3/Vanilla JS PWA architecture. It is intentionally free of React, Vite, or heavy frontend build pipelines.
- **Syllabus Hierarchy**: Strictly 1-level unit hierarchy (Main Units only). Sub-unit layers (`1.1`, `1.2`) are forbidden in UI representations; database compatibility is maintained by mirroring unit numbers and names to `sub_lesson_code` and `sub_lesson_title`.
- **Dynamic Curriculum Engine**: Supports dynamic subject configurations across Grades 6–11 (defaults to 13 Grade 9 subjects: MATH, SCI, SIN, ENG, BUD, HIST, GEO, CIV, HLTH, ICT, TAM, AES, PTS), persisted in `ZenithCurriculum` and `localStorage` (`g9_subjects_config`).
- **Security PIN**: Protected administrative syllabus and unit modifications require PIN `[PIN]`.
- **Administrator Role Boundary**: Administrative capabilities in `admin-portal.js` and `auth-manager.js` are strictly gatekept to email `krishaja@gmail.com` or verified role `admin`.
- **Tenant Isolation**: User data isolation is enforced via Supabase `user_id` query scoping, while guest sessions default cleanly to profile `wosandi_legacy_user` without disrupting existing local storage.

## Global Side Effects
- **Cloud Database Synchronization**: Client interactions synchronize asynchronously with Supabase PostgreSQL tables over HTTPS REST and WebSockets.
- **Client Cache Storage**: Service Worker maintains local cache storage `al-study-tracker-v12` and intercepts client navigations for offline functionality.
- **Local Storage State**: Client browser state (theme, font scale, guest profiles, subject selections, timer state) persists in browser `localStorage`.
- **Development Server**: Node.js HTTP server binds to network TCP port (default 3000).

## System Verification
- Run: `<test-command>` (verify system via `npm start` or `node server.js`)
