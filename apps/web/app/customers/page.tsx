'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Search,
  Plus,
  ArrowRight,
  Phone,
  MessageCircle,
  History,
  CreditCard,
  Truck,
  Filter,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  phone: string;
  balance: number;
  lastMovement: string;
  status: 'debt' | 'ok';
}

interface ImportRow {
  row_index: number;
  data: {
    name: string;
    phone: string;
    email: string;
    initial_balance: number;
    notes: string;
  };
  is_valid: boolean;
  errors: string[];
  is_duplicate: boolean;
}

interface PreviewResponse {
  total_rows: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  duplicate_rows_count: number;
  rows: ImportRow[];
}

export default function CustomersPage() {
  const [view, setView] = useState<'list' | 'upload' | 'preview' | 'summary' | 'new'>('list');
  const [newClient, setNewClient] = useState({ name: '', phone: '', initial_balance: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<{ created: number; skipped: number } | null>(null);

  // Mock data for mobile-first view
  const clients: Client[] = [
    { id: '1', name: 'Ana Lopez', phone: '+528781234567', balance: -3500, lastMovement: 'hace 2h', status: 'debt' },
    { id: '2', name: 'Carlos Perez', phone: '+528782223344', balance: -2750, lastMovement: 'ayer', status: 'debt' },
    { id: '3', name: 'Luis Garcia', phone: '+528785551122', balance: 0, lastMovement: 'hace 3 días', status: 'ok' },
    { id: '4', name: 'Maria Rodriguez', phone: '+528789998877', balance: -1200, lastMovement: 'hace 1h', status: 'debt' },
  ];

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const downloadTemplate = () => {
    const csvContent = "name,phone,email,initial_balance,notes\nAna Lopez,+528781111111,ana@email.com,650,Cliente frecuente";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entrega_clientes_template.csv';
    a.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    // Simulate Preview API
    setTimeout(() => {
        setIsUploading(false);
        setView('preview');
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto py-2 px-4 md:px-0">
      
      {/* Header Interactivo */}
      {view === 'list' && (
        <div className="space-y-8 mb-10">
           <div className="flex items-center justify-between">
              <div>
                 <h1 className="text-2xl md:text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
                    <Users className="text-[#56CCF2]" size={32} />
                    Clientes
                 </h1>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Directorio Operativo ChocoBites</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setView('upload')} className="p-3 bg-[#EBEEF2] text-[#1D3146] rounded-2xl hover:bg-slate-200 transition-colors" title="Importar Clientes" aria-label="Importar Clientes">
                    <Upload size={20} />
                 </button>
                 <button onClick={() => setView('new')} className="px-5 py-3 bg-[#1D3146] text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                    <Plus size={20} strokeWidth={3} />
                    <span className="hidden sm:inline">Nuevo</span>
                 </button>
              </div>
           </div>

           {/* Buscador Mobile-First */}
           <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#56CCF2] transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o celular..." 
                className="w-full h-16 pl-14 pr-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm text-sm font-bold text-[#1D3146] outline-none focus:ring-4 focus:ring-[#56CCF2]/10 transition-all placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-50 text-slate-400 rounded-xl" title="Filtrar" aria-label="Filtrar">
                 <Filter size={18} />
              </button>
           </div>
        </div>
      )}

      {view === 'new' && (
         <div className="max-w-xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-[#1D3146] mb-2 tracking-tight">Alta de Cliente</h2>
            <p className="text-sm text-slate-500 mb-8">Registra un nuevo destino de ChocoBites manualmente.</p>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">Nombre Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Chiltepik Market" 
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                  />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">WhatsApp / Celular</label>
                     <input 
                       type="tel" 
                       placeholder="+52..." 
                       value={newClient.phone}
                       onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                       className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">Saldo Inicial (Opcional)</label>
                     <input 
                       type="number" 
                       placeholder="0.00" 
                       value={newClient.initial_balance}
                       onChange={(e) => setNewClient({...newClient, initial_balance: e.target.value})}
                       className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none font-mono"
                     />
                  </div>
               </div>
            </div>

            <div className="flex justify-between items-center mt-12 gap-4">
               <button onClick={() => setView('list')} className="text-sm font-black text-slate-400 uppercase tracking-widest px-4">Cancelar</button>
               <button 
                  onClick={() => {
                     // Simulate save
                     setLoading(true);
                     setTimeout(() => {
                        setLoading(false);
                        setView('list');
                     }, 800);
                  }}
                  className="flex-grow py-4 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl shadow-xl shadow-[#1D3146]/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest"
               >
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                  Guardar Cliente
               </button>
            </div>
         </div>
      )}

      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredClients.map((client) => (
              <div key={client.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                 <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner ${
                          client.status === 'debt' ? 'bg-rose-50 text-rose-500' : 'bg-green-50 text-green-500'
                       }`}>
                          {client.name.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div>
                          <h3 className="font-black text-[#1D3146] text-lg leading-tight group-hover:text-[#56CCF2] transition-colors">{client.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                             <Phone size={12} />
                             <span className="text-[11px] font-bold">{client.phone}</span>
                          </div>
                       </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                       client.status === 'debt' ? 'bg-rose-100 text-rose-600' : 'bg-green-100 text-green-600'
                    }`}>
                       {client.status === 'debt' ? 'En Mora' : 'Al Día'}
                    </div>
                 </div>

                 {/* Balance Focus */}
                 <div className="bg-[#EBEEF2]/50 p-4 rounded-2xl flex items-center justify-between mb-6">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</p>
                       <p className={`text-xl font-black ${client.balance < 0 ? 'text-rose-500' : 'text-[#1D3146]'}`}>
                          ${Math.abs(client.balance).toLocaleString()}
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad</p>
                       <p className="text-xs font-bold text-[#1D3146]">{client.lastMovement}</p>
                    </div>
                 </div>

                 {/* Quick Actions Footer */}
                 <div className="flex gap-3">
                    <Link href="/operations" className="flex-1 h-12 bg-[#1D3146] text-white rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-transform active:scale-95">
                       <Truck size={14} />
                       Entregar
                    </Link>
                    <Link href="/operations" className="flex-1 h-12 bg-[#56CCF2] text-[#1D3146] rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-transform active:scale-95">
                       <CreditCard size={14} />
                       Cobrar
                    </Link>
                    <button className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center transition-transform active:scale-90" title="Contactar WhatsApp" aria-label="WhatsApp">
                       <MessageCircle size={18} fill="currentColor" className="opacity-20" />
                    </button>
                 </div>

                 <div className="absolute top-0 right-0 w-24 h-24 bg-[#56CCF2] opacity-[0.02] rounded-full translate-x-1/2 -translate-y-1/2"></div>
              </div>
           ))}
        </div>
      )}

      {/* Upload View (Simplified from original) */}
      {view === 'upload' && (
         <div className="max-w-xl mx-auto bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-[#1D3146] mb-2">Importar Clientes</h2>
            <p className="text-sm text-slate-500 mb-10">Carga tu lista masiva en formato CSV para agilizar la operación.</p>
            
            <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center group hover:border-[#56CCF2]/30 transition-all cursor-pointer relative">
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".csv" onChange={handleFileChange} />
               <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="text-slate-400 group-hover:text-[#56CCF2]" size={36} />
               </div>
               <p className="font-black text-[#1D3146]">{file ? file.name : "Subir archivo .csv"}</p>
               <button onClick={downloadTemplate} className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#56CCF2] hover:underline flex items-center gap-1 mx-auto">
                  <Download size={14} />
                  Descargar Plantilla
               </button>
            </div>

            <div className="flex justify-between items-center mt-10">
               <button onClick={() => setView('list')} className="text-sm font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
               <button 
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="px-8 py-4 bg-[#1D3146] text-white font-black rounded-2xl shadow-xl shadow-[#1D3146]/20 flex items-center gap-3 disabled:opacity-30 active:scale-95 transition-all"
               >
                  {isUploading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                  Ver Vista Previa
               </button>
            </div>
         </div>
      )}

      {/* Summary Logic and Preview can remain similar but optimized for smaller viewport cards */}
       {view === 'preview' && (
         <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-in fade-in duration-500">
            <div className="text-center mb-10">
               <h2 className="text-2xl font-black text-[#1D3146]">Validación de Datos</h2>
               <p className="text-sm text-slate-500 mt-2 italic">Revisa si hay errores antes de confirmar.</p>
            </div>
            
            <div className="flex flex-col gap-3 mb-10">
               <div className="bg-green-50 p-5 rounded-3xl flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-green-700">Filas Listas</span>
                  <span className="text-2xl font-black text-green-700">12</span>
               </div>
               <div className="bg-rose-50 p-5 rounded-3xl flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-rose-700">Con Error</span>
                  <span className="text-2xl font-black text-rose-700">2</span>
               </div>
            </div>

            <div className="flex gap-4">
               <button onClick={() => setView('upload')} className="flex-1 py-4 text-slate-400 font-bold uppercase text-xs tracking-widest">Corregir</button>
               <button onClick={() => setView('list')} className="flex-1 py-4 bg-[#1D3146] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest">Confirmar Tudo</button>
            </div>
         </div>
       )}

    </div>
  );
}
