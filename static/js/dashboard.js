/**
 * SympoFlow - Dashboard Module
 */

const Dashboard = {
  stats: null,

  async init() {
    await this.loadStats();
  },

  async loadStats() {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      this.stats = data;
      this.renderMetrics(data.metrics);
      this.renderRecentActivities(data.recent_activities);
      this.renderUpcomingDeadlines(data.upcoming_deadlines);
      this.renderSectorSummary(data.sector_summary);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  },

  renderMetrics(metrics) {
    if (!metrics) return;
    document.getElementById('metric-total-admins').textContent = metrics.total_admins || 0;
    document.getElementById('metric-total-staff').textContent = metrics.total_staff || 0;
    document.getElementById('metric-total-students').textContent = metrics.total_students || 0;
    document.getElementById('metric-total-sectors').textContent = metrics.total_sectors || 0;
    document.getElementById('metric-total-works').textContent = metrics.total_works || 0;
    document.getElementById('metric-pending-works').textContent = metrics.pending_works || 0;
    document.getElementById('metric-inprogress-works').textContent = metrics.in_progress_works || 0;
    document.getElementById('metric-completed-works').textContent = metrics.completed_works || 0;
  },

  renderRecentActivities(activities) {
    const container = document.getElementById('recent-activities-list');
    if (!container) return;

    if (!activities || activities.length === 0) {
      container.innerHTML = `<p class="form-helper">No recent activities recorded.</p>`;
      return;
    }

    container.innerHTML = activities.slice(0, 8).map(act => {
      const timeStr = this.formatTimeAgo(act.timestamp);
      return `
        <div class="activity-entry">
          <div class="activity-bullet"></div>
          <div class="activity-content">
            <strong>${App.escapeHtml(act.user_name)}</strong> 
            <span style="color: var(--text-muted);">${App.escapeHtml(act.action)}</span> 
            <strong>${App.escapeHtml(act.target || '')}</strong>
            <div class="activity-meta">
              <span class="badge badge-priority-low" style="font-size: 10px; padding: 1px 6px;">${App.escapeHtml(act.sector || 'General')}</span>
              <span>• ${timeStr}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderUpcomingDeadlines(deadlines) {
    const container = document.getElementById('upcoming-deadlines-list');
    if (!container) return;

    if (!deadlines || deadlines.length === 0) {
      container.innerHTML = `<p class="form-helper">No pending deadlines. All tasks completed!</p>`;
      return;
    }

    container.innerHTML = deadlines.map(w => {
      const priorityClass = `badge-priority-${w.priority.toLowerCase()}`;
      const statusClass = w.status === 'In Progress' ? 'badge-status-inprogress' : 'badge-status-pending';

      return `
        <div style="padding: 12px 14px; background: var(--bg-surface-subtle); border-radius: var(--radius-md); margin-bottom: 8px; border-left: 3px solid ${w.priority === 'Critical' ? 'var(--rose-500)' : 'var(--primary-500)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: var(--text-main);">${App.escapeHtml(w.title)}</strong>
            <span class="badge ${priorityClass}">${w.priority}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-subtle);">
            <span>${App.escapeHtml(w.sector_name)} • ${App.escapeHtml(w.assigned_to_name)}</span>
            <span style="font-weight: 600; color: var(--rose-700);">Due: ${App.formatDate(w.deadline)}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderSectorSummary(sectors) {
    const container = document.getElementById('dashboard-sector-summary-grid');
    if (!container) return;

    if (!sectors || sectors.length === 0) {
      container.innerHTML = `<p class="form-helper">No sectors found.</p>`;
      return;
    }

    container.innerHTML = sectors.map(s => {
      const percent = s.total_works > 0 ? Math.round((s.completed_works / s.total_works) * 100) : 0;
      return `
        <div class="card-panel" style="padding: 16px; margin-bottom: 0; cursor: pointer; transition: transform 0.15s ease;" onclick="Sectors.openSectorDetail('${s.id}')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 14px; color: var(--text-main);">${App.escapeHtml(s.name)}</strong>
            <span class="badge badge-priority-medium">${percent}% Done</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
            Staff: <strong>${App.escapeHtml(s.staff_coordinator)}</strong>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width: ${percent}%; background: ${s.color || 'var(--primary-600)'};"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-light); margin-top: 6px;">
            <span>${s.student_count} Student Coord</span>
            <span>${s.completed_works}/${s.total_works} Works Completed</span>
          </div>
        </div>
      `;
    }).join('');
  },

  formatTimeAgo(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  }
};
