/**
 * SympoFlow - Sector Management Module
 */

const Sectors = {
  list: [],
  currentSectorDetail: null,

  async init() {
    await this.loadSectors();
    this.setupEventListeners();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('sector-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterAndRender());
    }
  },

  async loadSectors() {
    try {
      const res = await fetch('/api/sectors');
      if (!res.ok) throw new Error('Failed to load sectors');
      this.list = await res.json();
      this.filterAndRender();
    } catch (err) {
      console.error('Error loading sectors:', err);
      Toast.show('Error loading sectors data', 'error');
    }
  },

  filterAndRender() {
    const query = (document.getElementById('sector-search-input')?.value || '').toLowerCase().trim();
    let filtered = this.list;

    if (query) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (s.staff_coordinator_name && s.staff_coordinator_name.toLowerCase().includes(query))
      );
    }

    this.renderGrid(filtered);
    const countEl = document.getElementById('sectors-count-badge');
    if (countEl) countEl.textContent = `${filtered.length} Sectors`;
  },

  renderGrid(sectors) {
    const container = document.getElementById('sectors-grid-container');
    if (!container) return;

    if (sectors.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-light);">No sectors found.</div>`;
      return;
    }

    const isAdmin = Auth.isAdmin();

    container.innerHTML = sectors.map(s => {
      const total = s.total_works || 0;
      const completed = s.completed_works || 0;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return `
        <div class="sector-card" onclick="Sectors.openSectorDetail('${s.id}')">
          <div class="sector-card-header">
            <div>
              <h3 class="sector-title">${App.escapeHtml(s.name)}</h3>
              <div style="font-size: 11px; color: var(--text-light);">ID: ${s.slug || s.id}</div>
            </div>
            <div class="sector-icon-box" style="background: ${s.color || '#4f46e5'};">
              ★
            </div>
          </div>

          <p class="sector-desc">${App.escapeHtml(s.description || 'Coordination team for symposium operations.')}</p>

          <div class="sector-staff-box">
            <span class="sector-staff-label">Staff Coordinator</span>
            <div class="sector-staff-name">${App.escapeHtml(s.staff_coordinator_name || 'Not Assigned')}</div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
              <span>Work Completion</span>
              <strong>${percent}% (${completed}/${total})</strong>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" style="width: ${percent}%; background: ${s.color || 'var(--emerald-500)'};"></div>
            </div>
          </div>

          <div class="sector-stats-bar">
            <div class="stat-item">
              <span class="stat-num" style="color: var(--primary-700);">${s.student_count || 0}</span>
              <span class="stat-label">Students</span>
            </div>
            <div class="stat-item">
              <span class="stat-num" style="color: var(--amber-700);">${s.pending_works || 0}</span>
              <span class="stat-label">Pending</span>
            </div>
            <div class="stat-item">
              <span class="stat-num" style="color: var(--emerald-700);">${completed}</span>
              <span class="stat-label">Done</span>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--border-color);" onclick="event.stopPropagation();">
            <button class="btn btn-secondary btn-sm" onclick="Sectors.openEditModal('${s.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Sectors.confirmDelete('${s.id}', '${App.escapeHtml(s.name)}')">Remove</button>
          </div>
        </div>
      `;
    }).join('');
  },

  async openSectorDetail(sectorId) {
    try {
      const res = await fetch(`/api/sectors/${sectorId}`);
      if (!res.ok) throw new Error('Sector not found');
      const data = await res.json();
      this.currentSectorDetail = data;
      this.renderSectorDetailPage(data);
      App.navigateTo('sector-detail-view');
    } catch (err) {
      Toast.show('Error loading sector detail', 'error');
    }
  },

  renderSectorDetailPage(sec) {
    document.getElementById('sec-detail-title').textContent = sec.name;
    document.getElementById('sec-detail-desc').textContent = sec.description || 'Sector details and assigned coordinators.';
    document.getElementById('sec-detail-total-works').textContent = sec.metrics?.total_works || 0;
    document.getElementById('sec-detail-completed-works').textContent = sec.metrics?.completed || 0;
    document.getElementById('sec-detail-pending-works').textContent = sec.metrics?.pending || 0;

    // Staff Coordinator Section
    const staffContainer = document.getElementById('sec-detail-staff-card');
    if (sec.staff_coordinator) {
      const st = sec.staff_coordinator;
      staffContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="user-avatar-circle" style="background: ${st.avatar_color || '#4f46e5'}; width: 44px; height: 44px; font-size: 16px;">
              ${st.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main);">${App.escapeHtml(st.name)}</h4>
              <div style="font-size: 12px; color: var(--text-muted);">${App.escapeHtml(st.department || '')} • ${App.escapeHtml(st.id_number || 'Staff')}</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="tel:${st.phone.replace(/\s+/g, '')}" class="btn btn-secondary btn-sm">Call (${st.phone})</a>
            <a href="mailto:${st.email}" class="btn btn-secondary btn-sm">Email</a>
          </div>
        </div>
      `;
    } else {
      staffContainer.innerHTML = `<p style="color: var(--text-light); font-size: 13px;">No staff coordinator assigned yet.</p>`;
    }

    // Student Coordinators List
    const studentsContainer = document.getElementById('sec-detail-students-list');
    if (sec.student_coordinators && sec.student_coordinators.length > 0) {
      studentsContainer.innerHTML = sec.student_coordinators.map(sc => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-surface-subtle); border-radius: var(--radius-md); margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar-circle" style="background: ${sc.avatar_color || '#3b82f6'}; width: 34px; height: 34px; font-size: 12px;">
              ${sc.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <strong style="font-size: 13px; color: var(--text-main);">${App.escapeHtml(sc.name)}</strong>
              <div style="font-size: 11px; color: var(--text-light);">${App.escapeHtml(sc.department || '')} • ${App.escapeHtml(sc.id_number || '')}</div>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="App.copyToClipboard('${sc.phone}', 'Phone')">Copy Phone</button>
            <button class="btn btn-secondary btn-sm" onclick="App.copyToClipboard('${sc.email}', 'Email')">Copy Email</button>
          </div>
        </div>
      `).join('');
    } else {
      studentsContainer.innerHTML = `<p style="color: var(--text-light); font-size: 13px;">No student coordinators registered under this sector.</p>`;
    }

    // Works Table
    const worksTbody = document.getElementById('sec-detail-works-tbody');
    if (sec.works && sec.works.length > 0) {
      worksTbody.innerHTML = sec.works.map(w => {
        const priorityClass = `badge-priority-${w.priority.toLowerCase()}`;
        const statusClass = w.status === 'Completed' ? 'badge-status-completed' : (w.status === 'In Progress' ? 'badge-status-inprogress' : 'badge-status-pending');

        return `
          <tr>
            <td>
              <strong style="color: var(--text-main); font-size: 13px;">${App.escapeHtml(w.title)}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">${App.escapeHtml(w.description || '')}</div>
            </td>
            <td>
              <span style="font-weight: 600; color: var(--text-main);">${App.escapeHtml(w.assigned_to_name)}</span>
            </td>
            <td>
              <span class="badge ${priorityClass}">${w.priority}</span>
            </td>
            <td>
              <span class="badge ${statusClass}">${w.status}</span>
            </td>
            <td style="font-size: 12px; color: var(--rose-700); font-weight: 600;">
              ${App.formatDate(w.deadline)}
            </td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm" onclick="Works.openEditModal('${w.id}')">Manage</button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      worksTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-light);">No works assigned to this sector yet.</td></tr>`;
    }
  },

  openAddModal() {
    document.getElementById('sector-modal-title').textContent = 'Add New Sector';
    document.getElementById('sector-form').reset();
    document.getElementById('sector-id-field').value = '';
    this.populateStaffDropdown();
    App.openModal('sector-modal');
  },

  openEditModal(id) {
    const sec = this.list.find(s => s.id === id);
    if (!sec) return;

    document.getElementById('sector-modal-title').textContent = 'Edit Sector';
    document.getElementById('sector-id-field').value = sec.id;
    document.getElementById('sector-name-input').value = sec.name;
    document.getElementById('sector-desc-input').value = sec.description || '';
    document.getElementById('sector-color-input').value = sec.color || '#3b82f6';
    this.populateStaffDropdown(sec.staff_coordinator_id);
    App.openModal('sector-modal');
  },

  populateStaffDropdown(selectedStaffId) {
    const select = document.getElementById('sector-staff-input');
    if (!select) return;

    const staffCoords = Coordinators.list.filter(c => c.role === 'Staff Coordinator');
    select.innerHTML = `<option value="">-- Select Staff Coordinator --</option>` +
      staffCoords.map(c => `<option value="${c.id}" ${c.id === selectedStaffId ? 'selected' : ''}>${App.escapeHtml(c.name)} (${App.escapeHtml(c.department)})</option>`).join('');
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('sector-id-field').value;
    const name = document.getElementById('sector-name-input').value.trim();
    const description = document.getElementById('sector-desc-input').value.trim();
    const color = document.getElementById('sector-color-input').value;
    const staff_coordinator_id = document.getElementById('sector-staff-input').value;

    if (!name) {
      Toast.show('Sector name is required', 'error');
      return;
    }

    const payload = { name, description, color, staff_coordinator_id };

    try {
      let res;
      if (id) {
        res = await fetch(`/api/sectors/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/sectors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show(data.message, 'success');
        App.closeModal('sector-modal');
        await this.loadSectors();
        Dashboard.loadStats();
        Coordinators.loadCoordinators();
      } else {
        Toast.show(data.error || 'Failed to save sector', 'error');
      }
    } catch (err) {
      Toast.show('Network error while saving sector', 'error');
    }
  },

  confirmDelete(id, name) {
    App.confirmDialog({
      title: 'Remove Sector',
      message: `Are you sure you want to delete <strong>${name}</strong>? Please ensure all works and coordinators in this sector are reassigned.`,
      confirmText: 'Yes, Delete',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/sectors/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            Toast.show(data.message, 'success');
            await this.loadSectors();
            Dashboard.loadStats();
          } else {
            Toast.show(data.error || 'Failed to delete sector', 'error');
          }
        } catch (err) {
          Toast.show('Error deleting sector', 'error');
        }
      }
    });
  }
};
