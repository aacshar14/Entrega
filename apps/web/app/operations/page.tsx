'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Banknote, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Minus, 
  Loader2,
  Users,
  Package,
  Calendar,
  ChevronRight,
  PlusCircle
} from 'lucide-react';

export default function OperationsPage() {
  const [tab, setTab] = useState<'delivery' | 'payment'>('delivery');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // States for delivery
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);
  
  // States for payment
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 text-center animate-in fade-in duration-500">
         <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-emerald-200 animate-bounce">
            <CheckCircle2 className="text-emerald-500" size={48} />
         </div>
         <h1 className="text-3xl font-black text-[#1D3146] mb-4">¡Hecho!</h1>
         <p className="text-slate-500 font-medium mb-10">La operación se ha registrado correctamente en ChocoBites.</p>
         <button 
           onClick={() => { setSuccess(false); setClientId(''); setAmount(''); setItems([{ productId: '', quantity: 1 }]); }}
           className="w-full py-5 bg-[#1D3146] text-white font-bold rounded-3xl hover:bg-[#2B4764] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#1D3146]/20"
         >
            Nueva Operación
         </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      
      {/* Header Contextual */}
      <div className="flex items-center gap-4 mb-10">
         <div className="bg-[#1D3146] p-4 rounded-3xl text-white shadow-lg">
            <PlusCircle size={28} />
         </div>
         <div>
            <h1 className="text-2xl font-black text-[#1D3146] tracking-tight">Nueva Operación</h1>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Canal de Ventas ChocoBites</p>
         </div>
      </div>

      {/* Tabs Switcher - Mobile Optimized */}
      <div className="flex p-2 bg-white rounded-3xl border border-slate-100 shadow-sm mb-10 relative">
         <div 
           className={`absolute top-2 bottom-2 left-2 w-[calc(50%-8px)] bg-[#1D3146] rounded-2xl transition-all duration-300 ease-in-out ${
             tab === 'payment' ? 'translate-x-full' : 'translate-x-0'
           }`}
         />
         <button 
           onClick={() => setTab('delivery')}
           className={`relative z-10 flex-1 py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors duration-300 ${
             tab === 'delivery' ? 'text-white' : 'text-slate-400'
           }`}
         >
            <Truck size={20} />
            Entrega
         </button>
         <button 
           onClick={() => setTab('payment')}
           className={`relative z-10 flex-1 py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors duration-300 ${
             tab === 'payment' ? 'text-white' : 'text-slate-400'
           }`}
         >
            <Banknote size={20} />
            Cobro
         </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
         
         {/* Form Section: Cliente */}
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
               <Users size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Información del Cliente</span>
            </div>
            
            <div className="space-y-2">
               <label className="text-sm font-bold text-[#1D3146]">Elegir Cliente</label>
               <div className="relative">
                 <select 
                   required
                   value={clientId}
                   aria-label="Seleccionar Cliente"
                   onChange={(e) => setClientId(e.target.value)}
                   className="w-full h-14 pl-4 pr-10 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none appearance-none"
                 >
                   <option value="">Selecciona un cliente...</option>
                   <option value="1">Ana Lopez</option>
                   <option value="2">Carlos Perez</option>
                   <option value="3">Luis Garcia</option>
                 </select>
                 <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" size={18} />
               </div>
            </div>
         </div>

         {/* Form Section: Dinámica por Tab */}
         {tab === 'delivery' ? (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                     <Package size={16} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Productos a Entregar</span>
                  </div>
                  <button type="button" onClick={() => setItems([...items, { productId: '', quantity: 1 }])} className="text-[#56CCF2] p-1" title="Añadir producto" aria-label="Añadir producto">
                     <PlusCircle size={24} />
                  </button>
               </div>

               <div className="space-y-4">
                  {items.map((item, i) => (
                     <div key={i} className="flex gap-4 items-end animate-in fade-in zoom-in duration-300">
                        <div className="flex-grow space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Producto</label>
                           <select aria-label="Seleccionar Producto" className="w-full h-14 pl-4 bg-[#EBEEF2] border-none rounded-2xl text-xs font-bold text-[#1D3146] outline-none appearance-none">
                              <option>Barra ChocoBites 70%</option>
                              <option>Trufas Mix</option>
                              <option>Brownie Mini</option>
                           </select>
                        </div>
                        <div className="w-28 space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cantidad</label>
                           <div className="flex items-center h-14 bg-[#EBEEF2] rounded-2xl overflow-hidden px-2">
                              <button type="button" className="p-1 text-slate-400 hover:text-[#1D3146]" aria-label="Disminuir cantidad" title="Disminuir"><Minus size={16} /></button>
                              <input type="number" defaultValue={1} aria-label="Cantidad" className="w-full text-center bg-transparent font-black text-[#1D3146] outline-none border-none text-sm pointer-events-none" />
                              <button type="button" className="p-1 text-slate-400 hover:text-[#1D3146]" aria-label="Aumentar cantidad" title="Aumentar"><Plus size={16} /></button>
                           </div>
                        </div>
                        <button type="button" onClick={() => { if(items.length > 1) setItems(items.filter((_, idx) => idx !== i)) }} className="mb-3 text-rose-500 opacity-40 hover:opacity-100 transition-opacity" aria-label="Eliminar fila" title="Eliminar"><Minus size={20} /></button>
                     </div>
                  ))}
               </div>
            </div>
         ) : (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Banknote size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Detalles del Cobro</span>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-sm font-bold text-[#1D3146]">Monto a Cobrar ($)</label>
                     <input 
                        type="number" 
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-14 px-6 bg-[#EBEEF2] border-none rounded-2xl text-xl font-black text-[#1D3146] outline-none placeholder:text-slate-300" 
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-bold text-[#1D3146]">Método</label>
                     <select aria-label="Método de Pago" className="w-full h-14 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none appearance-none">
                        <option value="cash">Efectivo 💵</option>
                        <option value="transfer">Transferencia 📱</option>
                        <option value="card">Tarjeta 💳</option>
                     </select>
                  </div>
               </div>
            </div>
         )}

         {/* Submit Button */}
         <button 
           type="submit"
           disabled={submitting}
           className="w-full h-16 md:h-20 bg-[#1D3146] text-white font-black text-lg md:text-xl rounded-[2rem] shadow-2xl shadow-[#1D3146]/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
         >
            {submitting ? (
               <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Procesando...</span>
               </>
            ) : (
               <>
                  <CheckCircle2 size={24} />
                  <span>Registrar {tab === 'delivery' ? 'Entrega' : 'Cobro'}</span>
               </>
            )}
         </button>
      </form>

      {/* Helper Context */}
      <div className="mt-8 px-6 py-4 bg-slate-100 rounded-2xl flex items-start gap-3">
         <AlertCircle size={18} className="text-slate-400 mt-0.5" />
         <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-tighter">
            Nota: Al registrar una entrega, el stock se descontará automáticamente y el saldo pendiente del cliente aumentará.
         </p>
      </div>

    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
