/**
 * Symposium - Portal Access & State Management (Open Access Mode - No Auth / Role restrictions)
 */

const Auth = {
  currentUser: {
    id: "coord-1",
    name: "Symposium Coordinator",
    email: "symposium@sincet.edu.in",
    role: "Coordinator",
    department: "SINCET",
    sector_id: "all"
  },

  async init() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data && data.user) {
        this.currentUser = data.user;
      }
    } catch (err) {
      console.log('Open access portal initialized');
    }
    this.renderUserUI();
    this.hideLoginScreen();
  },

  async login(email, password) {
    this.renderUserUI();
    this.hideLoginScreen();
    Toast.show('Welcome to Symposium Portal', 'success');
    return { success: true };
  },

  async logout() {
    Toast.show('Open access mode active - authentication not required', 'info');
  },

  isAdmin() {
    return true;
  },

  isStaffOrAdmin() {
    return true;
  },

  isStudent() {
    return false;
  },

  renderUserUI() {
    // Update Sidebar User Profile
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const topbarRoleEl = document.getElementById('topbar-user-role');

    if (avatarEl) avatarEl.textContent = 'SF';
    if (nameEl) nameEl.textContent = 'Symposium Portal';
    if (roleEl) roleEl.textContent = 'Full Access';

    if (topbarRoleEl) {
      topbarRoleEl.className = 'role-pill admin';
      topbarRoleEl.innerHTML = '<span class="badge-pulse"></span> Open Access';
    }

    // Ensure all management actions and buttons are fully visible to all users
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = '';
    });

    document.querySelectorAll('.staff-admin-only').forEach(el => {
      el.style.display = '';
    });
  },

  showLoginScreen() {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'none';
  },

  hideLoginScreen() {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'none';
  }
};
