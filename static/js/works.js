/**
 * SympoFlow - Work & Task Management Module
 */

const Works = {
  list: [],
  editingWorkId: null,

  async init() {
    await this.loadWorks();
    this.setupEventListeners();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('works-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterAndRender());
    }

    const sectorFilter = document.getElementById('works-sector-filter');
    if (sectorFilter) {
      sectorFilter.addEventListener('change', () => this.filterAndRender());
    }

    const statusFilter = document.getElementById('works-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.filterAndRender());
    }

    const priorityFilter = document.getElementById('works-priority-filter');
    if (priorityFilter) {
      priorityFilter.addEventListener('change', () => this.filterAndRender());
    }

    // Dynamic coordinator dropdown filter when sector is selected in modal
    const modalSectorSelect = document.getElementById('work-sector-input');
    if (modalSectorSelect) {
      modalSectorSelect.addEventListener('change', (e) => {
        this.updateResponsibleCoordinatorDropdown(e.target.value);
      });
    }
  },

  async loadWorks() {
    try {
      const res = await fetch('/api/works');
      if (!res.ok) throw new Error('Failed to load works');
      this.list = await res.json();
      this.populateFilterDropdowns();
      this.filterAndRender();
      if (typeof MyWorks !== 'undefined') {
        MyWorks.loadMyWorks();
      }
    } catch (err) {
      console.error('Error loading works:', err);
      Toast.show('Error loading work list', 'error');
    }
  },

  populateFilterDropdowns() {
    const sectorFilter = document.getElementById('works-sector-filter');
    if (sectorFilter) {
      const sectors = Sectors.list || [];
      const curr = sectorFilter.value;
      sectorFilter.innerHTML = `<option value="all">All Sectors</option>` +
        sectors.map(s => `<option value="${s.id}">${App.escapeHtml(s.name)}</option>`).join('');
      sectorFilter.value = curr || 'all';
    }
  },

  filterAndRender() {
    const search = (document.getElementById('works-search-input')?.value || '').toLowerCase().trim();
    const sector = document.getElementById('works-sector-filter')?.value || 'all';
    const status = document.getElementById('works-status-filter')?.value || 'all';
    const priority = document.getElementById('works-priority-filter')?.value || 'all';

    let filtered = this.list;

    if (sector !== 'all') {
      filtered = filtered.filter(w => w.sector_id === sector);
    }
    if (status !== 'all') {
      filtered = filtered.filter(w => w.status === status);
    }
    if (priority !== 'all') {
      filtered = filtered.filter(w => w.priority === priority);
    }
    if (search) {
      filtered = filtered.filter(w =>
        w.title.toLowerCase().includes(search) ||
        (w.description && w.description.toLowerCase().includes(search)) ||
        (w.assigned_to_name && w.assigned_to_name.toLowerCase().includes(search)) ||
        (w.sector_name && w.sector_name.toLowerCase().includes(search))
      );
    }

    this.renderTable(filtered);
    const countEl = document.getElementById('works-count-badge');
    if (countEl) countEl.textContent = `${filtered.length} Works`;
  },

  renderTable(works) {
    const tbody = document.getElementById('works-table-body');
    if (!tbody) return;

    if (works.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 36px; color: var(--text-light);">No works found matching the criteria.</td></tr>`;
      return;
    }

    const isStaffOrAdmin = Auth.isStaffOrAdmin();

    tbody.innerHTML = works.map(w => {
      const priorityClass = `badge-priority-${w.priority.toLowerCase()}`;
      const statusClass = w.status === 'Completed' ? 'badge-status-completed' : (w.status === 'In Progress' ? 'badge-status-inprogress' : 'badge-status-pending');

      return `
        <tr>
          <td style="max-width: 280px;">
            <strong style="font-size: 13px; color: var(--text-main); display: block;">${App.escapeHtml(w.title)}</strong>
            <p style="font-size: 11px; color: var(--text-muted); line-height: 1.3; margin-top: 2px;">
              ${App.escapeHtml(w.description || '')}
            </p>
            ${w.completion_notes ? `<div style="font-size: 11px; color: var(--emerald-700); margin-top: 4px;"><strong>Note:</strong> ${App.escapeHtml(w.completion_notes)}</div>` : ''}
          </td>
          <td>
            <span class="badge badge-priority-medium">${App.escapeHtml(w.sector_name || 'General')}</span>
          </td>
          <td>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-main);">${App.escapeHtml(w.assigned_to_name)}</div>
            <div style="font-size: 11px; color: var(--text-light);">${App.escapeHtml(w.assigned_to_role || 'Coordinator')}</div>
          </td>
          <td>
            <span class="badge ${priorityClass}">${w.priority}</span>
          </td>
          <td>
            <select class="form-select" style="padding: 4px 8px; font-size: 11px; width: auto; font-weight: 600;" onchange="Works.quickUpdateStatus('${w.id}', this.value)">
              <option value="Pending" ${w.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
              <option value="In Progress" ${w.status === 'In Progress' ? 'selected' : ''}>⚡ In Progress</option>
              <option value="Completed" ${w.status === 'Completed' ? 'selected' : ''}>✓ Completed</option>
            </select>
          </td>
          <td style="font-size: 12px; font-weight: 600; color: var(--rose-700);">
            ${App.formatDate(w.deadline)}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="Works.openEditModal('${w.id}')" title="Edit / Reassign">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Works.confirmDelete('${w.id}', '${App.escapeHtml(w.title)}')" title="Delete Work">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal(presetSectorId = null) {
    this.editingWorkId = null;
    document.getElementById('work-modal-title').textContent = 'Assign New Work';
    document.getElementById('work-form').reset();
    document.getElementById('work-id-field').value = '';

    // Set default start date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('work-start-date').value = today;

    // Set default deadline to 5 days from today
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 5);
    document.getElementById('work-deadline').value = deadlineDate.toISOString().split('T')[0];

    // Populate sector dropdown
    const sectorSelect = document.getElementById('work-sector-input');
    const sectors = Sectors.list || [];
    sectorSelect.innerHTML = `<option value="">-- Select Sector First --</option>` +
      sectors.map(s => `<option value="${s.id}" ${s.id === presetSectorId ? 'selected' : ''}>${App.escapeHtml(s.name)}</option>`).join('');

    // If preset sector provided, populate coordinators
    if (presetSectorId) {
      sectorSelect.value = presetSectorId;
      this.updateResponsibleCoordinatorDropdown(presetSectorId);
    } else {
      this.updateResponsibleCoordinatorDropdown('');
    }

    App.openModal('work-modal');
  },

  openEditModal(id) {
    const work = this.list.find(w => w.id === id);
    if (!work) return;

    this.editingWorkId = id;
    document.getElementById('work-modal-title').textContent = 'Edit & Reassign Work';
    document.getElementById('work-id-field').value = work.id;
    document.getElementById('work-title-input').value = work.title;
    document.getElementById('work-desc-input').value = work.description || '';
    document.getElementById('work-priority-input').value = work.priority || 'Medium';
    document.getElementById('work-status-input').value = work.status || 'Pending';
    document.getElementById('work-start-date').value = work.start_date || '';
    document.getElementById('work-deadline').value = work.deadline || '';
    document.getElementById('work-notes-input').value = work.completion_notes || '';

    // Populate sector dropdown
    const sectorSelect = document.getElementById('work-sector-input');
    const sectors = Sectors.list || [];
    sectorSelect.innerHTML = `<option value="">-- Select Sector --</option>` +
      sectors.map(s => `<option value="${s.id}" ${s.id === work.sector_id ? 'selected' : ''}>${App.escapeHtml(s.name)}</option>`).join('');
    sectorSelect.value = work.sector_id;

    // Update and select coordinator
    this.updateResponsibleCoordinatorDropdown(work.sector_id, work.assigned_to_id);

    App.openModal('work-modal');
  },

  /**
   * Filter coordinators dynamically by selected sector
   */
  updateResponsibleCoordinatorDropdown(sectorId, selectedCoordId = null) {
    const coordSelect = document.getElementById('work-assignee-input');
    if (!coordSelect) return;

    if (!sectorId) {
      coordSelect.innerHTML = `<option value="">-- Please select a Sector first --</option>`;
      coordSelect.disabled = true;
      return;
    }

    coordSelect.disabled = false;
    const allCoords = Coordinators.list.filter(c => c.status !== 'Removed');
    
    // Filter coordinators belonging to this specific sector or overall admins
    const sectorCoords = allCoords.filter(c => c.sector_id === sectorId || c.sector_id === 'all');

    if (sectorCoords.length === 0) {
      coordSelect.innerHTML = `<option value="">No coordinators registered for this sector</option>`;
      return;
    }

    coordSelect.innerHTML = `<option value="">-- Select Responsible Coordinator --</option>` +
      sectorCoords.map(c => `
        <option value="${c.id}" ${c.id === selectedCoordId ? 'selected' : ''}>
          ${App.escapeHtml(c.name)} (${c.role} - ${App.escapeHtml(c.department || '')})
        </option>
      `).join('');
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('work-id-field').value;
    const title = document.getElementById('work-title-input').value.trim();
    const description = document.getElementById('work-desc-input').value.trim();
    const sector_id = document.getElementById('work-sector-input').value;
    const assigned_to_id = document.getElementById('work-assignee-input').value;
    const priority = document.getElementById('work-priority-input').value;
    const status = document.getElementById('work-status-input').value;
    const start_date = document.getElementById('work-start-date').value;
    const deadline = document.getElementById('work-deadline').value;
    const completion_notes = document.getElementById('work-notes-input').value.trim();

    if (!title || !sector_id || !assigned_to_id || !deadline) {
      Toast.show('Please fill in Title, Sector, Responsible Coordinator, and Deadline', 'error');
      return;
    }

    const payload = {
      title,
      description,
      sector_id,
      assigned_to_id,
      priority,
      status,
      start_date,
      deadline,
      completion_notes
    };

    try {
      let res;
      if (id) {
        res = await fetch(`/api/works/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/works', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show(data.message, 'success');
        App.closeModal('work-modal');
        await this.loadWorks();
        Dashboard.loadStats();
        Sectors.loadSectors();
      } else {
        Toast.show(data.error || 'Failed to save work task', 'error');
      }
    } catch (err) {
      Toast.show('Network error while saving work task', 'error');
    }
  },

  async quickUpdateStatus(workId, newStatus) {
    try {
      const res = await fetch(`/api/works/${workId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show(`Status updated to ${newStatus}`, 'success');
        await this.loadWorks();
        Dashboard.loadStats();
      } else {
        Toast.show(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      Toast.show('Error updating status', 'error');
    }
  },

  confirmDelete(id, title) {
    App.confirmDialog({
      title: 'Remove Work Task',
      message: `Are you sure you want to delete work task <strong>${title}</strong>?`,
      confirmText: 'Yes, Delete',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/works/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            Toast.show(data.message, 'success');
            await this.loadWorks();
            Dashboard.loadStats();
            Sectors.loadSectors();
          } else {
            Toast.show(data.error || 'Failed to delete work', 'error');
          }
        } catch (err) {
          Toast.show('Error deleting work', 'error');
        }
      }
    });
  }
};
