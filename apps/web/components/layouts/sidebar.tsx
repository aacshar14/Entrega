"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  ArrowLeft,
  Settings,
  LayoutDashboard,
  Package,
  Clock,
  CreditCard,
  Users,
  FileText,
  Layout,
  Activity,
  HeartPulse,
  Coins,
  User as UserIcon,
  Layers,
} from "lucide-react";
import { useTenant } from "@/lib/context/tenant-context";
import { FEATURES } from "@/config/feature-flags";
import Logo from "@/components/logo";

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  ownerOnly?: boolean;
  sreOnly?: boolean;
}

const tenantMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clientes", href: "/customers" },
  { icon: Package, label: "Inventario", href: "/stock" },
  {
    icon: Layers,
    label: "Inventario por Cliente",
    href: "/customer-inventory",
  },
  { icon: Layout, label: "Operaciones", href: "/operations" },
  { icon: Clock, label: "Movimientos", href: "/movements" },
  { icon: CreditCard, label: "Pagos", href: "/payments" },
  {
    icon: FileText,
    label: "Reportes",
    href: "/reports/weekly",
    ownerOnly: true,
  },
];

const platformMenuItems: MenuItem[] = [
  { icon: Activity, label: "Resumen", href: "/platform" },
  { icon: Users, label: "Tenants", href: "/platform/tenants" },
  { icon: UserIcon, label: "Usuarios", href: "/platform/users" },
  { icon: HeartPulse, label: "Salud", href: "/platform/health", sreOnly: true },
  { icon: Coins, label: "Costos", href: "/platform/costs", sreOnly: true },
  { icon: Settings, label: "Ajustes", href: "/platform/settings" },
];

export function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user, activeRole, clearTenant } = useTenant();
  const isPlatformPath = pathname.startsWith("/platform");
  const isAdmin = user?.platform_role === "admin";

  const currentMenu = isPlatformPath ? platformMenuItems : tenantMenuItems;

  return (
    <aside
      className={`fixed inset-y-0 left-0 w-64 lg:w-60 xl:w-64 2xl:w-80 ${
        isPlatformPath ? "bg-[#0F172A]" : "bg-[#1D3146]"
      } text-white flex flex-col z-[70] transition-all duration-500 lg:translate-x-0 ${
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
    >
      <div className="p-8 pb-8 flex flex-col items-center">
        <div className="flex justify-between items-center w-full mb-6">
          <Link
            href={isPlatformPath ? "/platform" : "/dashboard"}
            className="flex flex-col items-center justify-center w-full"
          >
            <Logo variant="master" className="w-48 h-auto drop-shadow-xl" />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-white/50 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {!isPlatformPath && (
          <div className="w-full">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
              <p className="text-[10px] font-black text-[#56CCF2] uppercase tracking-[0.3em] mb-1">
                NEGOCIO ACTIVO
              </p>
              <h2 className="text-sm font-black text-white truncate px-2">
                {useTenant().activeTenant?.name?.toUpperCase() ?? "ENTREGA"}
              </h2>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-grow px-4 space-y-1">
        {currentMenu
          .filter(
            (item) =>
              (!item.ownerOnly || activeRole === "owner") &&
              (!item.sreOnly || FEATURES.ENABLE_SRE),
          )
          .map((item) => {
            const isActive = pathname === item.href;
            const activeColor = isPlatformPath
              ? "bg-amber-400 text-[#0F172A]"
              : "bg-[#56CCF2] text-[#1D3146]";
            const hoverColor = isPlatformPath
              ? "hover:text-amber-400"
              : "hover:text-[#56CCF2]";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm group ${
                  isActive
                    ? `${activeColor} shadow-lg`
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon
                  size={20}
                  className={
                    isActive ? "" : `text-slate-500 group-${hoverColor}`
                  }
                />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {isPlatformPath ? (
        <div className="p-8 border-t border-white/5">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">
              {isPlatformPath ? "Status Global" : "Estado del Bot"}
            </p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                (isPlatformPath || useTenant().activeTenant?.whatsapp_status === "connected") 
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                  : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
              }`}></div>
              <p className="text-[11px] font-bold">
                {isPlatformPath 
                  ? "API Operativa" 
                  : (useTenant().activeTenant?.whatsapp_status === "connected" ? "WhatsApp Activo" : "Revisar Conexión")
                }
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isAdmin && (
            <button
              onClick={() => {
                clearTenant();
                onClose();
              }}
              className="w-full mx-4 mb-2 flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 group"
            >
              <ArrowLeft size={16} />
              Regresar a Plataforma
            </button>
          )}
          <Link
            href="/settings"
            onClick={onClose}
            className="p-8 border-t border-white/5 hover:bg-white/5 transition-all block cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Settings size={20} className="text-[#56CCF2]" />
              </div>
              <div>
                <p className="text-xs font-black text-white/50 uppercase tracking-widest leading-none mb-1">
                  Configuración
                </p>
                <p className="text-xs font-bold text-white">Panel Central</p>
              </div>
            </div>
          </Link>
        </>
      )}
      <div className="p-4 border-t border-white/5 opacity-40 text-center hidden lg:block">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1">
          Entrega v{FEATURES.VERSION || "1.1"}
        </p>
        <p className="text-[7px] font-bold text-slate-400 leading-tight">
          Entrega is a SaaS platform for business inventory and delivery
          operations.
        </p>
      </div>
    </aside>
  );
}
