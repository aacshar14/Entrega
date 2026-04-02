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
  ArrowDownRight
} from 'lucide-react';

export default function Dashboard() {
  // Mock session for role-based testing
  const user = { role: "owner" }; // or "operator"

  // Mock data for initial evolution
  const kpis = [
    { label: 'Entregas Hoy', value: '15', sub: '30 productos', icon: Truck, color: 'bg-blue-500', shadow: 'shadow-blue-500/20', roles: ['owner', 'operator'] },
    { label: 'Pagos Hoy', value: '$5,200', sub: '4 recibidos', icon: Banknote, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20', roles: ['owner', 'operator'] },
    { label: 'Adeudos', value: '$8,750', sub: '3 clientes', icon: AlertCircle, color: 'bg-rose-500', shadow: 'shadow-rose-500/20', roles: ['owner'] },
    { label: 'Stock Bajo', value: '5', sub: 'Atención req.', icon: Package, color: 'bg-orange-500', shadow: 'shadow-orange-500/20', roles: ['owner'] },
  ];

  const visibleKpis = kpis.filter(k => k.roles.includes(user.role));

  const quickActions = [
    { label: 'Nueva Entrega', icon: Plus, href: '/operations', color: 'bg-[#1D3146]' },
    { label: 'Registrar Cobro', icon: Banknote, href: '/operations', color: 'bg-[#1D3146]' },
    { label: 'Ver Clientes', icon: Users, href: '/customers', color: 'bg-[#1D3146]' },
    { label: 'Inventario', icon: Package, href: '/stock', color: 'bg-[#1D3146]' },
  ];

  const activities = [
    { type: 'delivery', client: 'Juan Lopez', detail: '+15 ChocoBites', time: 'hace 10 min', amount: null },
    { type: 'payment', client: 'Ana Perez', detail: 'Pago recibido', time: 'hace 2h', amount: '$1,500' },
    { type: 'adjustment', client: 'Inventario', detail: 'Ajuste manual', time: 'hace 4h', amount: '-5 und' },
  ];

  return (
    <div className="space-y-10 pb-10">
      
      {/* 1. Header & Welcome (Mobile Friendly) */}
      <section className="flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-black text-[#1D3146] tracking-tight">Hola, Leonardo 👋</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium italic">Esto es lo que sucede hoy en ChocoBites.</p>
         </div>
         <div className="hidden md:flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 items-center gap-3 pr-6">
            <div className="bg-[#56CCF2]/20 p-2 rounded-xl text-[#56CCF2]">
               <TrendingUp size={20} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#1D3146]">+12.5% vs ayer</p>
         </div>
      </section>

      {/* 2. KPI Cards - Responsive Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
         {kpis.map((kpi, i) => (
            <div key={i} className={`${kpi.color} ${kpi.shadow} rounded-[2rem] p-5 md:p-8 text-white flex flex-col justify-between h-40 md:h-48 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer`}>
               <div className="flex justify-between items-start">
                  <div className="bg-white/20 p-2 md:p-3 rounded-2xl">
                     <kpi.icon size={20} className="md:w-6 md:h-6" />
                  </div>
                  <ArrowUpRight size={16} className="opacity-40" />
               </div>
               <div>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-80 mb-1">{kpi.label}</p>
                  <h3 className="text-2xl md:text-4xl font-black leading-none">{kpi.value}</h3>
                  <p className="text-[10px] md:text-xs font-semibold opacity-60 mt-1">{kpi.sub}</p>
               </div>
            </div>
         ))}
      </section>

      {/* 3. Quick Actions (Mobile UI Priority) */}
      <section className="space-y-4">
         <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">Acciones Rápidas</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
               <Link key={i} href={action.href} className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200 transition-all active:scale-95 group">
                  <div className={`${action.color} p-4 rounded-2xl text-white group-hover:scale-110 transition-transform shadow-lg`}>
                     <action.icon size={24} />
                  </div>
                  <span className="text-xs font-black text-[#1D3146] uppercase tracking-tighter text-center">{action.label}</span>
               </Link>
            ))}
         </div>
      </section>

      {/* 4. Activity Feed (Feed-style Cards) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-12 space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Actividad Reciente</h3>
               <Link href="/movements" className="text-xs font-black text-[#56CCF2] uppercase tracking-widest flex items-center gap-1 hover:underline">Ver Todo <ChevronRight size={14} /></Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {activities.map((act, i) => (
                  <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:bg-slate-50 cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                           act.type === 'delivery' ? 'bg-blue-50 text-blue-500' :
                           act.type === 'payment' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                        }`}>
                           {act.type === 'delivery' ? <Truck size={24} /> : 
                            act.type === 'payment' ? <Handshake size={24} /> : <Package size={24} />}
                        </div>
                        <div>
                           <p className="text-sm font-black text-[#1D3146] leading-tight">{act.client}</p>
                           <p className="text-xs text-slate-500 font-medium">{act.detail}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{act.time}</p>
                        </div>
                     </div>
                     {act.amount && (
                        <div className={`text-sm font-black px-3 py-1 rounded-full ${
                           act.amount.startsWith('$') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                           {act.amount}
                        </div>
                     )}
                  </div>
               ))}
            </div>
         </div>

         {/* Alerts & Urgent Focus (Mobile only shows top summary, Desktop shows details) */}
         <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <div className="bg-[#1D3146] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="flex items-center gap-2 text-rose-400 mb-4">
                     <AlertCircle size={20} />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Prioridad: Adeudos Vencidos</span>
                  </div>
                  <h4 className="text-3xl font-black text-white leading-tight mb-2">3 Clientes en mora</h4>
                  <p className="text-slate-400 text-sm font-medium mb-6">Total pendiente de cobro: <span className="text-white font-bold">$8,750.00</span></p>
                  <button className="px-6 py-3 bg-[#56CCF2] text-[#1D3146] font-extrabold rounded-2xl shadow-lg hover:scale-105 transition-all active:scale-95">Gestionar Cobros</button>
               </div>
               <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Banknote size={200} />
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="flex items-center gap-2 text-orange-500 mb-4">
                     <Package size={20} />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Prioridad: Stock Crítico</span>
                  </div>
                  <h4 className="text-3xl font-black text-[#1D3146] leading-tight mb-2">5 SKUs por agotar</h4>
                  <p className="text-slate-500 text-sm font-medium mb-6">Productos como <span className="text-[#1D3146] font-bold">Brownie Bites</span> requieren restock.</p>
                  <button className="px-6 py-3 bg-white border-2 border-[#1D3146] text-[#1D3146] font-extrabold rounded-2xl hover:bg-[#1D3146] hover:text-white transition-all active:scale-95">Ver Inventario</button>
               </div>
               <div className="absolute -right-10 top-0 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                  <AlertCircle size={150} />
               </div>
            </div>
         </div>
      </section>
    </div>
  )
}
