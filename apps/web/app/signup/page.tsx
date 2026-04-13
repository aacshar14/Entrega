"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Logo from "@/components/logo";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

/**
 * SIGNUP PAGE V2.6.6 (CONVERSION-FIRST)
 * Focus: High speed, Zero technical friction, Strong trust indicators.
 */
export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: { 
            full_name: fullName.trim() 
          },
        },
      });

      if (signUpError) throw signUpError;

      // Deterministic flow: Move to verify or onboarding sequence
      router.push("/onboarding?status=verify_email");
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1D3146] flex flex-col items-center justify-center p-6 -mt-10 overflow-hidden relative">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#56CCF2]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#56CCF2]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-10 relative z-10">
        {/* Visual Hierarchy 1: Brand & Hook */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/" className="transition-transform hover:scale-105 active:scale-95 duration-200">
            <Logo variant="master" className="w-80 md:w-88 h-auto opacity-100" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Empieza a controlar tu negocio hoy
            </h1>
            <p className="text-white/60 font-medium text-lg">
              Registra ventas, clientes y deudas en minutos.
            </p>
          </div>
        </div>

        {/* Visual Hierarchy 2: Conversion Form */}
        <form 
          onSubmit={handleSignup} 
          className="bg-white/5 backdrop-blur-2xl p-10 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/10 space-y-8"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-[10px] font-black uppercase tracking-widest p-4 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              name="full_name_signup"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="off"
              placeholder="Nombre (opcional)"
              className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146] placeholder:text-slate-400"
            />
            
            <input
              type="email"
              name="email_signup"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
              placeholder="Correo electrónico"
              className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146] placeholder:text-slate-400"
            />

            <input
              type="password"
              name="password_signup"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              placeholder="Contraseña"
              className="w-full h-16 px-6 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-[#56CCF2]/20 transition-all font-bold text-[#1D3146] placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-[#56CCF2] text-[#1D3146] rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? "Creando cuenta..." : "Empieza gratis 7 días"}
              <ArrowRight size={18} />
            </button>
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
              <Zap size={14} className="text-[#56CCF2] animate-pulse" />
              <span>Sin tarjeta • Configuración en menos de 1 minuto</span>
            </div>
          </div>
        </form>

        {/* Visual Hierarchy 3: Support Logic & Trust */}
        <div className="text-center space-y-6">
          <div>
            <Link href="/login" className="text-sm font-bold text-white/50 hover:text-white transition-colors duration-200">
              ¿Ya tienes cuenta? <span className="text-white underline decoration-white/30 underline-offset-4">Inicia sesión</span>
            </Link>
          </div>
          
          <div className="pt-6 border-t border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
              Usado por negocios que venden por WhatsApp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
