// SQLite persistence for users, conversations, and messages.
// Conversations are owned by a user; all conversation/message access is scoped.

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "chat.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    user_id    TEXT,
    title      TEXT NOT NULL DEFAULT 'New conversation',
    scratchpad TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content         TEXT NOT NULL,
    created_at      INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, created_at);
`);

// Migration: older databases may have a conversations table without user_id.
// This must run BEFORE creating any index that references user_id.
const cols = db.prepare(`PRAGMA table_info(conversations)`).all();
if (!cols.some((c) => c.name === "user_id")) {
  db.exec(`ALTER TABLE conversations ADD COLUMN user_id TEXT`);
}

// Migration: add username to users if an older users table lacks it.
const userCols = db.prepare(`PRAGMA table_info(users)`).all();
if (!userCols.some((c) => c.name === "username")) {
  db.exec(`ALTER TABLE users ADD COLUMN username TEXT`);
}

// Migration: add scratchpad to conversations if missing.
if (!cols.some((c) => c.name === "scratchpad")) {
  db.exec(`ALTER TABLE conversations ADD COLUMN scratchpad TEXT NOT NULL DEFAULT ''`);
}

// Now safe to index user_id (column is guaranteed to exist).
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_conversations_user
    ON conversations (user_id, updated_at);
`);

const now = () => Date.now();

// --- Users ---------------------------------------------------------------

export function createUser(email, passwordHash, username) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, email, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, email, username, passwordHash, now());
  return { id, email, username };
}

export function getUserByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

export function getUserById(id) {
  return db.prepare(`SELECT id, email, username, created_at FROM users WHERE id = ?`).get(id);
}

// --- Conversations (scoped to a user) -----------------------------------

export function listConversations(userId) {
  return db
    .prepare(
      `SELECT id, title, created_at, updated_at
       FROM conversations
       WHERE user_id = ?
       ORDER BY updated_at DESC`
    )
    .all(userId);
}

export function createConversation(userId, title = "New conversation") {
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, title, ts, ts);
  return { id, title, created_at: ts, updated_at: ts };
}

// Returns the conversation only if it belongs to the given user.
export function getConversation(id, userId) {
  return db
    .prepare(
      `SELECT id, title, created_at, updated_at
       FROM conversations WHERE id = ? AND user_id = ?`
    )
    .get(id, userId);
}

export function renameConversation(id, userId, title) {
  db.prepare(
    `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?`
  ).run(title, now(), id, userId);
}

// Scratchpad: shared editable markdown per conversation.
export function getScratchpad(id, userId) {
  const row = db
    .prepare(`SELECT scratchpad FROM conversations WHERE id = ? AND user_id = ?`)
    .get(id, userId);
  return row ? row.scratchpad || "" : null; // null => not found / not owned
}

export function setScratchpad(id, userId, content) {
  const info = db
    .prepare(`UPDATE conversations SET scratchpad = ? WHERE id = ? AND user_id = ?`)
    .run(content ?? "", id, userId);
  return info.changes > 0;
}

export function deleteConversation(id, userId) {
  const owned = getConversation(id, userId);
  if (!owned) return;
  db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(id);
  db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
}

export function getMessages(conversationId) {
  return db
    .prepare(
      `SELECT id, role, content, created_at
       FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
    )
    .all(conversationId);
}

export function addMessage(conversationId, role, content) {
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, conversationId, role, content, ts);
  db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(ts, conversationId);
  return { id, role, content, created_at: ts };
}

export default db;
