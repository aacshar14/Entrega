import React from 'react';
import './globals.css';
import Link from 'next/link';
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
          <div className="p-8 pb-10 flex flex-col items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="bg-[#56CCF2] p-1 rounded-md shadow-lg shadow-[#56CCF2]/20 rotate-[-12deg]">
                  <Zap className="w-5 h-5 text-white" fill="white" /> 
                </div>
                <h1 className="text-xl font-black italic tracking-tighter text-white">EntréGA</h1>
             </div>
             
             {/* ChocoBites Pilot Logo Sidebar indicator */}
             <div className="flex flex-col items-center gap-2 px-4 py-3 bg-white/5 rounded-2xl border border-white/10">
                <img src="/chocobites.jpg" alt="ChocoBites" className="w-10 h-10 rounded-full border border-white/20" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">ChocoBites Pilot</span>
             </div>
          </div>

          <nav className="flex flex-col gap-1 px-3">
             {[
               { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', active: true },
               { icon: Package, label: 'Stock', href: '/stock' },
               { icon: Clock, label: 'Movimientos', href: '/dashboard' },
               { icon: CreditCard, label: 'Pagos', href: '/payments' },
               { icon: Users, label: 'Adeudos', href: '/dashboard' },
               { icon: FileText, label: 'Reportes', href: '/reports' }
             ].map((item, i) => (
                <Link 
                  key={i} 
                  href={item.href} 
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                    item.active 
                    ? 'bg-[#2B4764] text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                   <item.icon size={18} className={item.active ? 'text-[#56CCF2]' : 'text-slate-400'} />
                   {item.label}
                </Link>
             ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-grow pl-56 flex flex-col min-h-screen">
           {/* Header Navy match image */}
           <header className="h-16 bg-[#1D3146] px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm border-b border-white/5">
              <h2 className="text-lg font-bold text-white opacity-90 tracking-tight">Dashboard</h2>
              
              <div className="flex items-center gap-6">
                 {/* Branding / User Profile */}
                 <div className="flex items-center gap-4 group cursor-pointer pr-6 border-r border-white/10">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-[#56CCF2] uppercase tracking-tighter">Pilot Account</p>
                      <p className="text-sm font-bold text-white leading-none">ChocoBites</p>
                    </div>
                    <div className="relative">
                      <img 
                        src="/chocobites.jpg" 
                        alt="Admin" 
                        className="w-9 h-9 rounded-full border-2 border-[#56CCF2] shadow-lg shadow-white/5"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1D3146] rounded-full"></span>
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
