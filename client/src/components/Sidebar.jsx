import React, { useEffect, useRef, useState } from "react";
import {
  PlusIcon,
  CompassIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  SparkIcon,
  SettingsIcon,
  MemoryIcon,
  NoteIcon,
  GhostIcon,
  LogoutIcon,
} from "./icons.jsx";

// Group conversations into Today / Yesterday / Previous 7 Days / Older.
function groupByTime(conversations) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;
  const groups = { Today: [], Yesterday: [], "Previous 7 Days": [], Older: [] };
  for (const c of conversations) {
    const t = c.updated_at;
    if (t >= startOfToday) groups.Today.push(c);
    else if (t >= startOfToday - dayMs) groups.Yesterday.push(c);
    else if (t >= startOfToday - 7 * dayMs) groups["Previous 7 Days"].push(c);
    else groups.Older.push(c);
  }
  return groups;
}

export default function Sidebar({
  conversations,
  activeId,
  user,
  onLogout,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onShare,
  temporary,
  onOpenSettings,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tempChat, setTempChat] = useState(temporary);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const footRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (footRef.current && !footRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const groups = groupByTime(conversations);

  function startRename(c) {
    setEditingId(c.id);
    setDraft(c.title);
  }
  function commitRename(id) {
    const t = draft.trim();
    if (t) onRename(id, t);
    setEditingId(null);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand">
          <span className="logo">
            <SparkIcon size={18} />
          </span>
          Nova&nbsp;AI
        </div>
        <button className="new-chat" onClick={onNew}>
          <PlusIcon size={17} /> New Chat
        </button>
      </div>

      <div className="sidebar-scroll">
        {conversations.length === 0 && (
          <p className="time-label" style={{ marginTop: 18 }}>
            No conversations yet
          </p>
        )}
        {Object.entries(groups).map(([label, items]) =>
          items.length ? (
            <div className="time-group" key={label}>
              <div className="time-label">{label}</div>
              {items.map((c) => (
                <div
                  key={c.id}
                  className={`conv ${c.id === activeId ? "active" : ""}`}
                  onClick={() => editingId !== c.id && onSelect(c.id)}
                >
                  {editingId === c.id ? (
                    <input
                      className="conv-rename"
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commitRename(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="conv-title">{c.title}</span>
                  )}
                  <div className="conv-actions">
                    <button
                      className="micro"
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(c);
                      }}
                    >
                      <PencilIcon size={14} />
                    </button>
                    <button
                      className="micro"
                      title="Share"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(c);
                      }}
                    >
                      <ShareIcon size={14} />
                    </button>
                    <button
                      className="micro danger"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.id);
                      }}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null
        )}
      </div>

      <div className="sidebar-foot" ref={footRef}>
        {menuOpen && (
          <div className="popover">
            <button className="pop-item" onClick={() => { setMenuOpen(false); onOpenSettings("instructions"); }}>
              <span className="ic"><NoteIcon size={17} /></span> Custom Instructions
            </button>
            <button className="pop-item" onClick={() => { setMenuOpen(false); onOpenSettings("memory"); }}>
              <span className="ic"><MemoryIcon size={17} /></span> Manage Memory
            </button>
            <button className="pop-item" onClick={() => { setMenuOpen(false); onOpenSettings("settings"); }}>
              <span className="ic"><SettingsIcon size={17} /></span> Settings
            </button>
            <div className="pop-divider" />
            <button
              className="pop-item"
              onClick={() => {
                const next = !tempChat;
                setTempChat(next);
                onOpenSettings("temporary", next);
              }}
            >
              <span className="ic"><GhostIcon size={17} /></span> Temporary Chat
              <span className={`switch ${tempChat ? "on" : ""}`}>
                <span className="knob" />
              </span>
            </button>
            <div className="pop-divider" />
            <button className="pop-item" onClick={() => { setMenuOpen(false); onLogout(); }}>
              <span className="ic"><LogoutIcon size={17} /></span> Log out
            </button>
          </div>
        )}
        <button className="profile" onClick={() => setMenuOpen((v) => !v)}>
          <span className="avatar">{(user?.username?.[0] || "U").toUpperCase()}</span>
          <span className="profile-meta">
            <span className="name">{user?.username || "Account"}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
