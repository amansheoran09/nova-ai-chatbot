import React, { useState } from "react";
import { SparkIcon } from "./icons.jsx";
import * as api from "../api.js";

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === "signup";

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const { token, user } = isSignup
        ? await api.signup(email.trim(), password, username.trim())
        : await api.login(email.trim(), password);
      api.setToken(token);
      onAuth(user);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <span className="logo"><SparkIcon size={22} /></span>
          <span>Nova&nbsp;AI</span>
        </div>

        <h1 className="auth-title">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-sub">
          {isSignup ? "Sign up to start chatting with Nova." : "Sign in to continue."}
        </p>

        {isSignup && (
          <>
            <label className="auth-label">Username</label>
            <input
              className="auth-input"
              type="text"
              autoComplete="username"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
            />
          </>
        )}

        <label className="auth-label">Email</label>
        <input
          className="auth-input"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="auth-label">Password</label>
        <input
          className="auth-input"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setError(null);
            }}
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </form>
    </div>
  );
}
