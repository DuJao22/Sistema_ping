import { Outlet, Link } from 'react-router-dom';
import { Activity, Home, Menu, X } from 'lucide-react';
import React, { useState } from 'react';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight">Ping Monitor</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 hover:text-zinc-100">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 text-emerald-400 font-medium transition-colors">
            <Home className="w-5 h-5" />
            Dashboard
          </Link>
          {/* Future links can go here */}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-medium text-zinc-300">Overview</h2>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>

        <footer className="py-4 px-4 text-center text-xs text-zinc-500 border-t border-zinc-800 shrink-0">
          De todos os créditos a João Layon. Desenvolvedor Full Stack, Instagram profissional @Layon.Dev. Otimizado para hospedar no vercel.
        </footer>
      </main>
    </div>
  );
}
