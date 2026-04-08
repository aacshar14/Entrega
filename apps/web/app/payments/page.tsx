'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface PaymentRecord {
  id: string;
  customer_id: string;
  amount: number;
  method: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customers, setCustomers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [paymentsData, customersData] = await Promise.all([
          apiRequest('payments', 'GET'),
          apiRequest('customers', 'GET')
        ]);
        
        setPayments(paymentsData);
        
        const custMap: Record<string, string> = {};
        customersData.forEach((c: Customer) => {
          custMap[c.id] = c.name;
        });
        setCustomers(custMap);
      } catch (err) {
        console.error("Failed to load payments:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Historial de Cobros</h2>
        <p className="text-slate-400 font-medium">Control de flujo de caja para entregas realizadas</p>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest leading-none">Últimos cobros registrados</span>
            <button className="bg-white text-slate-600 border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold hover:shadow-md transition-all">
               Actualizar
            </button>
         </div>
         
         <div className="p-4 space-y-3">
            {loading ? (
              <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Cargando historial...</div>
            ) : payments.length === 0 ? (
              <div className="p-10 text-center text-slate-300 font-medium italic">No hay cobros registrados aún.</div>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex gap-4 items-center">
                     <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center font-black">$</div>
                     <div>
                        <p className="font-bold text-slate-800 leading-tight">
                          {customers[p.customer_id] || 'Cliente desconocido'}
                        </p>
                        <p className="text-xs font-medium text-slate-400 mt-1 capitalize">
                          {p.method} - {new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="font-black text-slate-800 text-lg leading-tight tracking-tight">
                       ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                     </p>
                     <p className="text-[10px] uppercase font-black tracking-widest text-green-600 mt-1">Saldado</p>
                  </div>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
}
