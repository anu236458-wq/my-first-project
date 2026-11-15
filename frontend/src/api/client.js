const API_BASE_URL = '/api/v1';

function getToken() {
  return localStorage.getItem('apex_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('apex_token', token);
  } else {
    localStorage.removeItem('apex_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      if (endpoint !== '/auth/login') {
        // Clear token on auth failure
        // setToken(null);
      }
    }
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getMe: () => request('/auth/me'),

  // Batches
  getBatches: () => request('/batches'),
  getBatch: (id) => request(`/batches/${id}`),
  createBatch: (data) =>
    request('/batches', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateBatch: (id, data) =>
    request(`/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Students
  getStudents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/students${q ? `?${q}` : ''}`);
  },
  createStudent: (data) =>
    request('/students', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateStudent: (id, data) =>
    request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteStudent: (id) =>
    request(`/students/${id}`, {
      method: 'DELETE'
    }),

  // Teachers
  getTeachers: () => request('/teachers'),
  createTeacher: (data) =>
    request('/teachers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Attendance
  getBatchRoster: (batchId, date) =>
    request(`/attendance/batch-roster?batch_id=${batchId}&date=${date}`),
  submitAttendance: (batchId, date, records) =>
    request('/attendance/submit', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, date, records })
    }),
  getAbsentList: (batchId, date) =>
    request(`/attendance/absent-list?batch_id=${batchId}&date=${date}`),

  // WhatsApp Messaging
  sendAbsentBroadcast: (batchId, date, force = false) =>
    request('/messages/send-absent-broadcast', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, date, force })
    }),
  retrySingleMessage: (data) =>
    request('/messages/retry-single', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getMessageLogs: (batchId, date) =>
    request(`/messages/logs?batch_id=${batchId}&date=${date}`),

  // Dashboard
  getDashboardStats: (date) =>
    request(`/dashboard/stats?date=${date}`),
  getDashboardBatchSummary: (date) =>
    request(`/dashboard/batch-summary?date=${date}`),
  getDashboardAbsentGrouped: (date) =>
    request(`/dashboard/absent-grouped?date=${date}`),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Fees (Phase 2)
  getFees: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/fees${q ? `?${q}` : ''}`);
  },
  getFeeSummary: () => request('/fees/summary'),
  getDefaulters: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/fees/defaulters${q ? `?${q}` : ''}`);
  },
  recordPayment: (data) =>
    request('/fees/record-payment', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getReceipt: (receiptNumber) =>
    request(`/fees/receipt/${encodeURIComponent(receiptNumber)}`),
  sendFeeReminderBroadcast: (batchId = null) =>
    request('/fees/send-reminder-broadcast', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId })
    })
};
