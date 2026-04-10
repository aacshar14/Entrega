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
  Activity,
  History,
  ShieldAlert,
  Zap,
  Clock,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { useTenant } from '@/lib/context/tenant-context';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import ConfirmModal from '@/components/confirm-modal';

export default function PlatformTenants() {
  const { memberships, switchTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    tenantId: string;
    status: string;
    days?: number;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'info';
  } | null>(null);

  const filtered = memberships.filter(m => {
    const matchesSearch = m.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (m.tenant as any).whatsapp_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const executeUpdate = async () => {
    if (!modalConfig) return;
    try {
      await apiRequest(`admin/tenants/${modalConfig.tenantId}/billing`, 'PATCH', {
        status: modalConfig.status,
        trial_days: modalConfig.status === 'trial' ? modalConfig.days : undefined,
        grace_days: modalConfig.status === 'grace' ? modalConfig.days : undefined,
        notes: `Manual Registry Action: ${modalConfig.status}`
      });
      setModalOpen(false);
      window.location.reload();
    } catch (err) {
      console.error('Billing update failed:', err);
      alert('Error updating billing lifecycle state');
    }
  };

  const triggerUpdate = (tenantId: string, status: string, days?: number) => {
    if (status === 'suspended') {
      setModalConfig({
        tenantId, status,
        title: 'Suspender acceso',
        message: 'Esto bloqueará el dashboard del cliente inmediatamente. Su operación puede continuar por WhatsApp, pero perderá visibilidad.',
        confirmLabel: 'Confirmar suspensión',
        variant: 'danger'
      });
      setModalOpen(true);
    } else if (status === 'active_paid') {
      setModalConfig({
        tenantId, status,
        title: 'Activar plan',
        message: 'Este cliente tendrá acceso completo sin restricciones.',
        confirmLabel: 'Activar',
        variant: 'info'
      });
      setModalOpen(true);
    } else {
      // Direct updates for trial/grace or simple confirm
      if (confirm(`Confirmar +${days} días de ${status.toUpperCase()}?`)) {
        setModalConfig({
          tenantId, status, days,
          title: 'Actualizar Billing',
          message: 'Se aplicará el nuevo periodo de tiempo.',
          confirmLabel: 'Confirmar',
          variant: 'info'
        });
        // We can just call it directly if we want or use the modal
        setModalOpen(true);
      }
    }
  };

  const getBillingInfo = (tenant: any) => {
    const status = tenant.billing_status;
    const now = new Date();
    let color = 'bg-slate-400';
    let label = (status || 'Unknown').toUpperCase();
    let subtext = '';
    let pulse = false;
    
    const formatDate = (d: any) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };
    
    if (status === 'active_paid') {
      color = 'bg-emerald-500';
      label = '🟢 ACTIVO';
      if (tenant.subscription_ends_at) subtext = `Renueva: ${formatDate(tenant.subscription_ends_at)}`;
    } else if (status === 'trial') {
      color = 'bg-amber-400';
      label = '🟡 TRIAL';
      const ends = new Date(tenant.trial_ends_at);
      const diff = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      subtext = diff > 0 ? `${diff} días restantes` : `Venció hace ${Math.abs(diff)} días`;
      if (diff <= 2) pulse = true;
    } else if (status === 'grace') {
      color = 'bg-purple-500';
      label = '🟣 GRACIA';
      const ends = new Date(tenant.grace_ends_at);
      const diff = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      subtext = diff > 0 ? `${diff} días restantes` : `Venció hace ${Math.abs(diff)} días`;
      pulse = true;
    } else if (status === 'suspended') {
      color = 'bg-rose-500';
      label = '🔴 PAGO PENDIENTE';
      subtext = 'Acceso bloqueado';
      pulse = true;
    }
    
    return { color, label, subtext, pulse };
  };

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
             {memberships.length} negocios registrados en el ecosistema Entrega.
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
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">WhatsApp Status:</span>
           <select 
             className="bg-slate-50 border-none text-xs font-black text-[#1D3146] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#56CCF2]"
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
           >
              <option value="all">TODOS</option>
              <option value="connected">CONECTADOS</option>
              <option value="token_expired">TOKEN EXPIRADO</option>
              <option value="not_connected">SIN VINCULAR</option>
              <option value="disconnected">SUSPENDIDOS</option>
           </select>
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
              <th className="px-6 py-6">WhatsApp Registry</th>
              <th className="px-6 py-6">Billing / Plan</th>
              <th className="px-6 py-6 text-center">Ready State</th>
              <th className="pr-10 py-6 text-right">Acciones Directas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((m) => {
              const b = getBillingInfo(m.tenant);
              return (
                <tr key={m.tenant.id} className={`group hover:bg-slate-50/50 transition-colors border-l-[3px] ${
                   (m.tenant as any).billing_status === 'suspended' ? 'border-l-rose-500' :
                   (m.tenant as any).billing_status === 'grace' ? 'border-l-purple-500' :
                   (m.tenant as any).billing_status === 'trial' ? 'border-l-amber-400' :
                   'border-l-transparent'
                }`}>
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
                <td className="px-6 py-6 border-l border-slate-50">
                   <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                         <div className={`w-2.5 h-2.5 rounded-full ${
                            (m.tenant as any).whatsapp_status === 'connected' ? 'bg-[#25D366]' :
                            (m.tenant as any).whatsapp_status === 'token_expired' ? 'bg-amber-400' :
                            (m.tenant as any).whatsapp_status === 'not_connected' ? 'bg-slate-300' :
                            'bg-rose-500'
                         }`}></div>
                         <span className="text-[10px] font-black uppercase tracking-tight text-[#1D3146]">
                            {(m.tenant as any).whatsapp_status || 'not_connected'}
                         </span>
                      </div>
                      {(m.tenant as any).whatsapp_display_number && (
                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">
                           {(m.tenant as any).whatsapp_display_number}
                        </p>
                      )}
                   </div>
                </td>
                <td className="px-6 py-6 font-medium border-l border-slate-50">
                   <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-sm flex items-center gap-1.5 ${b.color} ${b.pulse ? 'animate-pulse' : ''}`}>
                            {b.label}
                         </span>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-[#1D3146]">
                               {b.subtext}
                            </span>
                         </div>
                      </div>
                      <div className="flex gap-2 mt-1">
                         <button onClick={() => triggerUpdate(m.tenant.id, 'trial', 7)} title="+7 días de prueba" className="text-[9px] font-black bg-slate-50 hover:bg-amber-100 hover:text-amber-700 px-2 py-1 rounded-lg border border-slate-100 transition-all">+7 días</button>
                         <button onClick={() => triggerUpdate(m.tenant.id, 'active_paid')} title="Activar plan" className="text-[9px] font-black bg-slate-50 hover:bg-emerald-100 hover:text-emerald-700 px-2 py-1 rounded-lg border border-slate-100 transition-all">Activar</button>
                         <button onClick={() => triggerUpdate(m.tenant.id, 'grace', 3)} title="+3 días de gracia" className="text-[9px] font-black bg-slate-50 hover:bg-purple-100 hover:text-purple-700 px-2 py-1 rounded-lg border border-slate-100 transition-all">+3 días</button>
                         <button onClick={() => triggerUpdate(m.tenant.id, 'suspended')} title="Suspender acceso" className="text-[9px] font-black bg-slate-50 hover:bg-rose-100 hover:text-rose-700 px-2 py-1 rounded-lg border border-slate-100 transition-all text-rose-500">Suspender</button>
                      </div>
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
                      {((m.tenant as any).billing_status === 'trial' || (m.tenant as any).billing_status === 'grace' || (m.tenant as any).billing_status === 'suspended') && (m.tenant as any).whatsapp_display_number && (
                        <a 
                          href={`https://wa.me/${(m.tenant as any).whatsapp_display_number.replace(/\D/g, '')}?text=Hola%2C%20te%20ayudo%20a%20activar%20tu%20plan%20de%20Entrega`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all"
                        >
                           <MessageSquare size={14} />
                           Contactar cliente
                        </a>
                      )}
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
            )})}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {modalConfig && (
        <ConfirmModal 
          isOpen={modalOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmLabel={modalConfig.confirmLabel}
          variant={modalConfig.variant}
          onConfirm={executeUpdate}
          onCancel={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
