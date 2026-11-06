# Wosandi Grade 9 Study Tracker (krishsoft) - AGY / Gemini Rules
Stack: Standalone Multi-Page HTML5 / Vanilla JS / CSS3 PWA (`index.html`, `sidebar.html`, `study-analytics.html`, `sw.js`, `server.js`) + Supabase + Chart.js

## 1. Core Architecture & File Roles:
- **DO NOT convert to React/Vite**: Preserve the existing standalone HTML/CSS/JS PWA architecture (`index.html`, `sidebar.html`, `study-analytics.html`, `sw.js`).
- **Keep Existing Supabase Env/Config Untouched**: Do not delete or break existing Supabase client initialization; the user will swap `.env` and URLs later.
- **Role-Based Authorization & Confirmation Guards**:
  - Hardcoded authentication prompts are retired.
  - Only authenticated platform administrators (`ZenithAuth.isAdminUser()`) may modify master curriculum in `canonical_syllabus`.
  - Normal students and guest sessions may add, edit, and delete their own subjects and units, saved strictly to their own tenant data (`user_custom_units` and `user_subjects_config` in Supabase, or scoped `localStorage` for guests) and never to `canonical_syllabus`.
  - Routine destructive actions (such as session deletions or paper confirmations) use a standard confirmation modal with a clearly visible Cancel button.
  - High-impact data reset actions (wiping spaced repetition history or restoring default subjects) require typing `RESET`, validated with `.trim().toUpperCase() === 'RESET'`, accompanied by bilingual Sinhala and English instructions.
- **Supabase Client in study-radar.html**: The Supabase client variable in `study-radar.html` is named `supabaseClient` to prevent browser global naming collisions.

## 2. Grade 9 Domain Rules (Dynamic Subjects & NO Sub-Units):
- **Dynamic Multi-Subject Engine (Up to 13+ Subjects)**:
  - Never hardcode only `ICT`, `ET`, `SFT`.
  - Use a dynamic subject configuration (`getActiveSubjects()`) stored in `localStorage` (`g9_subjects_config`) and synced with Supabase, with sensible Grade 9 defaults (Mathematics, Science, Sinhala, English, Buddhism, History, Geography, Civic Ed, Health, ICT, Tamil, Aesthetics, PTS).
  - Each subject has `{ code, nameSi, nameEn, color, icon, active }`.
  - Allow adding, editing, enabling/disabling subjects via `sidebar.html` (authenticated admins write to master catalog; normal students and guests manage scoped tenant data).
- **Strict 1-Level Unit Hierarchy (NO SUB-UNITS)**:
  - Completely remove the Sub-Units layer (`1.1`, `1.2`). Every subject consists strictly of **Main Units** (`unit_number`: 1, 2, 3... and `unit_name`: "ඒකකය 01: ...").
  - For backward-compatible database storage in `canonical_syllabus`, automatically set `sub_lesson_code = "Unit " + unit_number` and `sub_lesson_title = unit_name`.
  - Lesson Done (`lesson_done`), Homework/Study Done (`hw_done`), Unit Paper logging, Print tracking, Urgent Radar, and Ebbinghaus Spaced Repetition operate directly on **Main Units**.
- **2-Tier Paper System**:
  - Merge "Sub-Unit Paper" and "Full Unit Paper" into a single **"Unit Paper (පාඩම් ප්‍රශ්න පත්‍ර)"** workflow.
  - Keep **"Full / Term Paper (වාර විභාග / සම්පූර්ණ ප්‍රශ්න පත්‍ර)"** as the second tier. Replace A/L Z-Score with **Overall Average %** across all active subjects.
- **User-Configurable Countdown**:
  - Allow the user to customize the Countdown Target Date/Time and Target Title/Header inside the Settings Modal (`localStorage` key: `g9_countdown_config`).

