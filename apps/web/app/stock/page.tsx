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
        price_especial: Number(editingProduct.price_especial)
      }, activeTenant.id);
      
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingProduct(null);
    } catch (err: any) {
      setError('Error al actualizar el producto.');
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
            <label className={`cursor-pointer flex items-center gap-2 px-6 py-3 bg-[#1D3146] text-white text-sm font-bold rounded-2xl hover:scale-105 transition-all shadow-xl shadow-[#1D3146]/20 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
               {uploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
               <span>{uploading ? 'Procesando...' : 'Importar Catálogo'}</span>
               <input type="file" className="hidden" accept=".csv" onChange={handleFilePreview} />
            </label>
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
                    <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#56CCF2]" size={32} /></td></tr>
                  ) : filteredProducts.map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50 transition-all font-medium">
                       <td className="px-8 py-5 font-bold text-[#1D3146] group-hover:text-[#56CCF2] transition-colors">{p.name}</td>
                       <td className="px-4 py-5 font-mono text-[10px] font-bold text-slate-400">{p.sku || 'N/A'}</td>
                       <td className="px-4 py-5 text-center">
                          <span className={`px-3 py-1 rounded-xl text-[10px] font-black ${p.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {p.quantity} unid.
                          </span>
                       </td>
                       <td className="px-4 py-5 text-right font-black text-[#1D3146]">${p.price_menudeo.toFixed(2)}</td>
                       <td className="px-4 py-5 text-right font-black text-slate-500">${p.price_mayoreo.toFixed(2)}</td>
                       <td className="px-4 py-5 text-right font-black text-slate-500">${p.price_especial.toFixed(2)}</td>
                       <td className="pr-8 py-5 text-right relative">
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
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
