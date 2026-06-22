import React, { useEffect, useRef, useState } from "react";
import {
  GlobeIcon, BulbIcon, ChartIcon, PaperclipIcon, HeadphoneIcon, SendIcon, CloseIcon,
} from "./icons.jsx";
import { extractFiles } from "../fileExtract.js";

const TOOLS = [
  { id: "web", label: "Search Web", Icon: GlobeIcon },
  { id: "think", label: "Think", Icon: BulbIcon },
  { id: "data", label: "Data Analysis", Icon: ChartIcon },
];

function kb(size) {
  if (size == null) return "";
  return size > 1024 * 1024
    ? (size / 1024 / 1024).toFixed(1) + " MB"
    : Math.max(1, Math.round(size / 1024)) + " KB";
}

export default function Composer({ tools, onToggleTool, onSend, disabled, seed }) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState([]); // extracted attachment objects
  const [extracting, setExtracting] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  useEffect(() => {
    if (seed && seed.text != null) {
      setValue(seed.text);
      requestAnimationFrame(autosize);
      taRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.n]);

  async function onPick(e) {
    const picked = e.target.files;
    if (!picked?.length) return;
    setExtracting(true);
    const extracted = await extractFiles(picked);
    setFiles((arr) => [...arr, ...extracted]);
    setExtracting(false);
    e.target.value = "";
  }

  function submit() {
    const text = value.trim();
    if ((!text && files.length === 0) || disabled || extracting) return;
    onSend(text, files);
    setValue("");
    setFiles([]);
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = "auto";
    });
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <div className="tool-row">
          {TOOLS.map((t) => (
            <button key={t.id} className={`tool ${tools[t.id] ? "on" : ""}`} onClick={() => onToggleTool(t.id)}>
              <span className="t-ic"><t.Icon size={15} /></span>
              {t.label}
            </button>
          ))}
        </div>

        {(files.length > 0 || extracting) && (
          <div className="attachments">
            {files.map((f, i) => (
              <span className={`chip ${f.kind === "error" || f.kind === "unsupported" ? "chip-bad" : ""}`} key={i}>
                <PaperclipIcon size={13} />
                <span className="chip-name">{f.name}</span>
                <span className="chip-meta">
                  {f.kind === "image"
                    ? "image"
                    : f.kind === "text"
                    ? (f.ocr ? "OCR · " : "") + kb(f.size)
                    : f.kind === "unsupported"
                    ? "unsupported"
                    : "error"}
                </span>
                <button onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}>
                  <CloseIcon size={12} />
                </button>
              </span>
            ))}
            {extracting && <span className="chip"><span className="spinner" /> Reading…</span>}
          </div>
        )}

        <div className="input-line">
          <div className="left-tools">
            <button className="round" title="Attach files, PDFs, images" onClick={() => fileRef.current?.click()}>
              <PaperclipIcon size={18} />
            </button>
            <input ref={fileRef} type="file" multiple hidden onChange={onPick} />
          </div>

          <textarea
            ref={taRef}
            rows={1}
            value={value}
            placeholder="Message Nova AI…"
            onChange={(e) => { setValue(e.target.value); autosize(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />

          <div className="right-tools">
            <button className="round" title="Voice mode"><HeadphoneIcon size={18} /></button>
            <button
              className="send"
              title="Send"
              onClick={submit}
              disabled={disabled || extracting || (!value.trim() && files.length === 0)}
            >
              <SendIcon size={18} />
            </button>
          </div>
        </div>
      </div>
      <p className="disclaimer">AI can make mistakes. Verify important info.</p>
    </div>
  );
}
