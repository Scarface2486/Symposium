/**
 * SympoFlow - Open Access Mode (No Authentication Required)
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
    this.renderUserUI();
  },

  login() {
    return Promise.resolve({ success: true });
  },

  logout() {
    return Promise.resolve({ success: true });
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
    // Reveal all management and action buttons globally without restrictions
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = '';
    });

    document.querySelectorAll('.staff-admin-only').forEach(el => {
      el.style.display = '';
    });
  },

  showLoginScreen() {},
  hideLoginScreen() {}
};

