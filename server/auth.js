// Auth helpers: password hashing (bcrypt), JWT signing/verifying, and an
// Express middleware that protects routes.

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const JWT_EXPIRES = "7d";

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET not set — using an insecure dev default.");
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Express middleware — requires a valid Bearer token, sets req.userId/req.email.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.email = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validCredentials(email, password) {
  if (!EMAIL_RE.test(email || "")) return "A valid email is required.";
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  return null;
}
