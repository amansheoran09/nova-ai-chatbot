import React, { useState } from "react";
import { CloseIcon, NoteIcon, MemoryIcon, SettingsIcon, TrashIcon } from "./icons.jsx";

const TITLES = {
  instructions: { label: "Custom Instructions", Icon: NoteIcon },
  memory: { label: "Manage Memory", Icon: MemoryIcon },
  settings: { label: "Settings", Icon: SettingsIcon },
};

export default function SettingsModal({ section, onClose }) {
  const meta = TITLES[section] || TITLES.settings;
  const [about, setAbout] = useState("");
  const [style, setStyle] = useState("");
  const [memories, setMemories] = useState([
    "Prefers concise, direct answers.",
    "Working on a full-stack AI chatbot in React.",
    "Uses the Groq API for inference.",
  ]);
  const [theme, setTheme] = useState("Obsidian (Dark)");

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="m-ic"><meta.Icon size={18} /></span>
          <h3>{meta.label}</h3>
          <button className="icon-btn" onClick={onClose}><CloseIcon size={17} /></button>
        </div>

        <div className="modal-body">
          {section === "instructions" && (
            <>
              <label className="field-label">What should Nova know about you?</label>
              <textarea
                className="field"
                rows={4}
                placeholder="Your role, goals, preferences…"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
              />
              <label className="field-label">How should Nova respond?</label>
              <textarea
                className="field"
                rows={4}
                placeholder="Tone, format, level of detail…"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </>
          )}

          {section === "memory" && (
            <>
              <p className="field-hint">Nova remembers details across chats. Remove anything you don't want kept.</p>
              {memories.map((m, i) => (
                <div className="memory-row" key={i}>
                  <span>{m}</span>
                  <button className="micro danger" onClick={() => setMemories((a) => a.filter((_, j) => j !== i))}>
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}
              {memories.length === 0 && <p className="field-hint">Memory is empty.</p>}
            </>
          )}

          {section === "settings" && (
            <>
              <div className="setting-row">
                <div>
                  <div className="s-name">Theme</div>
                  <div className="s-desc">Visual appearance</div>
                </div>
                <select className="field-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option>Obsidian (Dark)</option>
                  <option>Midnight</option>
                  <option>System</option>
                </select>
              </div>
              <div className="setting-row">
                <div>
                  <div className="s-name">Language</div>
                  <div className="s-desc">Interface language</div>
                </div>
                <select className="field-select" defaultValue="English">
                  <option>English</option>
                  <option>Español</option>
                  <option>हिन्दी</option>
                </select>
              </div>
              <div className="setting-row">
                <div>
                  <div className="s-name">Data controls</div>
                  <div className="s-desc">Improve the model for everyone</div>
                </div>
                <span className="switch on"><span className="knob" /></span>
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onClose}>Save</button>
        </div>
      </div>
    </div>
  );
}
