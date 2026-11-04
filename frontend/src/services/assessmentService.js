import { API_BASE_URL } from '../constants';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ── Create a new assessment ──────────────────────────────────────────────────
export const createAssessment = async ({ phase, track, label, prescribedGames }) => {
  const res = await fetch(`${API_BASE_URL}/assessment/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ phase, track, label, prescribedGames }),
  });
  return handleResponse(res);
};

// ── Link a game session to a Track A assessment ─────────────────────────────
export const linkGameSession = async (assessmentId, { gameType, gameSessionId }) => {
  const res = await fetch(`${API_BASE_URL}/assessment/${assessmentId}/link-session`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ gameType, gameSessionId }),
  });
  return handleResponse(res);
};

// ── Save Track B clinical test session ──────────────────────────────────────
export const saveClinicalSession = async (assessmentId, testData) => {
  const res = await fetch(`${API_BASE_URL}/assessment/${assessmentId}/clinical-session`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(testData),
  });
  return handleResponse(res);
};

// ── Explicitly save / sync matrix files user-wise to server ─────────────────
export const saveMatrixFilesToServer = async (assessmentId, data) => {
  const res = await fetch(`${API_BASE_URL}/assessment/${assessmentId}/save-matrix-files`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

// ── List user's saved matrix files ──────────────────────────────────────────
export const listUserMatrixFiles = async (userId = null) => {
  const url = userId
    ? `${API_BASE_URL}/assessment/user-files?userId=${encodeURIComponent(userId)}`
    : `${API_BASE_URL}/assessment/user-files`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ── Finalise assessment (trigger metric computation) ────────────────────────
export const finaliseAssessment = async (assessmentId) => {
  const res = await fetch(`${API_BASE_URL}/assessment/${assessmentId}/finalise`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ── Abandon an in-progress assessment ───────────────────────────────────────
export const abandonAssessment = async (assessmentId) => {
  const res = await fetch(`${API_BASE_URL}/assessment/${assessmentId}/abandon`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ── Fetch a single assessment ────────────────────────────────────────────────
export const getAssessment = async (assessmentId) => {
  const res = await fetch(`${API_BASE_URL}/assessment/${assessmentId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ── Fetch all assessments for a patient ─────────────────────────────────────
export const listAssessments = async (userId) => {
  const url = userId
    ? `${API_BASE_URL}/assessment/patient/${userId}`
    : `${API_BASE_URL}/assessment/patient/me`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse(res);
};

// ── Compare two assessments (pre vs post delta) ──────────────────────────────
export const compareAssessments = async (idA, idB) => {
  const res = await fetch(
    `${API_BASE_URL}/assessment/compare?a=${idA}&b=${idB}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(res);
};
