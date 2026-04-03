'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('[AUTH DEBUG] Attempting login for:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AUTH DEBUG] Login error:', error.message);
        setError(error.message);
        setLoading(false);
        return;
      }

      console.log('[AUTH DEBUG] Login success, forcing hard redirect to root...');
      // ✅ Usamos assign a nivel de ventana para asegurar re-bootstrap completo
      window.location.assign('/'); 
    } catch (err: any) {
      console.error('[AUTH DEBUG] Unexpected login exception:', err);
      setError(err?.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-[70vh]">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 flex flex-col gap-8">

        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">EntréGA</h2>
          <p className="text-slate-400 font-medium mt-1">Gestión Inteligente de Logística</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@entrega.space"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center font-bold tracking-tight bg-red-50 p-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#1D3146] text-[#56CCF2] p-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-100 hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {loading ? 'Preparando Entrada...' : 'Iniciar Sesión'}
        </button>

      </div>
    </div>
  );
}