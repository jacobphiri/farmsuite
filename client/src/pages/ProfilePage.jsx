import { useEffect, useMemo, useState } from 'react';
import {
  deleteProfileDocument,
  getProfile,
  getProfileActivity,
  getProfileDocuments,
  updateProfile,
  updateProfilePassword,
  updateProfileTheme,
  uploadProfileAvatar,
  uploadProfileDocument
} from '../api/endpoints.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const DOCUMENT_TYPES = ['NRC', 'PASSPORT', 'CONTRACT', 'CERTIFICATE', 'MEDICAL', 'OTHER'];

function toAssetUrl(path) {
  const clean = String(path || '').trim().replace(/^\/+/, '');
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  if (typeof window === 'undefined') return `/${clean}`;
  return `${window.location.protocol}//${window.location.hostname}/${clean}`;
}

function initialsFromName(name) {
  const chunks = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!chunks.length) return 'U';
  return chunks.slice(0, 2).map((item) => item[0]?.toUpperCase() || '').join('');
}

function formatBytes(bytes) {
  const size = Math.max(0, Number(bytes || 0));
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${size} B`;
}

function ProfilePage() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activity, setActivity] = useState([]);

  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [themeForm, setThemeForm] = useState({
    theme_mode: 'light',
    text_color_mode: 'balanced',
    button_style: 'default',
    glow_intensity: 'medium',
    card_border_size: '1',
    card_radius_mode: 'default',
    glass_effect: true
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [documentForm, setDocumentForm] = useState({
    document_type: 'OTHER',
    document_title: '',
    document_file: null
  });
  const [avatarForm, setAvatarForm] = useState({
    avatar_file: null,
    remove_avatar: false
  });

  async function loadProfileContext() {
    setLoading(true);
    setError('');

    try {
      const [profileResponse, documentResponse, activityResponse] = await Promise.all([
        getProfile(),
        getProfileDocuments(),
        getProfileActivity({ limit: 20 })
      ]);

      if (!profileResponse?.ok) throw new Error(profileResponse?.message || 'Failed to load profile.');
      if (!documentResponse?.ok) throw new Error(documentResponse?.message || 'Failed to load documents.');
      if (!activityResponse?.ok) throw new Error(activityResponse?.message || 'Failed to load recent activity.');

      const user = profileResponse?.user || {};
      const prefs = profileResponse?.ui_preferences || {};
      setProfile(profileResponse);
      setDocuments(documentResponse?.documents || []);
      setActivity(activityResponse?.activity || []);
      setProfileForm({
        full_name: String(user?.full_name || ''),
        email: String(user?.email || '')
      });
      setThemeForm({
        theme_mode: String(prefs?.theme_mode || 'light'),
        text_color_mode: String(prefs?.text_color_mode || 'balanced'),
        button_style: String(prefs?.button_style || 'default'),
        glow_intensity: String(prefs?.glow_intensity || 'medium'),
        card_border_size: String(prefs?.card_border_size || '1'),
        card_radius_mode: String(prefs?.card_radius_mode || 'default'),
        glass_effect: String(prefs?.glass_effect || '1') === '1'
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfileContext().catch(() => {});
  }, []);

  const avatarUrl = useMemo(() => toAssetUrl(profile?.user?.avatar_path || ''), [profile?.user?.avatar_path]);
  const profileName = String(profile?.user?.full_name || 'User');
  const profileInitials = initialsFromName(profileName);
  const userStatus = Number(profile?.user?.is_active || 0) === 1 ? 'Active' : 'Inactive';

  const doRefreshBootstrap = async () => {
    try {
      await auth.refreshBootstrap();
    } catch {
      // Ignore refresh errors after successful action.
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const response = await updateProfile(profileForm);
      if (!response?.ok) throw new Error(response?.message || 'Failed to update profile.');
      setNotice('Profile updated.');
      await loadProfileContext();
      await doRefreshBootstrap();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update profile.');
    } finally {
      setBusy(false);
    }
  };

  const handleThemeSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const response = await updateProfileTheme(themeForm);
      if (!response?.ok) throw new Error(response?.message || 'Failed to update display preferences.');
      setNotice('Display preferences updated.');
      await loadProfileContext();
      await doRefreshBootstrap();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update display preferences.');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const response = await updateProfilePassword(passwordForm);
      if (!response?.ok) throw new Error(response?.message || 'Failed to update password.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setNotice('Password updated.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const formData = new FormData();
      if (avatarForm.avatar_file) formData.append('avatar_file', avatarForm.avatar_file);
      if (avatarForm.remove_avatar) formData.append('remove_avatar', '1');
      const response = await uploadProfileAvatar(formData);
      if (!response?.ok) throw new Error(response?.message || 'Failed to update avatar.');
      setAvatarForm({ avatar_file: null, remove_avatar: false });
      setNotice('Profile picture updated.');
      await loadProfileContext();
      await doRefreshBootstrap();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update avatar.');
    } finally {
      setBusy(false);
    }
  };

  const handleDocumentUpload = async (event) => {
    event.preventDefault();
    if (!documentForm.document_file) {
      setError('Select a file to upload.');
      return;
    }

    setBusy(true);
    setNotice('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('document_type', documentForm.document_type);
      formData.append('document_title', documentForm.document_title);
      formData.append('document_file', documentForm.document_file);
      const response = await uploadProfileDocument(formData);
      if (!response?.ok) throw new Error(response?.message || 'Failed to upload document.');
      setDocumentForm({ document_type: 'OTHER', document_title: '', document_file: null });
      setNotice('Document uploaded.');
      await loadProfileContext();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to upload document.');
    } finally {
      setBusy(false);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const response = await deleteProfileDocument(documentId);
      if (!response?.ok) throw new Error(response?.message || 'Failed to delete document.');
      setNotice('Document removed.');
      await loadProfileContext();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete document.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vstack gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h3 className="mb-0">My Profile</h3>
          <div className="text-secondary">Account details, password management, and recent activity</div>
        </div>
      </div>

      {error ? <div className="alert alert-danger py-2 mb-0">{error}</div> : null}
      {notice ? <div className="alert alert-success py-2 mb-0">{notice}</div> : null}

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header">Profile Picture</div>
            <div className="card-body">
              <div className="d-flex justify-content-center mb-3">
                <span className="user-avatar user-avatar-xl">
                  {avatarUrl ? (
                    <img className="avatar-img" src={avatarUrl} alt={profileName} />
                  ) : (
                    <span className="avatar-initials">{profileInitials}</span>
                  )}
                </span>
              </div>
              <form className="vstack gap-2" onSubmit={handleAvatarSave}>
                <input
                  className="form-control"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => setAvatarForm((prev) => ({ ...prev, avatar_file: event.target.files?.[0] || null }))}
                />
                <label className="form-check-label d-flex align-items-center gap-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={avatarForm.remove_avatar}
                    onChange={(event) => setAvatarForm((prev) => ({ ...prev, remove_avatar: event.target.checked }))}
                  />
                  Remove current avatar
                </label>
                <button className="btn btn-primary" disabled={busy || loading}>Save Picture</button>
                <div className="small text-secondary">Accepted: JPG, PNG, WEBP, GIF. Max size: 25MB.</div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">Profile Details</div>
            <div className="card-body">
              <form className="vstack gap-2" onSubmit={handleProfileSave}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-control"
                    value={profileForm.full_name}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                  />
                </div>
                <div className="small text-secondary">Account status: {userStatus}</div>
                <button className="btn btn-primary" disabled={busy || loading}>Save Profile</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-2">
          <div className="card h-100">
            <div className="card-header">Account</div>
            <div className="card-body">
              <div className="small text-secondary mb-2">Status</div>
              <div className="fw-semibold mb-3">{userStatus}</div>
              <div className="small text-secondary mb-2">Created</div>
              <div className="small">{profile?.user?.created_at || '-'}</div>
            </div>
          </div>
        </div>

        <div className="col-lg-12">
          <div className="card h-100">
            <div className="card-header">Display Preferences</div>
            <div className="card-body">
              <form className="row g-3" onSubmit={handleThemeSave}>
                <div className="col-md-6">
                  <label className="form-label">Theme</label>
                  <select className="form-select" value={themeForm.theme_mode} onChange={(event) => setThemeForm((prev) => ({ ...prev, theme_mode: event.target.value }))}>
                    <option value="light">Light (Default)</option>
                    <option value="neon">Dark Neon</option>
                    <option value="forest-light">Forest Light</option>
                    <option value="forest-dark">Forest Dark</option>
                    <option value="sunrise">Sunrise</option>
                    <option value="cobalt">Cobalt Night</option>
                    <option value="ember">Ember Dusk</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Text Color Mode</label>
                  <select className="form-select" value={themeForm.text_color_mode} onChange={(event) => setThemeForm((prev) => ({ ...prev, text_color_mode: event.target.value }))}>
                    <option value="balanced">Balanced</option>
                    <option value="high-contrast">High Contrast</option>
                    <option value="soft">Soft</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Button Style</label>
                  <select className="form-select" value={themeForm.button_style} onChange={(event) => setThemeForm((prev) => ({ ...prev, button_style: event.target.value }))}>
                    <option value="default">Default</option>
                    <option value="pill">Pill</option>
                    <option value="outline">Outline</option>
                    <option value="soft">Soft</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Glow Intensity (Neon)</label>
                  <select className="form-select" value={themeForm.glow_intensity} onChange={(event) => setThemeForm((prev) => ({ ...prev, glow_intensity: event.target.value }))}>
                    <option value="subtle">Subtle</option>
                    <option value="medium">Medium</option>
                    <option value="strong">Strong</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Card Border Size</label>
                  <select className="form-select" value={themeForm.card_border_size} onChange={(event) => setThemeForm((prev) => ({ ...prev, card_border_size: event.target.value }))}>
                    <option value="1">1px (Default)</option>
                    <option value="2">2px</option>
                    <option value="3">3px</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Card Corner Radius</label>
                  <select className="form-select" value={themeForm.card_radius_mode} onChange={(event) => setThemeForm((prev) => ({ ...prev, card_radius_mode: event.target.value }))}>
                    <option value="compact">Compact</option>
                    <option value="default">Default</option>
                    <option value="rounded">Rounded</option>
                    <option value="soft">Soft</option>
                  </select>
                </div>
                <div className="col-md-6 d-flex align-items-end">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={themeForm.glass_effect}
                      onChange={(event) => setThemeForm((prev) => ({ ...prev, glass_effect: event.target.checked }))}
                      id="profile_glass_effect"
                    />
                    <label className="form-check-label" htmlFor="profile_glass_effect">Enable glass effects</label>
                  </div>
                </div>
                <div className="col-12 d-flex justify-content-end">
                  <button className="btn btn-primary" disabled={busy || loading}>Save Display Preferences</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-12">
          <div className="card h-100">
            <div className="card-header">Change Password</div>
            <div className="card-body">
              <form className="vstack gap-2" onSubmit={handlePasswordSave}>
                <div>
                  <label className="form-label">Current Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">New Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                    required
                  />
                </div>
                <button className="btn btn-primary" disabled={busy || loading}>Update Password</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">My Documents</div>
        <div className="card-body">
          <form className="row g-2 align-items-end" onSubmit={handleDocumentUpload}>
            <div className="col-lg-3">
              <label className="form-label">Document Type</label>
              <select className="form-select" value={documentForm.document_type} onChange={(event) => setDocumentForm((prev) => ({ ...prev, document_type: event.target.value }))}>
                {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="col-lg-4">
              <label className="form-label">Document Title (optional)</label>
              <input
                className="form-control"
                type="text"
                maxLength={190}
                value={documentForm.document_title}
                onChange={(event) => setDocumentForm((prev) => ({ ...prev, document_title: event.target.value }))}
                placeholder="e.g. Employment Contract 2026"
              />
            </div>
            <div className="col-lg-3">
              <label className="form-label">File</label>
              <input
                className="form-control"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,.gif"
                onChange={(event) => setDocumentForm((prev) => ({ ...prev, document_file: event.target.files?.[0] || null }))}
                required
              />
            </div>
            <div className="col-lg-2 d-grid">
              <button className="btn btn-primary" disabled={busy || loading}>Upload</button>
            </div>
            <div className="col-12">
              <div className="small text-secondary">Upload when requested by admin/HR. Max file size: 25MB.</div>
            </div>
          </form>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {!documents.length ? (
                  <tr><td colSpan={6} className="text-secondary">No documents uploaded yet.</td></tr>
                ) : documents.map((doc) => {
                  const viewUrl = toAssetUrl(doc?.stored_path || '');
                  return (
                    <tr key={doc.document_id}>
                      <td><span className="badge text-bg-light border">{String(doc.document_type || 'OTHER')}</span></td>
                      <td>{String(doc.document_title || '-')}</td>
                      <td>{String(doc.original_filename || '-')}</td>
                      <td>{formatBytes(doc.file_size)}</td>
                      <td>{String(doc.uploaded_at || '-')}</td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          {viewUrl ? <a className="btn btn-sm btn-outline-primary" href={viewUrl} target="_blank" rel="noreferrer">View</a> : null}
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDocumentDelete(doc.document_id)} disabled={busy}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">Recent Activity</div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Entity</th>
                </tr>
              </thead>
              <tbody>
                {!activity.length ? (
                  <tr><td colSpan={3} className="text-secondary">No recent activity.</td></tr>
                ) : activity.map((row, index) => (
                  <tr key={`activity-${row.created_at || ''}-${row.action_key || ''}-${index}`}>
                    <td>{String(row.created_at || '-')}</td>
                    <td>{String(row.action_key || '-')}</td>
                    <td>{String(row.entity_table || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
