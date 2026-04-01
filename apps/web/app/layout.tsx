import React from 'react';
import './globals.css';

export const metadata = {
  title: 'EntréGA V1.1 | SaaS Logística Inteligente',
  description: 'Sistema de gestión de entregas y finanzas para pilotos comerciales.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="antialiased">
      <body className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-72 bg-[#F8F9FB] border-r border-slate-200 p-8 flex flex-col gap-10 sticky top-0 h-screen">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">E</div>
             <div>
                <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">EntréGA</h1>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">V1.1 Pilot</span>
             </div>
          </div>

          <nav className="flex flex-col gap-2 flex-grow">
             <a href="/dashboard" className="sidebar-item sidebar-item-active">
                <span className="text-lg">📊</span> Dashboard
             </a>
             <a href="/deliveries" className="sidebar-item">
                <span className="text-lg">🚚</span> Entregas
             </a>
             <a href="/stock" className="sidebar-item">
                <span className="text-lg">📦</span> Stock
             </a>
             <a href="/payments" className="sidebar-item">
                <span className="text-lg">💰</span> Pagos
             </a>
             <a href="/reports" className="sidebar-item">
                <span className="text-lg">📈</span> Reportes
             </a>
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-8 flex flex-col gap-2">
             <a href="/settings" className="sidebar-item">
                <span className="text-lg">⚙️</span> Configuración
             </a>
             <div className="p-4 bg-slate-100 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-slate-800 shadow-sm">CB</div>
                <div>
                   <p className="text-sm font-bold text-slate-900 leading-none">ChocoBites</p>
                   <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-tighter">Pilot #001</p>
                </div>
             </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col overflow-x-hidden">
           {/* Header */}
           <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-50">
              <div className="flex flex-col">
                 <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">Resumen Operativo</h2>
                 <p className="text-slate-900 font-bold mt-1">Lunes, 1 de Abril 2026</p>
              </div>
              
              <div className="flex items-center gap-4">
                 <button className="btn-secondary flex items-center gap-2">
                    <span>💳</span> Registrar Pago
                 </button>
                 <button className="btn-primary flex items-center gap-2">
                    <span>📦</span> Registrar Entrega
                 </button>
              </div>
           </header>

           {/* Viewport */}
           <div className="p-10 scroll-smooth">
              {children}
           </div>
        </main>
      </body>
    </html>
  );
}
