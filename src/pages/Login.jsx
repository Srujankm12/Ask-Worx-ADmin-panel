import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

import { login } from '../api';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { EASE } from '../lib/motion';

/**
 * The sign-in sheet. Ink ground, drawing grid, the mark centred on it.
 *
 * The form authenticates for real: it posts an email address and a password to
 * /api/login and stores the session token that comes back, which every
 * subsequent API call sends as a Bearer header.
 *
 * Sign-in used to be a single shared password with no account behind it. There
 * are real accounts now — the server holds a bcrypt hash per address and hands
 * back a signed token that expires — so the field pair here is what the API
 * expects, not decoration.
 *
 * There is no way past this screen.
 */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      // Distinguish "wrong password" from "server unreachable" — they need
      // two completely different things from the person reading this.
      // Three different things need three different sentences: wrong details,
      // a malformed request, and a server that never answered.
      const status = err?.response?.status;
      const fromServer = err?.response?.data?.error;
      setError(
        status === 401 || status === 400
          ? fromServer || 'That email address and password do not match.'
          : 'Could not reach the server. Check your connection, then try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-paper-inverse" />

      {/* A single soft pool of light behind the mark. Decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne/[0.05] blur-[140px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="flex flex-col items-center text-center">
          {/* logo-mark is the evenly trimmed artwork — the master logo.png sits
              ~11% left of centre, so it must not be used where it is centred. */}
          <img src="/logo.png" alt="ASKworX" className="mb-8 h-16 w-auto object-contain" />

          <h1 className="font-heading text-4xl font-extrabold uppercase leading-none tracking-tight">
            <span className="titanium-sheen-dark">ASKworX</span>
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-white/15" />
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-300">
              WhatsApp Business Console
            </span>
            <span aria-hidden="true" className="h-px w-8 bg-white/15" />
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-champagne-600">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
                placeholder="you@askworx.in"
                required
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'signin-error' : undefined}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="border-white/15 bg-white/[0.04] text-champagne-100 placeholder:text-titanium-700 focus-visible:border-champagne focus-visible:ring-champagne/15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-champagne-600">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'signin-error' : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-white/15 bg-white/[0.04] text-champagne-100 placeholder:text-titanium-700 focus-visible:border-champagne focus-visible:ring-champagne/15"
              />
            </div>

            {error && (
              <p
                id="signin-error"
                role="alert"
                className="flex items-start gap-2 text-[13px] leading-relaxed text-[#E5766B]"
              >
                <AlertCircle className="mt-1 size-4 shrink-0" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting || !email || !password}
              className="group w-full bg-champagne text-ink hover:bg-champagne-100"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Signing in
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

        </div>

        <p className="mt-8 text-center font-mono text-[10px] tracking-[0.18em] uppercase text-titanium-700">
          ASKworX Smart Automation
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
