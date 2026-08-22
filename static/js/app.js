/**
 * Symposium - Main Application Controller & Utilities
 */

const App = {
  currentView: 'dashboard-view',

  async init() {
    // 1. Initialize Auth Check
    await Auth.init();

    // 2. Setup Navigation Event Handlers
    this.setupNavigation();

    // 3. Initialize App Modules
    await Sectors.init();
    await Coordinators.init();
    await Works.init();
    await MyWorks.init();
    await Contacts.init();
    await Resources.init();
    await Settings.init();
    await Dashboard.init();

    // 4. Global Keydown Handlers (Escape to close modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    console.log('Symposium application successfully initialized.');
  },

  setupNavigation() {
    document.querySelectorAll('[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        this.navigateTo(targetView);
        this.closeMobileSidebar();
      });
    });
  },

  navigateTo(viewId) {
    this.currentView = viewId;

    // Switch active view panel
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(viewId);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // Update nav item active states
    document.querySelectorAll('.nav-item').forEach(item => {
      const isMatch = item.getAttribute('data-view') === viewId;
      item.classList.toggle('active', isMatch);
    });

    // Update Topbar headline
    this.updatePageHeader(viewId);

    // Refresh view specific data
    this.refreshCurrentView();
  },

  updatePageHeader(viewId) {
    const titleEl = document.getElementById('page-title');
    const descEl = document.getElementById('page-subtitle');
    if (!titleEl || !descEl) return;

    const headers = {
      'dashboard-view': {
        title: 'Executive Dashboard',
        desc: 'Real-time overview of symposium coordination metrics and active responsibilities.'
      },
      'coordinators-view': {
        title: 'Coordinator Management',
        desc: 'Admins, Staff In-Charges, and Student Coordinators directory and assignments.'
      },
      'sectors-view': {
        title: 'Sectors & Committees',
        desc: 'Organized sectors, associated coordinators, and work progress tracking.'
      },
      'sector-detail-view': {
        title: 'Sector Overview',
        desc: 'Detailed view of committee leadership, members, and assigned works.'
      },
      'works-view': {
        title: 'All Symposium Works',
        desc: 'Centralized work master list, priority scheduling, and responsibility tracking.'
      },
      'my-works-view': {
        title: 'My Assigned Works',
        desc: 'Your active tasks, deadlines, progress status, and completion notes.'
      },
      'contacts-view': {
        title: 'Contact Directory',
        desc: 'Quick communication directory for instant calling, emailing, and messaging.'
      },
      'resources-view': {
        title: 'Documents & Links',
        desc: 'Official event brochure, registration links, schedules, and Google Forms.'
      },
      'settings-view': {
        title: 'Portal Settings',
        desc: 'Symposium configuration, venue details, emergency helpline, and account security.'
      }
    };

    const info = headers[viewId] || { title: 'Symposium Portal', desc: 'Symposium Management' };
    titleEl.textContent = info.title;
    descEl.textContent = info.desc;
  },

  refreshCurrentView() {
    switch (this.currentView) {
      case 'dashboard-view':
        Dashboard.loadStats();
        break;
      case 'coordinators-view':
        Coordinators.loadCoordinators();
        break;
      case 'sectors-view':
        Sectors.loadSectors();
        break;
      case 'works-view':
        Works.loadWorks();
        break;
      case 'my-works-view':
        MyWorks.loadMyWorks();
        break;
      case 'contacts-view':
        Contacts.loadContacts();
        break;
      case 'resources-view':
        Resources.loadResources();
        Resources.loadSettings();
        break;
      case 'settings-view':
        Settings.load();
        break;
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('open');
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  },

  confirmDialog({ title, message, confirmText = 'Confirm', confirmClass = 'btn-primary', onConfirm }) {
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const btn = document.getElementById('confirm-modal-action-btn');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message;
    if (btn) {
      btn.textContent = confirmText;
      btn.className = `btn ${confirmClass}`;
      btn.onclick = () => {
        this.closeModal('confirmation-modal');
        if (typeof onConfirm === 'function') onConfirm();
      };
    }
    this.openModal('confirmation-modal');
  },

  async copyToClipboard(text, label = 'Copied') {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      Toast.show(`${label} copied to clipboard!`, 'success');
    } catch (err) {
      Toast.show('Failed to copy to clipboard', 'error');
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const year = parts[0];
        return `${day} ${months[monthIndex] || ''} ${year}`;
      }
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

/**
 * Toast Notification Utility
 */
const Toast = {
  container: null,

  init() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    this.container = el;
  },

  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '⚠️';
    else if (type === 'warning') icon = '⚡';

    toast.innerHTML = `<span style="font-weight: 700;">${icon}</span> <span>${message}</span>`;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Fast Demo Login Autofill Helper
function fillDemoLogin(email, password) {
  const emailInput = document.getElementById('login-email');
  const pwdInput = document.getElementById('login-password');
  if (emailInput) emailInput.value = email;
  if (pwdInput) pwdInput.value = password;
  Toast.show(`Autofilled credentials for: ${email}`, 'info');
}

// Global Launch on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
