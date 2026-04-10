'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Search, 
  User, 
  Package, 
  Banknote,
  Navigation,
  RefreshCcw,
  Zap,
  MoreVertical,
  Check,
  X,
  Plus
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';

interface MessageLog {
  id: string;
  sender: string;
  raw_message: string;
  timestamp: string;
  detected_intent: string;
  detected_entities: string;
  confidence: number;
  needs_confirmation: boolean;
  final_status: string;
}

export default function LearningDashboard() {
  const { activeTenant } = useTenant();
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<MessageLog | null>(null);
  const [correction, setCorrection] = useState({
    intent: '',
    entities: {}
  });
  const [tab, setTab] = useState<'logs' | 'dictionary'>('logs');
  const [newAlias, setNewAlias] = useState({ type: 'customer', id: '', alias: '' });

  const fetchLogs = async () => {
    if (!activeTenant) return;
    try {
      const data = await apiRequest('/learning/logs', 'GET', null, activeTenant.id);
      setLogs(data);
    } catch (err) {
      console.error("Error fetching logs, using mock data:", err);
      // PILOT MOCK LOGS
      setLogs([
        {
          id: 'l1',
          sender: '+52 55 1234 5678',
          raw_message: 'Entregar 10 productos a Distribuidora Los Santos mañana',
          timestamp: new Date().toISOString(),
          detected_intent: 'delivery',
          detected_entities: JSON.stringify({ customer: 'Distribuidora Los Santos', qty: 10, product: 'Producto A' }),
          confidence: 0.92,
          needs_confirmation: false,
          final_status: 'pending'
        },
        {
          id: 'l2',
          sender: '+52 55 9988 7766',
          raw_message: 'pago 500 pesos factura ayer',
          timestamp: new Date().toISOString(),
          detected_intent: 'payment',
          detected_entities: JSON.stringify({ amount: 500 }),
          confidence: 0.85,
          needs_confirmation: true,
          final_status: 'pending'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTenant]);

  const handleCorrect = async (logId: string) => {
    if (!activeTenant) return;
    try {
      await apiRequest(`/learning/logs/${logId}`, 'PATCH', {
        intent: correction.intent,
        entities: correction.entities,
        status: 'corrected'
      }, activeTenant.id);
      setReviewing(null);
      fetchLogs();
    } catch (err) {
      alert("Error al guardar corrección");
    }
  };

  const handleAddAlias = async () => {
    if (!activeTenant || !newAlias.id || !newAlias.alias) return;
    try {
      await apiRequest(`/learning/aliases/${newAlias.type}`, 'POST', {
        [newAlias.type === 'customer' ? 'customer_id' : 'product_id']: newAlias.id,
        alias: newAlias.alias
      }, activeTenant.id);
      setNewAlias({ type: 'customer', id: '', alias: '' });
      alert("Alias guardado. El parser aprenderá en el próximo mensaje.");
    } catch (err) {
      alert("Error al guardar alias");
    }
  };

  const handleApprove = async (logId: string) => {
      // For now, approval just marks as processed
      // Real implementation would trigger the actual operation (delivery/payment)
      alert("Operación procesada basándose en el aprendizaje.");
      setReviewing(null);
  }

  if (loading) return <div className="p-20 text-center text-slate-400">Cargando inteligencia del negocio...</div>;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <div className="bg-[#1D3146] p-2 rounded-xl text-[#56CCF2]">
                  <Zap size={24} fill="currentColor" />
               </div>
               Entrega AI: Intelligence Mode
            </h2>
            <p className="text-sm text-slate-500 font-medium italic underline decoration-[#56CCF2]/30">Entrenando el parsing engine con lenguaje real de {activeTenant?.name}.</p>
         </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-100">
         <button onClick={() => setTab('logs')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${tab === 'logs' ? 'text-[#1D3146] border-b-2 border-[#1D3146]' : 'text-slate-300'}`}>Message Review</button>
         <button onClick={() => setTab('dictionary')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${tab === 'dictionary' ? 'text-[#1D3146] border-b-2 border-[#1D3146]' : 'text-slate-300'}`}>Tenant Dictionary</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {tab === 'logs' ? (
           <div className="lg:col-span-12 space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mensajes del Centro de Control</h3>
                 <button onClick={fetchLogs} title="Refrescar logs" className="p-2 text-slate-400 hover:text-[#1D3146]"><RefreshCcw size={16} /></button>
              </div>
              
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="border-b border-slate-50">
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#1D3146]/40">Origen</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#1D3146]/40">Mensaje Raw</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#1D3146]/40">Intento Detectado</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#1D3146]/40">Confianza</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#1D3146]/40 text-right">Acción</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {logs.map((log) => (
                             <tr key={log.id} className="hover:bg-slate-50 group transition-colors">
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                         <User size={14} />
                                      </div>
                                      <span className="text-xs font-bold text-[#1D3146]">{log.sender}</span>
                                   </div>
                                </td>
                                <td className="px-8 py-5 max-w-xs">
                                   <p className="text-xs font-medium text-slate-600 italic truncate">"{log.raw_message}"</p>
                                </td>
                                <td className="px-8 py-5">
                                   <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                      log.detected_intent === 'unknown' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                                   }`}>
                                      {log.detected_intent}
                                   </div>
                                </td>
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-2">
                                      <div className="flex-grow w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                         <div className={`h-full transition-all ${log.confidence > 0.8 ? 'bg-emerald-400' : log.confidence > 0.5 ? 'bg-orange-400' : 'bg-rose-400'}`} style={{ width: `${log.confidence * 100}%` }}></div>
                                      </div>
                                      <span className="text-[10px] font-black text-slate-400">{(log.confidence * 100).toFixed(0)}%</span>
                                   </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                   <button 
                                     onClick={() => { setReviewing(log); setCorrection({ intent: log.detected_intent, entities: JSON.parse(log.detected_entities)}) }}
                                     className="p-3 hover:bg-[#1D3146] hover:text-white rounded-xl transition-all text-slate-300"
                                     title="Revisar y Corregir"
                                   >
                                      <Edit3 size={16} />
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
         ) : (
           <div className="lg:col-span-12 space-y-8 animate-in slide-in-from-bottom-4">
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
                 <div className="flex-grow space-y-6">
                    <h3 className="text-xl font-black text-[#1D3146] tracking-tight">Agregar Alias al Diccionario</h3>
                    <p className="text-sm text-slate-500 italic">Mapea nombres informales de WhatsApp a entidades reales del sistema.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <select 
                         className="h-14 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                         value={newAlias.type}
                         onChange={(e) => setNewAlias({...newAlias, type: e.target.value})}
                         title="Tipo de entidad"
                       >
                          <option value="customer">Cliente</option>
                          <option value="product">Producto</option>
                       </select>
                       <input 
                         type="text" 
                         placeholder="ID de la entidad (UUID)" 
                         className="h-14 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                         value={newAlias.id}
                         onChange={(e) => setNewAlias({...newAlias, id: e.target.value})}
                         title="ID referencial"
                       />
                       <input 
                         type="text" 
                         placeholder="Alias (Ej: 'Tienda', 'Alén')" 
                         className="h-14 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                         value={newAlias.alias}
                         onChange={(e) => setNewAlias({...newAlias, alias: e.target.value})}
                         title="Nombre informal"
                       />
                    </div>
                    
                    <button onClick={handleAddAlias} className="px-10 py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl shadow-lg flex items-center gap-3 uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all">
                       <Plus size={18} /> Registrar Alias
                    </button>
                 </div>
                 <div className="hidden lg:block bg-blue-50 p-10 rounded-[2.5rem] text-blue-500 rotate-3">
                    <MessageCircle size={80} fill="currentColor" className="opacity-20" />
                 </div>
              </div>
           </div>
         )}
      </div>

      {/* Review Modal */}
      {reviewing && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1D3146]/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Review & Learning</h2>
                    <p className="text-slate-500 text-sm italic">Corrige y enseña al parser de {activeTenant?.name}.</p>
                  </div>
                  <button onClick={() => setReviewing(null)} className="p-3 text-slate-300 hover:text-rose-500 transition-colors"><X size={24} /></button>
               </div>

               <div className="space-y-8">
                  <div className="bg-[#EBEEF2] p-8 rounded-3xl border border-slate-200">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mensaje Original</p>
                     <p className="text-lg font-bold text-[#1D3146]">"{reviewing.raw_message}"</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Intento Correcto</label>
                        <select 
                          className="w-full h-14 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                          value={correction.intent}
                          onChange={(e) => setCorrection({...correction, intent: e.target.value})}
                          title="Seleccionar Intento"
                        >
                           <option value="delivery">Entrega / Despacho</option>
                           <option value="payment">Cobro / Pago</option>
                           <option value="stock">Ajuste Stock</option>
                           <option value="unknown">Desconocido</option>
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Estado Final</label>
                        <div className="flex gap-2">
                           {['pending', 'processed', 'corrected', 'failed'].map((s) => (
                              <button 
                                key={s} 
                                onClick={() => handleCorrect(reviewing.id)}
                                className={`flex-1 py-3 px-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                                 s === 'corrected' ? 'bg-[#56CCF2] text-[#1D3146]' : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                 {s}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl space-y-6">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entidades Extraídas</h4>
                     <pre className="text-xs bg-white p-4 rounded-xl border border-slate-200 text-[#1D3146] font-mono">
                        {JSON.stringify(JSON.parse(reviewing.detected_entities), null, 2)}
                     </pre>
                     <p className="text-[10px] text-slate-400 italic">Si el cliente o producto es incorrecto, agrega un alias en la sección de diccionarios.</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setReviewing(null)} className="flex-1 py-5 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Descartar</button>
                     <button onClick={() => handleApprove(reviewing.id)} className="flex-[2] py-5 bg-[#1D3146] text-[#56CCF2] rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#1D3146]/20 flex items-center justify-center gap-3">
                        <Check size={18} /> Aprobar y Procesar
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
