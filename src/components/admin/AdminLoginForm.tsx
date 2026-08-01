"use client";

import { FormEvent, useState } from "react";

/**
 * Minimal password gate for /admin. On success, reloads the page so the
 * server component re-checks the now-set session cookie and renders the
 * dashboard.
 */
export default function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Incorrect password.");
        setSubmitting(false);
        return;
      }

      window.location.reload();
    } catch {
      setError("Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#FDFBF7] dark:bg-[#181615] px-6 text-[#2C2825] dark:text-[#EDE8E1] transition-colors duration-300">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <h1 className="text-center text-lg font-medium text-[#2C2825] dark:text-[#EDE8E1]">Admin</h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="w-full border-b border-[#D8D2C9] dark:border-[#383330] bg-transparent py-2 text-center text-base text-[#2C2825] dark:text-[#EDE8E1] placeholder-[#8C827A]/50 outline-none transition-colors duration-300 ease-out focus:border-[#2C2825] dark:focus:border-[#EDE8E1]"
        />
        {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-full bg-[#2C2825] dark:bg-[#EDE8E1] py-3 text-sm font-medium text-[#FDFBF7] dark:text-[#181615] transition-all duration-300 ease-out disabled:opacity-30"
        >
          Enter
        </button>
      </form>
    </main>
  );
}
