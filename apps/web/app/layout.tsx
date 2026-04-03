'use client';

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
  Layout
} from 'lucide-react';
import { Providers } from '../lib/context/providers';
import { useTenant } from '../lib/context/tenant-context';
import { usePathname } from 'next/navigation';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Clientes', href: '/customers' },
    { icon: Package, label: 'Inventario', href: '/stock' },
    { icon: Layout, label: 'Operaciones', href: '/operations' },
    { icon: CreditCard, label: 'Pagos', href: '/payments' },
    { icon: Clock, label: 'Movimientos', href: '/operations' }, // Point to operations for now
    { icon: FileText, label: 'Reportes', href: '/reports/weekly' }, // Fix 404
];

function UI_Shell({ children }) {
  const pathname = usePathname();
  const { user, activeTenant, isLoading } = useTenant();

  // No shell for landing or login
  const isPublicPath = ['/landing', '/login', '/'].includes(pathname);
  if (isPublicPath) return children;

  // Protected route loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">Protegiendo tu sesión</p>
      </div>
    );
  }

  // If loading finished but no user, and NOT on public path, show nothing (Provider will redirect)
  if (!user) return null;

  // STRICT GUARD: If authenticated but no tenant selected yet, 
  // only allow access to '/select-tenant' or '/onboarding'
  // (This prevents manual navigation to dashboard bypass)
  const isSetupPath = pathname.startsWith('/select-tenant') || pathname.startsWith('/onboarding');
  if (!activeTenant && !isSetupPath) {
    return null; // Don't render dashboard if no tenant is active
  }

  const displayUser = {
    name: user.full_name || 'Usuario',
    role: user.platform_role === 'admin' ? 'Plataforma Admin' : 'Operador'
  };

  const displayTenant = {
    name: activeTenant?.name || 'Seleccionar Negocio'
  };

  return (
    <div className="flex min-h-screen bg-[#EBEEF2] font-sans antialiased text-slate-900">
      {/* Sidebar (Desktop) */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[#1D3146] text-white flex flex-col z-50">
        <div className="p-8 pb-12">
            <div className="flex items-center gap-3">
               <div className="bg-[#56CCF2] p-2 rounded-xl text-[#1D3146]">
                  <Zap size={24} fill="currentColor" />
               </div>
               <h1 className="text-xl font-black tracking-tighter">EntréGA</h1>
            </div>
        </div>

        <nav className="flex-grow px-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm group ${
                  isActive ? 'bg-[#56CCF2] text-[#1D3146] shadow-lg shadow-[#56CCF2]/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-[#1D3146]' : 'text-slate-500 group-hover:text-[#56CCF2]'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 border-t border-white/5">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                 <Settings size={20} className="text-[#56CCF2]" />
              </div>
              <div>
                 <p className="text-xs font-black text-white/50 uppercase tracking-widest leading-none mb-1">Configuración</p>
                 <p className="text-xs font-bold text-white">Panel Central</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow pl-64 flex flex-col min-h-screen">
         {/* Top Header */}
         <header className="h-20 bg-white/70 backdrop-blur-md sticky top-0 z-40 px-8 lg:px-10 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-4">
               <div className="bg-[#56CCF2]/20 px-3 py-1 rounded-full flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#56CCF2]" />
                  <span className="text-[10px] font-black uppercase text-[#1D3146] tracking-tighter">Premium Enterprise</span>
               </div>
               <span className="text-slate-400 text-sm font-medium">/</span>
               <h2 className="text-sm font-black text-[#1D3146] uppercase tracking-widest">{displayTenant.name}</h2>
            </div>
            
            <div className="flex items-center gap-6">
               <div className="relative cursor-pointer">
                  <Bell size={20} className="text-slate-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">2</span>
               </div>
               
               <div className="h-10 w-[1px] bg-slate-100"></div>

               <div className="flex items-center gap-4 px-2 py-1 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group">
                  <div className="text-right">
                     <p className="text-sm font-black text-[#1D3146] leading-none mb-1">{displayUser.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{displayUser.role}</p>
                  </div>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-[#1D3146] flex items-center justify-center text-[#56CCF2] font-black text-xs border-2 border-slate-200 group-hover:border-[#56CCF2] transition-colors">
                      {displayUser.name.charAt(0)}
                    </div>
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-[0_0_8px_#56CCF2]"></span>
                  </div>
                  <ChevronDown size={14} className="text-slate-400" />
               </div>
            </div>
         </header>

         {/* Viewport */}
         <main className="p-8 lg:p-10">
            {children}
         </main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="antialiased font-sans">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#1D3146" />
        <link rel="apple-touch-icon" href="/chocobites.jpg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Providers>
           <UI_Shell>
              {children}
           </UI_Shell>
        </Providers>
      </body>
    </html>
  );
}
