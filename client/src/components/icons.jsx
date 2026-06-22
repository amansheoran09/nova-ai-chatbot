// Lightweight inline SVG icon set (no external dependency). Each icon inherits
// `currentColor` and takes an optional size.
import React from "react";

const S = ({ size = 18, children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const PlusIcon = (p) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const CompassIcon = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </S>
);
export const SearchIcon = (p) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </S>
);
export const PencilIcon = (p) => (
  <S {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </S>
);
export const ShareIcon = (p) => (
  <S {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
  </S>
);
export const TrashIcon = (p) => (
  <S {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </S>
);
export const CopyIcon = (p) => (
  <S {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </S>
);
export const RefreshIcon = (p) => (
  <S {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </S>
);
export const ThumbUpIcon = (p) => (
  <S {...p}>
    <path d="M7 10v11H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16 21H7" />
  </S>
);
export const ThumbDownIcon = (p) => (
  <S {...p}>
    <path d="M17 14V3h3v11zM17 14l-4 7a2 2 0 0 1-3-2l1-5H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 8 3h9" />
  </S>
);
export const SpeakerIcon = (p) => (
  <S {...p}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </S>
);
export const GlobeIcon = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </S>
);
export const BulbIcon = (p) => (
  <S {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
  </S>
);
export const ChartIcon = (p) => (
  <S {...p}>
    <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-7" />
  </S>
);
export const PaperclipIcon = (p) => (
  <S {...p}>
    <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3l7.5-7.5" />
  </S>
);
export const HeadphoneIcon = (p) => (
  <S {...p}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="2.5" y="14" width="4" height="6" rx="1.5" />
    <rect x="17.5" y="14" width="4" height="6" rx="1.5" />
  </S>
);
export const SendIcon = (p) => (
  <S {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </S>
);
export const ChevronDownIcon = (p) => (
  <S {...p}>
    <path d="m6 9 6 6 6-6" />
  </S>
);
export const SidebarIcon = (p) => (
  <S {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </S>
);
export const CloseIcon = (p) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </S>
);
export const DownloadIcon = (p) => (
  <S {...p}>
    <path d="M12 3v12M7 11l5 4 5-4M5 21h14" />
  </S>
);
export const HistoryIcon = (p) => (
  <S {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </S>
);
export const CodeIcon = (p) => (
  <S {...p}>
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 6l-2 12" />
  </S>
);
export const SparkIcon = (p) => (
  <S {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </S>
);
export const BrainIcon = (p) => (
  <S {...p}>
    <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4.5A2.5 2.5 0 0 0 9 4Z" />
    <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1" />
  </S>
);
export const SettingsIcon = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 12.6 2 2 0 1 1 3 8.6h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8Z" />
  </S>
);
export const MemoryIcon = (p) => (
  <S {...p}>
    <rect x="5" y="5" width="14" height="14" rx="2" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </S>
);
export const NoteIcon = (p) => (
  <S {...p}>
    <path d="M4 4h16v12l-4 4H4z" />
    <path d="M16 20v-4h4M8 9h8M8 13h5" />
  </S>
);
export const GhostIcon = (p) => (
  <S {...p}>
    <path d="M5 21V11a7 7 0 0 1 14 0v10l-2.5-2-2.3 2-2.2-2-2.2 2-2.3-2Z" />
    <path d="M9 10h.01M15 10h.01" />
  </S>
);
export const LogoutIcon = (p) => (
  <S {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </S>
);
export const SunIcon = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </S>
);
export const MoonIcon = (p) => (
  <S {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </S>
);
