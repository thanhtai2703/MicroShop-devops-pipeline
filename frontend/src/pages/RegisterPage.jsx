import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function RegisterPage() {
  const { busy, isAuthenticated, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      await register(form);
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
      <section className="auth-story register-story">
        <span className="eyebrow">Join MicroShop</span>
        <h1>One account. Several tiny services.</h1>
        <p>
          Register once, then watch identity travel safely from the gateway to
          every protected part of the shop.
        </p>
        <div className="auth-art" aria-hidden="true">
          <span>01</span>
          <small>account → token → cart → order</small>
        </div>
      </section>
      <section className="auth-card">
        <h2>Create an account</h2>
        <p>No newsletter. No real payment details. Just the learning flow.</p>
        <form onSubmit={submit}>
          <label>
            Name
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(event) =>
                setForm((value) => ({ ...value, name: event.target.value }))
              }
            />
          </label>
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
              autoComplete="new-password"
              value={form.password}
              onChange={(event) =>
                setForm((value) => ({ ...value, password: event.target.value }))
              }
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-full" disabled={busy} type="submit">
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </section>
    </div>
  );
}

