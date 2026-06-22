import React from "react";
import { SidebarIcon, SparkIcon, GhostIcon, NoteIcon, SunIcon, MoonIcon } from "./icons.jsx";

export default function ChatHeader({ onToggleSidebar, temporary, onToggleScratchpad, scratchpadOpen, theme, onToggleTheme }) {
  return (
    <header className="chat-header">
      <button className="icon-btn" title="Toggle sidebar" onClick={onToggleSidebar}>
        <SidebarIcon size={18} />
      </button>

      <div className="header-brand"><span className="spark"><SparkIcon size={16} /></span> Nova AI</div>

      <div className="spacer" />

      {temporary && (
        <span className="pill temp"><span className="dot" /><GhostIcon size={13} /> Temporary</span>
      )}
      <button
        className={`pill sp-toggle ${scratchpadOpen ? "active" : ""}`}
        title="Toggle scratchpad"
        onClick={onToggleScratchpad}
      >
        <NoteIcon size={14} /> Scratchpad
      </button>
      <button
        className="icon-btn theme-toggle"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={onToggleTheme}
      >
        {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      </button>
    </header>
  );
}
