/**
 * Zenith O-Level - Admin Portal Module
 * Exclusively loaded and executed for administrator (krishaja@gmail.com).
 * Provides deep management of users, study sessions, unit/full papers, platform metrics, and broadcast announcements.
 */

(function () {
  'use strict';

  // Guard check: strictly ensure the current user is krishaja@gmail.com
  if (typeof ZenithAuth === 'undefined' || !ZenithAuth.isAdminUser()) {
    console.warn('[ZenithAdmin] Access denied. Admin privileges required.');
    return;
  }

  const ADMIN_EMAIL = 'krishaja@gmail.com';

  const ZenithAdmin = {
    isOpen: false,
    currentTab: 'overview',
    stats: {
      usersCount: 0,
      totalHours: 0,
      totalSessions: 0,
      totalUnitPapers: 0,
      totalFullPapers: 0
    },
    users: [],
    sessions: [],
    unitPapers: [],
    fullPapers: [],
    announcements: [],

    init() {
      this.injectStyles();
      this.injectModal();
      this.bindEvents();
      console.log('[ZenithAdmin] Admin Portal module initialized for', ADMIN_EMAIL);
    },

    injectStyles() {
      if (document.getElementById('zenithAdminStyles')) return;
      const style = document.createElement('style');
      style.id = 'zenithAdminStyles';
      style.textContent = `
        .zenith-admin-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 15, 29, 0.82);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .zenith-admin-backdrop.active {
          opacity: 1;
          pointer-events: auto;
        }
        .zenith-admin-modal {
          background: var(--bg-card, #131b2e);
          color: var(--text-main, #f1f5f9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15);
          border-radius: 20px;
          width: 96vw;
          max-width: 1240px;
          height: 90vh;
          max-height: 860px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: inherit;
        }
        .zenith-admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }
        .zenith-admin-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .zenith-admin-badge {
          background: linear-gradient(135deg, #ef4444, #f97316);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .zenith-admin-tabs {
          display: flex;
          gap: 8px;
          padding: 10px 24px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          overflow-x: auto;
        }
        .zenith-admin-tab-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .zenith-admin-tab-btn:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }
        .zenith-admin-tab-btn.active {
          color: #fff;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
        }
        .zenith-admin-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          position: relative;
        }
        .zenith-admin-tab-panel {
          display: none;
        }
        .zenith-admin-tab-panel.active {
          display: block;
        }
        .zenith-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .zenith-stat-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .zenith-stat-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 600;
        }
        .zenith-stat-val {
          font-size: 26px;
          font-weight: 800;
          color: #f8fafc;
        }
        .zenith-admin-table-container {
          overflow-x: auto;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.15);
        }
        .zenith-admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }
        .zenith-admin-table th {
          background: rgba(255, 255, 255, 0.04);
          padding: 12px 16px;
          color: #94a3b8;
          font-weight: 600;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          white-space: nowrap;
        }
        .zenith-admin-table td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
        }
        .zenith-admin-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }
        .zenith-btn-sm {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }
        .zenith-btn-delete {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .zenith-btn-delete:hover {
          background: #ef4444;
          color: #fff;
        }
        .zenith-btn-edit {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .zenith-btn-edit:hover {
          background: #3b82f6;
          color: #fff;
        }
        .zenith-admin-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .zenith-admin-input {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #fff;
          padding: 8px 12px;
          font-size: 13px;
          outline: none;
        }
        .zenith-admin-input:focus {
          border-color: #6366f1;
        }
        .zenith-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zenith-close-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }
      `;
      document.head.appendChild(style);
    },

    injectModal() {
      if (document.getElementById('zenithAdminBackdrop')) return;
      const div = document.createElement('div');
      div.id = 'zenithAdminBackdrop';
      div.className = 'zenith-admin-backdrop';
      div.innerHTML = `
        <div class="zenith-admin-modal" role="dialog" aria-modal="true" aria-labelledby="zenithAdminHeading">
          <div class="zenith-admin-header">
            <div class="zenith-admin-title-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <h2 id="zenithAdminHeading" style="margin:0;font-size:18px;font-weight:700;">Zenith Platform Master Console</h2>
              <span class="zenith-admin-badge">Admin: ${ADMIN_EMAIL}</span>
            </div>
            <button class="zenith-close-btn" id="btnZenithAdminClose" title="Close Admin Portal">&times;</button>
          </div>

          <div class="zenith-admin-tabs">
            <button class="zenith-admin-tab-btn active" data-tab="overview">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>
              Overview & Telemetry
            </button>
            <button class="zenith-admin-tab-btn" data-tab="users">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Users Directory
            </button>
            <button class="zenith-admin-tab-btn" data-tab="sessions">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Study Sessions
            </button>
            <button class="zenith-admin-tab-btn" data-tab="papers">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Unit & Term Papers
            </button>
            <button class="zenith-admin-tab-btn" data-tab="announcements">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              Broadcast Announcements
            </button>
          </div>

          <div class="zenith-admin-body">
            <!-- TAB 1: OVERVIEW -->
            <div class="zenith-admin-tab-panel active" id="zenithAdminPanel-overview">
              <div class="zenith-stat-grid">
                <div class="zenith-stat-card">
                  <span class="zenith-stat-label">Registered Students</span>
                  <span class="zenith-stat-val" id="adminStatUsers">-</span>
                </div>
                <div class="zenith-stat-card">
                  <span class="zenith-stat-label">Total Study Time</span>
                  <span class="zenith-stat-val" id="adminStatHours">- hrs</span>
                </div>
                <div class="zenith-stat-card">
                  <span class="zenith-stat-label">Focus Sessions</span>
                  <span class="zenith-stat-val" id="adminStatSessions">-</span>
                </div>
                <div class="zenith-stat-card">
                  <span class="zenith-stat-label">Papers Completed</span>
                  <span class="zenith-stat-val" id="adminStatPapers">-</span>
                </div>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius:14px; padding: 20px;">
                <h3 style="margin-top:0;font-size:16px;">Platform Status & Cloud Sync</h3>
                <p style="color:#94a3b8;font-size:13px;line-height:1.6;">
                  Zenith O-Level Multi-Tenant Engine is running on Supabase. User isolation is enforced by <code>user_id</code> and safe row-level policies. Legacy Wosandi tracker data is preserved with null <code>user_id</code>.
                </p>
                <div style="display:flex; gap:12px; margin-top:16px;">
                  <button class="zenith-btn-sm" style="background:#4f46e5;color:#fff;padding:8px 16px;" id="btnAdminRefreshAll">
                    ↻ Refresh Global Telemetry
                  </button>
                  <button class="zenith-btn-sm" style="background:#059669;color:#fff;padding:8px 16px;" id="btnAdminExportAll">
                    ↓ Export Global JSON Snapshot
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB 2: USERS DIRECTORY -->
            <div class="zenith-admin-tab-panel" id="zenithAdminPanel-users">
              <div class="zenith-admin-filter-bar">
                <input type="text" class="zenith-admin-input" id="adminUserSearch" placeholder="Search by name, email or grade..." style="min-width:280px;" />
                <span id="adminUserCountBadge" style="font-size:13px;color:#94a3b8;">Loading users...</span>
              </div>
              <div class="zenith-admin-table-container">
                <table class="zenith-admin-table" id="adminUsersTable">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Full Name</th>
                      <th>Grade</th>
                      <th>Role</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">Loading user profiles...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 3: STUDY SESSIONS -->
            <div class="zenith-admin-tab-panel" id="zenithAdminPanel-sessions">
              <div class="zenith-admin-filter-bar">
                <input type="text" class="zenith-admin-input" id="adminSessionSearch" placeholder="Filter by subject or lesson..." style="min-width:260px;" />
                <span id="adminSessionCountBadge" style="font-size:13px;color:#94a3b8;">Loading sessions...</span>
              </div>
              <div class="zenith-admin-table-container">
                <table class="zenith-admin-table" id="adminSessionsTable">
                  <thead>
                    <tr>
                      <th>User ID / Scope</th>
                      <th>Subject</th>
                      <th>Lesson / Unit</th>
                      <th>Duration</th>
                      <th>Date / Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">Loading study sessions...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 4: PAPERS -->
            <div class="zenith-admin-tab-panel" id="zenithAdminPanel-papers">
              <div class="zenith-admin-filter-bar">
                <input type="text" class="zenith-admin-input" id="adminPaperSearch" placeholder="Filter by subject..." style="min-width:260px;" />
                <span id="adminPaperCountBadge" style="font-size:13px;color:#94a3b8;">Loading papers...</span>
              </div>
              <div class="zenith-admin-table-container">
                <table class="zenith-admin-table" id="adminPapersTable">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>User ID / Scope</th>
                      <th>Subject</th>
                      <th>Paper / Unit</th>
                      <th>Score</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">Loading exam papers...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 5: ANNOUNCEMENTS -->
            <div class="zenith-admin-tab-panel" id="zenithAdminPanel-announcements">
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius:14px; padding: 20px; margin-bottom: 20px;">
                <h4 style="margin:0 0 12px 0;">Post Broadcast Announcement</h4>
                <div style="display:flex; flex-direction:column; gap:12px;">
                  <input type="text" id="adminAnnounceTitle" class="zenith-admin-input" placeholder="Title (e.g. 🎯 2nd Term Examination Dates Released!)" />
                  <textarea id="adminAnnounceMsg" class="zenith-admin-input" rows="3" placeholder="Message content for all students..."></textarea>
                  <div style="display:flex; gap:12px; align-items:center;">
                    <select id="adminAnnounceGrade" class="zenith-admin-input" style="width:160px;">
                      <option value="ALL">All Grades (6-11)</option>
                      <option value="11">Grade 11 (O-Level)</option>
                      <option value="10">Grade 10</option>
                      <option value="9">Grade 9</option>
                      <option value="8">Grade 8</option>
                      <option value="7">Grade 7</option>
                      <option value="6">Grade 6</option>
                    </select>
                    <button class="zenith-btn-sm" id="btnAdminPostAnnouncement" style="background:#4f46e5;color:#fff;padding:8px 20px;">
                      📢 Publish to Students
                    </button>
                  </div>
                </div>
              </div>

              <h4 style="margin:0 0 12px 0;">Active Announcements</h4>
              <div class="zenith-admin-table-container">
                <table class="zenith-admin-table" id="adminAnnounceTable">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Target Grade</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">No announcements posted yet.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      `;
      document.body.appendChild(div);
    },

    bindEvents() {
      const closeBtn = document.getElementById('btnZenithAdminClose');
      if (closeBtn) closeBtn.onclick = () => this.close();

      const backdrop = document.getElementById('zenithAdminBackdrop');
      if (backdrop) {
        backdrop.onclick = (e) => {
          if (e.target === backdrop) this.close();
        };
      }

      // Tab switching
      document.querySelectorAll('.zenith-admin-tab-btn').forEach((btn) => {
        btn.onclick = () => {
          document.querySelectorAll('.zenith-admin-tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.zenith-admin-tab-panel').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.getAttribute('data-tab');
          this.currentTab = tab;
          const panel = document.getElementById(`zenithAdminPanel-${tab}`);
          if (panel) panel.classList.add('active');
          this.loadTabData(tab);
        };
      });

      // Search filters
      const userSearch = document.getElementById('adminUserSearch');
      if (userSearch) {
        userSearch.oninput = () => this.filterUsers(userSearch.value);
      }
      const sessionSearch = document.getElementById('adminSessionSearch');
      if (sessionSearch) {
        sessionSearch.oninput = () => this.filterSessions(sessionSearch.value);
      }
      const paperSearch = document.getElementById('adminPaperSearch');
      if (paperSearch) {
        paperSearch.oninput = () => this.filterPapers(paperSearch.value);
      }

      // Action buttons
      const btnRefresh = document.getElementById('btnAdminRefreshAll');
      if (btnRefresh) btnRefresh.onclick = () => this.loadAll();

      const btnExport = document.getElementById('btnAdminExportAll');
      if (btnExport) btnExport.onclick = () => this.exportSnapshot();

      const btnAnnounce = document.getElementById('btnAdminPostAnnouncement');
      if (btnAnnounce) btnAnnounce.onclick = () => this.postAnnouncement();
    },

    open() {
      if (!ZenithAuth.isAdminUser()) {
        alert('Access Denied: Only administrator krishaja@gmail.com has access to this portal.');
        return;
      }
      const backdrop = document.getElementById('zenithAdminBackdrop');
      if (backdrop) {
        backdrop.classList.add('active');
        this.isOpen = true;
        this.loadAll();
      }
    },

    openModal() {
      this.open();
    },

    close() {
      const backdrop = document.getElementById('zenithAdminBackdrop');
      if (backdrop) {
        backdrop.classList.remove('active');
        this.isOpen = false;
      }
    },

    async loadAll() {
      await Promise.all([
        this.loadOverview(),
        this.loadUsers(),
        this.loadSessions(),
        this.loadPapers(),
        this.loadAnnouncements()
      ]);
    },

    async loadTabData(tab) {
      if (tab === 'overview') this.loadOverview();
      else if (tab === 'users') this.loadUsers();
      else if (tab === 'sessions') this.loadSessions();
      else if (tab === 'papers') this.loadPapers();
      else if (tab === 'announcements') this.loadAnnouncements();
    },

    async loadOverview() {
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        // Fetch sessions
        const { data: sessions, error: sErr } = await sb
          .from('study_timer_sessions')
          .select('duration_seconds, completed');

        let totalSeconds = 0;
        let countSessions = 0;
        if (sessions && !sErr) {
          countSessions = sessions.length;
          sessions.forEach(s => {
            totalSeconds += (s.duration_seconds || 0);
          });
        }

        // Fetch user profiles
        const { data: users, count: userCount, error: uErr } = await sb
          .from('user_profiles')
          .select('*', { count: 'exact' });

        // Fetch unit papers
        const { data: unitP, count: upCount } = await sb
          .from('unit_papers')
          .select('id', { count: 'exact' });

        // Fetch full papers
        const { data: fullP, count: fpCount } = await sb
          .from('full_papers')
          .select('id', { count: 'exact' });

        const totalHrs = (totalSeconds / 3600).toFixed(1);
        const totalPapers = (upCount || 0) + (fpCount || 0);

        document.getElementById('adminStatUsers').textContent = userCount !== null ? userCount : (users ? users.length : 1);
        document.getElementById('adminStatHours').textContent = `${totalHrs} hrs`;
        document.getElementById('adminStatSessions').textContent = countSessions;
        document.getElementById('adminStatPapers').textContent = totalPapers;

        this.stats = {
          usersCount: userCount || (users ? users.length : 1),
          totalHours: totalHrs,
          totalSessions: countSessions,
          totalUnitPapers: upCount || 0,
          totalFullPapers: fpCount || 0
        };
      } catch (e) {
        console.warn('[ZenithAdmin] Error loading overview telemetry:', e);
      }
    },

    async loadUsers() {
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const { data, error } = await sb
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // Table might not exist yet if migration hasn't been run
          console.warn('[ZenithAdmin] Could not fetch user_profiles:', error.message);
          this.renderUsersFallback();
          return;
        }

        this.users = data || [];
        this.renderUsers(this.users);
      } catch (e) {
        console.warn('[ZenithAdmin] User load error:', e);
        this.renderUsersFallback();
      }
    },

    renderUsersFallback() {
      const tbody = document.querySelector('#adminUsersTable tbody');
      if (!tbody) return;
      tbody.innerHTML = `
        <tr>
          <td>${ADMIN_EMAIL}</td>
          <td>Platform Administrator</td>
          <td><span class="zenith-admin-badge">Grade 6-11</span></td>
          <td><span style="color:#ef4444;font-weight:700;">Super Admin</span></td>
          <td>Active</td>
          <td><em>Root Account</em></td>
        </tr>
      `;
      const badge = document.getElementById('adminUserCountBadge');
      if (badge) badge.textContent = '1 Active User (Database migration pending for full table sync)';
    },

    renderUsers(list) {
      const tbody = document.querySelector('#adminUsersTable tbody');
      if (!tbody) return;

      const badge = document.getElementById('adminUserCountBadge');
      if (badge) badge.textContent = `${list.length} registered students`;

      if (!list || list.length === 0) {
        this.renderUsersFallback();
        return;
      }

      tbody.innerHTML = list.map(u => `
        <tr>
          <td><strong>${u.email || 'N/A'}</strong></td>
          <td>${u.full_name || 'Student'}</td>
          <td><span style="background:rgba(99,102,241,0.2);padding:2px 8px;border-radius:6px;color:#a5b4fc;font-weight:600;">Grade ${u.grade || 9}</span></td>
          <td><span style="color:${u.role === 'admin' ? '#ef4444' : '#10b981'};font-weight:600;">${u.role || 'student'}</span></td>
          <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button class="zenith-btn-sm zenith-btn-edit" onclick="ZenithAdmin.inspectUser('${u.id}')">Inspect</button>
            ${u.email !== ADMIN_EMAIL ? `<button class="zenith-btn-sm zenith-btn-delete" onclick="ZenithAdmin.deleteUser('${u.id}', '${u.email}')">Delete</button>` : ''}
          </td>
        </tr>
      `).join('');
    },

    filterUsers(query) {
      if (!query) {
        this.renderUsers(this.users);
        return;
      }
      const q = query.toLowerCase();
      const filtered = this.users.filter(u =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (String(u.grade).includes(q))
      );
      this.renderUsers(filtered);
    },

    async deleteUser(userId, userEmail) {
      if (!confirm(`Are you sure you want to permanently delete user ${userEmail}? This will delete all user progress and cannot be undone.`)) {
        return;
      }
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const { error } = await sb.from('user_profiles').delete().eq('id', userId);
        if (error) throw error;
        alert(`User ${userEmail} deleted successfully.`);
        this.loadUsers();
      } catch (err) {
        alert('Error deleting user: ' + err.message);
      }
    },

    inspectUser(userId) {
      const u = this.users.find(x => x.id === userId);
      if (!u) return;
      alert(`User Profile Inspection:\n\nEmail: ${u.email}\nName: ${u.full_name}\nGrade: ${u.grade}\nMedium: ${u.medium}\nRegistered: ${u.created_at}\nTarget Exam: ${u.target_exam_date || 'N/A'}`);
    },

    async loadSessions() {
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const { data, error } = await sb
          .from('study_timer_sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        this.sessions = data || [];
        this.renderSessions(this.sessions);
      } catch (e) {
        console.warn('[ZenithAdmin] Sessions load error:', e);
      }
    },

    renderSessions(list) {
      const tbody = document.querySelector('#adminSessionsTable tbody');
      if (!tbody) return;

      const badge = document.getElementById('adminSessionCountBadge');
      if (badge) badge.textContent = `Showing last ${list.length} sessions`;

      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">No study sessions recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(s => {
        const mins = Math.round((s.duration_seconds || 0) / 60);
        const scope = s.user_id ? `${s.user_id.slice(0, 8)}...` : '<span style="color:#f59e0b;">Wosandi Legacy</span>';
        const dateStr = s.created_at ? new Date(s.created_at).toLocaleString() : 'N/A';
        return `
          <tr>
            <td><code>${scope}</code></td>
            <td><strong>${s.subject || 'N/A'}</strong></td>
            <td>${s.lesson_name || `Unit ${s.lesson_number || ''}`}</td>
            <td>${mins} mins</td>
            <td>${dateStr}</td>
            <td><span style="color:${s.completed ? '#10b981' : '#f59e0b'};font-weight:600;">${s.completed ? 'Completed' : 'Partial'}</span></td>
            <td>
              <button class="zenith-btn-sm zenith-btn-delete" onclick="ZenithAdmin.deleteSession('${s.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    },

    filterSessions(query) {
      if (!query) {
        this.renderSessions(this.sessions);
        return;
      }
      const q = query.toLowerCase();
      const filtered = this.sessions.filter(s =>
        (s.subject && s.subject.toLowerCase().includes(q)) ||
        (s.lesson_name && s.lesson_name.toLowerCase().includes(q))
      );
      this.renderSessions(filtered);
    },

    async deleteSession(sessionId) {
      if (!confirm('Are you sure you want to delete this study session record?')) return;
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const { error } = await sb.from('study_timer_sessions').delete().eq('id', sessionId);
        if (error) throw error;
        alert('Session deleted.');
        this.loadSessions();
      } catch (err) {
        alert('Error deleting session: ' + err.message);
      }
    },

    async loadPapers() {
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const [unitRes, fullRes] = await Promise.all([
          sb.from('unit_papers').select('*').order('created_at', { ascending: false }).limit(50),
          sb.from('full_papers').select('*').order('created_at', { ascending: false }).limit(50)
        ]);

        const combined = [];
        if (unitRes.data) {
          unitRes.data.forEach(p => combined.push({ ...p, paperType: 'Unit Paper' }));
        }
        if (fullRes.data) {
          fullRes.data.forEach(p => combined.push({ ...p, paperType: 'Term / Full' }));
        }

        combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        this.unitPapers = combined;
        this.renderPapers(this.unitPapers);
      } catch (e) {
        console.warn('[ZenithAdmin] Papers load error:', e);
      }
    },

    renderPapers(list) {
      const tbody = document.querySelector('#adminPapersTable tbody');
      if (!tbody) return;

      const badge = document.getElementById('adminPaperCountBadge');
      if (badge) badge.textContent = `Showing last ${list.length} papers`;

      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">No paper logs found.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(p => {
        const scope = p.user_id ? `${p.user_id.slice(0, 8)}...` : '<span style="color:#f59e0b;">Wosandi Legacy</span>';
        const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A';
        const score = p.marks !== undefined ? `${p.marks}%` : (p.score !== undefined ? `${p.score}%` : 'N/A');
        const tableName = p.paperType === 'Unit Paper' ? 'unit_papers' : 'full_papers';
        return `
          <tr>
            <td><span style="background:rgba(59,130,246,0.15);color:#60a5fa;padding:2px 8px;border-radius:6px;font-weight:600;">${p.paperType}</span></td>
            <td><code>${scope}</code></td>
            <td><strong>${p.subject || 'N/A'}</strong></td>
            <td>${p.unit_name || p.paper_name || p.paper_title || 'Exam'}</td>
            <td><strong>${score}</strong></td>
            <td>${dateStr}</td>
            <td>
              <button class="zenith-btn-sm zenith-btn-delete" onclick="ZenithAdmin.deletePaper('${tableName}', '${p.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    },

    filterPapers(query) {
      if (!query) {
        this.renderPapers(this.unitPapers);
        return;
      }
      const q = query.toLowerCase();
      const filtered = this.unitPapers.filter(p =>
        (p.subject && p.subject.toLowerCase().includes(q)) ||
        (p.unit_name && p.unit_name.toLowerCase().includes(q)) ||
        (p.paper_name && p.paper_name.toLowerCase().includes(q))
      );
      this.renderPapers(filtered);
    },

    async deletePaper(tableName, paperId) {
      if (!confirm('Are you sure you want to delete this paper record?')) return;
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const { error } = await sb.from(tableName).delete().eq('id', paperId);
        if (error) throw error;
        alert('Paper record deleted.');
        this.loadPapers();
      } catch (err) {
        alert('Error deleting paper: ' + err.message);
      }
    },

    async loadAnnouncements() {
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const { data, error } = await sb
          .from('platform_announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[ZenithAdmin] Announcements table not initialized:', error.message);
          return;
        }

        this.announcements = data || [];
        this.renderAnnouncements(this.announcements);
      } catch (e) {
        console.warn('[ZenithAdmin] Announcements load error:', e);
      }
    },

    renderAnnouncements(list) {
      const tbody = document.querySelector('#adminAnnounceTable tbody');
      if (!tbody) return;

      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">No announcements posted yet.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(a => `
        <tr>
          <td><strong>${a.title}</strong><div style="font-size:12px;color:#94a3b8;margin-top:2px;">${a.content || ''}</div></td>
          <td><span style="background:rgba(99,102,241,0.2);padding:2px 8px;border-radius:6px;color:#a5b4fc;">Grade: ${a.target_grade || 'ALL'}</span></td>
          <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button class="zenith-btn-sm zenith-btn-delete" onclick="ZenithAdmin.deleteAnnouncement('${a.id}')">Delete</button>
          </td>
        </tr>
      `).join('');
    },

    async postAnnouncement() {
      const titleInput = document.getElementById('adminAnnounceTitle');
      const msgInput = document.getElementById('adminAnnounceMsg');
      const gradeInput = document.getElementById('adminAnnounceGrade');

      const title = titleInput ? titleInput.value.trim() : '';
      const content = msgInput ? msgInput.value.trim() : '';
      const targetGrade = gradeInput ? gradeInput.value : 'ALL';

      if (!title) {
        alert('Please enter an announcement title.');
        return;
      }

      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const { error } = await sb.from('platform_announcements').insert([{
          title,
          content,
          target_grade: targetGrade,
          created_by: ADMIN_EMAIL,
          active: true
        }]);

        if (error) throw error;
        alert('Broadcast announcement published to students!');
        if (titleInput) titleInput.value = '';
        if (msgInput) msgInput.value = '';
        this.loadAnnouncements();
      } catch (err) {
        alert('Failed to post announcement: ' + err.message);
      }
    },

    async deleteAnnouncement(id) {
      if (!confirm('Delete this broadcast announcement?')) return;
      const sb = window.supabaseClient;
      if (!sb) return;

      try {
        const { error } = await sb.from('platform_announcements').delete().eq('id', id);
        if (error) throw error;
        this.loadAnnouncements();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    },

    exportSnapshot() {
      const snapshot = {
        exportedAt: new Date().toISOString(),
        exportedBy: ADMIN_EMAIL,
        telemetry: this.stats,
        users: this.users,
        sessions: this.sessions,
        papers: this.unitPapers,
        announcements: this.announcements
      };

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenith_platform_snapshot_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  window.ZenithAdmin = ZenithAdmin;
  ZenithAdmin.init();
})();
