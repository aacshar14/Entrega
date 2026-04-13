"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Logo from "@/components/logo";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: { full_name: fullName },
        },
      });

      if (signUpError) throw signUpError;
      
      router.push("/onboarding?status=verify_email");
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EBEEF2] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/">
            <Logo variant="master" className="w-64 h-auto" />
          </Link>
          <h1 className="text-3xl font-black text-[#1D3146] tracking-tight">Crea tu cuenta gratis</h1>
          <p className="text-slate-500 font-medium">Empieza a controlar tu negocio en 3 minutos.</p>
        </div>

        <form onSubmit={handleSignup} className="bg-[#1D3146] p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/5 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mb-2 ml-1">Nombre Completo</label>
              <input
                type="text"
                name="full_name_signup"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mb-2 ml-1">Email</label>
              <input
                type="email"
                name="email_signup"
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
                name="password_signup"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder=""
                className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146]"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-4 rounded-xl font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-[#56CCF2] text-[#1D3146] rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? "Creando cuenta..." : "Prueba gratis 7 días"}
            <ArrowRight size={18} />
          </button>

          <p className="text-center text-[10px] text-white/40 font-bold uppercase tracking-widest">
            Al registrarte aceptas nuestros <Link href="/terms" className="underline text-[#56CCF2]">Términos</Link>
          </p>
        </form>

        <div className="text-center">
          <Link href="/login" className="text-sm font-bold text-[#1D3146]/60 hover:text-[#1D3146] transition-colors">
            ¿Ya tienes cuenta? <span className="text-[#1D3146] underline">Inicia Sesión</span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 pt-4 opacity-40">
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1D3146]">
             <ShieldCheck size={14} /> Sin tarjeta
           </div>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1D3146]">
             <Zap size={14} /> Setup instantáneo
           </div>
        </div>
      </div>
    </div>
  );
}
