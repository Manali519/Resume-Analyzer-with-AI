// The session token lives in memory only: reloading the page or leaving the
// site discards it, which signs the user out.
let token = null;

// Same-origin "/api" by default; set VITE_API_URL at build time when the API is on another host
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const setToken = (value) => {
  token = value;
};

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, options);

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: () => request("/auth/me"),
  sendContact: (body) => request("/contact", { method: "POST", body }),
  previewAnalysis: (body) => request("/analyses/preview", { method: "POST", body }),
  saveAnalysis: (body) => request("/analyses", { method: "POST", body }),
  listAnalyses: () => request("/analyses"),
  deleteAnalysis: (id) => request(`/analyses/${id}`, { method: "DELETE" }),
};