## 3. Token Optimization & Surgical Editing Rules:
- **Large File Handling (`index.html` is ~747KB)**: NEVER rewrite or output the entire file. Always inspect specific line ranges or function names and apply **surgical diffs** only to the targeted sections.
- **Preserve All Premium Features**: Keep Dark/Light/System themes, Font Scale slider, Sinhala/English toggle, Deep Focus Timer (Brown Noise, Wake Lock, Target Picker), Offline IndexedDB Sync Queue, Activity Log & Undo, and A4 PDF Export.

## 4. Strict UI Standardization & Color System (MANDATORY FOR ALL FUTURE WORK):
- **Emoji Elimination Rule**:
  - **NO emojis anywhere in UI text, navigation, tabs, action buttons, card headers, metric tiles, or modal popups.**
  - **Emojis are reserved EXCLUSIVELY for subject configuration icons** (e.g. 📐 for Mathematics, 🔬 for Science, 📘 for Sinhala, etc. in `getActiveSubjects()`). All other emojis (such as 🔍, ➕, ✏️, 📚, 📝, 🎯, 🎓, ⚡, 🔔, 🏆, 🚀, 💡, ⏱️, 📊, 📈, 🔄, 💾, 🗑️, etc.) must be completely removed.
- **Strict Color Tokens (Dark Mode 🌙)**:
  - Base Background (`--bg`): `#121212` (not pure black `#000`)
  - Surface Cards (`--surface`, `--card-bg`): `#1E1E1E`
  - Elevated Modals/Dropdowns (`--elevated`, `--card-inner`): `#2A2A2A`
  - Border/Dividers (`--border`, `--border-color`): `#3A3A3A`
  - Primary Green (`--primary`): `#66BB6A`
  - Primary Hover (`--primary-hover`): `#81C784`
  - Primary Muted Tint (`--primary-muted`): `#1B3A1E`
  - On-Primary Text (`--on-primary`): `#0A1F0C` (**MANDATORY: Dark text on light green, NEVER white text on green in dark mode**)
  - Main Text (`--text`, `--text-main`): `#E8EAED` (Soft white, avoids halation)
  - Secondary/Muted Text (`--text-muted`): `#A0A4AB`
  - Disabled Text (`--text-disabled`): `#6B6F76`
  - Accent / Streak (`--accent`): `#FFCA28` (Dark text `--on-accent: #3E2A00`)
  - Success: `#81C784` | Error: `#EF5350` | Warning: `#FFB74D` | Info: `#64B5F6`
- **Strict Color Tokens (Light Mode ☀️)**:
  - Base Background (`--bg`): `#F1F8F4` (Clean white with subtle green hint)
  - Surface Cards (`--surface`, `--card-bg`): `#FFFFFF`
  - Elevated Modals/Dropdowns (`--elevated`): `#FFFFFF` + soft shadow
  - Border/Dividers (`--border`, `--border-color`): `#D6DED8`
  - Primary Green (`--primary`): `#2E7D32`
  - Primary Hover (`--primary-hover`): `#1B5E20`
  - Primary Muted Tint (`--primary-muted`): `#E3F1E4` (with `#1B5E20` text)
  - On-Primary Text (`--on-primary`): `#FFFFFF` (White text on dark green)
  - Main Text (`--text`, `--text-main`): `#1F2937`
  - Secondary/Muted Text (`--text-muted`): `#4B5563`
  - Disabled Text (`--text-disabled`): `#9CA3AF`
  - Accent / Streak (`--accent`): `#F9A825` (Dark text `--on-accent: #3E2A00`)
  - Success: `#2E7D32` | Error: `#C62828` | Warning: `#B26A00` | Info: `#1565C0`
- **PWA Meta Standards**:
  - `manifest.json`: `theme_color: #2E7D32`, `background_color: #F1F8F4`
  - HTML headers must include:
    `<meta name="theme-color" media="(prefers-color-scheme: light)" content="#2E7D32">`
    `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121212">`

