'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const from = searchParams.get('from') || '/';
        window.location.href = from;
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password. Please try again.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="password"
          className="text-sm text-muted block mb-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-dark)',
            color: 'var(--text-main)',
            fontFamily: 'inherit',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--primary-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
        />
      </div>

      {error && (
        <p
          style={{
            color: 'var(--danger)',
            fontSize: '0.875rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(239, 68, 68, 0.08)',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
        style={{ marginTop: '0.5rem', width: '100%' }}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2.5rem',
        }}
      >
        {/* Logo / Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            className="text-gradient"
            style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}
          >
            Dollar Vault
          </div>
          <p className="text-muted" style={{ fontSize: '0.95rem' }}>
            Sign in to access your financial dashboard
          </p>
        </div>

        <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
          <LoginForm />
        </Suspense>

        <p
          className="text-muted"
          style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '1.5rem' }}
        >
          🔒 Your data stays on your device
        </p>
      </div>
    </div>
  );
}
