import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AuthPage() {
  const [mode, setMode] = useState('sign_in'); // 'sign_in' | 'sign_up'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fn = mode === 'sign_in' ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Dumbbell className="text-orange-500" size={28} />
          <span className="text-xl font-bold text-neutral-900 dark:text-white">Gym Tracker</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4"
        >
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {mode === 'sign_in' ? 'Log in' : 'Create account'}
          </h1>

          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'sign_in' ? 'Log in' : 'Sign up'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
            className="w-full text-sm text-neutral-500 hover:text-orange-500"
          >
            {mode === 'sign_in' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
