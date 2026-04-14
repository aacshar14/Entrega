"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Banknote,
  AlertCircle,
  Package,
  ChevronRight,
  Handshake,
  Loader2,
  Users,
  Wallet,
  Filter,
  Activity,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useTenant } from "@/lib/context/tenant-context";
import Link from "next/link";

const DASHBOARD_VERSION = "V6.3.0";

interface DashboardStats {
  customer_count: number;
  product_count: number;
  total_payments: number;
  total_debt: number;
  force_monthly_in: number;
  force_monthly_out: number;
  total_stock_hq: number;
  total_stock_outside: number;
  total_stock_global: number;
  debtor_count: number;
  low_stock_count: number;
}

interface StockItem {
  name: string;
  quantity: number;
  quantity_outside: number;
  total: number;
}

interface DashboardData {
  stats: DashboardStats;
  stock: Array<StockItem>;
  debtors: Array<{ name: string; amount: number }>;
  recent_activity?: Array<{
    id: string;
    customer_name: string;
    description: string;
    quantity: number;
    type: string;
    amount: number;
    created_at: string;
  }>;
  welcome_message: string;
  business_name: string;
  billing: {
    status: string;
    days_remaining: number;
    is_expired: boolean;
    trial_ends_at: string | null;
    grace_ends_at: string | null;
    subscription_ends_at: string | null;
    total_orders: number;
    sales_today: number;
  };
}

