"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Logo from "@/components/logo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) throw signInError;
      window.location.assign("/dashboard");
    } catch (err: any) {
      let msg = err.message || "Error en la autenticación";
      if (msg.toLowerCase().includes("data breach") || msg.toLowerCase().includes("leaked")) {
        msg = "Tu contraseña no es segura. Usa una más fuerte y única.";
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1D3146] flex flex-col items-center justify-center p-6 -mt-10">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/">
            <Logo variant="master" className="w-64 h-auto" />
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">Bienvenido de nuevo</h1>
          <p className="text-white/60 font-medium">Inicia sesión para controlar tu negocio.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-2xl p-10 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/10 space-y-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mb-2 ml-1">Email</label>
              <input
                type="email"
                name="user_email_identity"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mb-2 ml-1">Contraseña</label>
              <input
                type="password"
                name="user_password_identity"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146]"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-[10px] p-4 rounded-xl font-black uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-[#56CCF2] text-[#1D3146] rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? "Entrando..." : "Iniciar Sesión"}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="text-center space-y-4">
          <Link href="/signup" className="text-sm font-bold text-white/60 hover:text-white transition-colors">
            ¿No tienes cuenta? <span className="text-white underline">Crear cuenta</span>
          </Link>
          <div className="pt-2">
             <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
               ← Volver al inicio
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
