import React from 'react';
import './globals.css';
import { 
  LayoutDashboard, 
  Package, 
  Clock, 
  CreditCard, 
  Users, 
  FileText,
  Bell,
  ChevronDown,
  Zap
} from 'lucide-react';

export const metadata = {
  title: 'EntréGA Dashboard',
  description: 'Gestión logística inteligente.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="antialiased font-sans">
      <body className="flex min-h-screen bg-[#EBEEF2]">
        {/* Sidebar Azul Compacto */}
        <aside className="w-56 bg-[#1D3146] text-white flex flex-col fixed top-0 h-screen overflow-y-auto border-r border-slate-800">
          <div className="p-8 pb-10 flex items-center gap-3">
             <div className="bg-[#56CCF2] p-1 rounded-md shadow-lg shadow-[#56CCF2]/20 rotate-[-12deg]">
               <Zap className="w-5 h-5 text-white" fill="white" /> 
             </div>
             <h1 className="text-xl font-black italic tracking-tighter text-white">EntréGA</h1>
          </div>

          <nav className="flex flex-col gap-1 px-3">
             {[
               { icon: LayoutDashboard, label: 'Dashboard', active: true },
               { icon: Package, label: 'Stock' },
               { icon: Clock, label: 'Movimientos' },
               { icon: CreditCard, label: 'Pagos' },
               { icon: Users, label: 'Adeudos' },
               { icon: FileText, label: 'Reportes' }
             ].map((item, i) => (
                <a 
                  key={i} 
                  href="#" 
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                    item.active 
                    ? 'bg-[#2B4764] text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                   <item.icon size={18} className={item.active ? 'text-[#56CCF2]' : 'text-slate-400'} />
                   {item.label}
                </a>
             ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-grow pl-56 flex flex-col min-h-screen">
           {/* Header Navy match image */}
           <header className="h-16 bg-[#1D3146] px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm border-b border-white/5">
              <h2 className="text-lg font-bold text-white opacity-90 tracking-tight">Dashboard</h2>
              
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-3 group cursor-pointer pr-6 border-r border-white/10">
                    <img 
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                      alt="Admin" 
                      className="w-8 h-8 rounded-full bg-slate-100/10 border border-white/20"
                    />
                    <div className="flex flex-col items-start leading-none gap-1">
                      <span className="text-sm font-bold text-white">Admin</span>
                    </div>
                    <ChevronDown size={14} className="text-slate-400" />
                 </div>
                 <div className="relative cursor-pointer hover:scale-110 transition-transform">
                   <Bell size={20} className="text-slate-400 hover:text-white" />
                   <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#56CCF2] rounded-full"></span>
                 </div>
              </div>
           </header>

           {/* Viewport */}
           <main className="p-8 lg:p-10">
              {children}
           </main>
        </div>
      </body>
    </html>
  );
}
