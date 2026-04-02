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
  CreditCard,
  Truck,
  Filter,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useTenant } from '../../lib/context/TenantContext';
import { apiRequest } from '../../lib/api';

interface CustomerRecord {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  address?: string;
  notes?: string;
  balance?: number; // Calculated or from balance table in reality
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
  const { activeTenant, isLoading: isTenantLoading } = useTenant();
  const [view, setView] = useState<'list' | 'upload' | 'preview' | 'summary' | 'new'>('list');
  const [newClient, setNewClient] = useState({ name: '', phone: '', initial_balance: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchCustomers = async () => {
    if (!activeTenant) return;
    setLoading(true);
    try {
      const data = await apiRequest('/customers', 'GET', null, activeTenant.id);
      setCustomers(data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchCustomers();
    }
  }, [activeTenant]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone_number.includes(searchTerm)
  );

  const handleSave = async () => {
    if (!activeTenant) return;
    setLoading(true);
    try {
      await apiRequest('/customers', 'POST', {
        name: newClient.name,
        phone_number: newClient.phone,
        initial_balance: parseFloat(newClient.initial_balance) || 0
      }, activeTenant.id);
      setNewClient({ name: '', phone: '', initial_balance: '' });
      setView('list');
      fetchCustomers();
    } catch (error) {
       console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPreview = async () => {
    if (!file || !activeTenant) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Need a more generic apiRequest for FormData or manual fetch
      const { data: { session } } = await (require('../../lib/supabase').supabase).auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/customers/import/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Tenant-Id': activeTenant.id
        },
        body: formData
      });
      const data = await response.json();
      setPreview(data);
      setView('preview');
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || !activeTenant) return;
    setLoading(true);
    try {
      // Filter only valid rows to commit
      const validRows = preview.rows.filter(r => r.is_valid).map(r => r.data);
      await apiRequest('/customers/import/commit', 'POST', { rows: validRows }, activeTenant.id);
      setView('list');
      fetchCustomers();
    } catch (error) {
      console.error('Commit error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isTenantLoading || (loading && view === 'list' && customers.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#56CCF2] animate-spin" />
      </div>
    );
  }

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
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Directorio Operativo {activeTenant?.name}</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setView('upload')} className="p-3 bg-[#EBEEF2] text-[#1D3146] rounded-2xl hover:bg-slate-200 transition-colors" title="Importar Clientes via CSV">
                    <Upload size={20} />
                 </button>
                 <button onClick={() => setView('new')} className="px-5 py-3 bg-[#1D3146] text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg active:scale-95 transition-all" title="Crear Nuevo Cliente">
                    <Plus size={20} strokeWidth={3} />
                    <span className="hidden sm:inline">Nuevo</span>
                 </button>
              </div>
           </div>

