// Thin wrapper around the Gemini REST API. Uses the global fetch (Node 18+),
// so there is no SDK dependency to keep in sync.

import { SYSTEM_PERSONA } from "./persona.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function modelName() {
  return process.env.GEMINI_MODEL || "gemini-3-flash-preview";
}

// Convert our stored messages ({ role: 'user'|'model', content }) into the
// "contents" shape the Gemini API expects.
function toContents(messages) {
  return messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));
}

const SHARED_BODY = {
  systemInstruction: { parts: [{ text: SYSTEM_PERSONA }] },
  generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
};

// Status codes worth retrying: transient overload / rate spikes.
const RETRYABLE = new Set([429, 500, 503]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// POST to Gemini, retrying transient failures with exponential backoff.
async function fetchWithRetry(url, body, { retries = 4, baseDelay = 800 } = {}) {
  let lastDetail = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok && res.body) return res;

    lastDetail = await res.text().catch(() => "");
    if (!RETRYABLE.has(res.status) || attempt === retries) {
      throw new Error(`Gemini API error (${res.status}): ${lastDetail.slice(0, 500)}`);
    }
    // Exponential backoff with jitter: ~0.8s, 1.6s, 3.2s, 6.4s.
    const wait = baseDelay * 2 ** attempt + Math.random() * 300;
    console.warn(
      `Gemini ${res.status}; retrying in ${Math.round(wait)}ms (attempt ${attempt + 1}/${retries})`
    );
    await sleep(wait);
  }
  throw new Error(`Gemini API error: ${lastDetail.slice(0, 500)}`);
}

/**
 * Stream a completion from Gemini.
 * @param {Array<{role:string, content:string}>} history full ordered history (incl. latest user turn)
 * @param {(text:string)=>void} onChunk called with each incremental text chunk
 * @returns {Promise<string>} the full concatenated text
 */
export async function streamCompletion(history, onChunk) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Copy server/.env.example to server/.env.");
  }

  const url = `${API_BASE}/models/${modelName()}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const res = await fetchWithRetry(url, { ...SHARED_BODY, contents: toContents(history) });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by blank lines.
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      for (const line of frame.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const text =
            json?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text || "")
              .join("") || "";
          if (text) {
            full += text;
            onChunk(text);
          }
        } catch {
          // Ignore partial/non-JSON keep-alive frames.
        }
      }
    }
  }

  return full;
}
