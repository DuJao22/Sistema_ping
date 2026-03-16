import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Login({ setAuth }: { setAuth: (auth: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuth(true);
        navigate('/');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Activity className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-100">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-zinc-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-300">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  className="block w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  className="block w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-xl border border-transparent bg-emerald-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors"
              >
                Sign in
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-zinc-900 px-2 text-zinc-400">New to Ping Monitor?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="flex w-full justify-center rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 px-4 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-700 transition-colors"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
