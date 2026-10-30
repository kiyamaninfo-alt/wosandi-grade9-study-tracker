/**
 * Zenith O-Level • Smart Study Engine
 * Authentication & Multi-Tenant User Management
 * Supports: Google OAuth, Email/Password, Guest/Wosandi Mode, Admin Role Verification
 */

(function(global) {
  'use strict';

  let currentUser = null;
  const ADMIN_EMAIL = 'krishaja@gmail.com';

  function getStoredGuestUser() {
    try {
      const raw = localStorage.getItem('zenith_guest_profile');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      id: 'wosandi_legacy_user',
      email: null,
      fullName: 'Wosandi (Guest Mode)',
      avatarUrl: null,
      grade: (global.ZenithCurriculum ? global.ZenithCurriculum.getActiveGrade() : 9),
      role: 'student',
      isGuest: true
    };
  }

  function setStoredGuestUser(guestObj) {
    try {
      localStorage.setItem('zenith_guest_profile', JSON.stringify(guestObj));
    } catch (_) {}
  }

  function getCurrentUser() {
    if (currentUser) return currentUser;
    currentUser = getStoredGuestUser();
    return currentUser;
  }

  function isAdminUser() {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.isGuest) return false;
    const email = String(user.email || '').toLowerCase().trim();
    return email === ADMIN_EMAIL || user.role === 'admin';
  }

  function getScopedKey(baseKey) {
    const user = getCurrentUser();
    if (!user || user.isGuest || user.id === 'wosandi_legacy_user') {
      return baseKey; // 100% backward compatible for Wosandi legacy data!
    }
    return `${baseKey}_${user.id}`;
  }

  function getUserId() {
    const user = getCurrentUser();
    if (!user || user.isGuest || user.id === 'wosandi_legacy_user') {
      return null;
    }
    return user.id;
  }

  function scopeQuery(query) {
    const uid = getUserId();
    if (uid) {
      return query.eq('user_id', uid);
    }
    return query.is('user_id', null);
  }

  function attachUser(payload) {
    const uid = getUserId();
    if (uid && payload && typeof payload === 'object') {
      payload.user_id = uid;
    }
    return payload;
  }

  function getSupabaseClient() {
    return global.supabaseClient || global.supabase || null;
  }

  async function initAuth() {
    const sb = getSupabaseClient();
    if (!sb || typeof sb.auth === 'undefined') {
      currentUser = getStoredGuestUser();
      updateAuthUI();
      return currentUser;
    }

    try {
      // 1. Get current session
      const { data: { session }, error } = await sb.auth.getSession();
      if (session && session.user) {
        await handleAuthenticatedUser(session.user);
      } else {
        currentUser = getStoredGuestUser();
        updateAuthUI();
      }

      // 2. Listen for auth state changes (OAuth redirects, Sign In, Sign Out)
      sb.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession && newSession.user) {
          await handleAuthenticatedUser(newSession.user);
          if (typeof global.showDashboardView === 'function') {
            global.showDashboardView();
          }
          window.dispatchEvent(new CustomEvent('ZENITH_USER_CHANGED', { detail: currentUser }));
          if (typeof global.refreshTelemetry === 'function') {
            global.refreshTelemetry();
          }
        } else if (event === 'SIGNED_OUT') {
          currentUser = getStoredGuestUser();
          updateAuthUI();
          if (typeof global.showLandingPage === 'function') {
            global.showLandingPage();
          }
          window.dispatchEvent(new CustomEvent('ZENITH_USER_CHANGED', { detail: currentUser }));
          if (typeof global.refreshTelemetry === 'function') {
            global.refreshTelemetry();
          }
        }
      });
    } catch (e) {
      console.warn('Auth initialization fallback:', e);
      currentUser = getStoredGuestUser();
      updateAuthUI();
    }

    return currentUser;
  }

  async function handleAuthenticatedUser(supabaseUser) {
    const sb = getSupabaseClient();
    const email = String(supabaseUser.email || '').toLowerCase().trim();
    const isAdmin = (email === ADMIN_EMAIL);
    const meta = supabaseUser.user_metadata || {};
    const fullName = meta.full_name || meta.name || email.split('@')[0];
    const avatar = meta.avatar_url || meta.picture || null;
    const grade = Number(meta.grade) || (global.ZenithCurriculum ? global.ZenithCurriculum.getActiveGrade() : 9);

    currentUser = {
      id: supabaseUser.id,
      email: email,
      fullName: fullName,
      avatarUrl: avatar,
      grade: grade,
      role: isAdmin ? 'admin' : (meta.role || 'student'),
      isGuest: false
    };

    if (global.ZenithCurriculum) {
      global.ZenithCurriculum.setActiveGrade(grade);
    }

    // Attempt to upsert profile in user_profiles
    try {
      if (sb && navigator.onLine) {
        await sb.from('user_profiles').upsert([{
          id: supabaseUser.id,
          email: email,
          full_name: fullName,
          avatar_url: avatar,
          grade: grade,
          role: currentUser.role,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('Profile sync notice:', err);
    }

    updateAuthUI();
  }

  function updateAuthUI() {
    const user = getCurrentUser();
    const badge = document.getElementById('zenithUserStatusBadge');
    const avatarEl = document.getElementById('zenithUserAvatar');
    const nameEl = document.getElementById('zenithUserName');
    const gradeBadge = document.getElementById('zenithUserGradeBadge');
    const adminBtn = document.getElementById('btnZenithAdminPortal');
    const authActionBtn = document.getElementById('btnZenithAuthAction');

    if (nameEl) nameEl.innerText = user.fullName || 'Student';
    if (gradeBadge) {
      gradeBadge.innerText = `Grade ${user.grade || 9}`;
      gradeBadge.style.display = 'inline-block';
    }
    const topGradeEl = document.getElementById('zenithTopActiveGrade');
    if (topGradeEl) topGradeEl.innerText = `Grade ${user.grade || 9}`;

    if (avatarEl) {
      if (user.avatarUrl) {
        avatarEl.src = user.avatarUrl;
        avatarEl.style.display = 'inline-block';
      } else {
        avatarEl.style.display = 'none';
      }
    }

    if (authActionBtn) {
      if (user.isGuest) {
        authActionBtn.innerText = '🔑 Log In / Sign Up';
        authActionBtn.onclick = () => showAuthModal('login');
      } else {
        authActionBtn.innerText = '🚪 Sign Out';
        authActionBtn.onclick = () => signOut();
      }
    }

    if (badge) {
      badge.className = user.isGuest ? 'zenith-user-chip guest' : 'zenith-user-chip logged-in';
      badge.title = user.isGuest ? 'Guest Mode (Click to Sign In)' : `Logged in as ${user.email}`;
    }

    // Admin Panel Trigger Button (Req 12 & 13: strictly for krishaja@gmail.com)
    if (adminBtn) {
      if (isAdminUser()) {
        adminBtn.style.display = 'inline-flex';
        adminBtn.onclick = () => openAdminPortal();
      } else {
        adminBtn.style.display = 'none';
      }
    }
  }

  async function signInWithGoogle() {
    const sb = getSupabaseClient();
    if (!sb) {
      alert('⚠️ Database connection not available. Please check network.');
      return;
    }
    const origin = window.location.origin + window.location.pathname;
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin
      }
    });
    if (error) {
      alert('Google Login Notice: ' + error.message);
    }
  }

  async function signInWithEmail(email, password) {
    const sb = getSupabaseClient();
    if (!sb) return { error: { message: 'Database not initialized' } };
    const res = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });
    if (!res.error && res.data.user) {
      hideAuthModal();
    }
    return res;
  }

  async function signUpWithEmail(email, password, fullName, grade) {
    const sb = getSupabaseClient();
    if (!sb) return { error: { message: 'Database not initialized' } };
    const gNum = Number(grade) || 9;
    const res = await sb.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: fullName.trim(),
          grade: gNum
        }
      }
    });
    if (!res.error) {
      hideAuthModal();
      alert('✅ සාර්ථකව ලියාපදිංචි විය! (Account created successfully)');
    }
    return res;
  }

  async function signOut() {
    const sb = getSupabaseClient();
    if (sb && !getCurrentUser().isGuest) {
      try {
        await sb.auth.signOut();
      } catch (_) {}
    }
    currentUser = getStoredGuestUser();
    updateAuthUI();
    if (typeof global.showLandingPage === 'function') {
      global.showLandingPage();
    }
    window.dispatchEvent(new CustomEvent('ZENITH_USER_CHANGED', { detail: currentUser }));
    if (typeof global.refreshTelemetry === 'function') {
      global.refreshTelemetry();
    }
  }

  function continueAsGuest(name, grade) {
    const g = Number(grade) || 9;
    currentUser = {
      id: 'wosandi_legacy_user',
      email: null,
      fullName: name || 'Student (Guest)',
      avatarUrl: null,
      grade: g,
      role: 'student',
      isGuest: true
    };
    setStoredGuestUser(currentUser);
    if (global.ZenithCurriculum) {
      global.ZenithCurriculum.setActiveGrade(g);
    }
    hideAuthModal();
    updateAuthUI();
    window.dispatchEvent(new CustomEvent('ZENITH_USER_CHANGED', { detail: currentUser }));
  }

  function showAuthModal(initialTab = 'login') {
    const modal = document.getElementById('zenithAuthModal');
    if (!modal) return;
    switchAuthTab(initialTab);
    modal.style.display = 'flex';
  }

  function hideAuthModal() {
    const modal = document.getElementById('zenithAuthModal');
    if (modal) modal.style.display = 'none';
  }

  function switchAuthTab(tabId) {
    const tabs = ['login', 'signup', 'guest'];
    tabs.forEach(t => {
      const pane = document.getElementById(`authPane_${t}`);
      const btn = document.getElementById(`authTabBtn_${t}`);
      if (pane) pane.style.display = (t === tabId ? 'block' : 'none');
      if (btn) btn.classList.toggle('active', t === tabId);
    });
  }

  function openAdminPortal() {
    if (!isAdminUser()) {
      alert('⛔ Access Denied. Admin privileges required.');
      return;
    }
    // Lazy load admin portal script if not yet loaded
    if (typeof global.ZenithAdmin !== 'undefined') {
      global.ZenithAdmin.openModal();
    } else {
      const s = document.createElement('script');
      s.src = 'admin-portal.js';
      s.onload = () => {
        if (typeof global.ZenithAdmin !== 'undefined') {
          global.ZenithAdmin.openModal();
        }
      };
      s.onerror = () => alert('Failed to load Admin Portal module.');
      document.body.appendChild(s);
    }
  }

  // Export module
  global.ZenithAuth = {
    ADMIN_EMAIL,
    getCurrentUser,
    getUser: getCurrentUser,
    getUserId,
    scopeQuery,
    attachUser,
    getSupabaseClient,
    isAdminUser,
    getScopedKey,
    initAuth,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    continueAsGuest,
    showAuthModal,
    hideAuthModal,
    switchAuthTab,
    updateAuthUI,
    openAdminPortal
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    setTimeout(initAuth, 100);
  }

})(typeof window !== 'undefined' ? window : this);
