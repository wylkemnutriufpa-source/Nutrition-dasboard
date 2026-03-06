/**
 * automationEngineApi.js
 * Thin wrapper around the FastAPI automation-engine endpoints.
 * Uses REACT_APP_BACKEND_URL – never calls Supabase directly.
 * 
 * 🔒 JWT Authentication: All requests include Supabase access token
 */

import { authenticatedFetch } from '@/lib/apiClient';

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api/admin/automation-engine`;

async function apiFetch(path, options = {}) {
  // 🔒 Use authenticatedFetch to automatically add JWT token
  const response = await authenticatedFetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  
  return response.json();
}

// ── Health ────────────────────────────────────────────────
export const getEngineHealth = () => apiFetch('/health');

// ── Run engine batch ──────────────────────────────────────
export const runEngineBatch = () =>
  apiFetch('/run', { method: 'POST' });

// ── Detectors ─────────────────────────────────────────────
export const runDetectors = (org_id, inactive_days_threshold = 5, plan_stale_days = 30) =>
  apiFetch('/detect', {
    method: 'POST',
    body: JSON.stringify({ org_id, inactive_days_threshold, plan_stale_days }),
  });

// ── Emit event (manual) ───────────────────────────────────
export const emitEvent = (org_id, type, payload, patient_id = null) =>
  apiFetch('/events/emit', {
    method: 'POST',
    body: JSON.stringify({ org_id, type, payload, patient_id }),
  });

// ── Rules CRUD ────────────────────────────────────────────
export const listRules = (org_id, limit = 100) => {
  const qs = new URLSearchParams({ limit });
  if (org_id) qs.set('org_id', org_id);
  return apiFetch(`/rules?${qs}`);
};

export const createRule = (rule) =>
  apiFetch('/rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  });

export const patchRule = (id, updates) =>
  apiFetch(`/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

export const deleteRule = (id) =>
  apiFetch(`/rules/${id}`, { method: 'DELETE' });

export const toggleRule = (id, enabled) =>
  patchRule(id, { enabled });

// ── Runs listing ──────────────────────────────────────────
export const listRuns = (org_id, { status, limit = 50 } = {}) => {
  const qs = new URLSearchParams({ limit });
  if (org_id) qs.set('org_id', org_id);
  if (status) qs.set('status', status);
  return apiFetch(`/runs?${qs}`);
};
