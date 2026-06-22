// Groq provider. Groq exposes an OpenAI-compatible Chat Completions API with
// SSE streaming, so we POST to /chat/completions and parse OpenAI-style deltas.
// Uses the global fetch (Node 18+) — no SDK dependency.

import { SYSTEM_PERSONA } from "./persona.js";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
// Vision-capable model used automatically when an image is attached.
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

// The UI's model dropdown maps friendly names to real Groq models. Only these
// values are accepted from the client (whitelist) to avoid arbitrary input.
const MODEL_ALIASES = {
  standard: "llama-3.1-8b-instant",
  reasoning: "llama-3.3-70b-versatile",
  data: "llama-3.3-70b-versatile",
};

function resolveModel(requested) {
  if (!requested) return DEFAULT_MODEL;
  return MODEL_ALIASES[requested] || DEFAULT_MODEL;
}

const MAX_TEXT_CHARS = 8000; // per attachment (~2k tokens) — fits free-tier TPM
const MAX_HISTORY = 12; // most recent messages kept for context
const MAX_SCRATCHPAD_CHARS = 4000; // scratchpad slice sent to the model

// Build the content for the latest user turn, folding in attachment text and
// images. Returns either a plain string (text-only) or OpenAI content parts.
function buildUserContent(userText, attachments) {
  const texts = attachments.filter((a) => a.kind === "text" && a.text);
  const images = attachments.filter((a) => a.kind === "image" && a.dataUrl);

  let combined = userText || "";
  for (const a of texts) {
    const body = a.text.length > MAX_TEXT_CHARS ? a.text.slice(0, MAX_TEXT_CHARS) + "\n[truncated]" : a.text;
    combined += `\n\n--- Attached file: ${a.name} ---\n${body}`;
  }
  // Include any OCR text extracted from images as extra context.
  for (const a of images) {
    if (a.text) {
      const body = a.text.length > MAX_TEXT_CHARS ? a.text.slice(0, MAX_TEXT_CHARS) + "\n[truncated]" : a.text;
      combined += `\n\n--- OCR text from image: ${a.name} ---\n${body}`;
    }
  }

  if (images.length === 0) return combined.trim();

  return [
    { type: "text", text: combined.trim() || "Please analyze the attached image(s)." },
    ...images.map((img) => ({ type: "image_url", image_url: { url: img.dataUrl } })),
  ];
}

// Map our stored roles ('user' | 'model') to OpenAI roles ('user' | 'assistant')
// and prepend the persona as a system message.
function toMessages(history) {
  return [
    { role: "system", content: SYSTEM_PERSONA },
    ...history.map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.content,
    })),
  ];
}

// Sentinels the model uses to rewrite the shared scratchpad. Content between
// them is captured into the scratchpad and hidden from the chat reply.
const SP_START = "<<<SCRATCHPAD>>>";
const SP_END = "<<<END_SCRATCHPAD>>>";

function scratchpadSystemMessage(scratchpad) {
  return {
    role: "system",
    content:
      "You share a live Markdown SCRATCHPAD with the user (a panel beside the chat). " +
      "You can read it and rewrite it. To update it, output the ENTIRE new contents wrapped exactly like:\n" +
      `${SP_START}\n...full markdown...\n${SP_END}\n` +
      "The wrapped block is hidden from the chat and replaces the scratchpad, so always include the COMPLETE new version, not a diff. " +
      "Only include the block when you actually want to change the scratchpad; otherwise reply normally. " +
      "Keep your chat reply concise and refer to the scratchpad rather than repeating large blocks.\n\n" +
      "Current scratchpad contents:\n" +
      (scratchpad && scratchpad.trim()
        ? scratchpad.slice(0, MAX_SCRATCHPAD_CHARS) +
          (scratchpad.length > MAX_SCRATCHPAD_CHARS ? "\n[scratchpad truncated]" : "")
        : "(empty)"),
  };
}

