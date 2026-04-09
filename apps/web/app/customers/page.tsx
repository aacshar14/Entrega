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
  History,
  Pencil,
  Trash2,
  X,
  Save
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
  balance?: number;
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

  // Actions state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone_number: '',
    email: '',
    tier: 'menudeo',
    notes: ''
  });
  const [confirmingLiquidation, setConfirmingLiquidation] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?') || !activeTenant) return;
    try {
      await apiRequest(`customers/${id}`, 'DELETE', null, activeTenant.id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setActiveMenu(null);
    } catch (err: any) {
      setError('Error al eliminar el cliente.');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setIsSaving(true);
    try {
      const created = await apiRequest('customers', 'POST', newCustomer, activeTenant.id);
      setCustomers(prev => [created, ...prev]);
      setIsAddingCustomer(false);
      setNewCustomer({ name: '', phone_number: '', email: '', tier: 'menudeo', notes: '' });
    } catch (err: any) {
      setError('Error al crear el cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !activeTenant) return;
    setIsSaving(true);
    try {
      const updated = await apiRequest(`customers/${editingCustomer.id}`, 'PATCH', {
        name: editingCustomer.name,
        phone_number: editingCustomer.phone_number,
        email: editingCustomer.email,
        notes: editingCustomer.notes,
        tier: editingCustomer.tier,
        balance: editingCustomer.balance
      }, activeTenant.id);
      
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingCustomer(null);
    } catch (err: any) {
      setError('Error al actualizar el cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearTotalDebt = async (customer: Customer) => {
    setIsDataLoading(true);
    try {
      await apiRequest('payments/clear-total', 'POST', {
        customer_id: customer.id,
        method: 'cash' 
      }, activeTenant?.id || '');
      
      await loadCustomers();
      setConfirmingLiquidation(null);
      setActiveMenu(null);
    } catch (err: any) {
      setError('Error al liquidar la deuda.');
    } finally {
      setIsDataLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Nombre,Teléfono,Correo,Saldo,Notas,Nivel\nAna,+528781111111,ana@email.com,650,Cliente frecuente,menudeo\nLuis,+528782222222,,300,,mayoreo";
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
    (c.phone_number && c.phone_number.includes(searchTerm))
  );

  if (isContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#56CCF2]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 relative min-h-screen pb-20">
      {/* Create Modal */}
      {isAddingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D3146]/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-2xl font-black text-[#1D3146]">Nuevo Cliente</h2>
                 <button onClick={() => setIsAddingCustomer(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X size={24} />
                 </button>
              </div>
              <form onSubmit={handleCreateCustomer} className="p-8 space-y-6">
                 <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Nombre Completo</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Juan Pérez"
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Teléfono</label>
                        <input 
                          type="text"
                          required
                          placeholder="+52..."
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all"
                          value={newCustomer.phone_number}
                          onChange={e => setNewCustomer({...newCustomer, phone_number: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Nivel</label>
                        <select 
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all appearance-none"
                          value={newCustomer.tier}
                          onChange={e => setNewCustomer({...newCustomer, tier: e.target.value})}
                        >
                           <option value="menudeo">Menudeo</option>
                           <option value="mayoreo">Mayoreo</option>
                           <option value="especial">Especial</option>
                        </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Correo (Opcional)</label>
                    <input 
                      type="email"
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Notas / Referencias</label>
                    <textarea 
                      rows={3}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all"
                      value={newCustomer.notes}
                      onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                    />
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsAddingCustomer(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600">Cancelar</button>
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="flex-1 bg-[#1D3146] text-white py-4 rounded-2xl font-black shadow-xl shadow-[#1D3146]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                       Crear Cliente
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D3146]/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-2xl font-black text-[#1D3146]">Editar Cliente</h2>
                 <button onClick={() => setEditingCustomer(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X size={24} />
                 </button>
              </div>
              <form onSubmit={handleUpdateCustomer} className="p-8 space-y-6">
                 <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Nombre Completo</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all"
                      value={editingCustomer.name}
                      onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Teléfono</label>
                        <input 
                          type="text"
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all"
                          value={editingCustomer.phone_number || ''}
                          onChange={e => setEditingCustomer({...editingCustomer, phone_number: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Nivel</label>
                        <select 
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all appearance-none"
                          value={editingCustomer.tier}
                          onChange={e => setEditingCustomer({...editingCustomer, tier: e.target.value})}
                        >
                           <option value="menudeo">Menudeo</option>
                           <option value="mayoreo">Mayoreo</option>
                           <option value="especial">Especial</option>
                        </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Saldo Actual ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full px-6 py-4 bg-blue-50/50 text-blue-700 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-black text-lg transition-all"
                      value={editingCustomer.balance || 0}
                      onChange={e => setEditingCustomer({...editingCustomer, balance: parseFloat(e.target.value) || 0})}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Correo (Opcional)</label>
                    <input 
                      type="email"
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all"
                      value={editingCustomer.email || ''}
                      onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Notas / Referencias</label>
                    <textarea 
                      rows={3}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146] transition-all"
                      value={editingCustomer.notes || ''}
                      onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                    />
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setEditingCustomer(null)} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600">Cancelar</button>
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="flex-1 bg-[#1D3146] text-white py-4 rounded-2xl font-black shadow-xl shadow-[#1D3146]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                       Guardar Cambios
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <Users className="text-[#56CCF2]" size={36} />
               Clientes
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic">
                {activeTenant?.name} — {customers.length} registros activos.
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
              onClick={() => setIsAddingCustomer(true)}
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
              <p className="text-slate-400 mt-4 font-bold">Cargando...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-20 text-center">
              <div className="bg-[#EBEEF2] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Users className="text-slate-300" size={40} />
              </div>
              <h2 className="text-2xl font-black text-[#1D3146]">Aún no hay clientes</h2>
              <button 
                onClick={() => setStep('upload')}
                className="mt-10 px-8 py-3.5 bg-[#56CCF2] text-white font-black rounded-2xl flex items-center gap-2 mx-auto"
              >
                  <Upload size={20} />
                  Importar CSV
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[700px]">
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
                            <div className="space-y-1 font-medium">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
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
                            <span className={customer.balance && customer.balance < 0 ? 'text-red-500' : 'text-slate-600'}>
                                ${Math.abs(customer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </td>
                        <td className="pr-8 py-5 text-right relative">
                            <div className="flex items-center justify-end gap-2 text-slate-400">
                                <button
                                  onClick={() => setActiveMenu(activeMenu === customer.id ? null : customer.id)}
                                  className={`p-2 hover:bg-slate-100 rounded-lg transition-colors ${activeMenu === customer.id ? 'bg-slate-100 text-[#1D3146]' : ''}`}
                                >
                                    <MoreVertical size={18} />
                                </button>
                                
                                {activeMenu === customer.id && (
                                  <div className="absolute right-8 top-12 z-20 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                     <button 
                                      onClick={() => { setEditingCustomer(customer); setActiveMenu(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-[#56CCF2]/5 hover:text-[#56CCF2] rounded-xl transition-all"
                                     >
                                        <Pencil size={16} />
                                        Editar
                                     </button>
                                     {customer.balance && customer.balance < 0 && (
                                         <button 
                                           onClick={() => { setConfirmingLiquidation(customer); setActiveMenu(null); }}
                                           className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                         >
                                           <CheckCircle2 size={16} />
                                           Liquidar Deuda
                                        </button>
                                      )}
                                     <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 cursor-not-allowed rounded-xl transition-all">
                                        <History size={16} />
                                        Historial
                                     </button>
                                     <div className="h-px bg-slate-50 my-1"></div>
                                     <button 
                                      onClick={() => handleDeleteCustomer(customer.id)}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                     >
                                        <Trash2 size={16} />
                                        Eliminar
                                     </button>
                                  </div>
                                )}
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

      {/* Branded Liquidation Modal */}
      {confirmingLiquidation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1D3146]/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
              <div className="p-10 text-center">
                 <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-inner">
                    <CheckCircle2 size={40} />
                 </div>
                 <h2 className="text-3xl font-black text-[#1D3146] mb-4 tracking-tighter">¡Liquidación VIP!</h2>
                 <p className="text-slate-500 font-medium leading-relaxed mb-8">
                    ¿Confirmas la recepción de <span className="text-emerald-600 font-black">${Math.abs(confirmingLiquidation.balance || 0).toLocaleString()}</span> para saldar la cuenta de <span className="text-[#1D3146] font-bold">{confirmingLiquidation.name}</span>?
                    <br/><br/>
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Esta acción liberará el inventario en tránsito.</span>
                 </p>

                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setConfirmingLiquidation(null)}
                      className="px-6 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                    >
                       Cancelar
                    </button>
                    <button 
                      onClick={() => handleClearTotalDebt(confirmingLiquidation)}
                      disabled={isDataLoading}
                      className="px-6 py-4 bg-[#1D3146] text-white font-black rounded-2xl shadow-xl shadow-[#1D3146]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       {isDataLoading ? <Loader2 className="animate-spin" size={20} /> : "Confirmar Pago"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Step upload/preview/summary UI remains similar but ensures proxy use */}
      {step === 'upload' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-10 mt-10">
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden mt-10 animate-in fade-in zoom-in-95 duration-300">
           {/* ... (Existing preview UI) */}
           <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                 <h2 className="text-xl font-bold text-[#1D3146]">Vista Previa de Importación</h2>
              </div>
              <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                 <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl">Válidos: {preview.valid_rows_count}</div>
                 <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl">Errores: {preview.invalid_rows_count}</div>
                 <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl">Duplicados: {preview.duplicate_rows_count}</div>
              </div>
           </div>

           <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left">
                 <thead>
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                       <th className="px-8 py-4">Fila</th>
                       <th className="px-4 py-4">Nombre</th>
                       <th className="px-4 py-4">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {preview.rows.map((row, idx) => (
                       <tr key={idx} className={`hover:bg-slate-50/80 ${!row.is_valid ? 'bg-red-50/30' : ''}`}>
                          <td className="px-8 py-4 text-slate-400 font-mono text-xs">#{row.row_index}</td>
                          <td className="px-4 py-4 font-bold text-[#1D3146] text-sm">{row.data.name}</td>
                          <td className="px-4 py-4">
                             {row.is_valid ? (
                                <CheckCircle2 size={16} className="text-green-500" />
                             ) : (
                                <span className="text-red-500 text-xs font-bold">{row.errors[0]}</span>
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           <div className="p-8 bg-slate-50 border-t flex justify-end gap-4">
              <button onClick={() => setStep('upload')} className="px-6 py-3 text-slate-500 font-bold">Atrás</button>
              <button 
               onClick={handleCommit}
               disabled={preview.valid_rows_count === 0 || isCommitting}
               className="px-10 py-3 bg-[#1D3146] text-white font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-[#1D3146]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                 {isCommitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                 Procesar
              </button>
           </div>
        </div>
      )}

      {step === 'summary' && summary && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-10 text-center mt-10 animate-in zoom-in-95">
           <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle2 className="text-green-600" size={48} />
           </div>
           <h2 className="text-3xl font-black text-[#1D3146] tracking-tight">¡Importación Exitosa!</h2>
           <p className="text-slate-500 mt-2 mb-10 font-medium">Se han procesado {summary.created} registros nuevos.</p>
           
           <button 
             onClick={() => { setStep('list'); setFile(null); setPreview(null); }}
             className="w-full py-4 bg-[#1D3146] text-white font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-[#1D3146]/20"
           >
              Volver a la Cartera
           </button>
        </div>
      )}
    </div>
  );
}
