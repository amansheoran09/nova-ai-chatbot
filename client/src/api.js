// Backend client with JWT auth. The token is stored in localStorage and sent
// as a Bearer header on every request (including the streaming chat endpoint).

const TOKEN_KEY = "nova_token";

// In production, set VITE_API_URL to the deployed backend's URL.
// Left empty in dev so requests stay same-origin and use the Vite proxy.
const BASE = import.meta.env.VITE_API_URL || "";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function authHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : extra;
}

async function parse(r) {
  if (!r.ok) {
    let msg = `Request failed: ${r.status}`;
    try {
      const body = await r.json();
      if (body?.error) msg = body.error;
    } catch {}
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return r.status === 204 ? null : r.json();
}

// --- Auth ---------------------------------------------------------------

export const signup = (email, password, username) =>
  fetch(BASE + "/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  }).then(parse);

export const login = (email, password) =>
  fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(parse);

export const me = () => fetch(BASE + "/api/auth/me", { headers: authHeaders() }).then(parse);

// --- Conversations ------------------------------------------------------

export const listConversations = () =>
  fetch(BASE + "/api/conversations", { headers: authHeaders() }).then(parse);

export const createConversation = () =>
  fetch(BASE + "/api/conversations", { method: "POST", headers: authHeaders() }).then(parse);

export const getMessages = (id) =>
  fetch(`${BASE}/api/conversations/${id}/messages`, { headers: authHeaders() }).then(parse);

export const renameConversation = (id, title) =>
  fetch(`${BASE}/api/conversations/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ title }),
  }).then(parse);

export const deleteConversation = (id) =>
  fetch(`${BASE}/api/conversations/${id}`, { method: "DELETE", headers: authHeaders() }).then(parse);

export const getScratchpad = (id) =>
  fetch(`${BASE}/api/conversations/${id}/scratchpad`, { headers: authHeaders() }).then(parse);

export const saveScratchpad = (id, content) =>
  fetch(`${BASE}/api/conversations/${id}/scratchpad`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ content }),
  }).then(parse);

// --- Streaming chat -----------------------------------------------------

export async function streamChat(conversationId, message, { model, attachments, onChunk, onDone, onError }) {
  const res = await fetch(`${BASE}/api/conversations/${conversationId}/chat`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message, model, attachments }),
  });

  if (!res.ok || !res.body) {
    let msg = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    onError?.(new Error(msg));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      let parsed;
      try { parsed = JSON.parse(data); } catch { continue; }
      if (event === "chunk") onChunk?.(parsed.text || "");
      else if (event === "done") onDone?.(parsed);
      else if (event === "error") onError?.(new Error(parsed.message || "Stream error"));
    }
  }
}
