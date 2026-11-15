'use client';
import { useState, useEffect } from 'react';

const SESSION_KEY = 'admin_auth';
// Password is set via NEXT_PUBLIC_ADMIN_PASSWORD env var.
// Falls back to 'cakegame2024' if the env var is not set.
const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'cakegame2024';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check sessionStorage on mount (persists for the browser tab session)
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setAuthed(true);
    }
    setChecked(true);
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password. Try again.');
      setInput('');
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setInput('');
  }

  // Don't flash the login screen on first render
  if (!checked) return null;

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lift border border-cream-200 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <span className="mx-auto mb-3 grid place-items-center h-14 w-14 rounded-2xl bg-forest-900 text-cake-300 shadow-lift">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
              </svg>
            </span>
            <h2 className="text-3xl font-extrabold text-forest-800">Admin Access</h2>
            <p className="text-sm text-gray-500 mt-1">Enter the facilitator password to continue.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full border border-cream-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cake-300 focus:border-cake-400"
            />
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-cake-600 hover:bg-cake-700 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-sm"
            >
              Enter Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Logout bar */}
      <div className="flex justify-end px-6 pt-4">
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          🔓 Log out of admin
        </button>
      </div>
      {children}
    </div>
  );
}
