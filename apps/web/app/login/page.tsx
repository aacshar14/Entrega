'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        console.log('[AUTH DEBUG] Attempting registration for:', email);
        const origin = window.location.origin;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}`,
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        console.log('[AUTH DEBUG] Registration success.');
      } else {
        console.log('[AUTH DEBUG] Attempting login for:', email);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        console.log('[AUTH DEBUG] Login success.');
      }

      console.log('[AUTH DEBUG] Auth success, forcing redirect...');
      window.location.assign('/'); 
    } catch (err: any) {
      console.error('[AUTH DEBUG] Auth exception:', err);
      setError(err?.message || 'Error en la autenticación');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-[90vh]">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">

        <div className="text-center">
          <h2 className="text-4xl font-black text-[#1D3146] tracking-tighter italic">EntréGA</h2>
          <p className="text-slate-400 font-medium mt-2">{isRegister ? 'Crea tu cuenta de propietario' : 'Gestión Inteligente de Logística'}</p>
        </div>

        <div className="space-y-4">
          {isRegister && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1.5 ml-1">Nombre Completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Leonardo Gonzalez"
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#56CCF2] transition-colors font-bold text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1.5 ml-1">Email Corporativo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="leo@chocobites.mx"
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#56CCF2] transition-colors font-bold text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1.5 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#56CCF2] transition-colors font-bold text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="text-rose-500 text-[11px] text-center font-black uppercase tracking-widest bg-rose-50 p-4 rounded-2xl border border-rose-100 animate-in shake-1 duration-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-[#1D3146] text-[#56CCF2] p-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-[#1D3146]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (isRegister ? 'Registrar Negocio' : 'Iniciar Sesión')}
          </button>

          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#1D3146] transition-colors py-2"
          >
            {isRegister ? 'Ya tengo cuenta - Entrar' : '¿Nuevo aquí? - Crear Cuenta'}
          </button>
        </div>

      </div>
    </div>
  );
}