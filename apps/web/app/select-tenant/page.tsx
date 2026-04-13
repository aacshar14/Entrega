"use client";

import React from "react";
import { useTenant } from "@/lib/context/tenant-context";
import { Building2, ArrowRight, LayoutDashboard, Search } from "lucide-react";

export default function SelectTenantPage() {
  const { memberships, switchTenant, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">
          Cargando tus accesos...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-3">
          Selector de Negocio
        </h1>
        <p className="text-slate-500 text-lg font-medium">
          Hola Admin, selecciona el tenant en el que deseas operar hoy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {memberships
          .filter((m) => !m.tenant.id.startsWith("00000000"))
          .map((membership) => (
          <button
            key={membership.tenant.id}
            onClick={() => switchTenant(membership.tenant.id)}
            className="group relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                {membership.tenant.logo_url ? (
                  <img
                    src={membership.tenant.logo_url}
                    alt={membership.tenant.name}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                )}
              </div>
              <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider">
                {membership.role}
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-800 mb-1">
                {membership.tenant.name}
              </h3>
              <p className="text-slate-400 font-medium">
                slug: {membership.tenant.slug}
              </p>
            </div>

            <div className="mt-auto flex items-center gap-2 text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
              Entrar al Dashboard <ArrowRight className="w-5 h-5" />
            </div>
          </button>
        ))}

        {/* Placeholder for new tenant creation (Admin only) */}
        <button className="group bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-white transition-all text-left flex flex-col items-center justify-center gap-4 min-h-[240px]">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-8 h-8 text-slate-300 group-hover:text-blue-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
              Registrar Nuevo Tenant
            </h3>
            <p className="text-slate-400 text-sm">Próximamente disponible</p>
          </div>
        </button>
      </div>

      <div className="mt-16 p-8 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-6">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0">
          <Search className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-blue-900">
            Búsqueda Global de Operaciones
          </h4>
          <p className="text-blue-700/70 text-sm">
            Como Super Admin, puedes buscar pedidos y folios a través de todos
            los tenants registrados.
          </p>
        </div>
      </div>
    </div>
  );
}
