import React from 'react';

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center h-[70vh]">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 flex flex-col gap-8">
        <div className="text-center">
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter">EntréGA</h2>
           <p className="text-slate-400 font-medium mt-1">Gestión Inteligente de Logística</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Email</label>
            <input type="email" placeholder="admin@entrega.space" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Password</label>
            <input type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium" />
          </div>
        </div>
        <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-[0.98] transition-all">Iniciar Sesión</button>
      </div>
    </div>
  )
}
