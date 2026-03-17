import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const { token } = await response.json();
      localStorage.setItem('token', token);
      navigate('/');
    } else {
      alert('Login failed');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <form onSubmit={handleLogin} className="p-8 bg-zinc-900 rounded-xl border border-zinc-800 w-96">
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 mb-4 rounded-xl bg-zinc-800 border border-zinc-700" />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 mb-6 rounded-xl bg-zinc-800 border border-zinc-700" />
        <button type="submit" className="w-full p-3 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-500">Login</button>
        <p className="mt-4 text-center text-zinc-400 text-sm">
          Não tem uma conta? <a href="/register" className="text-emerald-500 hover:underline">Registre-se</a>
        </p>
      </form>
    </div>
  );
}
