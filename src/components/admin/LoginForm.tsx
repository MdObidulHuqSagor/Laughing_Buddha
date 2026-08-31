"use client";

import { useState } from "react";
import { LogoLockup } from "@/components/Logo";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("owner@laughingbuddha.com.bd");
  const [password, setPassword] = useState("buddha123");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setBlocked(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      // Confirm the browser really kept the cookie before navigating, so a
      // blocked cookie shows a real explanation instead of a silent bounce
      // back to this page.
      const check = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const session = (await check.json()) as { authenticated?: boolean };

      if (!session.authenticated) {
        setBlocked(true);
        return;
      }

      // A full document load guarantees the server re-renders with the cookie.
      window.location.assign(next);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-3xl border border-gold-500/25 bg-chili-700/40 p-8 backdrop-blur"
    >
      <div className="text-center">
        <LogoLockup width={180} className="mx-auto" priority />
        <h1 className="font-display mt-3 text-2xl font-semibold text-cream">Staff sign in</h1>
        <p className="mt-1 text-xs text-cream/60">Gulshan operations console</p>
      </div>

      <label className="mt-6 block">
        <span className="text-[11px] font-semibold tracking-wider text-gold-400 uppercase">
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-cream/20 bg-chili-900/50 px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/40 focus:border-gold-400 focus:outline-none"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[11px] font-semibold tracking-wider text-gold-400 uppercase">
          Password
        </span>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-cream/20 bg-chili-900/50 px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/40 focus:border-gold-400 focus:outline-none"
        />
      </label>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-200">{error}</p>
      )}

      {blocked && (
        <div className="mt-4 rounded-xl bg-amber-500/15 px-3 py-3 text-xs leading-relaxed text-amber-100">
          <p className="font-semibold">Your password was correct, but this browser blocked the session cookie.</p>
          <p className="mt-1.5">
            That normally happens when the dashboard is shown inside an embedded frame with
            third-party cookies turned off.
          </p>
          <a
            href={next}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block rounded-full bg-gold-500 px-3 py-1.5 font-semibold text-chili-900"
          >
            Open the dashboard in a new tab →
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-gold-500 py-3 text-sm font-semibold tracking-wide text-chili-900 uppercase transition hover:bg-gold-400 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-cream/45">
        Demo credentials are pre-filled: owner@laughingbuddha.com.bd / buddha123
      </p>
    </form>
  );
}
