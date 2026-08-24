/**
 * SympoFlow - Contact Directory Module
 */

const Contacts = {
  list: [],

  async init() {
    await this.loadContacts();
    this.setupEventListeners();
  },

  setupEventListeners() {
    const search = document.getElementById('contact-search-input');
    if (search) {
      search.addEventListener('input', () => this.filterAndRender());
    }

    const role = document.getElementById('contact-role-filter');
    if (role) {
      role.addEventListener('change', () => this.filterAndRender());
    }

    const sector = document.getElementById('contact-sector-filter');
    if (sector) {
      sector.addEventListener('change', () => this.filterAndRender());
    }

    const dept = document.getElementById('contact-dept-filter');
    if (dept) {
      dept.addEventListener('change', () => this.filterAndRender());
    }
  },

  async loadContacts() {
    try {
      const res = await fetch('/api/coordinators');
      if (!res.ok) throw new Error('Failed to load contacts');
      this.list = await res.json();
      this.populateFilters();
      this.filterAndRender();
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  },

  populateFilters() {
    const sectorFilter = document.getElementById('contact-sector-filter');
    if (sectorFilter) {
      const sectors = Sectors.list || [];
      const curr = sectorFilter.value;
      sectorFilter.innerHTML = `<option value="all">All Sectors</option>` +
        sectors.map(s => `<option value="${s.id}">${App.escapeHtml(s.name)}</option>`).join('');
      sectorFilter.value = curr || 'all';
    }
  },

  filterAndRender() {
    const search = (document.getElementById('contact-search-input')?.value || '').toLowerCase().trim();
    const role = document.getElementById('contact-role-filter')?.value || 'all';
    const sector = document.getElementById('contact-sector-filter')?.value || 'all';
    const dept = document.getElementById('contact-dept-filter')?.value || 'all';

    let filtered = this.list;

    if (role !== 'all') {
      filtered = filtered.filter(c => c.role === role);
    }
    if (sector !== 'all') {
      filtered = filtered.filter(c => c.sector_id === sector || c.sector_id === 'all');
    }
    if (dept !== 'all') {
      filtered = filtered.filter(c => (c.department || '').toLowerCase().includes(dept.toLowerCase()));
    }
    if (search) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.phone.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        (c.department && c.department.toLowerCase().includes(search)) ||
        (c.sector && c.sector.toLowerCase().includes(search))
      );
    }

    this.renderGrid(filtered);
    const countBadge = document.getElementById('contacts-count-badge');
    if (countBadge) countBadge.textContent = `${filtered.length} Contacts`;
  },

  renderGrid(contacts) {
    const container = document.getElementById('contacts-grid-container');
    if (!container) return;

    if (contacts.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-light);">No contacts match the criteria.</div>`;
      return;
    }

    container.innerHTML = contacts.map(c => {
      let roleBadge = 'role-pill student';
      if (c.role === 'Admin') roleBadge = 'role-pill admin';
      else if (c.role === 'Staff Coordinator') roleBadge = 'role-pill staff';

      const cleanPhone = c.phone.replace(/[^0-9+]/g, '');
      const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      return `
        <div class="contact-card">
          <div class="contact-card-top">
            <div class="user-avatar-circle" style="background: ${c.avatar_color || '#4f46e5'}; width: 44px; height: 44px; font-size: 15px;">
              ${initials}
            </div>
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${App.escapeHtml(c.name)}
              </h4>
              <div style="margin-top: 2px;">
                <span class="${roleBadge}">${c.role}</span>
              </div>
            </div>
          </div>

          <div class="contact-details-list">
            <div class="contact-row-item">
              <span style="font-weight: 600; color: var(--text-main);">Sector:</span>
              <span class="badge badge-priority-medium">${App.escapeHtml(c.sector || 'General')}</span>
            </div>
            <div class="contact-row-item">
              <span style="font-weight: 600; color: var(--text-main);">Dept:</span>
              <span>${App.escapeHtml(c.department || '-')}</span>
            </div>
            <div class="contact-row-item">
              <span style="font-weight: 600; color: var(--text-main);">Phone:</span>
              <span style="font-weight: 600; color: var(--primary-700);">${App.escapeHtml(c.phone)}</span>
            </div>
            <div class="contact-row-item">
              <span style="font-weight: 600; color: var(--text-main);">Email:</span>
              <span style="word-break: break-all;">${App.escapeHtml(c.email)}</span>
            </div>
          </div>

          <div class="contact-actions-row">
            <a href="tel:${cleanPhone}" class="contact-btn" title="Direct Phone Call">
              📞 Call
            </a>
            <a href="mailto:${c.email}" class="contact-btn" title="Send Email">
              ✉️ Email
            </a>
            <button class="contact-btn" onclick="App.copyToClipboard('${c.phone}', 'Phone number')" title="Copy Phone Number">
              📋 Phone
            </button>
            <button class="contact-btn" onclick="App.copyToClipboard('${c.email}', 'Email address')" title="Copy Email Address">
              📋 Email
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
};