// Incremental filter: splits streamed text into visible chat text (sent via
// onVisible) and captured scratchpad content, tolerating chunk-split sentinels.
function createScratchpadFilter(onVisible) {
  let buf = "";
  let capturing = false;
  let visible = "";
  let scratch = null;

  const emit = (s) => {
    if (s) {
      visible += s;
      onVisible(s);
    }
  };

  function process() {
    while (true) {
      if (!capturing) {
        const i = buf.indexOf(SP_START);
        if (i === -1) {
          // Emit everything except a tail that might be a partial SP_START.
          const safe = buf.length - (SP_START.length - 1);
          if (safe > 0) {
            emit(buf.slice(0, safe));
            buf = buf.slice(safe);
          }
          return;
        }
        emit(buf.slice(0, i));
        buf = buf.slice(i + SP_START.length);
        capturing = true;
      } else {
        const j = buf.indexOf(SP_END);
        if (j === -1) {
          const safe = buf.length - (SP_END.length - 1);
          if (safe > 0) {
            scratch = (scratch || "") + buf.slice(0, safe);
            buf = buf.slice(safe);
          }
          return;
        }
        scratch = (scratch || "") + buf.slice(0, j);
        buf = buf.slice(j + SP_END.length);
        capturing = false;
      }
    }
  }

  return {
    push(chunk) {
      buf += chunk;
      process();
    },
    finish() {
      if (!capturing && buf) emit(buf);
      // A scratchpad value is only applied if its block was properly closed.
      const finalScratch = capturing ? null : scratch;
      return { text: visible.trim(), scratchpad: finalScratch == null ? null : finalScratch.trim() };
    },
  };
}

// Status codes worth retrying: transient overload / rate spikes.
const RETRYABLE = new Set([429, 500, 502, 503]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(body, apiKey, { retries = 4, baseDelay = 800 } = {}) {
  let lastDetail = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok && res.body) return res;

    lastDetail = await res.text().catch(() => "");
    if (!RETRYABLE.has(res.status) || attempt === retries) {
      throw new Error(`Groq API error (${res.status}): ${lastDetail.slice(0, 500)}`);
    }
    const wait = baseDelay * 2 ** attempt + Math.random() * 300;
    console.warn(
      `Groq ${res.status}; retrying in ${Math.round(wait)}ms (attempt ${attempt + 1}/${retries})`
    );
    await sleep(wait);
  }
  throw new Error(`Groq API error: ${lastDetail.slice(0, 500)}`);
}

/**
 * Stream a completion from Groq.
 * @param {Array<{role:string, content:string}>} history full ordered history (incl. latest user turn)
 * @param {(text:string)=>void} onChunk called with each incremental text chunk
 * @returns {Promise<string>} the full concatenated text
 */
export async function streamCompletion(history, onChunk, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Copy server/.env.example to server/.env.");
  }

  const attachments = options.attachments || [];
  const hasImage = attachments.some((a) => a.kind === "image" && a.dataUrl);

  // Only send the most recent slice of history to stay within rate limits.
  const messages = toMessages(history.slice(-MAX_HISTORY));
  // Give the model the current scratchpad and edit instructions.
  if (options.scratchpad !== undefined) {
    messages.splice(1, 0, scratchpadSystemMessage(options.scratchpad));
  }
  // Replace the latest user turn's content with attachment-aware content.
  if (attachments.length) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        messages[i] = { role: "user", content: buildUserContent(options.userText, attachments) };
        break;
      }
    }
  }

  const res = await fetchWithRetry(
    {
      model: hasImage ? VISION_MODEL : resolveModel(options.model),
      messages,
      stream: true,
      temperature: 0.7,
    },
    apiKey
  );

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const filter = createScratchpadFilter(onChunk);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // OpenAI-style SSE: frames separated by blank lines, each "data: {json}".
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
          const text = json?.choices?.[0]?.delta?.content || "";
          if (text) filter.push(text); // routes visible text to onChunk, captures scratchpad
        } catch {
          // Ignore partial/non-JSON keep-alive frames.
        }
      }
    }
  }

  // Returns { text: visibleReply, scratchpad: newContent | null }.
  return filter.finish();
}
