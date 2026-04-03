'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Trash2,
  Filter,
  Plus,
  ArrowRight
} from 'lucide-react';

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
  const [step, setStep] = useState<'list' | 'upload' | 'preview' | 'summary'>('list');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [summary, setSummary] = useState<{ created: number; skipped: number } | null>(null);

  const downloadTemplate = () => {
    const csvContent = "name,phone,email,initial_balance,notes,tier\nTienda Juan,+528781111111,juan@email.com,0,,mayoreo\nAbarrotes Ana,+528782222222,,0,,menudeo\nCliente Promo,+528783333333,,0,,especial";
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
    try {
      const formData = new FormData();
      formData.append('file', file);

      // In a real app, use the actual API base URL from process.env.NEXT_PUBLIC_API_URL
      // For this pilot, we assume the backend handles it correctly.
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.entrega.space'}/api/v1/customers/import/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase-token') || ''}`,
        },
        body: formData
      });
      
      const data = await response.json();
      setPreview(data);
      setStep('preview');
    } catch (error) {
      console.error('Error uploading CSV:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setIsCommitting(true);
    try {
      // Only commit valid rows
      const validRows = preview.rows.filter(r => r.is_valid).map(r => r.data);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.entrega.space'}/api/v1/customers/import/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase-token') || ''}`,
        },
        body: JSON.stringify({ rows: validRows })
      });
      
      const data = await response.json();
      setSummary({ created: data.created_count, skipped: data.skipped_duplicates });
      setStep('summary');
    } catch (error) {
       console.error('Error committing CSV:', error);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-10">
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <Users className="text-[#56CCF2]" size={32} />
               Gestión de Clientes
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Administra tu cartera y realiza importaciones masivas.</p>
         </div>
         
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
               Importar CSV
            </button>
         </div>
      </div>

      {step === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-10 text-center">
           <div className="bg-[#EBEEF2] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="text-slate-400" size={32} />
           </div>
           <h2 className="text-xl font-bold text-[#1D3146]">Aún no hay clientes registrados</h2>
           <p className="text-slate-500 mt-2 max-w-sm mx-auto">Comienza agregando clientes manualmente o carga tu lista actual por CSV para agilizar el onboarding.</p>
           
           <div className="flex justify-center gap-4 mt-10">
              <button className="px-6 py-3 bg-[#56CCF2] text-white font-bold rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-[#56CCF2]/30">
                 <Plus size={20} />
                 Nuevo Cliente
              </button>
           </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-10">
           <h2 className="text-2xl font-bold text-[#1D3146] mb-6">Importar Clientes</h2>
           
           <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:border-[#56CCF2] transition-colors group cursor-pointer relative">
              <input 
                type="file" 
                accept=".csv" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
              />
              <div className="bg-[#56CCF2]/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                 <Upload className="text-[#56CCF2]" size={28} />
              </div>
              <p className="font-bold text-slate-700">{file ? file.name : "Selecciona tu archivo CSV"}</p>
              <p className="text-xs text-slate-400 mt-2">Máximo 5MB (Recomendado hasta 500 filas)</p>
           </div>

           <div className="flex justify-between mt-10">
              <button onClick={() => setStep('list')} className="px-6 py-3 text-slate-400 font-bold">Cancelar</button>
              <button 
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="px-8 py-3 bg-[#1D3146] text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:scale-105 transition-all disabled:opacity-50"
              >
                 {isUploading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                 Ver Vista Previa
              </button>
           </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                 <h2 className="text-xl font-bold text-[#1D3146]">Vista Previa del Archivo</h2>
                 <p className="text-sm text-slate-500 mt-1">Revisa los datos antes de procesar la importación definitiva.</p>
              </div>
              <div className="flex gap-4 text-xs font-black uppercase tracking-widest leading-none">
                 <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg">Válidos: {preview.valid_rows_count}</div>
                 <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg">Errores: {preview.invalid_rows_count}</div>
                 <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg">Duplicados: {preview.duplicate_rows_count}</div>
              </div>
           </div>

           <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                       <th className="px-8 py-4">Fila</th>
                       <th className="px-4 py-4">Nombre</th>
                       <th className="px-4 py-4">Teléfono</th>
                       <th className="px-4 py-4">Tier</th>
                       <th className="px-4 py-4">Status</th>
                    </tr>
                 </thead>
                 <tbody>
                    {preview.rows.map((row, idx) => (
                       <tr key={idx} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${!row.is_valid ? 'bg-red-50/30' : ''}`}>
                          <td className="px-8 py-4 text-slate-400 font-mono text-xs">#{row.row_index}</td>
                          <td className="px-4 py-4 font-bold text-[#1D3146] text-sm">{row.data.name}</td>
                          <td className="px-4 py-4 text-slate-500 text-sm">{row.data.phone || 'N/A'}</td>
                          <td className="px-4 py-4">
                             <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                row.data.tier === 'mayoreo' ? 'bg-blue-100 text-blue-700' :
                                row.data.tier === 'especial' ? 'bg-purple-100 text-purple-700' :
                                'bg-slate-100 text-slate-700'
                             }`}>
                                {row.data.tier}
                             </span>
                          </td>
                          <td className="px-4 py-4">
                             {row.is_valid ? (
                                <div className="flex items-center gap-2">
                                   <CheckCircle2 size={16} className="text-green-500" />
                                   {row.is_duplicate ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black">DUPLICADO</span> : <span className="text-[10px] text-green-600 font-bold">LISTO</span>}
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 text-red-500">
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
              <p className="text-sm text-slate-500 italic">Sólo se procesarán las filas válidas y las no duplicadas.</p>
              <div className="flex gap-4">
                 <button onClick={() => setStep('upload')} className="px-6 py-3 text-slate-500 font-bold">Regresar</button>
                 <button 
                  onClick={handleCommit}
                  disabled={preview.valid_rows_count === 0 || isCommitting}
                  className="px-10 py-3 bg-[#1D3146] text-white font-bold rounded-2xl flex items-center gap-2 shadow-xl shadow-[#1D3146]/20 hover:scale-105 transition-all disabled:opacity-50"
                 >
                    {isCommitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                    Confirmar e Importar
                 </button>
              </div>
           </div>
        </div>
      )}

      {step === 'summary' && summary && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-10 text-center">
           <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 className="text-green-600" size={40} />
           </div>
           <h2 className="text-3xl font-black text-[#1D3146]">¡Importación Finalizada!</h2>
           <p className="text-slate-500 mt-2 mb-10">Los clientes seleccionados se han integrado a tu base de datos correctamente.</p>
           
           <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-[#EBEEF2] p-6 rounded-2xl">
                 <p className="text-2xl font-black text-[#1D3146]">{summary.created}</p>
                 <p className="text-xs uppercase font-black text-slate-400 mt-1">Registrados</p>
              </div>
              <div className="bg-[#EBEEF2] p-6 rounded-2xl">
                 <p className="text-2xl font-black text-[#1D3146]">{summary.skipped}</p>
                 <p className="text-xs uppercase font-black text-slate-400 mt-1">Omitidos</p>
              </div>
           </div>

           <button 
             onClick={() => { setStep('list'); setFile(null); setPreview(null); }}
             className="w-full py-4 bg-[#1D3146] text-white font-bold rounded-2xl hover:bg-[#2B4764] transition-all"
           >
              Volver a Clientes
           </button>
        </div>
      )}
    </div>
  );
}
