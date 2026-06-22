import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NoteIcon, CopyIcon, DownloadIcon, CloseIcon } from "./icons.jsx";

// Live, editable shared Markdown scratchpad. Edits call onChange (debounced
// save lives in the parent). AI updates flow in via the `content` prop.
export default function ScratchpadPanel({ content, onChange, onClose, saving, aiTouched }) {
  const [tab, setTab] = useState("edit"); // 'edit' | 'preview'
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  function download() {
    const blob = new Blob([content || ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scratchpad.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="canvas scratchpad">
      <div className="canvas-head">
        <div className="c-title">
          <span className="c-ic"><NoteIcon size={16} /></span>
          Scratchpad
          {aiTouched && <span className="sp-badge">updated by AI</span>}
        </div>
        <div className="sp-tabs">
          <button className={`sp-tab ${tab === "edit" ? "on" : ""}`} onClick={() => setTab("edit")}>Edit</button>
          <button className={`sp-tab ${tab === "preview" ? "on" : ""}`} onClick={() => setTab("preview")}>Preview</button>
        </div>
        <div className="canvas-tools">
          <button className="icon-btn" title="Copy" onClick={copy}><CopyIcon size={17} /></button>
          <button className="icon-btn" title="Download .md" onClick={download}><DownloadIcon size={17} /></button>
          <button className="icon-btn" title="Close" onClick={onClose}><CloseIcon size={17} /></button>
        </div>
      </div>

      <div className="sp-status">
        {saving ? "Saving…" : copied ? "Copied!" : "Shared with the AI · edits auto-save"}
      </div>

      <div className="canvas-body sp-body">
        {tab === "edit" ? (
          <textarea
            className="sp-editor"
            value={content}
            placeholder={"# Scratchpad\n\nJot goals, a checklist, or code here.\nThe AI can read and edit this across turns.\n\n- [ ] First task\n- [ ] Second task"}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="md sp-preview">
            {content?.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="sp-empty">Nothing here yet. Switch to Edit, or send a snippet from the chat.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
