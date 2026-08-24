/**
 * SympoFlow - My Works Module (Personalized tasks for logged in coordinator)
 */

const MyWorks = {
  myWorksList: [],

  async init() {
    await this.loadMyWorks();
    this.setupEventListeners();
  },

  setupEventListeners() {
    const filterStatus = document.getElementById('myworks-status-filter');
    if (filterStatus) {
      filterStatus.addEventListener('change', () => this.render());
    }
  },

  async loadMyWorks() {
    try {
      const res = await fetch('/api/works/my-works');
      if (!res.ok) {
        this.myWorksList = [];
        this.render();
        return;
      }
      this.myWorksList = await res.json();
      this.render();
      const badge = document.getElementById('my-works-nav-badge');
      if (badge) {
        const pendingCount = this.myWorksList.filter(w => w.status !== 'Completed').length;
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
      }
    } catch (err) {
      this.myWorksList = [];
      this.render();
    }
  },

  render() {
    const container = document.getElementById('my-works-container');
    if (!container) return;

    const filterStatus = document.getElementById('myworks-status-filter')?.value || 'all';
    let list = this.myWorksList;

    if (filterStatus !== 'all') {
      list = list.filter(w => w.status === filterStatus);
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <div style="font-size: 32px; margin-bottom: 12px;">🎉</div>
          <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">No tasks assigned right now</h3>
          <p style="font-size: 13px; color: var(--text-muted);">You're all caught up! Works assigned to your account will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(w => {
      const priorityClass = `badge-priority-${w.priority.toLowerCase()}`;
      const statusClass = w.status === 'Completed' ? 'badge-status-completed' : (w.status === 'In Progress' ? 'badge-status-inprogress' : 'badge-status-pending');

      return `
        <div class="card-panel" style="padding: 22px; margin-bottom: 16px; border-left: 4px solid ${w.status === 'Completed' ? 'var(--emerald-500)' : (w.status === 'In Progress' ? 'var(--sky-500)' : 'var(--amber-500)')};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">${App.escapeHtml(w.title)}</h3>
                <span class="badge badge-priority-medium">${App.escapeHtml(w.sector_name)}</span>
                <span class="badge ${priorityClass}">${w.priority}</span>
              </div>
              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.4;">${App.escapeHtml(w.description || '')}</p>
            </div>
            <div style="text-align: right;">
              <span class="badge ${statusClass}" style="font-size: 12px; padding: 4px 12px;">${w.status}</span>
              <div style="font-size: 12px; font-weight: 600; color: var(--rose-700); margin-top: 6px;">
                Due: ${App.formatDate(w.deadline)}
              </div>
            </div>
          </div>

          <div style="background: var(--bg-surface-subtle); padding: 12px 16px; border-radius: var(--radius-md); margin: 14px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="font-size: 12px; color: var(--text-subtle);">
              Assigned by: <strong>${App.escapeHtml(w.created_by || 'Staff Coordinator')}</strong> • Started: ${App.formatDate(w.start_date)}
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">Update Status:</span>
              <select class="form-select" style="padding: 5px 10px; font-size: 12px; width: auto; font-weight: 600;" onchange="MyWorks.updateMyTaskStatus('${w.id}', this.value)">
                <option value="Pending" ${w.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="In Progress" ${w.status === 'In Progress' ? 'selected' : ''}>⚡ In Progress</option>
                <option value="Completed" ${w.status === 'Completed' ? 'selected' : ''}>✓ Completed</option>
              </select>
            </div>
          </div>

          ${w.completion_notes ? `
            <div style="font-size: 12px; color: var(--emerald-700); background: var(--emerald-50); padding: 8px 12px; border-radius: var(--radius-sm); margin-top: 8px;">
              <strong>Progress Notes:</strong> ${App.escapeHtml(w.completion_notes)}
            </div>
          ` : ''}

          <div style="margin-top: 10px; text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="MyWorks.openNotesModal('${w.id}', '${App.escapeHtml(w.title)}', '${App.escapeHtml(w.completion_notes || '')}')">
              ✍️ Add Progress Notes
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async updateMyTaskStatus(workId, newStatus) {
    try {
      const res = await fetch(`/api/works/${workId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show(`Work marked as ${newStatus}`, 'success');
        await this.loadMyWorks();
        Dashboard.loadStats();
        Works.loadWorks();
      } else {
        Toast.show(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      Toast.show('Error updating task status', 'error');
    }
  },

  openNotesModal(workId, title, currentNotes) {
    document.getElementById('notes-work-id').value = workId;
    document.getElementById('notes-work-title').textContent = title;
    document.getElementById('notes-textarea').value = currentNotes;
    App.openModal('my-notes-modal');
  },

  async saveNotes(e) {
    e.preventDefault();
    const workId = document.getElementById('notes-work-id').value;
    const notes = document.getElementById('notes-textarea').value.trim();

    try {
      const res = await fetch(`/api/works/${workId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_notes: notes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show('Progress notes saved successfully', 'success');
        App.closeModal('my-notes-modal');
        await this.loadMyWorks();
        Works.loadWorks();
      } else {
        Toast.show(data.error || 'Failed to save notes', 'error');
      }
    } catch (err) {
      Toast.show('Error saving progress notes', 'error');
    }
  }
};
