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
  X
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  price: number;
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
      event.target.value = ''; // Reset input
    } catch (err: any) {
      console.error('Preview error:', err);
      setError(err.message || 'Error al procesar el archivo CSV.');
    } finally {
      setUploading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData || !activeTenant) return;

    setUploading(true);
    setError(null);

    const validRows = previewData.rows.filter(r => r.is_valid).map(r => r.data);
    
    try {
      await apiRequest('products/import/commit', 'POST', { rows: validRows }, activeTenant.id);
      setMessage(`✅ Se han importado/actualizado perfectamente ${validRows.length} productos.`);
      setStep('list');
      setPreviewData(null);
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      console.error('Commit error:', err);
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
          <button 
            onClick={() => setStep('list')}
            className="flex items-center gap-2 text-slate-500 hover:text-[#1D3146] font-bold transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al inventario
          </button>
          
          <div className="flex gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-700 text-sm font-bold border border-blue-100 italic">
              {previewData.valid_rows_count} filas válidas listas
            </div>
            {previewData.duplicate_rows_count > 0 && (
              <div className="bg-orange-50 px-4 py-2 rounded-xl text-orange-700 text-sm font-bold border border-orange-100 italic">
                {previewData.duplicate_rows_count} actualizaciones/duplicados
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex-grow flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
             <div>
                <h2 className="text-2xl font-black text-[#1D3146]">Vista Previa del Catálogo</h2>
                <p className="text-slate-400 text-sm font-medium italic">Confirma los precios y SKU antes de guardarlos.</p>
             </div>
             <button 
                onClick={handleCommitImport}
                disabled={uploading || previewData.valid_rows_count === 0}
                className="bg-[#56CCF2] text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-[#56CCF2]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
             >
                {uploading ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                Confirmar e Importar Todo
             </button>
          </div>

          <div className="flex-grow overflow-auto p-4">
             <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b-2 border-slate-100">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4">Status</th>
                    <th className="px-4 py-4">SKU</th>
                    <th className="px-4 py-4">Producto</th>
                    <th className="px-4 py-4 text-center">Menudeo</th>
                    <th className="px-4 py-4 text-center">Mayoreo</th>
                    <th className="px-4 py-4 text-center">Especial</th>
                    <th className="px-4 py-4 text-center">Stock Inicial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {previewData.rows.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${!row.is_valid ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        {row.is_valid ? (
                          row.is_duplicate ? (
                            <div className="text-orange-500 font-bold text-[10px] flex items-center gap-1">
                              <AlertCircle size={12} /> UPDATE
                            </div>
                          ) : (
                            <CheckCircle2 className="text-green-500" size={18} />
                          )
                        ) : (
                          <div className="flex items-center gap-1 text-red-500" title={row.errors.join(', ')}>
                            <X size={18} />
                            <span className="text-[10px] font-black">ERROR</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">
                        {row.data.sku}
                      </td>
                      <td className="px-4 py-4 font-bold text-[#1D3146]">
                        {row.data.name}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-slate-700">
                        ${row.data.price_menudeo.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-slate-500">
                        ${row.data.price_mayoreo.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-slate-500">
                        ${row.data.price_especial.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-[#56CCF2]">
                        {row.data.quantity}
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

  return (
    <div className="max-w-7xl mx-auto py-8 h-full px-4 flex flex-col">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <Package className="text-[#56CCF2]" size={32} />
               Catálogo e Inventario
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic">Control maestro de precios y existencias.</p>
         </div>
         
         <div className="flex gap-4">
            <label className={`cursor-pointer flex items-center gap-2 px-6 py-3 bg-[#1D3146] text-white text-sm font-bold rounded-2xl hover:scale-105 transition-all shadow-xl shadow-[#1D3146]/20 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
               {uploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
               <span>{uploading ? 'Procesando...' : 'Importar Catálogo'}</span>
               <input 
                 type="file" 
                 className="hidden" 
                 accept=".csv" 
                 onChange={handleFilePreview} 
                 disabled={uploading} 
               />
            </label>
         </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl font-bold flex items-center gap-3 border border-red-100 animate-pulse">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {message && (
        <div className="mb-6 bg-green-50 text-green-600 p-4 rounded-2xl font-bold flex items-center gap-3 border border-green-100">
          <CheckCircle2 size={20} />
          {message}
        </div>
      )}

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="bg-[#56CCF2]/10 p-4 rounded-2xl">
                <Package className="text-[#56CCF2]" size={24} />
             </div>
             <div>
                <p className="text-2xl font-black text-[#1D3146]">{products.length}</p>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest text-[8px]">Productos en Catálogo</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="bg-green-100 p-4 rounded-2xl">
                <CheckCircle2 className="text-green-600" size={24} />
             </div>
             <div>
                <p className="text-2xl font-black text-[#1D3146]">{products.filter(p => p.quantity > 0).length}</p>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest text-[8px]">Items con Existencias</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="bg-red-100 p-4 rounded-2xl">
                <AlertCircle className="text-red-500" size={24} />
             </div>
             <div>
                <p className="text-2xl font-black text-[#1D3146]">{products.filter(p => p.quantity <= 0).length}</p>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest text-[8px]">Items sin Existencias</p>
             </div>
          </div>
      </div>

      {/* Table Container */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex-grow flex flex-col">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="relative flex-grow max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar por nombre o SKU..." 
                 className="w-full pl-12 pr-4 py-3 bg-[#EBEEF2] border-none rounded-2xl text-sm font-semibold text-[#1D3146] focus:ring-2 focus:ring-[#56CCF2]/30 outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            
            <div className="flex gap-4">
               <button className="p-3 bg-[#EBEEF2] rounded-xl text-slate-500 hover:bg-slate-200 transition-colors">
                  <Filter size={18} />
               </button>
               <a 
                 href="#" 
                 onClick={(e) => {
                   e.preventDefault();
                   const csvContent = "sku,name,quantity,price_menudeo,price_mayoreo,price_especial\nPROD-001,Producto Ejemplo,10,100.0,90.0,85.0";
                   const blob = new Blob([csvContent], { type: 'text/csv' });
                   const url = window.URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = 'plantilla_catalago_entrega.csv';
                   a.click();
                 }}
                 className="flex items-center gap-2 px-4 py-2 text-[#56CCF2] text-xs font-black uppercase tracking-widest hover:bg-[#56CCF2]/5 rounded-xl transition-all"
               >
                  <Download size={14} />
                  Plantilla CSV
               </a>
            </div>
         </div>

         <div className="overflow-auto rounded-3xl border border-slate-50 shadow-sm flex-grow">
            <table className="w-full text-left border-collapse">
               <thead className="bg-[#1D3146] text-white sticky top-0 z-10">
                  <tr className="text-[10px] font-black uppercase tracking-widest">
                     <th className="px-8 py-5">Producto</th>
                     <th className="px-4 py-5">SKU</th>
                     <th className="px-4 py-5 text-center">Disponibilidad</th>
                     <th className="px-8 py-5 text-right">Precio Menudeo</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                         <Loader2 className="animate-spin mx-auto text-[#56CCF2]" size={32} />
                         <p className="mt-4 text-sm font-bold text-slate-400">Consultando almacén...</p>
                      </td>
                    </tr>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-all duration-200 group cursor-pointer">
                         <td className="px-8 py-5">
                            <span className="font-bold text-[#1D3146] group-hover:text-[#56CCF2] transition-colors">{p.name}</span>
                         </td>
                         <td className="px-4 py-5">
                            <span className="font-mono text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-100 rounded-lg">{p.sku || 'N/A'}</span>
                         </td>
                         <td className="px-4 py-5 text-center">
                            <span className={`inline-block px-3 py-1 rounded-xl text-[10px] font-black ${
                               p.quantity > 50 ? 'bg-green-100 text-green-700' : 
                               p.quantity > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                            }`}>
                               {p.quantity} unid.
                            </span>
                         </td>
                         <td className="px-8 py-5 text-right font-black text-[#1D3146]">
                            ${p.price.toFixed(2)}
                         </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                         <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Package className="text-slate-200" size={32} />
                         </div>
                         <p className="text-lg font-bold text-[#1D3146]">Almacén vacío</p>
                         <p className="text-sm text-slate-400">Importa tu catálogo de productos para comenzar el control.</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
