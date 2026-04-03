'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';

interface ProductImportRow {
  sku: string;
  name: string;
  quantity: number;
  price_mayoreo: number;
  price_menudeo: number;
  price_especial: number;
}

interface ProductImportPreviewRow {
  row_index: number;
  data: ProductImportRow;
  is_valid: boolean;
  errors: string[];
  is_duplicate: boolean;
}

interface ProductImportPreviewResponse {
  total_rows: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  duplicate_rows_count: number;
  rows: ProductImportPreviewRow[];
}

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export default function StockPage() {
  const [step, setStep] = useState<'list' | 'upload' | 'preview' | 'summary'>('list');
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportPreviewResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [summary, setSummary] = useState<{ created: number; updated: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { activeTenant } = useTenant();

  const fetchStock = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiRequest('/products/stock', 'GET', null, activeTenant?.id);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching stock:', err);
      if (err.status === 401 || err.status === 403) {
         setError('No tienes permisos para ver el inventario o tu sesión ha expirado.');
      } else {
         setError(err.message || 'Error al cargar el inventario');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const downloadTemplate = () => {
    const csvContent = "sku,name,quantity,price_mayoreo,price_menudeo,price_especial\nCH-CC,Galleta Chocochip,100,28,30,35\nCH-BR,Brookie,100,30,32,37";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entrega_productos_plantilla.csv';
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
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiRequest('/products/import/preview', 'POST', formData, activeTenant?.id);
      
      // Defensive parsing
      const hardenedData = {
        ...data,
        rows: Array.isArray(data?.rows) ? data.rows : []
      };
      
      setPreview(hardenedData);
      setStep('preview');
    } catch (err: any) {
      console.error('Error uploading CSV:', err);
      if (err.status === 403) {
        setError('Acceso denegado: No tienes permisos para realizar importaciones.');
      } else {
        setError(err.message || 'Error al procesar el archivo CSV. Verifica el formato.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setIsCommitting(true);
    setError(null);
    try {
      const validRows = preview.rows.filter(r => r.is_valid).map(r => r.data);
      
      const data = await apiRequest('/products/import/commit', 'POST', { rows: validRows }, activeTenant?.id);
      
      setSummary({ created: data.created, updated: data.updated });
      setStep('summary');
      await fetchStock();
    } catch (err: any) {
       console.error('Error committing CSV:', err);
       setError(err.message || 'Error al finalizar la importación');
    } finally {
      setIsCommitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
     p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <Package className="text-[#56CCF2]" size={32} />
               Inventario y Precios
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic">Control maestro de stock en tiempo real.</p>
         </div>
         
         {error && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-bold animate-in fade-in slide-in-from-top-4">
               <AlertCircle size={20} />
               {error}
               <button onClick={() => setError(null)} className="ml-auto hover:scale-110 transition-transform">×</button>
            </div>
          )}
         
         <div className="flex gap-4">
            <button 
              onClick={downloadTemplate}
              className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
               <Download size={18} />
               Plantilla CSV
            </button>
            <button 
              onClick={() => setStep('upload')}
              className="px-5 py-2.5 bg-[#1D3146] text-white text-sm font-bold rounded-xl hover:bg-[#2B4764] transition-all flex items-center gap-2 shadow-lg shadow-[#1D3146]/10"
            >
               <Upload size={18} />
               Importar Catálogo
            </button>
         </div>
      </div>

      {step === 'list' && (
        <>
          {/* Stats Quick View */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                 <div className="bg-[#56CCF2]/10 p-4 rounded-2xl">
                    <Package className="text-[#56CCF2]" size={24} />
                 </div>
                 <div>
                    <p className="text-2xl font-black text-[#1D3146]">{products.length}</p>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Productos Totales</p>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                 <div className="bg-green-100 p-4 rounded-2xl">
                    <CheckCircle2 className="text-green-600" size={24} />
                 </div>
                 <div>
                    <p className="text-2xl font-black text-[#1D3146]">{products.filter(p => p.quantity > 0).length}</p>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">En Stock</p>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                 <div className="bg-red-100 p-4 rounded-2xl">
                    <AlertCircle className="text-red-500" size={24} />
                 </div>
                 <div>
                    <p className="text-2xl font-black text-[#1D3146]">{products.filter(p => p.quantity <= 0).length}</p>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Sin Existencias</p>
                 </div>
              </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="relative flex-grow max-w-md">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="Buscar producto o SKU..." 
                     className="w-full pl-12 pr-4 py-3 bg-[#EBEEF2] border-none rounded-2xl text-sm font-semibold text-[#1D3146] focus:ring-2 focus:ring-[#56CCF2]/30 outline-none"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                
                <div className="flex gap-4">
                   <button className="p-3 bg-[#EBEEF2] rounded-xl text-slate-500 hover:bg-slate-200 transition-colors" aria-label="Filtrar productos">
                      <Filter size={18} />
                   </button>
                   <button className="px-6 py-3 bg-[#56CCF2] text-white font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-[#56CCF2]/20 text-sm">
                      <Plus size={18} />
                      Nuevo Producto
                   </button>
                </div>
             </div>

             <div className="overflow-x-auto rounded-3xl border border-slate-50 shadow-sm">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-[#1D3146] text-white font-black uppercase tracking-widest text-[10px]">
                      <tr>
                         <th className="px-8 py-5">Producto</th>
                         <th className="px-4 py-5">SKU</th>
                         <th className="px-4 py-5 text-center">Disponible</th>
                         <th className="px-8 py-5 text-right">Precio</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="p-20 text-center">
                             <Loader2 className="animate-spin mx-auto text-[#56CCF2]" size={32} />
                             <p className="mt-4 text-sm font-bold text-slate-400 font-black uppercase tracking-widest">Sincronizando Inventario...</p>
                          </td>
                        </tr>
                      ) : filteredProducts.length > 0 ? (
                        filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-all duration-200 group cursor-pointer font-bold text-sm text-[#1D3146]">
                             <td className="px-8 py-5 group-hover:text-[#56CCF2] transition-colors">{p.name}</td>
                             <td className="px-4 py-5 font-mono text-xs text-slate-400">{p.sku || '---'}</td>
                             <td className="px-4 py-5 text-center">
                                <span className={`inline-block px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
                                   p.quantity > 10 ? 'bg-emerald-100 text-emerald-700' : 
                                   p.quantity > 0 ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                   {p.quantity} UNIDADES
                                </span>
                             </td>
                             <td className="px-8 py-5 text-right font-black">${p.price.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-24 text-center">
                             <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Package className="text-slate-200" size={40} />
                             </div>
                             <p className="text-xl font-black text-[#1D3146]">Inventario Vacío</p>
                             <p className="text-slate-400 text-sm mt-2 font-medium">Carga tu plantilla CSV para visualizar tus productos aquí.</p>
                          </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}

      {step === 'upload' && (
        <div className="max-w-xl mx-auto bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-12">
           <h2 className="text-3xl font-black text-[#1D3146] mb-2 tracking-tight">Importar Catálogo</h2>
           <p className="text-slate-400 font-medium mb-10">Sube tu lista de productos y stock inicial de ChocoBites.</p>
           
           <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-16 text-center hover:border-[#56CCF2] transition-all group cursor-pointer relative bg-slate-50/50">
              <input 
                type="file" 
                accept=".csv" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
              />
              <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                 <Package className="text-[#56CCF2]" size={32} />
              </div>
              <p className="font-black text-lg text-[#1D3146]">{file ? file.name : "Soltar archivo CSV aquí"}</p>
              <p className="text-xs text-slate-400 mt-3 font-bold uppercase tracking-widest">Excel, CSV o TXT (MAX 5MB)</p>
           </div>

           <div className="flex justify-between items-center mt-12">
              <button onClick={() => setStep('list')} className="text-slate-400 font-black uppercase text-xs tracking-widest hover:text-[#1D3146] transition-colors">Cancelar</button>
              <button 
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="px-10 py-5 bg-[#1D3146] text-white font-black rounded-3xl flex items-center gap-3 shadow-2xl shadow-[#1D3146]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                 {isUploading ? <Loader2 className="animate-spin" size={24} /> : <TrendingUp size={24} />}
                 <span>Procesar Catálogo</span>
              </button>
           </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
           <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
              <div>
                 <h2 className="text-3xl font-black text-[#1D3146] tracking-tight">Verificación de Datos</h2>
                 <p className="text-slate-500 font-medium mt-1">Valida la integridad de la información antes de guardarla.</p>
              </div>
              <div className="flex gap-3">
                 <div className="bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl flex flex-col items-center">
                    <span className="text-xl font-black">{preview.valid_rows_count}</span>
                    <span className="text-[9px] font-black uppercase tracking-tighter">Válidos</span>
                 </div>
                 <div className="bg-rose-50 text-rose-600 px-5 py-3 rounded-2xl flex flex-col items-center">
                    <span className="text-xl font-black">{preview.invalid_rows_count}</span>
                    <span className="text-[9px] font-black uppercase tracking-tighter">Errores</span>
                 </div>
                 <div className="bg-amber-50 text-amber-600 px-5 py-3 rounded-2xl flex flex-col items-center">
                    <span className="text-xl font-black">{preview.duplicate_rows_count}</span>
                    <span className="text-[9px] font-black uppercase tracking-tighter">Dupes</span>
                 </div>
              </div>
           </div>

           <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                       <th className="px-10 py-5">Item</th>
                       <th className="px-4 py-5">Nombre / SKU</th>
                       <th className="px-4 py-5 text-right">Mayoreo</th>
                       <th className="px-4 py-5 text-right">Menudeo</th>
                       <th className="px-4 py-5 text-right">Especial</th>
                       <th className="px-10 py-5 text-center">Estado</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {preview.rows.map((row, idx) => (
                       <tr key={idx} className={`hover:bg-slate-50 transition-colors ${!row.is_valid ? 'bg-rose-50/20' : ''}`}>
                          <td className="px-10 py-5 text-slate-300 font-mono text-xs">#{row.row_index}</td>
                          <td className="px-4 py-5">
                             <p className="font-bold text-[#1D3146]">{row.data?.name || '---'}</p>
                             <p className="font-mono text-[10px] text-slate-400">{row.data?.sku || '---'}</p>
                          </td>
                          <td className="px-4 py-5 text-right font-black text-slate-700">${row.data?.price_mayoreo?.toFixed(2) || '0.00'}</td>
                          <td className="px-4 py-5 text-right font-black text-slate-700">${row.data?.price_menudeo?.toFixed(2) || '0.00'}</td>
                          <td className="px-4 py-5 text-right font-black text-slate-700">${row.data?.price_especial?.toFixed(2) || '0.00'}</td>
                          <td className="px-10 py-5">
                             <div className="flex items-center justify-center">
                                {row.is_valid ? (
                                   <div className="flex items-center gap-2">
                                      <CheckCircle2 size={20} className="text-emerald-500" />
                                      {row.is_duplicate && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-black italic tracking-tighter">ACTUALIZACIÓN</span>}
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                                      <AlertCircle size={14} />
                                      <span className="text-[10px] font-black uppercase tracking-tighter">{row.errors[0]}</span>
                                   </div>
                                )}
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Nota: Productos existentes serán actualizados con los nuevos valores.</p>
              <div className="flex gap-6 items-center">
                 <button onClick={() => setStep('upload')} className="text-slate-400 font-black uppercase text-xs tracking-widest hover:text-[#1D3146]">Atrás</button>
                 <button 
                  onClick={handleCommit}
                  disabled={preview.valid_rows_count === 0 || isCommitting}
                  className="px-12 py-5 bg-[#1D3146] text-white font-black rounded-3xl flex items-center gap-3 shadow-2xl shadow-[#1D3146]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                 >
                    {isCommitting ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                    <span>Confirmar Catálogo</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {step === 'summary' && summary && (
        <div className="max-w-xl mx-auto bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-12 text-center animate-in zoom-in duration-500">
           <div className="bg-emerald-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-emerald-200 animate-bounce">
              <CheckCircle2 className="text-emerald-600" size={48} />
           </div>
           <h2 className="text-4xl font-black text-[#1D3146] tracking-tight">Catálogo Actualizado</h2>
           <p className="text-slate-500 mt-3 mb-12 font-medium">La operación se completó correctamente para ChocoBites.</p>
           
           <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-[#EBEEF2] p-8 rounded-[2rem] border border-white shadow-sm">
                 <p className="text-3xl font-black text-[#1D3146]">{summary.created}</p>
                 <p className="text-[10px] uppercase font-black text-slate-400 mt-2 tracking-[0.2em]">Nuevos SKUs</p>
              </div>
              <div className="bg-[#EBEEF2] p-8 rounded-[2rem] border border-white shadow-sm">
                 <p className="text-3xl font-black text-[#1D3146]">{summary.updated}</p>
                 <p className="text-[10px] uppercase font-black text-slate-400 mt-2 tracking-[0.2em]">Actualizados</p>
              </div>
           </div>

           <button 
             onClick={() => { setStep('list'); setFile(null); setPreview(null); }}
             className="w-full py-5 bg-[#1D3146] text-white font-black rounded-3xl shadow-xl shadow-[#1D3146]/20 transition-all hover:bg-[#2B4764]"
           >
              Finalizar y Ver Inventario
           </button>
        </div>
      )}
    </div>
  );
}

