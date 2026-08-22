/**
 * Symposium - Coordinator Management Module
 */

const Coordinators = {
  list: [],
  currentTabRole: 'all',
  editingCoordId: null,

  async init() {
    await this.loadCoordinators();
    this.setupEventListeners();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('coordinator-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterAndRender());
    }

    const sectorFilter = document.getElementById('coordinator-sector-filter');
    if (sectorFilter) {
      sectorFilter.addEventListener('change', () => this.filterAndRender());
    }

    const deptFilter = document.getElementById('coordinator-dept-filter');
    if (deptFilter) {
      deptFilter.addEventListener('change', () => this.filterAndRender());
    }
  },

  async loadCoordinators() {
    try {
      const res = await fetch('/api/coordinators');
      if (!res.ok) throw new Error('Failed to load coordinators');
      this.list = await res.json();
      this.populateSectorFilterDropdown();
      this.filterAndRender();
    } catch (err) {
      console.error('Error loading coordinators:', err);
      Toast.show('Error loading coordinators list', 'error');
    }
  },

  populateSectorFilterDropdown() {
    const dropdown = document.getElementById('coordinator-sector-filter');
    if (!dropdown) return;

    const sectors = Sectors.list || [];
    const currentValue = dropdown.value;
    dropdown.innerHTML = `<option value="all">All Sectors</option>` +
      sectors.map(s => `<option value="${s.id}">${App.escapeHtml(s.name)}</option>`).join('');
    dropdown.value = currentValue || 'all';
  },

  setRoleTab(role) {
    this.currentTabRole = role;
    document.querySelectorAll('.coord-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.role === role);
    });
    this.filterAndRender();
  },

  filterAndRender() {
    const searchTerm = (document.getElementById('coordinator-search-input')?.value || '').toLowerCase().trim();
    const selectedSector = document.getElementById('coordinator-sector-filter')?.value || 'all';
    const selectedDept = document.getElementById('coordinator-dept-filter')?.value || 'all';

    let filtered = this.list;

    // Filter by Role tab
    if (this.currentTabRole === 'admin') {
      filtered = filtered.filter(c => c.role === 'Admin');
    } else if (this.currentTabRole === 'staff') {
      filtered = filtered.filter(c => c.role === 'Staff Coordinator');
    } else if (this.currentTabRole === 'student') {
      filtered = filtered.filter(c => c.role === 'Student Coordinator');
    }

    // Filter by Sector
    if (selectedSector !== 'all') {
      filtered = filtered.filter(c => c.sector_id === selectedSector || c.sector_id === 'all');
    }

    // Filter by Department
    if (selectedDept !== 'all') {
      filtered = filtered.filter(c => (c.department || '').toLowerCase().includes(selectedDept.toLowerCase()));
    }

    // Filter by Search Query
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm) ||
        (c.id_number && c.id_number.toLowerCase().includes(searchTerm)) ||
        c.email.toLowerCase().includes(searchTerm) ||
        c.phone.toLowerCase().includes(searchTerm) ||
        (c.sector && c.sector.toLowerCase().includes(searchTerm)) ||
        (c.department && c.department.toLowerCase().includes(searchTerm))
      );
    }

    this.renderTable(filtered);
    const countEl = document.getElementById('coordinators-count-badge');
    if (countEl) countEl.textContent = `${filtered.length} Coordinators`;
  },

  renderTable(coords) {
    const tbody = document.getElementById('coordinators-table-body');
    if (!tbody) return;

    if (coords.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px; color: var(--text-light);">
            No coordinators match the selected filters or search query.
          </td>
        </tr>
      `;
      return;
    }

    const isAdmin = Auth.isAdmin();

    tbody.innerHTML = coords.map(c => {
      let roleBadge = 'role-pill student';
      if (c.role === 'Admin') roleBadge = 'role-pill admin';
      else if (c.role === 'Staff Coordinator') roleBadge = 'role-pill staff';

      const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-avatar-circle" style="background: ${c.avatar_color || '#4f46e5'};">
                ${initials}
              </div>
              <div class="user-cell-meta">
                <span class="user-name">${App.escapeHtml(c.name)}</span>
                <span class="user-sub">${App.escapeHtml(c.id_number || 'ID: -')}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="${roleBadge}">${c.role}</span>
          </td>
          <td>
            <span style="font-size: 12px; color: var(--text-muted);">${App.escapeHtml(c.department || '-')}</span>
          </td>
          <td>
            <span class="badge badge-priority-medium">${App.escapeHtml(c.sector || 'General')}</span>
          </td>
          <td>
            <div style="font-size: 12px;">
              <div>${App.escapeHtml(c.phone)}</div>
              <div style="color: var(--text-light); font-size: 11px;">${App.escapeHtml(c.email)}</div>
            </div>
          </td>
          <td>
            <span class="badge ${c.status === 'Active' ? 'badge-status-completed' : 'badge-status-pending'}">
              ${c.status || 'Active'}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="Coordinators.viewDetails('${c.id}')" title="View Contact Card">
              View
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Coordinators.openEditModal('${c.id}')" title="Edit Coordinator">
              Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="Coordinators.confirmRemove('${c.id}', '${App.escapeHtml(c.name)}')" title="Remove Coordinator">
              Remove
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.editingCoordId = null;
    document.getElementById('coord-modal-title').textContent = 'Add New Coordinator';
    document.getElementById('coord-form').reset();
    document.getElementById('coord-id-field').value = '';

    // Populate sectors dropdown
    this.populateModalSectorsDropdown();
    App.openModal('coordinator-modal');
  },

  openEditModal(id) {
    const coord = this.list.find(c => c.id === id);
    if (!coord) return;

    this.editingCoordId = id;
    document.getElementById('coord-modal-title').textContent = 'Edit Coordinator';
    document.getElementById('coord-id-field').value = coord.id;
    document.getElementById('coord-name-input').value = coord.name;
    document.getElementById('coord-role-input').value = coord.role;
    document.getElementById('coord-dept-input').value = coord.department || '';
    document.getElementById('coord-regid-input').value = coord.id_number || '';
    document.getElementById('coord-phone-input').value = coord.phone;
    document.getElementById('coord-email-input').value = coord.email;
    document.getElementById('coord-status-input').value = coord.status || 'Active';

    this.populateModalSectorsDropdown(coord.sector_id);
    App.openModal('coordinator-modal');
  },

  populateModalSectorsDropdown(selectedSectorId) {
    const select = document.getElementById('coord-sector-input');
    if (!select) return;

    const sectors = Sectors.list || [];
    select.innerHTML = `<option value="all">Overall / General</option>` +
      sectors.map(s => `<option value="${s.id}" ${s.id === selectedSectorId ? 'selected' : ''}>${App.escapeHtml(s.name)}</option>`).join('');
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('coord-id-field').value;
    const name = document.getElementById('coord-name-input').value.trim();
    const role = document.getElementById('coord-role-input').value;
    const department = document.getElementById('coord-dept-input').value.trim();
    const id_number = document.getElementById('coord-regid-input').value.trim();
    const phone = document.getElementById('coord-phone-input').value.trim();
    const email = document.getElementById('coord-email-input').value.trim();
    const sector_id = document.getElementById('coord-sector-input').value;
    const status = document.getElementById('coord-status-input').value;

    if (!name || !phone || !email) {
      Toast.show('Please fill in all required fields (Name, Phone, Email)', 'error');
      return;
    }

    const payload = { name, role, department, id_number, phone, email, sector_id, status };

    try {
      let res;
      if (id) {
        res = await fetch(`/api/coordinators/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/coordinators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show(data.message, 'success');
        App.closeModal('coordinator-modal');
        await this.loadCoordinators();
        Dashboard.loadStats();
        Works.loadWorks();
      } else {
        Toast.show(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      Toast.show('Network error while saving coordinator', 'error');
    }
  },

  confirmRemove(id, name) {
    App.confirmDialog({
      title: 'Remove Coordinator',
      message: `Are you sure you want to remove <strong>${name}</strong> from the symposium team? Their assigned tasks and contact history will be preserved safely.`,
      confirmText: 'Yes, Remove',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/coordinators/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            Toast.show(data.message, 'success');
            await this.loadCoordinators();
            Dashboard.loadStats();
          } else {
            Toast.show(data.error || 'Failed to remove coordinator', 'error');
          }
        } catch (err) {
          Toast.show('Error removing coordinator', 'error');
        }
      }
    });
  },

  viewDetails(id) {
    const coord = this.list.find(c => c.id === id);
    if (!coord) return;

    document.getElementById('detail-modal-name').textContent = coord.name;
    document.getElementById('detail-modal-role').textContent = coord.role;
    document.getElementById('detail-modal-dept').textContent = coord.department || '-';
    document.getElementById('detail-modal-id').textContent = coord.id_number || '-';
    document.getElementById('detail-modal-sector').textContent = coord.sector || 'General';
    document.getElementById('detail-modal-phone').textContent = coord.phone;
    document.getElementById('detail-modal-email').textContent = coord.email;
    document.getElementById('detail-modal-status').textContent = coord.status || 'Active';

    // Action buttons
    document.getElementById('detail-modal-call-btn').href = `tel:${coord.phone.replace(/\s+/g, '')}`;
    document.getElementById('detail-modal-email-btn').href = `mailto:${coord.email}`;
    document.getElementById('detail-modal-copy-phone').onclick = () => App.copyToClipboard(coord.phone, 'Phone number');
    document.getElementById('detail-modal-copy-email').onclick = () => App.copyToClipboard(coord.email, 'Email address');

    App.openModal('coordinator-details-modal');
  }
};
