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
  Zap,
  Settings,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export const metadata = {
  title: 'EntréGA Dashboard',
  description: 'Gestión logística inteligente.',
};

// Mock Auth context for pilot implementation
const getCurrentSession = () => {
    // In production, this would come from a real session or cookie
    return {
        user: { name: "Owner ChocoBites", role: "owner" },
        tenant: { name: "ChocoBites Pilot" }
    };
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getCurrentSession();
  const { user, tenant } = session;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['owner', 'operator'] },
    { icon: Package, label: 'Stock', href: '/stock', roles: ['owner', 'operator'] },
    { icon: Clock, label: 'Movimientos', href: '/movements', roles: ['owner', 'operator'] },
    { icon: CreditCard, label: 'Pagos', href: '/payments', roles: ['owner', 'operator'] },
    { icon: TrendingUp, label: 'Adeudos', href: '/balances', roles: ['owner', 'operator'] },
    { icon: Users, label: 'Clientes', href: '/customers', roles: ['owner', 'operator'] },
    { icon: Package, label: 'Productos', href: '/products', roles: ['owner'] },
    { icon: FileText, label: 'Reportes', href: '/reports', roles: ['owner'] },
    { icon: ShieldCheck, label: 'Usuarios', href: '/users', roles: ['owner'] },
    { icon: Settings, label: 'Configuración', href: '/settings', roles: ['owner'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <html lang="es" className="antialiased font-sans">
      <body className="flex min-h-screen bg-[#EBEEF2]">
        {/* Sidebar Azul Compacto */}
        <aside className="w-64 bg-[#1D3146] text-white flex flex-col fixed top-0 h-screen overflow-y-auto border-r border-slate-800 scrollbar-hide">
          <div className="p-8 pb-8 flex flex-col items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="bg-[#56CCF2] p-1.5 rounded-lg shadow-lg shadow-[#56CCF2]/20 rotate-[-12deg]">
                  <Zap className="w-6 h-6 text-white" fill="white" /> 
                </div>
                <h1 className="text-2xl font-black italic tracking-tighter text-white">EntréGA</h1>
             </div>
             
             {/* Tenant Logo indicator */}
             <div className="flex flex-col items-center gap-2 px-6 py-4 bg-white/5 rounded-2xl border border-white/10 w-full">
                <img src="/chocobites.jpg" alt={tenant.name} className="w-12 h-12 rounded-full border-2 border-white/20" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#56CCF2] truncate max-w-full px-2">{tenant.name}</span>
             </div>
          </div>

          <nav className="flex flex-col gap-1.5 px-4 mb-10">
             {visibleMenuItems.map((item, i) => (
                <Link 
                  key={i} 
                  href={item.href} 
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-sm font-semibold group ${
                    i === 0 
                    ? 'bg-[#2B4764] text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                   <item.icon size={18} className={i === 0 ? 'text-[#56CCF2]' : 'text-slate-400 group-hover:text-[#56CCF2] transition-colors'} />
                   {item.label}
                </Link>
             ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-grow pl-64 flex flex-col min-h-screen">
           {/* Header Navy match image */}
           <header className="h-16 bg-[#1D3146] px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm border-b border-white/5">
              <div className="flex items-center gap-2">
                 <h2 className="text-lg font-bold text-white opacity-90 tracking-tight capitalize">{user.role} Dashboard</h2>
                 <span className="px-2 py-0.5 bg-[#56CCF2]/20 text-[#56CCF2] text-[10px] uppercase font-black rounded-md border border-[#56CCF2]/20">v1 RBAC</span>
              </div>
              
              <div className="flex items-center gap-6">
                 {/* Branding / User Profile */}
                 <div className="flex items-center gap-4 group cursor-pointer pr-6 border-r border-white/10">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-[#56CCF2] uppercase tracking-tighter leading-tight">{user.role}</p>
                      <p className="text-sm font-bold text-white leading-none">{user.name}</p>
                      <p className="text-[10px] font-medium text-slate-400 leading-tight">{tenant.name}</p>
                    </div>
                    <div className="relative">
                      <img 
                        src="/chocobites.jpg" 
                        alt={user.name} 
                        className="w-9 h-9 rounded-full border-2 border-[#56CCF2] shadow-lg shadow-white/5"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1D3146] rounded-full"></span>
                    </div>
                    <ChevronDown size={14} className="text-slate-400 group-hover:text-white transition-colors" />
                 </div>

                 <div className="relative cursor-pointer hover:scale-110 transition-all duration-300">
                   <Bell size={20} className="text-slate-400 hover:text-white" />
                   <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#56CCF2] rounded-full animate-pulse shadow-[0_0_8px_#56CCF2]"></span>
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
