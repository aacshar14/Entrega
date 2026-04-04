'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Plus,
  ArrowRight,
  Search,
  MoreVertical,
  Mail,
  Phone,
  History
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';

interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  tier: string;
  notes?: string;
  created_at: string;
}

interface ImportRow {
  row_index: number;
  data: {
    name: string;
    phone: string;
    email: string;
    initial_balance: number;
    notes: string;
    tier: string;
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
  const { activeTenant, isLoading: isContextLoading } = useTenant();
  const [step, setStep] = useState<'list' | 'upload' | 'preview' | 'summary'>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Import state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [summary, setSummary] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadCustomers = useCallback(async () => {
    if (!activeTenant) return;
    setIsDataLoading(true);
    try {
      const data = await apiRequest('customers', 'GET', null, activeTenant.id);
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setError('No se pudieron cargar los clientes.');
    } finally {
      setIsDataLoading(false);
    }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTenant && step === 'list') {
      loadCustomers();
    }
  }, [activeTenant, step, loadCustomers]);

  const downloadTemplate = () => {
    const csvContent = "name,phone,email,initial_balance,notes,tier\nAna,+528781111111,ana@email.com,650,Cliente frecuente,menudeo\nLuis,+528782222222,,300,,mayoreo";
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
    if (!file || !activeTenant) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Resolve session for FormData upload (manual fetch)
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.entrega.space'}/api/v1/customers/import/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'X-Tenant-Id': activeTenant.id
        },
        body: formData
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: 'Error en el servidor' }));
        throw new Error(errData.detail || 'Error al procesar el archivo CSV');
      }
      
      const data = await response.json();
      setPreview(data);
      setStep('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || !activeTenant) return;
    setIsCommitting(true);
    setError(null);
    try {
      const validRows = preview.rows.filter(r => r.is_valid).map(r => r.data);
      const data = await apiRequest('customers/import/commit', 'POST', { rows: validRows }, activeTenant.id);
      
      setSummary({ created: data.created_count, skipped: data.skipped_duplicates });
      setStep('summary');
    } catch (err: any) {
       setError(err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone_number?.includes(searchTerm)
  );

  if (isContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#56CCF2]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <Users className="text-[#56CCF2]" size={36} />
               Gestión de Clientes
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic">
                {activeTenant?.name} — {customers.length} clientes registrados
            </p>
         </div>
         
         <div className="flex gap-3">
            <button 
              onClick={downloadTemplate}
              className="px-4 py-2.5 bg-white text-slate-700 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
               <Download size={18} />
               Plantilla
            </button>
            <button 
              onClick={() => { setStep('upload'); setError(null); }}
              className="px-4 py-2.5 bg-white text-[#1D3146] text-sm font-bold rounded-xl border-2 border-[#1D3146]/10 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
               <Upload size={18} />
               Importar CSV
            </button>
            <button 
              className="px-6 py-2.5 bg-[#1D3146] text-white text-sm font-bold rounded-xl hover:bg-[#2B4764] transition-all flex items-center gap-2 shadow-lg shadow-[#1D3146]/10"
            >
               <Plus size={20} />
               Nuevo Cliente
            </button>
         </div>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 text-red-600 p-4 rounded-2xl font-bold flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-4">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Main List View */}
      {step === 'list' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o teléfono..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-[#56CCF2] transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isDataLoading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
              <Loader2 className="animate-spin text-slate-300 mx-auto" size={48} />
              <p className="text-slate-400 mt-4 font-bold">Cargando clientes...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-20 text-center">
              <div className="bg-[#EBEEF2] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Users className="text-slate-300" size={40} />
              </div>
              <h2 className="text-2xl font-black text-[#1D3146]">Aún no hay clientes</h2>
              <p className="text-slate-500 mt-3 max-w-sm mx-auto font-medium">Comienza importando tu lista actual para empezar a registrar entregas y pagos.</p>
              
              <button 
                onClick={() => setStep('upload')}
                className="mt-10 px-8 py-3.5 bg-[#56CCF2] text-white font-black rounded-2xl flex items-center gap-2 mx-auto hover:scale-105 transition-all shadow-xl shadow-[#56CCF2]/30"
              >
                  <Upload size={20} />
                  Importar Primer CSV
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-[0.15em]">
                      <th className="pl-8 py-5">Cliente</th>
                      <th className="px-6 py-5">Contacto</th>
                      <th className="px-6 py-5">Nivel</th>
                      <th className="px-6 py-5">Saldo</th>
                      <th className="pr-8 py-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="pl-8 py-5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#1D3146]/5 flex items-center justify-center text-[#1D3146] font-black text-sm">
                                    {customer.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-[#1D3146]">{customer.name}</p>
                                    <p className="text-xs text-slate-400 font-medium">{customer.notes || 'Sin notas'}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-5">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                    <Phone size={14} className="text-slate-300" />
                                    {customer.phone_number || '—'}
                                </div>
                                {customer.email && (
                                    <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                                        <Mail size={12} />
                                        {customer.email}
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-5">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                                customer.tier === 'mayoreo' ? 'bg-purple-100 text-purple-700' :
                                customer.tier === 'especial' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {customer.tier}
                            </span>
                        </td>
                        <td className="px-6 py-5 font-black text-[#1D3146]">
                            $0.00
                        </td>
                        <td className="pr-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <History size={18} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      )}

      {/* ... (Keep existing Step upload/preview/summary UI but ensures they use correct activeTenantId) */}
      {step === 'upload' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-10">
           <h2 className="text-2xl font-black text-[#1D3146] mb-2 tracking-tight">Importar Clientes</h2>
           <p className="text-slate-500 mb-8 font-medium">Carga tu archivo CSV con el formato de la plantilla.</p>
           
           <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:border-[#56CCF2] transition-colors group cursor-pointer relative bg-slate-50/50">
              <input 
                type="file" 
                accept=".csv" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
              />
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 shadow-sm transition-transform">
                 <Upload className="text-[#56CCF2]" size={28} />
              </div>
              <p className="font-bold text-slate-700">{file ? file.name : "Selecciona tu archivo CSV"}</p>
              <p className="text-xs text-slate-400 mt-2 font-medium italic">Máximo 5MB (Solo archivos .csv)</p>
           </div>

           <div className="flex justify-between mt-10">
              <button 
                onClick={() => setStep('list')} 
                className="px-6 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
               >
                  Cancelar
               </button>
              <button 
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="px-8 py-3 bg-[#1D3146] text-white font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-[#1D3146]/20 hover:scale-105 transition-all disabled:opacity-50"
              >
                 {isUploading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                 Ver Vista Previa
              </button>
           </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                 <h2 className="text-xl font-bold text-[#1D3146]">Vista Previa de Importación</h2>
                 <p className="text-sm text-slate-500 mt-1">Verificamos duplicados y formatos antes de procesar.</p>
              </div>
              <div className="flex gap-4 text-xs font-black uppercase tracking-widest leading-none">
                 <div className="bg-green-100 text-green-700 px-4 py-2.5 rounded-xl border border-green-200">Válidos: {preview.valid_rows_count}</div>
                 <div className="bg-red-100 text-red-700 px-4 py-2.5 rounded-xl border border-red-200">Errores: {preview.invalid_rows_count}</div>
                 <div className="bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl border border-amber-200">Duplicados: {preview.duplicate_rows_count}</div>
              </div>
           </div>

           <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                       <th className="px-8 py-4">Fila</th>
                       <th className="px-4 py-4">Nombre</th>
                       <th className="px-4 py-4">Teléfono</th>
                       <th className="px-4 py-4">Nivel</th>
                       <th className="px-4 py-4">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {preview.rows.map((row, idx) => (
                       <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${!row.is_valid ? 'bg-red-50/30' : ''}`}>
                          <td className="px-8 py-4 text-slate-400 font-mono text-xs">#{row.row_index}</td>
                          <td className="px-4 py-4 font-bold text-[#1D3146] text-sm">{row.data.name}</td>
                          <td className="px-4 py-4 text-slate-500 text-sm font-medium">{row.data.phone || '—'}</td>
                          <td className="px-4 py-4">
                              <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">{row.data.tier}</span>
                          </td>
                          <td className="px-4 py-4">
                             {row.is_valid ? (
                                <div className="flex items-center gap-2">
                                   <CheckCircle2 size={16} className="text-green-500" />
                                   {row.is_duplicate ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black">DUPLICADO</span> : <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Listo</span>}
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 text-red-500 animate-pulse">
                                   <AlertCircle size={16} />
                                   <span className="text-xs font-bold">{row.errors[0]}</span>
                                </div>
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
              <p className="text-xs text-slate-400 italic max-w-xs font-medium">Nota: No se importarán las filas con error ni los clientes duplicados en este negocio.</p>
              <div className="flex gap-4">
                 <button onClick={() => setStep('upload')} className="px-6 py-3 text-slate-500 font-bold">Atrás</button>
                 <button 
                  onClick={handleCommit}
                  disabled={preview.valid_rows_count === 0 || isCommitting}
                  className="px-10 py-3 bg-[#1D3146] text-white font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-[#1D3146]/30 hover:scale-105 transition-all disabled:opacity-50"
                 >
                    {isCommitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                    Procesar Importación
                 </button>
              </div>
           </div>
        </div>
      )}

      {step === 'summary' && summary && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-10 text-center animate-in zoom-in-95">
           <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle2 className="text-green-600" size={48} />
           </div>
           <h2 className="text-3xl font-black text-[#1D3146] tracking-tight">¡Éxito!</h2>
           <p className="text-slate-500 mt-2 mb-10 font-medium">La base de datos se ha actualizado correctamente.</p>
           
           <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-[#EBEEF2] p-6 rounded-3xl border border-slate-100 shadow-sm">
                 <p className="text-3xl font-black text-[#1D3146]">{summary.created}</p>
                 <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">Registrados</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
                 <p className="text-3xl font-black text-slate-400">{summary.skipped}</p>
                 <p className="text-[10px] uppercase font-black text-slate-300 mt-1 tracking-widest">Omitidos</p>
              </div>
           </div>

           <button 
             onClick={() => { setStep('list'); setFile(null); setPreview(null); }}
             className="w-full py-4 bg-[#1D3146] text-white font-black rounded-2xl hover:bg-[#2B4764] transition-all shadow-xl shadow-[#1D3146]/20"
           >
              Ver Cartera Actualizada
           </button>
        </div>
      )}
    </div>
  );
}
