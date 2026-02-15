import api from './client.js';

export async function login(payload) {
  const response = await api.post('/api/auth/login', payload);
  return response.data;
}

export async function getProfile() {
  const response = await api.get('/api/auth/profile');
  return response.data;
}

export async function updateProfile(payload) {
  const response = await api.post('/api/auth/profile/update', payload);
  return response.data;
}

export async function updateProfileTheme(payload) {
  const response = await api.post('/api/auth/profile/theme', payload);
  return response.data;
}

export async function updateProfilePassword(payload) {
  const response = await api.post('/api/auth/profile/password', payload);
  return response.data;
}

export async function getProfileDocuments() {
  const response = await api.get('/api/auth/profile/documents');
  return response.data;
}

export async function getProfileActivity(query = {}) {
  const response = await api.get('/api/auth/profile/activity', { params: query });
  return response.data;
}

export async function uploadProfileAvatar(formData) {
  const response = await api.post('/api/auth/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function uploadProfileDocument(formData) {
  const response = await api.post('/api/auth/profile/document/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function deleteProfileDocument(documentId) {
  const response = await api.post('/api/auth/profile/document/delete', { document_id: documentId });
  return response.data;
}

export async function switchFarm(farmId) {
  const response = await api.post('/api/auth/switch-farm', { farm_id: farmId });
  return response.data;
}

export async function getBootstrap() {
  const response = await api.get('/api/system/bootstrap');
  return response.data;
}

export async function getDashboard() {
  const response = await api.get('/api/dashboard/overview');
  return response.data;
}

export async function getEntities(moduleKey) {
  const response = await api.get(`/api/modules/${moduleKey}/entities`);
  return response.data;
}

export async function getRecords(moduleKey, table, query = {}) {
  const response = await api.get(`/api/modules/${moduleKey}/${table}`, { params: query });
  return response.data;
}

export async function createRecord(moduleKey, table, payload) {
  const response = await api.post(`/api/modules/${moduleKey}/${table}`, payload);
  return response.data;
}

export async function updateRecord(moduleKey, table, recordId, payload) {
  const response = await api.put(`/api/modules/${moduleKey}/${table}/${recordId}`, payload);
  return response.data;
}

export async function deleteRecord(moduleKey, table, recordId) {
  const response = await api.delete(`/api/modules/${moduleKey}/${table}/${recordId}`);
  return response.data;
}

export async function getHierarchy() {
  const response = await api.get('/api/settings/hierarchy');
  return response.data;
}

export async function getRoles() {
  const response = await api.get('/api/settings/roles');
  return response.data;
}

export async function getUsers() {
  const response = await api.get('/api/settings/users');
  return response.data;
}

export async function getFarmUsers() {
  const response = await api.get('/api/settings/users/farm');
  return response.data;
}

export async function createFarm(payload) {
  const response = await api.post('/api/settings/farms', payload);
  return response.data;
}

export async function createFarmUser(payload) {
  const response = await api.post('/api/settings/users/create', payload);
  return response.data;
}

export async function resetFarmUserPassword(payload) {
  const response = await api.post('/api/settings/users/password', payload);
  return response.data;
}

export async function getFarmPortfolio() {
  const response = await api.get('/api/settings/farm-portfolio');
  return response.data;
}

export async function assignMembership(payload) {
  const response = await api.post('/api/settings/farm-memberships', payload);
  return response.data;
}

export async function updateMembership(farmUserId, payload) {
  const response = await api.put(`/api/settings/farm-memberships/${farmUserId}`, payload);
  return response.data;
}

export async function getSettingsModules() {
  const response = await api.get('/api/settings/modules');
  return response.data;
}

export async function saveSettingsModules(payload) {
  const response = await api.post('/api/settings/modules', payload);
  return response.data;
}

export async function getUiPreferences() {
  const response = await api.get('/api/settings/ui');
  return response.data;
}

export async function saveUiPreferences(payload) {
  const response = await api.post('/api/settings/ui', payload);
  return response.data;
}

export async function saveTheming(payload) {
  const response = await api.post('/api/settings/theming', payload);
  return response.data;
}

export async function uploadFarmIcon(formData) {
  const response = await api.post('/api/settings/farm-icon', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function getSystemConfigs() {
  const response = await api.get('/api/settings/system-configs');
  return response.data;
}

export async function saveSystemConfig(payload) {
  const response = await api.post('/api/settings/system-configs', payload);
  return response.data;
}

export async function saveCurrencyConfig(payload) {
  const response = await api.post('/api/settings/system-configs/currency', payload);
  return response.data;
}

export async function getNotificationConfigs() {
  const response = await api.get('/api/settings/notification-configs');
  return response.data;
}

export async function saveNotificationConfig(payload) {
  const response = await api.post('/api/settings/notification-configs', payload);
  return response.data;
}

export async function getSyncConfig() {
  const response = await api.get('/api/settings/sync-config');
  return response.data;
}

export async function saveSyncConfig(payload) {
  const response = await api.post('/api/settings/sync-config', payload);
  return response.data;
}

export async function getModuleConfig() {
  const response = await api.get('/api/settings/module-config');
  return response.data;
}

export async function getModuleDataset(moduleKey) {
  const response = await api.get(`/api/modules/${moduleKey}`);
  return response.data;
}

export async function saveModuleConfig(payload) {
  const response = await api.post('/api/settings/module-config', payload);
  return response.data;
}

export async function getAlerts() {
  const response = await api.get('/api/settings/alerts');
  return response.data;
}

export async function resolveAlert(alertId) {
  const response = await api.post(`/api/settings/alerts/${alertId}/resolve`);
  return response.data;
}

export async function getAuditLogs(query = {}) {
  const response = await api.get('/api/settings/audit-logs', { params: query });
  return response.data;
}

export async function getSyncStatus() {
  const response = await api.get('/api/sync/status');
  return response.data;
}

export async function runSync(limit = 100) {
  const response = await api.post('/api/sync/run', { limit });
  return response.data;
}

export async function pullSyncSnapshots(payload = {}) {
  const response = await api.post('/api/sync/pull', payload);
  return response.data;
}
