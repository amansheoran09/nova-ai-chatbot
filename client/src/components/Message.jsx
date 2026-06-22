import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ReasoningAccordion from "./ReasoningAccordion.jsx";
import {
  CopyIcon,
  RefreshIcon,
  ThumbUpIcon,
  ThumbDownIcon,
  SpeakerIcon,
  PencilIcon,
  CodeIcon,
  NoteIcon,
} from "./icons.jsx";

function langFromClass(className = "") {
  const m = /language-(\w+)/.exec(className || "");
  return m ? m[1] : "text";
}

// Renders fenced code blocks with a "Send to Scratchpad" action.
function makeComponents(onToScratchpad) {
  return {
    pre({ children }) {
      const codeEl = Array.isArray(children) ? children[0] : children;
      const props = codeEl?.props || {};
      const lang = langFromClass(props.className);
      const raw = String(props.children ?? "").replace(/\n$/, "");
      return (
        <div className="code-card">
          <div className="code-card-head">
            <CodeIcon size={14} />
            <span className="lang">{lang}</span>
            <button
              className="open-canvas"
              onClick={() => onToScratchpad("\n```" + (lang === "text" ? "" : lang) + "\n" + raw + "\n```\n")}
            >
              <NoteIcon size={13} /> Send to Scratchpad
            </button>
          </div>
          <pre>
            <code>{raw}</code>
          </pre>
        </div>
      );
    },
  };
}

export default function Message({ msg, streaming, reasoning, onToScratchpad, onRegenerate, onEdit }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(msg.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function readAloud() {
    if (!window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(msg.content || "");
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  return (
    <div className={`row ${isUser ? "user" : "ai"}`}>
      <div className="bubble-avatar">{isUser ? "A" : "N"}</div>
      <div className="col">
        {!isUser && reasoning && <ReasoningAccordion reasoning={reasoning} />}

        <div className={`bubble ${isUser ? "plain" : ""}`}>
          {isUser ? (
            msg.content
          ) : (
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={makeComponents(onToScratchpad)}>
                {msg.content || ""}
              </ReactMarkdown>
              {streaming && !msg.content && (
                <span className="typing"><span /><span /><span /></span>
              )}
              {streaming && msg.content && <span className="caret" />}
            </div>
          )}
        </div>

        {isUser ? (
          <div className="action-bar">
            <button className="act" title="Edit" onClick={() => onEdit(msg)}>
              <PencilIcon size={15} />
            </button>
            <button className="act" title="Send to Scratchpad" onClick={() => onToScratchpad("\n" + (msg.content || "") + "\n")}>
              <NoteIcon size={15} />
            </button>
          </div>
        ) : (
          !streaming && (
            <div className="action-bar">
              <button className={`act ${copied ? "copied" : ""}`} title="Copy" onClick={copy}>
                <CopyIcon size={15} />
              </button>
              <button className="act" title="Send to Scratchpad" onClick={() => onToScratchpad("\n" + (msg.content || "") + "\n")}>
                <NoteIcon size={15} />
              </button>
              <button className="act" title="Regenerate" onClick={() => onRegenerate(msg)}>
                <RefreshIcon size={15} />
              </button>
              <button
                className={`act good ${vote === "up" ? "on" : ""}`}
                title="Good response"
                onClick={() => setVote(vote === "up" ? null : "up")}
              >
                <ThumbUpIcon size={15} />
              </button>
              <button
                className={`act bad ${vote === "down" ? "on" : ""}`}
                title="Bad response"
                onClick={() => setVote(vote === "down" ? null : "down")}
              >
                <ThumbDownIcon size={15} />
              </button>
              <button className={`act ${speaking ? "copied" : ""}`} title="Read aloud" onClick={readAloud}>
                <SpeakerIcon size={15} />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
