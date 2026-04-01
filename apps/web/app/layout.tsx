import React from 'react';
import './globals.css';

export const metadata = {
  title: 'EntréGA V1.1',
  description: 'Sistema de gestión de entregas y finanzas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="antialiased font-sans">
      <body className="flex min-h-screen bg-[#F4F7F9]">
        {/* Sidebar Azul Navy */}
        <aside className="w-64 bg-[#1E3146] text-white flex flex-col fixed top-0 h-screen scrollbar-hide">
          <div className="p-8 pb-10 flex items-center gap-3">
             <div className="bg-blue-400 p-1.5 rounded-md -rotate-12">🚀</div>
             <h1 className="text-[22px] font-black tracking-tight text-white italic">EntréGA</h1>
          </div>

          <nav className="flex flex-col gap-1 flex-grow">
             {[
               { icon: '🏠', label: 'Dashboard', active: true },
               { icon: '📦', label: 'Stock' },
               { icon: '🕒', label: 'Movimientos' },
               { icon: '💰', label: 'Pagos' },
               { icon: '💳', label: 'Adeudos' },
               { icon: '📊', label: 'Reportes' }
             ].map((item, i) => (
                <a key={i} href="#" className={`sidebar-item ${item.active ? 'sidebar-item-active' : ''}`}>
                   <span className="text-lg opacity-70">{item.icon}</span>
                   {item.label}
                </a>
             ))}
          </nav>

          <footer className="mt-auto p-8 border-t border-slate-700/50">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by Entrega.space</p>
          </footer>
        </aside>

        {/* Main Content Area */}
        <div className="flex-grow pl-64 flex flex-col">
           {/* Header Blanco */}
           <header className="h-16 bg-[#1D3146] text-white px-10 flex items-center justify-between sticky top-0 z-50">
              <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
              
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-slate-400 overflow-hidden shadow-sm">
                       <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" />
                    </div>
                    <span className="text-sm font-bold opacity-80 group-hover:opacity-100">Admin</span>
                    <span className="text-[10px] opacity-40">▼</span>
                 </div>
                 <span className="text-xl opacity-60 hover:opacity-100 cursor-pointer">🔔</span>
              </div>
           </header>

           {/* Viewport */}
           <main className="p-10 pb-20">
              {children}
           </main>
        </div>
      </body>
    </html>
  );
}
