"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/lib/context/tenant-context";

export default function PaymentSuccessPage() {
  const { activeTenant, refreshTenant } = useTenant();
  const [isActivating, setIsActivating] = useState(true);

  useEffect(() => {
    // Poll for status update since webhook might take a second
    const interval = setInterval(async () => {
      await refreshTenant();
      if (activeTenant?.billing_status === "active_paid") {
        setIsActivating(false);
        clearInterval(interval);
      }
    }, 2000);

    // Timeout after 15s to not poll forever
    const timeout = setTimeout(() => {
      setIsActivating(false);
      clearInterval(interval);
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [activeTenant, refreshTenant]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center">
          {isActivating ? (
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center animate-pulse">
              <Loader2 className="animate-spin" size={40} />
            </div>
          ) : (
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center border-4 border-white shadow-lg">
              <CheckCircle size={40} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#1D3146] tracking-tight">
            {isActivating ? "Activando tu cuenta..." : "¡Pago Confirmado!"}
          </h1>
          <p className="text-slate-500 font-medium">
            {isActivating 
              ? "Estamos procesando tu suscripción de forma segura. Tardará unos segundos."
              : "Tu suscripción premium ha sido activada con éxito. Ya tienes acceso total."}
          </p>
        </div>

        {!isActivating && (
          <Link
            href="/dashboard"
            className="group h-16 w-full bg-[#1D3146] text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#1D3146]/20"
          >
            Ir al Dashboard
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
        
        {isActivating && (
            <div className="pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                    No cierres esta ventana
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
