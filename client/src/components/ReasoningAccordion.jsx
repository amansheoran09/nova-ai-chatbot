import React, { useState } from "react";
import { ChevronDownIcon, BrainIcon } from "./icons.jsx";

// Shows a collapsible "Thought for X seconds" accordion above an AI reply.
// While `reasoning.thinking` is true, a glowing spinner is shown instead.
export default function ReasoningAccordion({ reasoning }) {
  const [open, setOpen] = useState(false);
  const { thinking, seconds, text } = reasoning;

  return (
    <div className="reasoning">
      <button className={`reasoning-head ${open ? "open" : ""}`} onClick={() => !thinking && setOpen((v) => !v)}>
        {thinking ? <span className="spinner" /> : <BrainIcon size={16} />}
        {thinking ? "Thinking…" : `Thought for ${seconds} second${seconds === 1 ? "" : "s"}`}
        {!thinking && <span className="chev"><ChevronDownIcon size={15} /></span>}
      </button>
      {open && !thinking && (
        <div className="reasoning-body">{text || "Worked through the request step by step before composing the final answer."}</div>
      )}
    </div>
  );
}
