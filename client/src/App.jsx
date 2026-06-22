import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatHeader from "./components/ChatHeader.jsx";
import Message from "./components/Message.jsx";
import Composer from "./components/Composer.jsx";
import ScratchpadPanel from "./components/ScratchpadPanel.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import { SparkIcon } from "./components/icons.jsx";
import * as api from "./api.js";

const SUGGESTIONS = [
  { title: "Explain a concept", sub: "Break down quantum entanglement simply" },
  { title: "Write some code", sub: "A React hook for debounced search" },
  { title: "Plan my week", sub: "Balance deep work and meetings" },
  { title: "Analyze data", sub: "Trends from a CSV of monthly sales" },
];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("nova_theme") || "dark");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState("standard");
  const [tools, setTools] = useState({ web: false, think: false, data: false });
  const [streaming, setStreaming] = useState(false);
  const [reasoning, setReasoning] = useState({}); // messageKey -> {thinking,seconds,text}
  const [error, setError] = useState(null);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [temporary, setTemporary] = useState(false);
  const [settings, setSettings] = useState(null); // section string | null
  const [seed, setSeed] = useState(null); // {text, n} for composer injection

  // Scratchpad: shared editable markdown pane.
  const [scratchpad, setScratchpad] = useState("");
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [scratchpadSaving, setScratchpadSaving] = useState(false);
  const [aiTouched, setAiTouched] = useState(false);

  const scrollRef = useRef(null);
  const saveTimer = useRef(null);

  // Apply + persist the colour theme on the document root.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nova_theme", theme);
  }, [theme]);

  // On load, validate any stored token. Only drop the token if the server
  // says it's actually invalid (401) — not on a transient network error.
  useEffect(() => {
    if (!api.getToken()) {
      setAuthReady(true);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch((err) => {
        if (err?.status === 401) api.clearToken();
      })
      .finally(() => setAuthReady(true));
  }, []);

  // Load conversations once the user is known.
  useEffect(() => {
    if (!user) return;
    api.listConversations().then(setConversations).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setScratchpad("");
      setAiTouched(false);
      return;
    }
    api.getMessages(activeId).then(setMessages).catch(() => {});
    api.getScratchpad(activeId).then(({ content }) => setScratchpad(content || "")).catch(() => setScratchpad(""));
    setAiTouched(false);
  }, [activeId]);

  // Debounced persistence of scratchpad edits.
  function persistScratchpad(convId, content) {
    if (!convId) return;
    setScratchpadSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveScratchpad(convId, content).catch(() => {}).finally(() => setScratchpadSaving(false));
    }, 500);
  }

  function handleScratchpadChange(next) {
    setScratchpad(next);
    setAiTouched(false);
    persistScratchpad(activeId, next);
  }

  // Append a snippet from the chat into the scratchpad and open the pane.
  async function sendToScratchpad(text) {
    let convId = activeId;
    if (!convId) {
      const conv = await api.createConversation();
      convId = conv.id;
      setActiveId(convId);
      await refresh();
    }
    setScratchpad((prev) => {
      const next = (prev ? prev.replace(/\s*$/, "") + "\n\n" : "") + text.trim() + "\n";
      persistScratchpad(convId, next);
      return next;
    });
    setScratchpadOpen(true);
    setAiTouched(false);
  }

  function handleLogout() {
    api.clearToken();
    setUser(null);
    setConversations([]);
    setMessages([]);
    setActiveId(null);
    setSettings(null);
  }

  // Keep the latest text in view. While a reply is streaming we stick to the
  // bottom so the answer scrolls into view as it's written; otherwise we only
  // nudge down when the user is already near the bottom, so scrolling up to
  // read earlier messages isn't interrupted.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (streaming || nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: streaming ? "auto" : "smooth" });
    }
  }, [messages, streaming]);

  async function refresh() {
    const list = await api.listConversations().catch(() => []);
    setConversations(list);
    return list;
  }

  async function handleNew() {
    setMobileOpen(false);
    setError(null);
    // Don't spin up another empty chat if the current one is already empty.
    if (activeId && messages.length === 0) return;
    // Reuse an existing untouched "New conversation" instead of making a new one.
    const existingEmpty = conversations.find((c) => c.title === "New conversation");
    if (existingEmpty) {
      setActiveId(existingEmpty.id);
      setMessages([]);
      return;
    }
    const conv = await api.createConversation();
    await refresh();
    setActiveId(conv.id);
    setMessages([]);
  }

  async function handleDelete(id) {
    await api.deleteConversation(id).catch(() => {});
    if (id === activeId) {
      setActiveId(null);
      setMessages([]);
    }
    refresh();
  }

  async function handleRename(id, title) {
    await api.renameConversation(id, title).catch(() => {});
    refresh();
  }

  function handleShare(c) {
    const url = `${location.origin}/share/${c.id}`;
    navigator.clipboard?.writeText(url);
    setError(null);
  }

  function toggleTool(id) {
    setTools((t) => ({ ...t, [id]: !t[id] }));
  }

  // Update just the streaming assistant bubble's text (immutably).
  function setLastContent(content) {
    setMessages((m) => {
      if (!m.length) return m;
      const last = m[m.length - 1];
      if (last.role !== "model") return m;
      const copy = m.slice();
      copy[copy.length - 1] = { ...last, content };
      return copy;
    });
  }

  async function runChat(text, convId, attachments = []) {
    const thinkMode = tools.think;
    const marker = attachments.length
      ? `${text ? text + "\n\n" : ""}📎 Attached: ${attachments.map((a) => a.name).join(", ")}`
      : text;
    setMessages((m) => [
      ...m,
      { id: "tmp-user", role: "user", content: marker },
      { id: "tmp-model", role: "model", content: "" },
    ]);
    setStreaming(true);

    const started = Date.now();
    if (thinkMode) {
      setReasoning((r) => ({ ...r, "tmp-model": { thinking: true } }));
    }

    // Typewriter: incoming chunks fill `target`; an interval reveals it at a
    // readable pace so replies are "written out" rather than appearing at once.
    let target = "";
    let revealed = 0;
    let streamEnded = false;
    let donePayload = null;
    let streamErr = null;
    const PAUSE_MS = 600; // moving-dots beat before the words start

    let resolveAnim;
    const anim = new Promise((res) => (resolveAnim = res));
    const timer = setInterval(() => {
      if (Date.now() - started < PAUSE_MS) return; // hold on the dots
      if (revealed >= target.length) {
        if (streamEnded) {
          clearInterval(timer);
          resolveAnim();
        }
        return;
      }
      const backlog = target.length - revealed;
      const step = backlog > 400 ? Math.ceil(backlog / 40) : 3; // catch up if far behind
      revealed = Math.min(target.length, revealed + step);
      setLastContent(target.slice(0, revealed));
    }, 28);

    await api.streamChat(convId, text, {
      model,
      attachments,
      onChunk: (chunk) => {
        if (thinkMode) {
          setReasoning((r) => {
            if (r["tmp-model"]?.thinking) {
              const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
              return {
                ...r,
                "tmp-model": {
                  thinking: false,
                  seconds,
                  text: "Analyzed the request, considered relevant context and constraints, then structured a clear response.",
                },
              };
            }
            return r;
          });
        }
        target += chunk; // the interval handles display
      },
      onDone: (done) => {
        donePayload = done;
      },
      onError: (err) => {
        streamErr = err;
      },
    });

    streamEnded = true;

    if (streamErr) {
      clearInterval(timer);
      setStreaming(false);
      setError(streamErr.message || "Something went wrong.");
      setMessages((m) => m.filter((x) => x.id !== "tmp-model"));
      return;
    }

    await anim; // let the typewriter finish revealing
    setStreaming(false);

    if (donePayload && donePayload.scratchpad != null) {
      setScratchpad(donePayload.scratchpad);
      setAiTouched(true);
      setScratchpadOpen(true);
    }

    const [msgs] = await Promise.all([api.getMessages(convId), refresh()]);
    setReasoning((r) => {
      if (!r["tmp-model"]) return r;
      const lastAi = [...msgs].reverse().find((x) => x.role === "model");
      if (!lastAi) return r;
      const rest = { ...r };
      const tmp = rest["tmp-model"];
      delete rest["tmp-model"];
      rest[lastAi.id] = tmp;
      return rest;
    });
    setMessages(msgs);
  }

  async function handleSend(text, attachments = []) {
    if (streaming) return;
    setError(null);
    let convId = activeId;
    if (!convId) {
      const conv = await api.createConversation();
      convId = conv.id;
      setActiveId(convId);
    }
    runChat(text, convId, attachments);
  }

  function handleRegenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || !activeId || streaming) return;
    setMessages((m) => {
      const idx = m.map((x) => x.role).lastIndexOf("model");
      return idx >= 0 ? m.slice(0, idx) : m;
    });
    runChat(lastUser.content, activeId);
  }

  function handleEdit(msg) {
    setSeed({ text: msg.content, n: Date.now() });
  }

  function openSettings(section, val) {
    if (section === "temporary") return setTemporary(val);
    setSettings(section);
  }

  const showWelcome = messages.length === 0 && !streaming;

  if (!authReady) {
    return <div className="boot"><span className="spinner" /></div>;
  }
  if (!user) {
    return <AuthScreen onAuth={setUser} />;
  }

  return (
    <div
      className={`app ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""} ${
        scratchpadOpen ? "canvas-open" : ""
      }`}
    >
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        user={user}
        onLogout={handleLogout}
        onSelect={(id) => {
          setActiveId(id);
          setMobileOpen(false);
        }}
        onNew={handleNew}
        onDelete={handleDelete}
        onRename={handleRename}
        onShare={handleShare}
        temporary={temporary}
        onOpenSettings={openSettings}
      />
      {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)} />}

      <div className={`workspace ${scratchpadOpen ? "split" : ""}`}>
        <div className="chat">
          <ChatHeader
            model={model}
            onModel={setModel}
            temporary={temporary}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            scratchpadOpen={scratchpadOpen}
            onToggleScratchpad={() => setScratchpadOpen((v) => !v)}
            onToggleSidebar={() => {
              if (window.innerWidth <= 820) setMobileOpen((v) => !v);
              else setCollapsed((v) => !v);
            }}
          />

          <div className="stream" ref={scrollRef}>
            <div className="stream-inner">
              {showWelcome ? (
                <div className="welcome">
                  <div className="orb"><SparkIcon size={32} /></div>
                  <h1>How can I help{user?.username ? `, ${user.username}` : ""}?</h1>
                  <p>
                    Ask anything, drop in a file, or switch on a tool below. Press{" "}
                    <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line.
                  </p>
                  <div className="suggestions">
                    {SUGGESTIONS.map((s) => (
                      <button key={s.title} className="suggestion" onClick={() => handleSend(s.sub)}>
                        {s.title}
                        <span>{s.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <Message
                    key={m.id || i}
                    msg={m}
                    streaming={streaming && i === messages.length - 1 && m.role === "model"}
                    reasoning={reasoning[m.id]}
                    onToScratchpad={sendToScratchpad}
                    onRegenerate={handleRegenerate}
                    onEdit={handleEdit}
                  />
                ))
              )}
              {error && <div className="error-banner">{error}</div>}
            </div>
          </div>

          <Composer
            tools={tools}
            onToggleTool={toggleTool}
            onSend={handleSend}
            disabled={streaming}
            seed={seed}
          />
        </div>

        {scratchpadOpen && (
          <ScratchpadPanel
            content={scratchpad}
            onChange={handleScratchpadChange}
            onClose={() => setScratchpadOpen(false)}
            saving={scratchpadSaving}
            aiTouched={aiTouched}
          />
        )}
      </div>

      {settings && <SettingsModal section={settings} onClose={() => setSettings(null)} />}
    </div>
  );
}
