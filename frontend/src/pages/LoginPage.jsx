import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { busy, isAuthenticated, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await login(form);
      const destination = location.state?.from
        ? `${location.state.from.pathname}${location.state.from.search || ''}`
        : '/';
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <span className="eyebrow">Welcome back</span>
        <h1>Pick up where your cart left off.</h1>
        <p>
          One small token connects your profile, cart, checkout, and order
          history across the MicroShop services.
        </p>
        <div className="auth-art" aria-hidden="true">
          <span>JWT</span>
          <small>signed · short-lived · delightfully adequate</small>
        </div>
      </section>
      <section className="auth-card">
        <h2>Log in</h2>
        <p>Use the account you registered with auth-service.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) =>
                setForm((value) => ({ ...value, email: event.target.value }))
              }
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(event) =>
                setForm((value) => ({ ...value, password: event.target.value }))
              }
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-full" disabled={busy} type="submit">
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}

