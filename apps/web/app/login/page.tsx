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

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setError('¡Cuenta creada! Revisa tu email para confirmar.');
        setLoading(false);
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        
        if (error) throw error;
        window.location.assign('/'); 
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#EBEEF2]">
      <form 
        onSubmit={handleAuth}
        className="bg-[#1D3146] p-10 md:p-14 rounded-[3rem] shadow-2xl w-full max-w-md border border-white/5 flex flex-col gap-10 animate-in fade-in zoom-in-95 duration-700"
      >
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="Entrega Logo" className="w-56 h-auto drop-shadow-2xl" />
          <p className="text-[#56CCF2] font-black uppercase tracking-[0.2em] text-[10px] text-center mt-2">
            {isRegister ? 'Crea tu cuenta de propietario' : 'Gestión Inteligente de Logística'}
          </p>
        </div>

        <div className="space-y-6">
          {isRegister && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mb-2 ml-1">Nombre Completo</label>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Leonardo Gonzalez"
                className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146] placeholder:text-slate-300"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mb-2 ml-1">Email Corporativo</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="leo@chocobites.mx"
              className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146] placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mb-2 ml-1">Password</label>
            <input
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146] placeholder:text-slate-300"
            />
          </div>
        </div>

        {error && (
          <div className="text-[#56CCF2] text-[10px] text-center font-black uppercase tracking-widest bg-white/5 p-5 rounded-2xl border border-white/5 animate-in shake-1 duration-300">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-[#1D3146] h-16 md:h-20 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (isRegister ? 'Registrar Negocio' : 'Iniciar Sesión')}
          </button>

          <button 
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-[10px] font-black uppercase tracking-widest text-[#56CCF2]/50 hover:text-[#56CCF2] transition-colors py-2"
          >
            {isRegister ? 'Ya tengo cuenta - Entrar' : '¿Nuevo aquí? - Crear Cuenta'}
          </button>
        </div>
      </form>
    </div>
  );
}