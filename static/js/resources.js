/**
 * Symposium - Resources & Documents Module
 */

const Resources = {
  list: [],
  settings: {},

  async init() {
    await this.loadResources();
    await this.loadSettings();
  },

  async loadResources() {
    try {
      const res = await fetch('/api/resources');
      if (!res.ok) throw new Error('Failed to load resources');
      this.list = await res.json();
      this.renderBrochureCard();
      this.renderResourcesList();
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  },

  async loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      this.settings = await res.json();
      this.renderRegistrationSection();
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  },

  renderBrochureCard() {
    const brochure = this.list.find(r => r.is_brochure) || {
      title: this.settings.brochure_title || "XENO '26 Official Event Brochure & Schedule",
      file_url: this.settings.brochure_file || "/uploads/symposium_brochure_2026.pdf",
      size: "2.4 MB"
    };

    const titleEl = document.getElementById('brochure-title-display');
    const sizeEl = document.getElementById('brochure-size-display');
    const downloadBtn = document.getElementById('brochure-download-btn');
    const previewBtn = document.getElementById('brochure-preview-btn');

    if (titleEl) titleEl.textContent = brochure.title;
    if (sizeEl) sizeEl.textContent = `PDF Document • ${brochure.size || 'Official File'}`;

    if (downloadBtn) {
      downloadBtn.href = brochure.file_url || '#';
      downloadBtn.setAttribute('download', 'symposium_brochure_2026.pdf');
    }

    if (previewBtn) {
      previewBtn.onclick = () => this.previewFile(brochure.file_url, brochure.title);
    }
  },

  renderRegistrationSection() {
    const regUrl = this.settings.registration_url || "https://registration.sincet.edu.in/XENO26";
    const status = this.settings.registration_status || "Open";
    const deadline = this.settings.registration_deadline || "2026-08-26";

    const urlEl = document.getElementById('reg-link-display');
    const statusEl = document.getElementById('reg-status-badge');
    const deadlineEl = document.getElementById('reg-deadline-display');
    const openBtn = document.getElementById('reg-open-btn');

    if (urlEl) urlEl.textContent = regUrl;
    if (statusEl) {
      statusEl.className = `badge ${status === 'Open' ? 'badge-status-completed' : 'badge-status-pending'}`;
      statusEl.textContent = `Status: ${status}`;
    }
    if (deadlineEl) deadlineEl.textContent = `Registration Closes: ${App.formatDate(deadline)}`;
    if (openBtn) {
      openBtn.href = regUrl;
      openBtn.target = "_blank";
      openBtn.rel = "noopener noreferrer";
    }
  },

  renderResourcesList() {
    const container = document.getElementById('resources-list-container');
    if (!container) return;

    const isAdmin = Auth.isAdmin();
    // Exclude primary brochure from general list
    const generalResources = this.list.filter(r => !r.is_brochure);

    if (generalResources.length === 0) {
      container.innerHTML = `<p class="form-helper" style="padding: 16px;">No additional documents or links uploaded yet.</p>`;
      return;
    }

    container.innerHTML = generalResources.map(r => {
      let icon = '📄';
      if (r.type === 'Google Form') icon = '📝';
      else if (r.type === 'Important Link') icon = '🔗';
      else if (r.type === 'Spreadsheet') icon = '📊';

      const isLink = Boolean(r.external_url);
      const actionUrl = isLink ? r.external_url : r.file_url;

      return `
        <div class="resource-item-row">
          <div class="resource-left">
            <div class="resource-type-icon" style="font-size: 20px;">
              ${icon}
            </div>
            <div>
              <strong style="font-size: 14px; color: var(--text-main); display: block;">${App.escapeHtml(r.title)}</strong>
              <div style="font-size: 12px; color: var(--text-muted);">${App.escapeHtml(r.description || '')}</div>
              <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                <span class="badge badge-priority-low">${r.type}</span> • Added by ${App.escapeHtml(r.uploaded_by || 'Admin')} • ${App.formatDate(r.created_at)}
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${isLink ? `
              <a href="${actionUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                Open Link ↗
              </a>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="Resources.previewFile('${actionUrl}', '${App.escapeHtml(r.title)}')">
                Preview
              </button>
              <a href="${actionUrl}" download class="btn btn-primary btn-sm">
                Download
              </a>
            `}
            <button class="btn btn-danger btn-sm" onclick="Resources.confirmDelete('${r.id}', '${App.escapeHtml(r.title)}')">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  previewFile(url, title) {
    if (!url) return;
    document.getElementById('preview-modal-title').textContent = title;
    const iframe = document.getElementById('preview-iframe');
    if (iframe) iframe.src = url;
    App.openModal('file-preview-modal');
  },

  openUploadBrochureModal() {
    document.getElementById('brochure-form').reset();
    App.openModal('brochure-modal');
  },

  async handleBrochureUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById('brochure-file-input');
    const titleInput = document.getElementById('brochure-title-input');

    if (!fileInput.files || fileInput.files.length === 0) {
      Toast.show('Please choose a brochure file to upload', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', titleInput.value.trim() || "XENO '26 Official Event Brochure");

    try {
      const res = await fetch('/api/resources/brochure', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show(data.message, 'success');
        App.closeModal('brochure-modal');
        await this.loadResources();
        await this.loadSettings();
      } else {
        Toast.show(data.error || 'Failed to upload brochure', 'error');
      }
    } catch (err) {
      Toast.show('Network error uploading brochure', 'error');
    }
  },

  openAddResourceModal() {
    document.getElementById('resource-form').reset();
    this.toggleResourceInputType('PDF Document');
    App.openModal('resource-modal');
  },

  toggleResourceInputType(type) {
    const fileGroup = document.getElementById('resource-file-group');
    const urlGroup = document.getElementById('resource-url-group');

    if (type === 'Google Form' || type === 'Important Link') {
      if (fileGroup) fileGroup.style.display = 'none';
      if (urlGroup) urlGroup.style.display = 'block';
    } else {
      if (fileGroup) fileGroup.style.display = 'block';
      if (urlGroup) urlGroup.style.display = 'none';
    }
  },

  async handleResourceSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('res-title-input').value.trim();
    const description = document.getElementById('res-desc-input').value.trim();
    const type = document.getElementById('res-type-input').value;
    const extUrl = document.getElementById('res-url-input').value.trim();
    const fileInput = document.getElementById('res-file-input');

    if (!title) {
      Toast.show('Title is required', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('external_url', extUrl);

    if (fileInput.files && fileInput.files.length > 0) {
      formData.append('file', fileInput.files[0]);
    }

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show(data.message, 'success');
        App.closeModal('resource-modal');
        await this.loadResources();
      } else {
        Toast.show(data.error || 'Failed to add resource', 'error');
      }
    } catch (err) {
      Toast.show('Error saving resource', 'error');
    }
  },

  openEditRegistrationModal() {
    document.getElementById('reg-edit-url').value = this.settings.registration_url || '';
    document.getElementById('reg-edit-status').value = this.settings.registration_status || 'Open';
    document.getElementById('reg-edit-deadline').value = this.settings.registration_deadline || '';
    App.openModal('registration-modal');
  },

  async handleRegistrationSubmit(e) {
    e.preventDefault();
    const url = document.getElementById('reg-edit-url').value.trim();
    const status = document.getElementById('reg-edit-status').value;
    const deadline = document.getElementById('reg-edit-deadline').value;

    try {
      const res = await fetch('/api/settings/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_url: url,
          registration_status: status,
          registration_deadline: deadline
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show('Registration details updated successfully', 'success');
        App.closeModal('registration-modal');
        await this.loadSettings();
      } else {
        Toast.show(data.error || 'Failed to update registration link', 'error');
      }
    } catch (err) {
      Toast.show('Error saving registration configuration', 'error');
    }
  },

  confirmDelete(id, title) {
    App.confirmDialog({
      title: 'Delete Resource',
      message: `Are you sure you want to delete resource <strong>${title}</strong>?`,
      confirmText: 'Yes, Delete',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            Toast.show(data.message, 'success');
            await this.loadResources();
          } else {
            Toast.show(data.error || 'Failed to delete resource', 'error');
          }
        } catch (err) {
          Toast.show('Error deleting resource', 'error');
        }
      }
    });
  }
};
