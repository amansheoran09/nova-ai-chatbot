import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  createUser,
  getUserByEmail,
  getUserById,
  listConversations,
  createConversation,
  getConversation,
  renameConversation,
  deleteConversation,
  getScratchpad,
  setScratchpad,
  getMessages,
  addMessage,
} from "./db.js";
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  validCredentials,
} from "./auth.js";
import { streamCompletion } from "./groq.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "30mb" })); // room for base64 image attachments

// --- Auth ----------------------------------------------------------------

app.post("/api/auth/signup", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const username = String(req.body?.username || "").trim();
    const problem = validCredentials(email, password);
    if (problem) return res.status(400).json({ error: problem });
    if (username.length < 2) return res.status(400).json({ error: "Username must be at least 2 characters." });
    if (getUserByEmail(email)) return res.status(409).json({ error: "Email already registered." });

    const user = createUser(email, await hashPassword(password), username);
    res.status(201).json({
      token: signToken(user),
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err) {
    console.error("signup error:", err);
    res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Could not sign in." });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: { id: user.id, email: user.email, username: user.username } });
});

// --- Conversations (all require auth + ownership) ------------------------

app.use("/api/conversations", requireAuth);

app.get("/api/conversations", (req, res) => {
  res.json(listConversations(req.userId));
});

app.post("/api/conversations", (req, res) => {
  res.status(201).json(createConversation(req.userId));
});

app.get("/api/conversations/:id/messages", (req, res) => {
  if (!getConversation(req.params.id, req.userId)) return res.status(404).json({ error: "Not found" });
  res.json(getMessages(req.params.id));
});

app.patch("/api/conversations/:id", (req, res) => {
  if (!getConversation(req.params.id, req.userId)) return res.status(404).json({ error: "Not found" });
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  renameConversation(req.params.id, req.userId, title);
  res.json(getConversation(req.params.id, req.userId));
});

app.delete("/api/conversations/:id", (req, res) => {
  deleteConversation(req.params.id, req.userId);
  res.status(204).end();
});

// --- Scratchpad ----------------------------------------------------------

app.get("/api/conversations/:id/scratchpad", (req, res) => {
  const content = getScratchpad(req.params.id, req.userId);
  if (content === null) return res.status(404).json({ error: "Not found" });
  res.json({ content });
});

app.put("/api/conversations/:id/scratchpad", (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  if (!setScratchpad(req.params.id, req.userId, content)) {
    return res.status(404).json({ error: "Not found" });
  }
  res.json({ content });
});

// --- Chat (streaming via SSE) -------------------------------------------

app.post("/api/conversations/:id/chat", async (req, res) => {
  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const conversation = getConversation(req.params.id, req.userId);
    if (!conversation) return res.status(404).json({ error: "Not found" });

    const message = String(req.body?.message || "").trim();
    const model = req.body?.model;
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    if (!message && attachments.length === 0) {
      return res.status(400).json({ error: "message or attachment required" });
    }

    const names = attachments.map((a) => a.name).filter(Boolean);
    const storedMessage = names.length
      ? `${message ? message + "\n\n" : ""}📎 Attached: ${names.join(", ")}`
      : message;

    addMessage(conversation.id, "user", storedMessage);
    if (getMessages(conversation.id).filter((m) => m.role === "user").length === 1) {
      renameConversation(conversation.id, req.userId, (message || names.join(", ")).slice(0, 60));
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const history = getMessages(conversation.id).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const scratchpad = getScratchpad(conversation.id, req.userId) || "";

    try {
      const result = await streamCompletion(
        history,
        (chunk) => send("chunk", { text: chunk }),
        { model, attachments, userText: message, scratchpad }
      );
      const reply = (result && result.text) || "";
      const saved = addMessage(conversation.id, "model", reply || "(no response)");

      // The model may have rewritten the scratchpad — persist and notify.
      let newScratchpad = null;
      if (result && result.scratchpad != null) {
        setScratchpad(conversation.id, req.userId, result.scratchpad);
        newScratchpad = result.scratchpad;
      }
      send("done", {
        id: saved.id,
        title: getConversation(conversation.id, req.userId).title,
        scratchpad: newScratchpad,
      });
    } catch (err) {
      console.error("stream error:", err);
      send("error", { message: err.message || "Something went wrong." });
    } finally {
      res.end();
    }
  } catch (err) {
    console.error("chat route error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Server error" });
    } else {
      try {
        send("error", { message: err.message || "Server error" });
      } catch {}
      res.end();
    }
  }
});

process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`AI chatbot server listening on http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn("WARNING: GROQ_API_KEY is not set — chat requests will fail.");
  }
});
