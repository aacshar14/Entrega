"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Menu,
  ShieldCheck,
  ChevronDown,
  User as UserIcon,
  LogOut,
} from "lucide-react";
import { useTenant } from "@/lib/context/tenant-context";
import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import NotificationCenter from "@/components/notification-center";

export function Header({ onMenuClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeTenant, activeRole } = useTenant();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isPlatformPath = pathname.startsWith("/platform");

  const displayUser = {
    name: user?.full_name || "Usuario",
    role:
      user?.platform_role === "admin"
        ? "Plataforma Admin"
        : activeRole === "owner"
          ? "Dueño"
          : "Operador",
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 md:h-20 bg-white/70 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 lg:px-10 flex items-center justify-between border-b border-slate-100">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-[#1D3146] transition-colors"
        >
          <Menu size={24} />
        </button>

        <div
          className={`${
            isPlatformPath ? "bg-amber-100" : "bg-[#56CCF2]/20"
          } px-2 py-0.5 md:px-3 md:py-1 rounded-full hidden sm:flex items-center gap-2 transition-colors flex-shrink-0`}
        >
          <ShieldCheck
            size={14}
            className={isPlatformPath ? "text-amber-600" : "text-[#56CCF2]"}
          />
          <span
            className={`text-[9px] md:text-[10px] font-black uppercase ${
              isPlatformPath ? "text-amber-900" : "text-[#1D3146]"
            } tracking-tighter`}
          >
            {isPlatformPath ? "Infra Administration" : "Premium Enterprise"}
          </span>
        </div>
        <span className="text-slate-200 text-sm font-medium hidden sm:block">
          /
        </span>
        <h2 className="text-[10px] md:text-sm font-black text-[#1D3146] uppercase tracking-widest truncate max-w-[150px] md:max-w-none">
          {isPlatformPath
            ? "Global Control"
            : activeTenant?.name || "Seleccionar Negocio"}
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-3">
          <NotificationCenter />
        </div>

        <div className="relative">
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-4 px-2 py-1 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group"
          >
            <div className="text-right">
              <p className="text-sm font-black text-[#1D3146] leading-none mb-1">
                {displayUser.name}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {displayUser.role}
              </p>
            </div>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#1D3146] flex items-center justify-center text-[#56CCF2] font-black text-xs border-2 border-slate-200 group-hover:border-[#56CCF2] transition-colors">
                {displayUser.name.charAt(0)}
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-[0_0_8px_#56CCF2]"></span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${
                showUserMenu ? "rotate-180" : ""
              }`}
            />
          </div>

          {showUserMenu && (
            <div className="absolute right-0 top-14 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-4">
              <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Empresa Activa
                </p>
                <p className="text-sm font-black text-[#1D3146]">
                  {activeTenant?.name || "Ninguna"}
                </p>
              </div>
              <div className="space-y-1">
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-[#56CCF2]/5 hover:text-[#56CCF2] rounded-xl transition-all"
                >
                  <UserIcon size={18} />
                  Mi Perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <LogOut size={18} />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
