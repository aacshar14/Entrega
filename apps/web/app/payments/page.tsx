'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  ChevronRight,
  Handshake,
  Clock,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Cobro {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'paid';
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<'pending' | 'overdue' | 'paid'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const cobros: Cobro[] = [
    { id: '1', client: 'Ana Lopez', amount: 3500, dueDate: '2024-04-25', status: 'pending' },
    { id: '2', client: 'Carlos Perez', amount: 2750, dueDate: '2024-04-20', status: 'overdue' },
    { id: '3', client: 'Luis Garcia', amount: 2500, dueDate: '2024-04-28', status: 'pending' },
    { id: '4', client: 'Maria Rodriguez', amount: 1200, dueDate: '2024-04-01', status: 'paid' },
  ];

  const filteredCobros = cobros.filter(c => 
    c.status === tab && 
    c.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-2">
      
      {/* Header Flexing Roles */}
      <div className="flex items-center justify-between mb-8">
         <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <CreditCard className="text-[#56CCF2]" size={32} />
               Cobranza
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de Tesorería ChocoBites</p>
         </div>
         <button className="px-5 py-3 bg-[#1D3146] text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg active:scale-95 transition-all">
            <PlusCircle size={20} strokeWidth={3} />
            <span className="hidden sm:inline">Nuevo Cobro</span>
         </button>
      </div>

      {/* Tabs Switcher - Mobile Optimized Card Style */}
      <div className="flex p-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm mb-10 overflow-x-auto scrollbar-hide">
         <button 
           onClick={() => setTab('pending')}
           className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap min-w-[100px] ${
             tab === 'pending' ? 'bg-[#56CCF2]/10 text-[#1D3146]' : 'text-slate-400'
           }`}
         >
            Pendientes
         </button>
         <button 
           onClick={() => setTab('overdue')}
           className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap min-w-[100px] ${
             tab === 'overdue' ? 'bg-rose-50 text-rose-500' : 'text-slate-400'
           }`}
         >
            ⚠️ Vencidos
         </button>
         <button 
           onClick={() => setTab('paid')}
           className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap min-w-[100px] ${
             tab === 'paid' ? 'bg-green-50 text-green-600' : 'text-slate-400'
           }`}
         >
            Pagados
         </button>
      </div>

      {/* Buscador Contextual */}
      <div className="relative group mb-10">
         <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
         <input 
           type="text" 
           placeholder="Buscar por cliente..." 
           className="w-full h-16 pl-14 pr-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-sm font-bold text-[#1D3146] outline-none"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* Mobile Card List: Cobros */}
      <div className="space-y-4">
         {filteredCobros.length > 0 ? (
            filteredCobros.map((c) => (
               <div key={c.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group active:scale-[0.98]">
                  <div className="flex justify-between items-start">
                     <div className="flex gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                           c.status === 'paid' ? 'bg-green-50 text-green-600' : 
                           c.status === 'overdue' ? 'bg-rose-50 text-rose-500' : 'bg-[#EBEEF2] text-slate-400'
                        }`}>
                           <Handshake size={28} />
                        </div>
                        <div>
                           <h3 className="font-black text-[#1D3146] text-lg leading-tight group-hover:text-[#56CCF2] transition-colors">{c.client}</h3>
                           <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                              {c.status === 'paid' ? <CheckCircle2 size={12} className="text-green-500" /> : <Clock size={12} />}
                              <span className="text-[10px] font-black uppercase">{c.dueDate}</span>
                           </div>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`text-xl font-black ${
                           c.status === 'paid' ? 'text-green-500' : 
                           c.status === 'overdue' ? 'text-rose-500' : 'text-[#1D3146]'
                        }`}>
                           ${c.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Monto Total</p>
                     </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-3 mt-6 pt-6 border-t border-slate-50">
                     {c.status !== 'paid' ? (
                        <Link href="/operations" className="flex-1 h-12 bg-[#1D3146] text-white rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-transform active:scale-95 shadow-md">
                           <CreditCard size={14} />
                           Registrar Cobro
                        </Link>
                     ) : (
                        <button className="flex-1 h-12 bg-green-50 text-green-700 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase border border-green-100 opacity-60">
                           <CheckCircle2 size={14} />
                           Cobrado
                        </button>
                     )}
                     <button className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center transition-transform active:scale-90" aria-label="Ver Detalles" title="Detalles">
                        <ExternalLink size={18} />
                     </button>
                  </div>
               </div>
            ))
         ) : (
            <div className="py-20 text-center">
               <DollarSign className="mx-auto text-slate-100 mb-4" size={48} />
               <p className="text-lg font-bold text-slate-400 uppercase tracking-widest leading-tight">No hay pagos {tab === 'paid' ? 'completados' : 'pendientes'} en esta vista</p>
            </div>
         )}
      </div>

    </div>
  );
}

function PlusCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}
