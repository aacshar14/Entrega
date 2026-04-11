"use client";

import React from "react";
import {
  Users,
  Building2,
  Activity,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Zap,
  BarChart3,
  AlertTriangle,
  Trash2,
  Settings,
  UserCheck,
  UserX,
  LucideIcon,
  History,
  MessageCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function PlatformOverview() {
  const [queueStats, setQueueStats] = React.useState<any>(null);
  const [capacity, setCapacity] = React.useState<any>(null);
  const [pressure, setPressure] = React.useState<any[]>([]);
  const [funnel, setFunnel] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [q, cap, pres, fun] = await Promise.all([
          apiRequest("admin/queue/stats", "GET"),
          apiRequest("admin/capacity/advisor", "GET"),
          apiRequest("admin/tenants/pressure", "GET"),
          apiRequest("admin/whatsapp/funnel", "GET"),
        ]);
        setQueueStats(q);
        setCapacity(cap);
        setPressure(pres || []);
        setFunnel(fun);
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return {
          text: "text-emerald-600",
          bg: "bg-emerald-100",
          iconColor: "text-emerald-400",
        };
      case "degraded":
        return {
          text: "text-amber-600",
          bg: "bg-amber-100",
          iconColor: "text-amber-400",
        };
      case "critical":
        return {
          text: "text-rose-600",
          bg: "bg-rose-100",
          iconColor: "text-rose-400",
        };
      default:
        return {
          text: "text-slate-600",
          bg: "bg-slate-100",
          iconColor: "text-slate-400",
        };
    }
  };

  const stats: any[] = [
    {
      label: "Backlog Actual",
      value: queueStats?.backlog?.toLocaleString() ?? "No data",
      icon: History,
      ...getStatusColor(queueStats?.backlog > 500 ? "degraded" : "healthy"),
    },
    ...(queueStats?.latency?.p95
      ? [
          {
            label: "Latencia p95",
            value: `${queueStats.latency.p95}s`,
            icon: Zap,
            ...getStatusColor(
              queueStats.latency.p95 > 10 ? "degraded" : "healthy",
            ),
          },
        ]
      : []),
    {
      label: "Infra Status",
      value:
        queueStats?.health_status === "healthy"
          ? "Estable"
          : queueStats?.health_status === "degraded"
            ? "Degradado"
            : "Crítico",
      icon: ShieldCheck,
      ...getStatusColor(queueStats?.health_status),
    },
    {
      label: "WhatsApp Funnel Today",
      value: `${funnel?.conversion_rate ?? 0}%`,
      icon: MessageCircle,
      text: "text-blue-600",
      bg: "bg-blue-50",
      subtext: `${funnel?.completed_today ?? 0} completados`,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Welcome */}
      <div>
        <h1 className="text-4xl font-black text-[#1D3146] tracking-tight">
          Platform Overview
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Global infrastructure and observability control center.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <div
                className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-6`}
              >
                <Icon className={stat.text} size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-[#1D3146]">
                  {stat.value}
                </p>
                {stat.subtext && (
                  <span className="text-[10px] font-bold text-slate-400 italic whitespace-nowrap">
                    {stat.subtext}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tenant Pressure Panel v1 */}
        {pressure && pressure.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-[#1D3146] flex items-center gap-3">
                <BarChart3 className="text-blue-500" size={24} />
                Tenant Pressure Panel
              </h3>
              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-3 py-1 rounded-full tracking-widest">
                Últimas 24h
              </span>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Tenant
                    </th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                      Volumen
                    </th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                      p95 Proc
                    </th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                      Status
                    </th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                      Backlog
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pressure.map((p, idx) => (
                    <tr
                      key={idx}
                      className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 font-medium text-xs"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${p.status === "hot" ? "bg-rose-500 animate-pulse" : p.status === "warning" ? "bg-amber-400" : "bg-emerald-500"}`}
                          ></div>
                          <span className="font-bold text-[#1D3146]">
                            {p.tenant_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="font-black text-slate-600">
                          {p.volume_24h.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span
                          className={`font-black ${p.p95_processing_ms > 5000 ? "text-amber-600" : "text-slate-400"}`}
                        >
                          {p.p95_processing_ms > 0
                            ? `${p.p95_processing_ms}ms`
                            : "---"}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${p.whatsapp_status === "connected" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                        >
                          {p.whatsapp_status}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${p.backlog > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-50 text-slate-300"}`}
                        >
                          {p.backlog}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Runtime Health Panel */}
        <div className="bg-[#0F172A] text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
            <Activity size={24} className="text-blue-400" />
            Runtime Health
          </h3>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-xs font-bold text-slate-400">
                Backlog Age
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                {queueStats?.oldest_pending_seconds
                  ? `${Math.floor(queueStats.oldest_pending_seconds / 60)}m`
                  : "0m"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-xs font-bold text-slate-400">
                Active Workers
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                {queueStats?.active_processing ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-xs font-bold text-slate-400">
                DB Utilization
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                {queueStats?.db_connections ?? "---"}
              </span>
            </div>
          </div>

          <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Capacity Advisor
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {capacity?.advice ||
                "Infrastructure operating within normal parameters."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
