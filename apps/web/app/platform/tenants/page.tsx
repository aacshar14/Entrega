'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  ArrowRight,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Activity,
  History
} from 'lucide-react';
import { useTenant } from '@/lib/context/tenant-context';
import Link from 'next/link';

export default function PlatformTenants() {
  const { memberships, switchTenant, isLoading } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = memberships.filter(m => 
    m.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
             <Building2 className="text-amber-500" size={32} />
             Tenant Registry
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">
             {memberships.length} negocios registrados en el ecosistema EntréGA.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="px-6 py-3 bg-[#1D3146] text-white text-sm font-black rounded-2xl hover:bg-[#0F172A] transition-all shadow-xl shadow-[#1D3146]/20">
              Registrar Nuevo Tenant
           </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o slug..."
            className="w-full pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-amber-400 transition-all font-medium text-[#1D3146]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-[0.15em]">
              <th className="pl-10 py-6">Estructura</th>
              <th className="px-6 py-6">ID / Slug</th>
              <th className="px-6 py-6">Status</th>
              <th className="px-6 py-6 text-center">Ready State</th>
              <th className="pr-10 py-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((m) => (
              <tr key={m.tenant.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="pl-10 py-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:border-amber-400 group-hover:scale-105 transition-all">
                        {m.tenant.name.charAt(0)}
                     </div>
                     <div>
                        <p className="font-extrabold text-[#1D3146] text-lg leading-none mb-1">{m.tenant.name}</p>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{m.role}</p>
                     </div>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="font-mono text-xs text-slate-400 space-y-1">
                    <p className="text-[#1D3146] font-bold">{m.tenant.slug}</p>
                    <p className="opacity-50">{m.tenant.id}</p>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                     <span className="text-sm font-bold text-slate-700 capitalize">{m.tenant.status}</span>
                  </div>
                </td>
                <td className="px-6 py-6">
                   <div className="flex justify-center">
                     {m.tenant.ready ? (
                       <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 border border-emerald-100">
                          <CheckCircle2 size={12} />
                          <span className="text-[10px] font-black uppercase">V1.1 Live</span>
                       </div>
                     ) : (
                       <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg flex items-center gap-1.5 border border-amber-100">
                          <Loader2 size={12} className="animate-spin" />
                          <span className="text-[10px] font-black uppercase">Onboarding</span>
                       </div>
                     )}
                   </div>
                </td>
                <td className="pr-10 py-6 text-right relative">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       title="System Health"
                       className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 hover:shadow-md transition-all"
                     >
                       <Activity size={20} />
                     </button>
                     <button 
                       onClick={() => switchTenant(m.tenant.id)}
                       className="flex items-center gap-2 pl-6 pr-4 py-3 bg-[#1D3146] text-white text-xs font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#1D3146]/20"
                     >
                        Enter Workspace
                        <ExternalLink size={14} className="opacity-50" />
                     </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
