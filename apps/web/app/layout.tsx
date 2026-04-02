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
  TrendingUp,
  PlusCircle,
  Menu,
  X,
  Home,
  Plus
} from 'lucide-react';

export const metadata = {
  title: 'EntréGA Dashboard',
  description: 'Gestión logística inteligente.',
  manifest: '/manifest.json',
  icons: {
    apple: '/chocobites.jpg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#1D3146',
};

// Mock Auth context for pilot implementation
const getCurrentSession = () => {
    return {
        user: { name: "Leonardo Gonzalez", role: "owner" },
        tenant: { name: "ChocoBites" }
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
    { icon: Home, label: 'Inicio', href: '/dashboard', roles: ['owner', 'operator'] },
    { icon: Users, label: 'Clientes', href: '/customers', roles: ['owner', 'operator'] },
    { icon: PlusCircle, label: 'Operación', href: '/operations', roles: ['owner', 'operator'], primary: true },
    { icon: CreditCard, label: 'Cobros', href: '/payments', roles: ['owner', 'operator'] },
    { icon: Menu, label: 'Más', href: '/more', roles: ['owner', 'operator'] },
  ];

  const desktopMenuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', roles: ['owner', 'operator'] },
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

  const visibleDesktopItems = desktopMenuItems.filter(item => item.roles.includes(user.role));

  return (
    <html lang="es" className="antialiased font-sans">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#1D3146" />
        <link rel="apple-touch-icon" href="/chocobites.jpg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[#EBEEF2] flex flex-col md:flex-row min-h-screen">
        
        {/* SIDEBAR (Desktop Only) */}
        <aside className="hidden md:flex w-72 bg-[#1D3146] text-white flex-col fixed top-0 h-screen overflow-y-auto border-r border-slate-800 z-50">
          <div className="p-8 pb-8 flex flex-col items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="bg-[#56CCF2] p-1.5 rounded-lg shadow-lg rotate-[-12deg]">
                  <Zap className="w-6 h-6 text-white" fill="white" /> 
                </div>
                <h1 className="text-2xl font-black italic tracking-tighter text-white">EntréGA</h1>
             </div>
             
             <div className="flex flex-col items-center gap-2 px-6 py-4 bg-white/5 rounded-2xl border border-white/10 w-full text-center">
                <img src="/chocobites.jpg" alt={tenant.name} className="w-12 h-12 rounded-full border-2 border-white/20 shadow-md" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#56CCF2] truncate w-full">{tenant.name}</span>
             </div>
          </div>

          <nav className="flex flex-col gap-1.5 px-4 mb-20 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-hide">
             {visibleDesktopItems.map((item, i) => (
                <Link 
                  key={i} 
                  href={item.href} 
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all text-sm font-semibold group ${
                    i === 0 
                    ? 'bg-[#2B4764] text-white border border-white/5 shadow-inner' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                   <item.icon size={18} className={i === 0 ? 'text-[#56CCF2]' : 'text-slate-400 group-hover:text-[#56CCF2] transition-colors'} />
                   {item.label}
                </Link>
             ))}
          </nav>

          <div className="mt-auto p-6 border-t border-white/5 bg-white/2 cursor-pointer flex items-center justify-between group">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-black text-[10px]">{user.name.split(' ').map(n => n[0]).join('')}</div>
                <div className="leading-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">
                   <p className="text-xs font-bold text-white mb-0.5">{user.name}</p>
                   <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{user.role}</p>
                </div>
             </div>
             <Settings size={14} className="text-slate-500 group-hover:text-white transition-colors" />
          </div>
        </aside>

        {/* HEADER (Mobile Only) */}
        <header className="md:hidden flex items-center justify-between px-6 h-20 bg-[#1D3146] text-white sticky top-0 z-[100] border-b border-white/10 shadow-lg">
           <div className="flex items-center gap-3">
              <img src="/chocobites.jpg" className="w-10 h-10 rounded-xl border border-white/20 shadow-md" alt="Logo" />
              <div>
                 <p className="text-xs font-black text-[#56CCF2] uppercase tracking-tighter leading-none mb-0.5">{tenant.name}</p>
                 <h1 className="text-lg font-bold leading-none tracking-tight">EntréGA</h1>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className="relative">
                <Bell size={22} className="text-slate-300" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#56CCF2] border-2 border-[#1D3146] rounded-full"></span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#2B4764] border border-white/20 flex items-center justify-center font-black text-xs text-[#56CCF2] shadow-inner">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
           </div>
        </header>

        {/* BOTTOM NAVIGATION (Mobile Only) */}
        <nav className="md:hidden flex items-center justify-around h-24 bg-white fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
           {menuItems.map((item, i) => (
              <Link 
                key={i} 
                href={item.href} 
                className={`flex flex-col items-center justify-center gap-1.5 transition-all py-2 ${
                   i === 0 ? 'text-[#1D3146]' : 'text-slate-400'
                } ${item.primary ? 'p-0 relative -top-6' : ''}`}
              >
                 {item.primary ? (
                    <div className="flex flex-col items-center">
                       <div className="bg-[#1D3146] p-4 rounded-full shadow-2xl shadow-[#1D3146]/40 border-[6px] border-[#EBEEF2] flex items-center justify-center">
                          <Plus className="text-[#56CCF2]" size={32} strokeWidth={3} />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-tighter mt-1 text-[#1D3146]">{item.label}</span>
                    </div>
                 ) : (
                    <>
                       <item.icon size={24} strokeWidth={i === 0 ? 2.5 : 2} className="transition-transform active:scale-90" />
                       <span className={`text-[10px] font-black uppercase tracking-tighter ${i === 0 ? 'text-[#1D3146]' : 'text-slate-400'}`}>
                          {item.label}
                       </span>
                    </>
                 )}
              </Link>
           ))}
        </nav>

        {/* MAIN CONTENT AREA */}
        <main className="flex-grow pt-0 md:pl-72 pb-[120px] md:pb-0 min-h-screen">
           <div className="p-6 md:p-10 lg:p-12">
              {children}
           </div>
        </main>
      </body>
    </html>
  );
}
