'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Search,
  Filter,
  ArrowLeft,
  Check,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Save,
  ShoppingBag,
  Zap,
  Star
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  price_menudeo: number;
  price_mayoreo: number;
  price_especial: number;
  quantity: number;
}

interface ImportPreviewRow {
  row_index: number;
  data: {
    sku: string;
    name: string;
    quantity: number;
    price_mayoreo: number;
    price_menudeo: number;
    price_especial: number;
  };
  is_valid: boolean;
  errors: string[];
  is_duplicate: boolean;
}

interface ImportPreviewResponse {
  total_rows: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  duplicate_rows_count: number;
  rows: ImportPreviewRow[];
}

export default function StockPage() {
  const { activeTenant } = useTenant();
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState<'list' | 'preview'>('list');
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);

  // Actions state
  const [editingProduct, setEditingProduct] = useState<ProductStock | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkData, setBulkData] = useState<Record<string, ProductStock>>({});

  const fetchStock = useCallback(async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest('products/stock', 'GET', null, activeTenant.id);
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching stock:', err);
      if (err.status !== 401) {
        setError('No se pudo cargar el inventario');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTenant && step === 'list') {
      fetchStock();
    }
  }, [activeTenant, step, fetchStock]);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este producto del catálogo?') || !activeTenant) return;
    try {
      await apiRequest(`products/${id}`, 'DELETE', null, activeTenant.id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setActiveMenu(null);
    } catch (err: any) {
      setError('Error al eliminar el producto.');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !activeTenant) return;
    setIsSaving(true);
    try {
      const updated = await apiRequest(`products/${editingProduct.id}`, 'PATCH', {
        name: editingProduct.name,
        sku: editingProduct.sku,
        price_menudeo: Number(editingProduct.price_menudeo),
        price_mayoreo: Number(editingProduct.price_mayoreo),
        price_especial: Number(editingProduct.price_especial),
        adjustment_quantity: (editingProduct as any).adjustment_quantity || 0
      }, activeTenant.id);
      
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingProduct(null);
    } catch (err: any) {
      setError('Error al actualizar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const startBulkEdit = () => {
    const data: Record<string, ProductStock> = {};
    products.forEach(p => {
      data[p.id] = { ...p };
    });
    setBulkData(data);
    setIsBulkEditing(true);
  };

  const handleBulkChange = (id: string, field: keyof ProductStock, value: any) => {
    setBulkData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const saveBulkEdit = async () => {
    if (!activeTenant) return;
    setIsSaving(true);
    try {
      const promises = Object.values(bulkData).map(p => {
        const original = products.find(op => op.id === p.id);
        const adjustment = original ? (Number(p.quantity) - original.quantity) : 0;

        return apiRequest(`products/${p.id}`, 'PATCH', {
          name: p.name,
          sku: p.sku,
          price_menudeo: Number(p.price_menudeo),
          price_mayoreo: Number(p.price_mayoreo),
          price_especial: Number(p.price_especial),
          adjustment_quantity: adjustment
        }, activeTenant.id);
      });
      
      await Promise.all(promises);
      await fetchStock();
      setIsBulkEditing(false);
      setMessage('✅ Catálogo y Stock actualizados correctamente.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError('Error al guardar algunos productos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilePreview = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeTenant) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await apiRequest('products/import/preview', 'POST', formData, activeTenant.id);
      setPreviewData(data);
      setStep('preview');
      event.target.value = '';
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo CSV.');
    } finally {
      setUploading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData || !activeTenant) return;
    setUploading(true);
    try {
      const validRows = previewData.rows.filter(r => r.is_valid).map(r => r.data);
      await apiRequest('products/import/commit', 'POST', { rows: validRows }, activeTenant.id);
      setMessage(`✅ Catálogo actualizado: ${validRows.length} productos procesados.`);
      setStep('list');
      setPreviewData(null);
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setError('Error al confirmar la importación.');
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = products.filter(p => 
     p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (step === 'preview' && previewData) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setStep('list')} className="flex items-center gap-2 text-slate-500 hover:text-[#1D3146] font-bold">
            <ArrowLeft size={20} /> Volver al inventario
          </button>
          <div className="flex gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-700 text-sm font-bold border border-blue-100">
              {previewData.valid_rows_count} filas válidas
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex-grow flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
             <div>
                <h2 className="text-2xl font-black text-[#1D3146]">Vista Previa</h2>
             </div>
             <button 
                onClick={handleCommitImport}
                disabled={uploading || previewData.valid_rows_count === 0}
                className="bg-[#1D3146] text-white px-10 py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-[#1D3146]/20"
             >
                {uploading ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                Confirmar Importación
             </button>
          </div>
          <div className="flex-grow overflow-auto p-4">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2">
                    <th className="px-6 py-4">Status</th>
                    <th className="px-4 py-4">SKU</th>
                    <th className="px-4 py-4">Producto</th>
                    <th className="px-4 py-4 text-center">Ménudeo</th>
                    <th className="px-4 py-4 text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {previewData.rows.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 ${!row.is_valid ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4">{row.is_valid ? <CheckCircle2 className="text-green-500" size={18} /> : <X className="text-red-500" size={18} />}</td>
                      <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{row.data.sku}</td>
                      <td className="px-4 py-4 font-bold text-[#1D3146]">{row.data.name}</td>
                      <td className="px-4 py-4 text-center font-black">${row.data.price_menudeo.toFixed(2)}</td>
                      <td className="px-4 py-4 text-center font-black text-[#56CCF2]">{row.data.quantity}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 h-full px-4 relative min-h-screen pb-20">
      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D3146]/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-2xl font-black text-[#1D3146]">Editar Producto</h2>
                 <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X size={24} />
                 </button>
              </div>
              <form onSubmit={handleUpdateProduct} className="p-8 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Nombre del Producto</label>
                        <input 
                          type="text" required
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-bold text-[#1D3146]"
                          value={editingProduct.name}
                          onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">SKU / CÓDIGO</label>
                        <input 
                          type="text"
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-mono font-bold text-[#1D3146]"
                          value={editingProduct.sku}
                          onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Precio Menudeo</label>
                        <div className="relative">
                           <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input 
                             type="number" step="0.01" required
                             className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-black text-[#1D3146]"
                             value={editingProduct.price_menudeo}
                             onChange={e => setEditingProduct({...editingProduct, price_menudeo: Number(e.target.value)})}
                           />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Precio Mayoreo</label>
                        <div className="relative">
                           <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input 
                             type="number" step="0.01" required
                             className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-black text-[#1D3146]"
                             value={editingProduct.price_mayoreo}
                             onChange={e => setEditingProduct({...editingProduct, price_mayoreo: Number(e.target.value)})}
                           />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 px-2">Precio Especial</label>
                        <div className="relative">
                           <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input 
                             type="number" step="0.01" required
                             className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-[#56CCF2] outline-none font-black text-[#1D3146]"
                             value={editingProduct.price_especial}
                             onChange={e => setEditingProduct({...editingProduct, price_especial: Number(e.target.value)})}
                           />
                        </div>
                    </div>
                    <div className="md:col-span-2 bg-[#56CCF2]/5 p-6 rounded-3xl border border-[#56CCF2]/10">
                        <label className="block text-[10px] uppercase font-black text-[#56CCF2] tracking-widest mb-3 px-2">Ajustar Unidades (Stock)</label>
                        <div className="flex items-center gap-4">
                           <div className="flex-grow">
                              <input 
                                type="number" 
                                placeholder="Ej: 10 o -5"
                                className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-[#56CCF2]/20 focus:border-[#56CCF2] outline-none font-black text-[#1D3146]"
                                value={(editingProduct as any).adjustment_quantity || ''}
                                onChange={e => setEditingProduct({...editingProduct, adjustment_quantity: Number(e.target.value)} as any)}
                              />
                           </div>
                           <div className="text-right pr-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actual</p>
                              <p className="text-xl font-black text-[#1D3146]">{editingProduct.quantity}</p>
                           </div>
                        </div>
                        <p className="mt-2 text-[10px] font-medium text-slate-400 px-2 italic">Ingresa un valor positivo para sumar o negativo para restar del stock actual.</p>
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-4 text-slate-400 font-bold">Cancelar</button>
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="flex-1 bg-[#1D3146] text-white py-4 rounded-2xl font-black shadow-xl shadow-[#1D3146]/20 transition-all flex items-center justify-center gap-2"
                    >
                       {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                       Guardar Producto
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Main UI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <Package className="text-[#56CCF2]" size={36} /> Catálogo
            </h1>
         </div>
         <div className="flex gap-4">
            {!isBulkEditing ? (
              <>
                <button 
                  onClick={startBulkEdit}
                  className="flex items-center gap-2 px-6 py-3 bg-[#56CCF2]/20 text-[#1D3146] text-sm font-bold rounded-2xl hover:bg-[#56CCF2]/30 transition-all border border-[#56CCF2]/30"
                >
                  <Pencil size={18} />
                  <span>Edición Rápida</span>
                </button>
                <label className={`cursor-pointer flex items-center gap-2 px-6 py-3 bg-[#1D3146] text-white text-sm font-bold rounded-2xl hover:scale-105 transition-all shadow-xl shadow-[#1D3146]/20 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                  <span>{uploading ? 'Procesando...' : 'Importar Catálogo'}</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleFilePreview} />
                </label>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsBulkEditing(false)}
                  className="px-6 py-3 text-slate-400 font-bold hover:text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveBulkEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white text-sm font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-green-500/20"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                  <span>Guardar Cambios</span>
                </button>
              </>
            )}
         </div>
      </div>

      {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl font-bold flex items-center gap-3 border border-red-100">{error}</div>}
      {message && <div className="mb-6 bg-green-50 text-green-600 p-4 rounded-2xl font-bold flex items-center gap-3 border border-green-100">{message}</div>}

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex-grow flex flex-col">
         <div className="relative flex-grow max-w-md mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Buscar por nombre o SKU..." 
              className="w-full pl-12 pr-4 py-3 bg-[#EBEEF2] border-none rounded-2xl text-sm font-semibold text-[#1D3146] focus:ring-2 focus:ring-[#56CCF2]/30 outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="overflow-auto rounded-3xl border border-slate-50 shadow-sm flex-grow min-h-[400px]">
            <table className="w-full text-left border-collapse">
                <thead className="bg-[#1D3146] text-white sticky top-0 z-10">
                   <tr className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      <th className="px-8 py-5">Producto</th>
                      <th className="px-4 py-5">SKU</th>
                      <th className="px-4 py-5 text-center">Stock</th>
                      <th className="px-4 py-5 text-right">Menudeo</th>
                      <th className="px-4 py-5 text-right font-black text-[#56CCF2]">Mayoreo</th>
                      <th className="px-4 py-5 text-right font-black text-[#F2C94C]">Especial</th>
                      <th className="pr-8 py-5 text-right">Acciones</th>
                   </tr>
                </thead>
               <tbody className="divide-y divide-slate-50">
                   {loading ? (
                     <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#56CCF2]" size={32} /></td></tr>
                   ) : filteredProducts.map((p) => {
                     const isEditingRow = isBulkEditing && bulkData[p.id];
                     const displayData = isEditingRow ? bulkData[p.id] : p;

                     return (
                       <tr key={p.id} className={`group hover:bg-slate-50 transition-all font-medium ${isEditingRow ? 'bg-[#56CCF2]/5' : ''}`}>
                          <td className="px-8 py-5">
                             {isEditingRow ? (
                               <input 
                                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-[#56CCF2]"
                                 value={displayData.name}
                                 onChange={e => handleBulkChange(p.id, 'name', e.target.value)}
                               />
                             ) : (
                               <span className="font-bold text-[#1D3146] group-hover:text-[#56CCF2] transition-colors">{p.name}</span>
                             )}
                          </td>
                          <td className="px-4 py-5">
                             {isEditingRow ? (
                               <input 
                                 className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-mono font-bold outline-none focus:border-[#56CCF2]"
                                 value={displayData.sku}
                                 onChange={e => handleBulkChange(p.id, 'sku', e.target.value)}
                               />
                             ) : (
                               <span className="font-mono text-[10px] font-bold text-slate-400">{p.sku || 'N/A'}</span>
                             )}
                          </td>
                          <td className="px-4 py-5 text-center">
                             {isEditingRow ? (
                               <input 
                                 type="number"
                                 className="w-20 text-center bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-black outline-none focus:border-[#56CCF2]"
                                 value={displayData.quantity}
                                 onChange={e => handleBulkChange(p.id, 'quantity', Number(e.target.value))}
                               />
                             ) : (
                               <span className={`px-3 py-1 rounded-xl text-[10px] font-black ${p.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {p.quantity} unid.
                               </span>
                             )}
                          </td>
                          <td className="px-4 py-5 text-right">
                             {isEditingRow ? (
                               <input 
                                 type="number"
                                 className="w-24 text-right bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-black outline-none focus:border-[#56CCF2]"
                                 value={displayData.price_menudeo}
                                 onChange={e => handleBulkChange(p.id, 'price_menudeo', e.target.value)}
                               />
                             ) : (
                               <span className="font-black text-[#1D3146]">${p.price_menudeo.toFixed(2)}</span>
                             )}
                          </td>
                          <td className="px-4 py-5 text-right font-black text-slate-500">
                             {isEditingRow ? (
                               <input 
                                 type="number"
                                 className="w-24 text-right bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-black outline-none focus:border-[#1D3146]"
                                 value={displayData.price_mayoreo}
                                 onChange={e => handleBulkChange(p.id, 'price_mayoreo', e.target.value)}
                               />
                             ) : (
                               <span>${p.price_mayoreo.toFixed(2)}</span>
                             )}
                          </td>
                          <td className="px-4 py-5 text-right font-black text-slate-500">
                             {isEditingRow ? (
                               <input 
                                 type="number"
                                 className="w-24 text-right bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-black outline-none focus:border-[#F2C94C]"
                                 value={displayData.price_especial}
                                 onChange={e => handleBulkChange(p.id, 'price_especial', e.target.value)}
                               />
                             ) : (
                               <span>${p.price_especial.toFixed(2)}</span>
                             )}
                          </td>
                          <td className="pr-8 py-5 text-right relative">
                             {!isBulkEditing ? (
                               <div className="flex items-center justify-end gap-2 text-slate-400">
                                  <button 
                                    onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)}
                                    className={`p-2 hover:bg-slate-100 rounded-lg transition-colors ${activeMenu === p.id ? 'bg-slate-100 text-[#1D3146]' : ''}`}
                                  >
                                    <MoreVertical size={18} />
                                  </button>
                                  {activeMenu === p.id && (
                                    <div className="absolute right-8 top-12 z-20 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2">
                                       <button onClick={() => { setEditingProduct(p); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-[#56CCF2]/5 hover:text-[#56CCF2] rounded-xl transition-all">
                                          <Pencil size={16} /> Editar
                                       </button>
                                       <div className="h-px bg-slate-50 my-1"></div>
                                       <button onClick={() => handleDeleteProduct(p.id)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">
                                          <Trash2 size={16} /> Eliminar
                                       </button>
                                    </div>
                                  )}
                               </div>
                             ) : (
                               <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest italic pr-2">Editando...</span>
                             )}
                          </td>
                       </tr>
                     );
                   })}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