export default function Dashboard() {
  const { activeTenant, user } = useTenant();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest(`dashboard?_t=${Date.now()}`, "GET", null, activeTenant.id);
      setData(res);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setError(
        "No se pudieron cargar los datos del dashboard. Verifica tu conexión.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTenant) {
      fetchDashboard();
    }
  }, [activeTenant, fetchDashboard]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="animate-spin text-[#56CCF2]" size={48} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          Actualizando datos reales...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center">
          <AlertCircle size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-[#1D3146]">
            Error de Conexión
          </h3>
          <p className="text-slate-500 font-medium max-w-xs">
            {error || "El dashboard no está disponible en este momento."}
          </p>
        </div>
        <button
          onClick={() => fetchDashboard()}
          className="h-12 px-8 bg-[#1D3146] text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          Reintentar actualización
        </button>
      </div>
    );
  }

  // Derivaciones de Stock Reales (No usar stock_status fantasma)
  const stockItems = data?.stock || [];
  const totalInWarehouse = stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalOutside = stockItems.reduce((sum, item) => sum + (item.quantity_outside || 0), 0);
  const totalInventory = totalInWarehouse + totalOutside;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 px-4 md:px-0">
      {/* Trial / Expiry Banners */}
      {data.billing.status === "suspended" ? (
        <div className="p-10 rounded-[2.5rem] bg-rose-600 text-white shadow-2xl shadow-rose-500/30 flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-rose-400/20 animate-in slide-in-from-top duration-700">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-3xl font-black tracking-tight">
              Tu cuenta está suspendida
            </h3>
            <p className="text-rose-100 font-medium">
              Activa tu plan para recuperar acceso completo al dashboard. Tu
              operación por WhatsApp sigue activa.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="h-16 px-12 bg-white text-rose-600 rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl"
          >
            Activar cuenta
          </Link>
        </div>
      ) : data.billing.status === "grace" ? (
        <div className="p-8 rounded-[2rem] bg-purple-600 text-white shadow-xl shadow-purple-500/20 flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-purple-400/30 animate-pulse">
          <div className="flex items-center gap-4">
            <AlertCircle size={32} />
            <div>
              <p className="text-xl font-black tracking-tight">
                Periodo de Gracia
              </p>
              <p className="text-purple-100 text-sm font-medium">
                Te quedan {data.billing.days_remaining}{" "}
                {data.billing.days_remaining === 1 ? "día" : "días"} para
                activar tu plan antes de la suspensión.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="h-12 px-8 bg-white text-purple-600 rounded-xl flex items-center justify-center font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
          >
            Activar Plan Ahora
          </Link>
        </div>
      ) : (
        data.billing.status === "trial" &&
        data.billing.days_remaining <= 3 && (
          <div className="p-6 rounded-[2rem] bg-amber-500 text-white shadow-xl shadow-amber-500/20 flex items-center justify-between gap-6 border-2 border-amber-300/30">
            <p className="font-bold flex items-center gap-3">
              <AlertCircle size={20} className="animate-pulse" />
              Estás en tu periodo gratis. Te quedan{" "}
              {data.billing.days_remaining}{" "}
              {data.billing.days_remaining === 1 ? "día" : "días"}.
            </p>
            <Link
              href="/onboarding"
              className="text-xs font-black uppercase tracking-widest bg-white/20 px-6 py-3 rounded-xl backdrop-blur-md hover:bg-white/30 transition-all"
            >
              Asegurar mi cuenta
            </Link>
          </div>
        )
      )}

      {/* Operational Trigger Prompts */}
      {!data.billing.is_expired && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.billing?.total_orders ?? 0) >= 5 && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-700 animate-in zoom-in duration-500">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center grow-0 shrink-0">
                <Truck size={20} />
              </div>
              <p className="text-sm font-black uppercase tracking-tight">
                Ya estás usando Entrega para vender ({data.billing?.total_orders ?? 0}{" "}
                envíos)
              </p>
            </div>
          )}
          {(data.billing?.sales_today ?? 0) > 0 && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 text-blue-700 animate-in zoom-in duration-700">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center grow-0 shrink-0">
                <Banknote size={20} />
              </div>
              <p className="text-sm font-black uppercase tracking-tight">
                Hoy generaste ${(data.billing?.sales_today ?? 0).toLocaleString()} con
                Entrega
              </p>
            </div>
          )}
        </div>
      )}

      {/* Welcome Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#1D3146] tracking-tighter flex items-center gap-3">
            {data.welcome_message}
            <span className="text-[10px] bg-orange-500 text-white px-3 py-1 rounded-full uppercase tracking-widest shrink-0">
              {DASHBOARD_VERSION}
            </span>
          </h1>
          <p className="text-slate-500 font-bold italic mt-2 text-lg">
            Hoy en {data.business_name || "Entrega"}
          </p>
        </div>
      </div>

      <div
        className={`space-y-8 relative ${data.billing.is_expired ? "overflow-hidden rounded-[3rem]" : ""}`}
      >
        {/* Soft Paywall Overlay */}
        {data.billing.is_expired && (
          <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center">
            <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
              <div className="w-24 h-24 bg-rose-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/40 rotate-6">
                <AlertCircle size={48} />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-[#1D3146] tracking-tight">
                  Acceso Restringido
                </h2>
                <p className="text-slate-600 font-bold leading-relaxed">
                  Para ver tus métricas detalladas, inventario y reportes,
                  necesitas activar tu suscripción.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <Link
                  href="/onboarding"
                  className="h-16 bg-[#1D3146] text-white rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-sm shadow-2xl shadow-[#1D3146]/30 hover:scale-105 active:scale-95 transition-all"
                >
                  Activar suscripción ahora
                </Link>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center justify-center gap-2">
                  <Truck size={12} /> WhatsApp sigue funcionando para tu
                  operación
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Welcome Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="px-3 py-1 bg-[#56CCF2]/10 text-[#56CCF2] text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                Dashboard Operativo
              </span>
              <div className="h-[1px] w-8 bg-slate-200"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-[#1D3146] tracking-tight">
              ¡Hola, {(user?.full_name ?? "Admin").split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              Aquí tienes el resumen de <span className="text-[#1D3146] font-bold">{activeTenant?.name ?? "tu negocio"}</span> para hoy.
            </p>
          </div>

          <div className="flex items-center gap-4">
             <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#56CCF2]/10 rounded-2xl flex items-center justify-center">
                  <Activity size={20} className="text-[#56CCF2]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Actividad</p>
                  <p className="text-sm font-bold text-[#1D3146]">Sistema Live</p>
                </div>
             </div>
          </div>
        </header>

        {/* 4 Cards Principales */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-3xl p-7 bg-gradient-to-br from-[#1D3146] to-[#2B4764] text-white flex flex-col justify-between h-44 shadow-2xl shadow-[#1D3146]/20 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                  Clientes Registrados
                </p>
                <h3 className="text-5xl font-black mt-2">
                  {data.stats?.customer_count ?? 0}
                </h3>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <Users size={24} className="text-[#56CCF2]" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-[#56CCF2] flex items-center gap-1 uppercase tracking-widest">
              Total Cartera Activa
            </p>
          </div>

          <div className="rounded-3xl p-7 bg-gradient-to-br from-[#56CCF2] to-[#45B8E0] text-white flex flex-col justify-between h-44 shadow-2xl shadow-[#56CCF2]/20 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                  Pagos Recibidos (Histórico)
                </p>
                <h3 className="text-4xl font-black mt-2">
                  ${(data.stats?.total_payments ?? 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <Banknote size={24} />
              </div>
            </div>
            <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest">
              Flujo de Caja Total
            </p>
          </div>

          <div className="rounded-3xl p-7 bg-gradient-to-br from-rose-500 to-rose-600 text-white flex flex-col justify-between h-44 shadow-2xl shadow-rose-500/20 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                  Saldo Pendiente (Adeudos)
                </p>
                <h3 className="text-4xl font-black mt-2">
                  ${(data.stats?.total_debt ?? 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <Wallet size={24} />
              </div>
            </div>
            <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest italic flex items-center gap-1">
              <AlertCircle size={12} /> {data.stats?.debtor_count ?? 0} Cuentas por Cobrar
            </p>
          </div>

          {/* Inventario Maestro (Live) */}
          <div className="rounded-[2.5rem] p-8 bg-gradient-to-br from-orange-500 to-amber-600 text-white flex flex-col justify-between min-h-[14rem] shadow-2xl shadow-orange-500/30 transition-all hover:scale-[1.01] border-t border-white/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100">
                  Estado del Stock
                </p>
                <div className="flex flex-col mt-2">
                   <div className="flex items-end gap-2">
                    <span className="text-4xl font-black italic">{totalInWarehouse.toLocaleString()}</span>
                    <span className="text-[10px] font-bold opacity-60 mb-1">EN BODEGA</span>
                  </div>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-4xl font-black text-white/90">{totalOutside.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-orange-200 mb-1">EN LA CALLE</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <Truck size={24} />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 mt-2 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-black opacity-60 uppercase">Total Sistema</span>
                <span className="text-xl font-black">{totalInventory.toLocaleString()}</span>
              </div>
              <Link 
                href="/stock"
                className="bg-white text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 transition-colors shadow-lg shadow-orange-900/20"
              >
                Stock
              </Link>
            </div>
          </div>
        </section>

        {/* Operational Intelligence Center (Orange Banner) */}
        <section className="mb-10">
          <div className="bg-gradient-to-br from-[#FF9F1C] to-[#FF4B2B] rounded-[2.5rem] p-1 shadow-2xl shadow-orange-200/50">
            <div className="bg-white/10 backdrop-blur-xl rounded-[2.3rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Package size={120} />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex-1">
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] opacity-80 mb-2">
                    Inteligencia Operativa (Mensual)
                  </h2>
                  <div className="flex items-end gap-3">
                    <span className="text-6xl font-black tracking-tighter">
                      {data.operational_flow?.monthly_out?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-xl font-bold opacity-80 pb-2 italic">
                      unidades fuera
                    </span>
                  </div>
                </div>

                <div className="flex gap-8 items-center">
                   <div className="bg-white/20 px-6 py-4 rounded-3xl border border-white/30 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Stock en Calle</p>
                    <p className="text-2xl font-black">
                      {totalOutside.toLocaleString()}
                    </p>
                  </div>

                  <div className="h-20 w-[1px] bg-white/20 hidden md:block"></div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                      <span>Eficiencia de Entrega</span>
                      <span>
                        {data.operational_flow?.in_out_ratio?.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-4 bg-white/20 rounded-full overflow-hidden border border-white/10 p-0.5">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-1000 shadow-sm"
                        style={{ width: `${Math.min(100, data.operational_flow?.in_out_ratio ?? 0)}%` }}
                      ></div>
                    </div>
                    <p className="mt-3 text-[10px] italic font-medium opacity-70">
                      * Proporción de stock producido que ha sido entregado.
                    </p>
                  </div>
                </div>

                <Link
                  href="/inventory"
                  className="bg-white text-[#FF4B2B] px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-50 transition-all shadow-xl shadow-orange-900/10 active:scale-95 text-center"
                >
                  Ver Stock
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Grid de Contenido Real */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Movimientos Recientes */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
              <div className="p-8 pb-4 flex items-center justify-between">
                <h3 className="font-extrabold text-[#1D3146] text-xl tracking-tight">
                  Actividad Reciente
                </h3>
                <button className="text-xs font-black uppercase tracking-widest text-[#56CCF2] hover:underline underline-offset-4">
                  Historial Completo
                </button>
              </div>

              <div className="p-0">
                {data.recent_activity && data.recent_activity.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {data.recent_activity.map((activity, i) => (
                      <div
                        key={i}
                        className="py-5 px-8 flex items-center justify-between hover:bg-slate-50/50 transition-all cursor-default"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-[#56CCF2]/10 p-3 rounded-2xl flex-shrink-0">
                            <Truck className="text-[#56CCF2]" size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-[#1D3146] text-base">
                              {activity.customer_name}
                            </p>
                            <p className="text-xs font-bold text-slate-400 capitalize flex items-center gap-2">
                              <span className="text-[#56CCF2] font-black">
                                {activity.quantity} unid.
                              </span>{" "}
                              •{activity.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-rose-500 text-lg">
                            ${(activity?.amount ?? 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            {new Date(activity.created_at).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 pt-0 space-y-2">
                    <div className="bg-slate-50 p-10 rounded-3xl text-center border border-dashed border-slate-200">
                      <Truck
                        className="text-slate-200 mx-auto mb-4"
                        size={40}
                      />
                      <p className="text-slate-400 font-bold text-sm">
                        Aún no hay actividad de envíos para mostrar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Derecha - Tablas Reales de Almacén y Adeudos */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
              <div className="p-8 pb-4 flex items-center justify-between">
                <h3 className="font-extrabold text-[#1D3146] text-xl tracking-tight">
                  Stock Maestro
                </h3>
                <Link
                  href="/stock"
                  className="text-[10px] font-black uppercase text-[#56CCF2] tracking-widest"
                >
                  IR AL ALMACÉN
                </Link>
              </div>
              <div className="p-0 px-8 pb-8">
                {data.stock.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="pb-4">Producto</th>
                        <th className="pb-4 text-center">Almacén</th>
                        <th className="pb-4 text-center">Fuera</th>
                        <th className="pb-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.stock.map((item, idx) => (
                        <tr
                          key={idx}
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="py-4 font-bold text-slate-700">
                            {item.name}
                          </td>
                          <td className="py-4 text-center">
                            <span
                              className={`${item.quantity <= 10 ? "text-orange-600" : "text-slate-600"} font-medium`}
                            >
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-4 text-center text-slate-400 font-medium">
                            {item.quantity_outside > 0 ? (
                              <span className="text-blue-500">
                                +{item.quantity_outside}
                              </span>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="py-4 text-right font-black text-slate-900">
                            {item.quantity + item.quantity_outside}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-10 text-center text-slate-400 text-xs font-bold italic">
                    No hay productos en inventario.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
              <div className="p-8 pb-4 flex items-center justify-between">
                <h3 className="font-extrabold text-[#1D3146] text-xl tracking-tight">
                  Saldos de Clientes
                </h3>
                <Link
                  href="/customers"
                  className="text-[10px] font-black uppercase text-[#56CCF2] tracking-widest"
                >
                  VER CARTERA
                </Link>
              </div>
              <div className="p-0">
                <div className="grid grid-cols-2 bg-slate-50/50 py-3 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <span>CLIENTE</span>
                  <span className="text-right">DEBE</span>
                </div>
                {data.debtors.length > 0 ? (
                  data.debtors.map((p, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-2 py-5 px-8 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 transition-all cursor-default"
                    >
                      <span className="text-base font-bold text-[#1D3146]">
                        {p.name}
                      </span>
                      <span className="text-right font-black text-rose-500 text-xl">
                        ${(p?.amount ?? 0).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-400 text-xs font-bold italic">
                    Todos tus clientes están al día. ✨
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
