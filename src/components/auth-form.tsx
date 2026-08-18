'use client';

import { useState } from 'react';
import { signIn, signUp } from '@/lib/auth';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode: initialMode }: AuthFormProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Check your email for the confirmation link!');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          window.location.href = '/profile';
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-card__label">
          <span aria-hidden="true"></span>
          {mode === 'login' ? 'Welcome back' : 'Get started'}
        </p>
        <h1 className="auth-card__title">
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email" className="auth-field__label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="auth-field__input"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-field__label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="auth-field__input"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div
              className="auth-error"
              role="status"
              style={{
                background: 'rgba(76, 191, 131, 0.1)',
                borderColor: 'rgba(76, 191, 131, 0.25)',
                color: '#6fd9a0',
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <a href="/auth/signup">Sign up</a>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <a href="/auth/login">Sign in</a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