           <div className="relative group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#56CCF2] transition-colors" size={20} />
               <input 
                 id="customer_search"
                 type="text" 
                 placeholder="Buscar por nombre o celular..." 
                 className="w-full h-16 pl-14 pr-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm text-sm font-bold text-[#1D3146] outline-none focus:ring-4 focus:ring-[#56CCF2]/10 transition-all placeholder:text-slate-300"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 title="Buscar clientes"
               />
            </div>
        </div>
      )}

      {view === 'new' && (
         <div className="max-w-xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-2xl">
            <h2 className="text-2xl font-black text-[#1D3146] mb-2 tracking-tight">Alta de Cliente</h2>
            <p className="text-sm text-slate-500 mb-8">Registra un nuevo destino de {activeTenant?.name} manualmente.</p>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <label htmlFor="new_client_name" className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">Nombre Completo</label>
                  <input 
                    id="new_client_name"
                    type="text" 
                    placeholder="Ej: Chiltepik Market" 
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                    title="Nombre del cliente"
                  />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label htmlFor="new_client_phone" className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">WhatsApp / Celular</label>
                     <input 
                       id="new_client_phone"
                       type="tel" 
                       placeholder="+52..." 
                       value={newClient.phone}
                       onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                       className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                       title="WhatsApp del cliente"
                     />
                  </div>
                  <div className="space-y-2">
                     <label htmlFor="new_client_balance" className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">Saldo Inicial (Opcional)</label>
                     <input 
                       id="new_client_balance"
                       type="number" 
                       placeholder="0.00" 
                       value={newClient.initial_balance}
                       onChange={(e) => setNewClient({...newClient, initial_balance: e.target.value})}
                       className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none font-mono"
                       title="Saldo inicial"
                     />
                  </div>
               </div>
            </div>

            <div className="flex justify-between items-center mt-12 gap-4">
               <button onClick={() => setView('list')} className="text-sm font-black text-slate-400 uppercase tracking-widest px-4">Cancelar</button>
               <button 
                  onClick={handleSave}
                  className="flex-grow py-4 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest"
               >
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                  Guardar Cliente
               </button>
            </div>
         </div>
      )}

      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredCustomers.length === 0 && !loading && (
             <div className="col-span-full py-20 text-center">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">No se encontraron clientes.</p>
                <button onClick={() => setView('new')} className="mt-4 text-[#56CCF2] text-xs font-black uppercase tracking-widest">Crear mi primer cliente</button>
             </div>
           )}
           {filteredCustomers.map((client) => (
              <div key={client.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                 <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-lg text-[#1D3146] shadow-inner">
                          {client.name.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div>
                          <h3 className="font-black text-[#1D3146] text-lg leading-tight group-hover:text-[#56CCF2] transition-colors">{client.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                             <Phone size={12} />
                             <span className="text-[11px] font-bold">{client.phone_number}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-[#EBEEF2]/50 p-4 rounded-2xl flex items-center justify-between mb-6">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</p>
                       <p className="text-xl font-black text-[#1D3146]">
                          ${(client.balance || 0).toLocaleString()}
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-3">
                    <Link href="/operations" className="flex-1 h-12 bg-[#1D3146] text-white rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase">
                       <Truck size={14} />
                       Entregar
                    </Link>
                    <Link href="/operations" className="flex-1 h-12 bg-[#56CCF2] text-[#1D3146] rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase">
                       <CreditCard size={14} />
                       Cobrar
                    </Link>
                 </div>
              </div>
           ))}
        </div>
      )}

      {view === 'upload' && (
         <div className="max-w-xl mx-auto bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl">
            <h2 className="text-2xl font-black text-[#1D3146] mb-2">Importar Clientes</h2>
            <p className="text-sm text-slate-500 mb-10">Carga tu lista masiva en formato CSV para agilizar la operación de {activeTenant?.name}.</p>
            
            <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center group hover:border-[#56CCF2]/30 transition-all cursor-pointer relative">
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
               <div className="bg-white group-hover:bg-[#56CCF2]/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all">
                  <Upload className="text-slate-400 group-hover:text-[#56CCF2]" size={36} />
               </div>
               <p className="font-black text-[#1D3146]">{file ? file.name : "Subir archivo .csv"}</p>
            </div>

            <div className="flex justify-between items-center mt-10">
               <button onClick={() => setView('list')} className="text-sm font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
               <button 
                  onClick={handleUploadPreview}
                  disabled={!file || isUploading}
                  className="px-8 py-4 bg-[#1D3146] text-white font-black rounded-2xl shadow-xl flex items-center gap-3 disabled:opacity-30 active:scale-95 transition-all"
               >
                  {isUploading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                  Ver Vista Previa
               </button>
            </div>
         </div>
      )}

      {view === 'preview' && preview && (
         <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
            <div className="text-center mb-10">
               <h2 className="text-2xl font-black text-[#1D3146]">Validación de Datos</h2>
               <p className="text-sm text-slate-500 mt-2">Revisa posibles duplicados antes de confirmar.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-10">
               <div className="bg-green-50 p-6 rounded-3xl text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Listos</p>
                  <p className="text-3xl font-black text-green-700">{preview.valid_rows_count}</p>
               </div>
               <div className="bg-rose-50 p-6 rounded-3xl text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Duplicados</p>
                  <p className="text-3xl font-black text-rose-700">{preview.duplicate_rows_count}</p>
               </div>
            </div>

            <div className="flex gap-4">
               <button onClick={() => setView('upload')} className="flex-1 py-4 text-slate-400 font-bold uppercase text-xs tracking-widest">Corregir</button>
               <button 
                onClick={handleCommit}
                className="flex-1 py-4 bg-[#1D3146] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
               >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Confirmar Todo
               </button>
            </div>
         </div>
      )}

    </div>
  );
}
