# AI Chatbot

A full-stack AI chatbot. React frontend, Express backend, **Groq** (OpenAI-compatible
API) for generation, and SQLite for persistent conversation history. The API key
stays on the server and is never exposed to the browser. Replies stream token by
token over Server-Sent Events.

```
ai chatbot/
├── client/        React + Vite frontend
│   └── src/
│       ├── App.jsx            chat state, streaming, conversation switching
│       ├── api.js             backend client + SSE stream reader
│       └── components/        Sidebar, Message
└── server/        Express backend
    ├── index.js   REST + streaming chat routes
    ├── groq.js    Groq (OpenAI-compatible) wrapper (streaming)
    ├── db.js      SQLite persistence
    └── persona.js system prompt / assistant persona
```

## Prerequisites

- Node.js 18 or newer
- A Groq API key — free from <https://console.groq.com/keys>

## Setup

**1. Backend**

```bash
cd server
npm install
cp .env.example .env       # then edit .env and paste your GROQ_API_KEY
npm run dev                # http://localhost:8787
```

**2. Frontend** (in a second terminal)

```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to the backend,
so no extra config is needed.

## How it works

- The persona in `server/persona.js` is sent to Groq as a system message on
  every request, so the assistant's tone and guardrails stay consistent.
- Each user message and model reply is stored in `server/chat.db` (created
  automatically). Conversations appear in the sidebar and persist across
  restarts.
- `POST /api/conversations/:id/chat` streams the reply as SSE; the frontend
  appends tokens to the last bubble as they arrive.

## API

| Method | Route | Purpose |
| ------ | ----- | ------- |
| GET    | `/api/conversations` | list conversations |
| POST   | `/api/conversations` | create one |
| GET    | `/api/conversations/:id/messages` | message history |
| PATCH  | `/api/conversations/:id` | rename |
| DELETE | `/api/conversations/:id` | delete |
| POST   | `/api/conversations/:id/chat` | send a message, stream reply (SSE) |

## Configuration

Set in `server/.env`:

- `GROQ_API_KEY` — required
- `GROQ_MODEL` — defaults to `llama-3.3-70b-versatile`
- `PORT` — defaults to `8787`

## Production build

```bash
cd client && npm run build      # outputs client/dist
```

Serve `client/dist` from any static host and point it at the running backend
(add the backend origin to the fetch URLs or serve both behind one reverse
proxy).
