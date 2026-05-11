// Central API configuration — reads from localStorage (set in-app), then env var, then localhost
const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://192.168.29.128:5001';

export function getApiUrl() {
  return localStorage.getItem('server_api_url') || DEFAULT_API_URL;
}

export function setApiUrl(url) {
  localStorage.setItem('server_api_url', url.replace(/\/$/, '')); // strip trailing slash
}

export function getDefaultApiUrl() {
  return DEFAULT_API_URL;
}

// Keep default export as a getter for backward compat (re-evaluated on each call)
// Note: since this is a module-level const, components should use getApiUrl() directly
// for live reactivity. This export is for files that import API_URL statically.
const API_URL = getApiUrl();
export default API_URL;
