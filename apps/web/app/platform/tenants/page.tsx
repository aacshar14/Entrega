"use client";

import React, { useState } from "react";
import {
  Building2,
  Search,
  ArrowRight,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  History,
  ShieldAlert,
  Zap,
  Clock,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Phone,
} from "lucide-react";
import { useTenant } from "@/lib/context/tenant-context";
import { apiRequest } from "@/lib/api";
import Link from "next/link";
import ConfirmModal from "@/components/confirm-modal";

export default function PlatformTenants() {
  const { memberships, switchTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = memberships.filter((m) => {
    if (!m.tenant) return false;
    const name = m.tenant.name?.toLowerCase() || "";
    const slug = m.tenant.slug?.toLowerCase() || "";
    const query = searchTerm.toLowerCase();
    const matchesSearch = !query || name.includes(query) || slug.includes(query);
    if (statusFilter === "all") return matchesSearch;
    const ws = (m.tenant as any).whatsapp_status;
    return matchesSearch && ws === statusFilter;
  });

  const runBillingAction = async (tenantId: string, payload: any) => {
    try {
      await apiRequest(`admin/tenants/${tenantId}/billing-control`, "POST", payload);
      window.location.reload();
    } catch (err) {
      console.error("Billing update failed", err);
      alert("Error al actualizar facturación");
    }
  };

  const renderWhatsAppStatus = (tenant: any) => {
    const s = tenant.whatsapp_status;
    const display = tenant.whatsapp_display_number;

    // 🛡️ Mapping per V1.6 requirements
    if (s === "connected" || s === "verified") {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#25D366]"></div>
            <span className="text-[10px] font-black uppercase text-emerald-600">
              Conectado
            </span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 font-mono">
            {display || "Meta Cloud API"}
          </p>
        </div>
      );
    }

    if (
      s === "pending" ||
      (tenant.onboarding_step && tenant.onboarding_step < 4)
    ) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-amber-600">
              En Proceso
            </span>
          </div>
          <button className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1">
            <ArrowRight size={10} /> Continuar
          </button>
        </div>
      );
    }

    if (s === "token_expired" || s === "disconnected") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
            <span className="text-[10px] font-black uppercase text-rose-600">
              Error ⚠️
            </span>
          </div>
          <button className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-md border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-1">
            <RefreshCw size={10} /> Reconectar
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter italic">
            No Iniciado
          </span>
        </div>
        <button className="text-[9px] font-black bg-slate-50 text-slate-500 px-2 py-1 rounded-md border border-slate-100 hover:bg-slate-100 transition-all">
          Activar
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
            <Building2 className="text-amber-500" size={32} />
            Tenant Registry
          </h1>
          <p className="text-slate-500 font-medium italic mt-1">
            {memberships.length} negocios registrados.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar negocio..."
            className="w-full pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border-none font-bold text-[#1D3146]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-50 border-none text-[10px] font-black rounded-xl px-6 py-4 tracking-widest uppercase w-full md:w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">TODOS</option>
          <option value="connected">CONECTADOS</option>
          <option value="pending">EN PROCESO</option>
          <option value="token_expired">FALLIDOS</option>
          <option value="not_connected">NO INICIADOS</option>
        </select>
      </div>

      {/* Modern Card View (Mobile Optimized Table) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((m) => (
          <div
            key={m.tenant.id}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-10 group hover:border-[#56CCF2]/30 transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
              <div className="flex items-center gap-6 flex-1 min-w-[300px]">
                <div className="w-16 h-16 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center text-xl font-black text-slate-300 group-hover:border-amber-400 group-hover:bg-amber-50 transition-all">
                  {m.tenant.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-[#1D3146] tracking-tight">
                    {m.tenant.name}
                  </h4>
                  <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-tighter">
                    {m.tenant.slug}
                    {m.tenant.display_code && ` • ${m.tenant.display_code}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-12 lg:flex-1 justify-between lg:justify-end">
                <div className="space-y-1.5 min-w-[120px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Billing Plan
                  </p>
                  <p
                    className={`text-xs font-black uppercase mb-1 ${
                      m.tenant.billing?.effective_status === "active_paid" ? "text-emerald-500" : 
                      m.tenant.billing?.effective_status === "trial_active" ? "text-blue-500" :
                      m.tenant.billing?.effective_status === "grace" ? "text-purple-500" :
                      "text-rose-500"
                    }`}
                  >
                    {m.tenant.billing?.effective_status?.replace("_", " ") || "TRIAL"}
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    {/* PLAN CONTROL */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => runBillingAction(m.tenant.id, { plan_code: "basic_monthly" })}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black transition-all ${m.tenant.plan_code === "basic_monthly" ? "bg-slate-200 text-slate-800" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                      >
                        BASIC
                      </button>
                      <button
                        onClick={() => runBillingAction(m.tenant.id, { plan_code: "pro_monthly" })}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black transition-all ${m.tenant.plan_code === "pro_monthly" ? "bg-blue-100 text-blue-600" : "bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600"}`}
                      >
                        PRO
                      </button>
                      <button
                        onClick={() => runBillingAction(m.tenant.id, { plan_code: "premium_monthly" })}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black transition-all ${m.tenant.plan_code === "premium_monthly" ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600"}`}
                      >
                        PREMIUM
                      </button>
                    </div>

                    {/* TIME CONTROL */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => runBillingAction(m.tenant.id, { trial_extension_days: 7 })}
                        className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-[8px] font-black hover:bg-blue-600 hover:text-white transition-all"
                        title="Add 7 Trial Days"
                      >
                        +7D Trial
                      </button>
                      <button
                        onClick={() => runBillingAction(m.tenant.id, { grace_extension_days: 7 })}
                        className="px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded text-[8px] font-black hover:bg-purple-600 hover:text-white transition-all"
                        title="Add 7 Grace Days"
                      >
                        +7D Gracia
                      </button>
                      <button
                        onClick={() => runBillingAction(m.tenant.id, { grace_extension_days: 10 })}
                        className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[8px] font-black hover:bg-purple-800 hover:text-white transition-all"
                        title="Add 10 Grace Days"
                      >
                        +10D Gracia
                      </button>
                    </div>

                    {/* SUSPEND CONTROL */}
                    <button
                      onClick={() => runBillingAction(m.tenant.id, { is_blocked: !m.tenant.is_blocked, block_reason: m.tenant.is_blocked ? null : "manual_suspension" })}
                      className={`px-1.5 py-1 rounded text-[8px] font-black transition-all ${m.tenant.is_blocked ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white" : "bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white"}`}
                    >
                      {m.tenant.is_blocked ? "Reactivar" : "Suspender"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 min-w-[140px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    WhatsApp / Onboarding
                  </p>
                  {renderWhatsAppStatus(m.tenant)}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => switchTenant(m.tenant.id)}
                    className="flex items-center gap-2 px-6 py-4 bg-[#1D3146] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#1D3146]/20 transition-all hover:scale-105 active:scale-95"
                  >
                    Entrar <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
