'use client';
import React from 'react';
import Link from 'next/link';
import { 
  Truck, 
  Banknote, 
  AlertCircle, 
  Package,
  ChevronRight,
  Handshake,
  Plus,
  Users,
  Search,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useTenant } from '../../lib/context/TenantContext';

export default function Dashboard() {
  const { user, activeTenant, memberships } = useTenant();
  const userRole = user?.platform_role === 'admin' ? 'admin' : (memberships.find(m => m.tenant.id === activeTenant?.id)?.role || 'operator');

  // KPI Cards
  const kpis = [
    { label: 'Entregas Hoy', value: '15', sub: '30 productos', icon: Truck, color: 'bg-blue-500', shadow: 'shadow-blue-500/20', roles: ['admin', 'owner', 'operator'] },
    { label: 'Pagos Hoy', value: '$5,200', sub: '4 recibidos', icon: Banknote, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20', roles: ['admin', 'owner', 'operator'] },
    { label: 'Adeudos', value: '$8,750', sub: '3 clientes', icon: AlertCircle, color: 'bg-rose-500', shadow: 'shadow-rose-500/20', roles: ['admin', 'owner'] },
    { label: 'Stock Bajo', value: '5', sub: 'Atención req.', icon: Package, color: 'bg-orange-500', shadow: 'shadow-orange-500/20', roles: ['admin', 'owner'] },
  ];

  const visibleKpis = kpis.filter(k => k.roles.includes(userRole));

  const quickActions = [
    { label: 'Nueva Entrega', icon: Plus, href: '/operations', color: 'bg-[#1D3146]' },
    { label: 'Registrar Cobro', icon: Banknote, href: '/operations', color: 'bg-[#1D3146]' },
    { label: 'Ver Clientes', icon: Users, href: '/customers', color: 'bg-[#1D3146]' },
    { label: 'Inventario', icon: Package, href: '/stock', color: 'bg-[#1D3146]' },
  ];

  const activities = [
    { type: 'delivery', client: 'Juan Lopez', detail: '+15 Unidades', time: 'hace 10 min', amount: null },
    { type: 'payment', client: 'Ana Perez', detail: 'Pago recibido', time: 'hace 2h', amount: '$1,500' },
  ];

  return (
    <div className="space-y-10 pb-10">
      
      {/* 1. Header & Welcome */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-black text-[#1D3146] tracking-tight">Hola, {user?.full_name.split(' ')[0]} 👋</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium italic">Esto es lo que sucede hoy en {activeTenant?.name}.</p>
         </div>
         {activeTenant?.ready && (
           <div className="hidden md:flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 items-center gap-3 pr-6">
              <div className="bg-[#56CCF2]/20 p-2 rounded-xl text-[#56CCF2]">
                 <TrendingUp size={20} />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-[#1D3146]">Operación Lista</p>
           </div>
         )}
      </section>

      {/* 2. Onboarding Checklist (Setup Wizard Integration) */}
      {!activeTenant?.ready && (
        <section className="bg-[#1D3146] rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group">
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <span className="bg-[#56CCF2] p-2 rounded-xl text-[#1D3146]">
                       <Zap size={24} fill="currentColor" />
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight">Activar Mi Negocio</h3>
                 </div>
                 <p className="text-slate-300 text-sm leading-relaxed max-w-md">Completa los pasos de la <b>EntréGA Academy</b> para habilitar el registro de operaciones y cobros en {activeTenant?.name}.</p>
                 <Link href="/onboarding" className="inline-flex items-center gap-3 px-8 py-4 bg-[#56CCF2] text-[#1D3146] font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#56CCF2]/20">
                    Ir a la Academy <ChevronRight size={18} />
                 </Link>
              </div>
              
              <div className="space-y-4">
                 {[
                   { label: 'Importar Clientes', done: activeTenant?.clients_imported, step: 2 },
                   { label: 'Sincronizar Stock', done: activeTenant?.stock_imported, step: 3 },
                   { label: 'Conectar WhatsApp', done: activeTenant?.business_whatsapp_connected, step: 4 },
                 ].map((task, i) => (
                   <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between group/task transition-all ${
                     task.done ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5'
                   }`}>
                      <div className="flex items-center gap-4">
                         <div className={`p-2 rounded-lg ${task.done ? 'bg-green-500' : 'bg-white/10'}`}>
                            {task.done ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-white/30" />}
                         </div>
                         <span className={`text-xs font-bold ${task.done ? 'text-white' : 'text-slate-400'}`}>{task.label}</span>
                      </div>
                      {!task.done && (
                        <Link href={`/onboarding?step=${task.step}`} className="text-[10px] uppercase font-black tracking-widest text-[#56CCF2] opacity-0 group-hover/task:opacity-100 transition-opacity">Completar</Link>
                      )}
                   </div>
                 ))}
              </div>
           </div>
           <div className="absolute -right-20 -bottom-20 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Zap size={300} />
           </div>
        </section>
      )}

      {/* 3. KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
         {visibleKpis.map((kpi, i) => (
            <div key={i} className={`${kpi.color} ${kpi.shadow} rounded-[2rem] p-5 md:p-8 text-white flex flex-col justify-between h-40 md:h-48 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer`}>
               <div className="flex justify-between items-start">
                  <div className="bg-white/20 p-2 md:p-3 rounded-2xl">
                     <kpi.icon size={20} className="md:w-6 md:h-6" />
                  </div>
                  <ArrowUpRight size={16} className="opacity-40" />
               </div>
               <div>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-80 mb-1">{kpi.label}</p>
                  <h3 className="text-2xl md:text-4xl font-black leading-none">{activeTenant?.ready ? kpi.value : '0'}</h3>
                  <p className="text-[10px] md:text-xs font-semibold opacity-60 mt-1">{activeTenant?.ready ? kpi.sub : 'Pendiente'}</p>
               </div>
            </div>
         ))}
      </section>

      {/* 4. Quick Actions */}
      <section className="space-y-4">
         <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">Gestión Central</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
               <Link 
                 key={i} 
                 href={activeTenant?.ready || action.href === '/customers' || action.href === '/stock' ? action.href : '#'} 
                 className={`flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm transition-all active:scale-95 group ${
                   !activeTenant?.ready && action.href.startsWith('/operations') ? 'opacity-30 cursor-not-allowed' : 'hover:shadow-xl'
                 }`}
               >
                  <div className={`${action.color} p-4 rounded-2xl text-white group-hover:scale-110 transition-transform shadow-lg`}>
                     <action.icon size={24} />
                  </div>
                  <span className="text-xs font-black text-[#1D3146] uppercase tracking-tighter text-center">{action.label}</span>
               </Link>
            ))}
         </div>
      </section>

      {/* 5. Activities Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-12 space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Actividad del Negocio</h3>
               <Link href="/movements" className="text-xs font-black text-[#56CCF2] uppercase tracking-widest flex items-center gap-1 hover:underline">Ver Todo <ChevronRight size={14} /></Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {activeTenant?.ready ? activities.map((act, i) => (
                  <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:bg-slate-50 cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                           act.type === 'delivery' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                        }`}>
                           {act.type === 'delivery' ? <Truck size={24} /> : <Handshake size={24} />}
                        </div>
                        <div>
                           <p className="text-sm font-black text-[#1D3146] leading-tight">{act.client}</p>
                           <p className="text-xs text-slate-500 font-medium">{act.detail}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{act.time}</p>
                        </div>
                     </div>
                  </div>
               )) : (
                 <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">No hay actividad para mostrar</p>
                    <p className="text-xs text-slate-300 mt-2">Completa el onboarding para comenzar.</p>
                 </div>
               )}
            </div>
         </div>
      </section>
    </div>
  )
}
