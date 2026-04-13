"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Logo from "@/components/logo";
import { PlayCircle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

export default function DemoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startDemo = async () => {
    setLoading(true);
    setError("");
    try {
      // Use standard demo credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: "demo@entrega.space",
        password: "demo_password_123",
      });

      if (signInError) {
         // If account doesn't exist, we show a message or redirect to signup
         throw new Error("La instancia de demo está reiniciándose. Por favor intenta en unos minutos o crea tu propia cuenta gratis.");
      }
      
      window.location.assign("/dashboard");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1D3146] flex flex-col items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#56CCF2] opacity-[0.05] rounded-full blur-[100px] -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#56CCF2] opacity-[0.05] rounded-full blur-[100px] -ml-32 -mb-32"></div>

      <div className="w-full max-w-2xl space-y-12 relative z-10 text-center">
        <div className="space-y-6">
          <Link href="/" className="inline-block">
            <Logo variant="master" className="w-64 h-auto brightness-110" />
          </Link>
          <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-none italic">
            Prueba el poder de <br />
            <span className="text-[#56CCF2]">Entrega</span> hoy.
          </h1>
          <p className="text-slate-400 text-xl font-medium max-w-lg mx-auto leading-relaxed">
            Entra a nuestra cuenta de demostración y descubre cómo controlar tus ventas, deudores e inventario en tiempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { title: "Ventas Reales", icon: Zap },
             { title: "Dashboard Vivo", icon: ShieldCheck },
             { title: "Control Total", icon: PlayCircle }
           ].map((item, i) => (
             <div key={i} className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 space-y-3">
                <item.icon className="text-[#56CCF2] mx-auto" size={24} />
                <p className="text-white text-xs font-black uppercase tracking-widest">{item.title}</p>
             </div>
           ))}
        </div>

        <div className="flex flex-col items-center space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-4 rounded-xl font-bold max-w-sm">
              {error}
            </div>
          )}

          <button
            onClick={startDemo}
            disabled={loading}
            className="h-20 px-16 bg-[#56CCF2] text-[#1D3146] rounded-[2.5rem] font-black uppercase tracking-widest text-lg shadow-2xl shadow-[#56CCF2]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
          >
            {loading ? "Accediendo..." : "Entrar a la Demo"}
            <ArrowRight size={24} />
          </button>

          <Link href="/signup" className="text-slate-500 text-sm font-bold hover:text-white transition-colors">
            O prefiere <span className="text-[#56CCF2] underline">crear tu propia cuenta gratis</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
