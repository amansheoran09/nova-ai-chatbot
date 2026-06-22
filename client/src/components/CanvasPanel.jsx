import React, { useState } from "react";
import { CodeIcon, CopyIcon, DownloadIcon, HistoryIcon, CloseIcon } from "./icons.jsx";

const EXT = {
  javascript: "js", js: "js", jsx: "jsx", typescript: "ts", ts: "ts",
  python: "py", py: "py", bash: "sh", sh: "sh", json: "json",
  html: "html", css: "css", sql: "sql", text: "txt", markdown: "md",
};

export default function CanvasPanel({ artifact, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [version, setVersion] = useState(1);

  const { lang = "text", code = "" } = artifact || {};

  function copy() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  function download() {
    const ext = EXT[lang] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artifact.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="canvas">
      <div className="canvas-head">
        <div className="c-title">
          <span className="c-ic"><CodeIcon size={16} /></span>
          Canvas
          <span className="c-lang">· {lang}</span>
        </div>
        <div className="canvas-tools">
          <button
            className={`icon-btn ${showHistory ? "" : ""}`}
            title="Version history"
            onClick={() => setShowHistory((v) => !v)}
          >
            <HistoryIcon size={17} />
          </button>
          <button className="icon-btn" title="Copy" onClick={copy}>
            <CopyIcon size={17} />
          </button>
          <button className="icon-btn" title="Download" onClick={download}>
            <DownloadIcon size={17} />
          </button>
          <button className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={17} />
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="version-bar">
          <HistoryIcon size={14} /> Versions:
          {[1, 2, 3].map((v) => (
            <button
              key={v}
              className={`version-pill ${version === v ? "active" : ""}`}
              onClick={() => setVersion(v)}
            >
              v{v}
            </button>
          ))}
          <span style={{ marginLeft: "auto" }}>{copied ? "Copied!" : `Editing v${version}`}</span>
        </div>
      )}

      <div className="canvas-body">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </section>
  );
}
