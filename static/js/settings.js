/**
 * Symposium - Settings & Configuration Module
 */

const Settings = {
  data: {},

  async init() {
    await this.load();
  },

  async load() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      this.data = await res.json();
      this.populateForm();
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  },

  populateForm() {
    const s = this.data;
    const collegeEl = document.getElementById('set-college-name');
    const sympoEl = document.getElementById('set-sympo-name');
    const themeEl = document.getElementById('set-theme');
    const dateEl = document.getElementById('set-event-date');
    const venueEl = document.getElementById('set-venue');
    const emailEl = document.getElementById('set-email');
    const helpEl = document.getElementById('set-helpline');

    if (collegeEl) collegeEl.value = s.college_name || '';
    if (sympoEl) sympoEl.value = s.symposium_name || '';
    if (themeEl) themeEl.value = s.symposium_theme || '';
    if (dateEl) dateEl.value = s.event_date || '';
    if (venueEl) venueEl.value = s.venue || '';
    if (emailEl) emailEl.value = s.contact_email || '';
    if (helpEl) helpEl.value = s.emergency_helpline || '';
  },

  async handleSaveSymposiumConfig(e) {
    e.preventDefault();

    const payload = {
      college_name: document.getElementById('set-college-name').value.trim(),
      symposium_name: document.getElementById('set-sympo-name').value.trim(),
      symposium_theme: document.getElementById('set-theme').value.trim(),
      event_date: document.getElementById('set-event-date').value,
      venue: document.getElementById('set-venue').value.trim(),
      contact_email: document.getElementById('set-email').value.trim(),
      emergency_helpline: document.getElementById('set-helpline').value.trim()
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show('Symposium settings saved successfully', 'success');
        this.data = data.settings;
      } else {
        Toast.show(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      Toast.show('Network error while saving settings', 'error');
    }
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const old_password = document.getElementById('pwd-old').value;
    const new_password = document.getElementById('pwd-new').value;
    const confirm_password = document.getElementById('pwd-confirm').value;

    if (new_password !== confirm_password) {
      Toast.show('New passwords do not match', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password, new_password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.show(data.message, 'success');
        document.getElementById('password-form').reset();
      } else {
        Toast.show(data.error || 'Failed to update password', 'error');
      }
    } catch (err) {
      Toast.show('Error updating password', 'error');
    }
  }
};
