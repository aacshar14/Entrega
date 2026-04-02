'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Package, 
  Clock, 
  CreditCard, 
  Users, 
  FileText,
  Bell,
  Zap,
  Settings,
  ShieldCheck,
  TrendingUp,
  PlusCircle,
  Menu,
  Home,
  Plus,
  ChevronDown
} from 'lucide-react';
import { useTenant } from '../lib/context/TenantContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, activeTenant, memberships, switchTenant, isLoading } = useTenant();
  const pathname = usePathname();
  const [showTenantSwitcher, setShowTenantSwitcher] = useState(false);

  // If on landing or generic pages, return children directly
  if (pathname === '/landing' || pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EBEEF2]">
        <div className="flex flex-col items-center gap-4">
          <Zap className="w-10 h-10 text-[#56CCF2] animate-pulse" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando EntréGA...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'Inicio', href: '/dashboard', roles: ['admin', 'owner', 'operator'] },
    { icon: Users, label: 'Clientes', href: '/customers', roles: ['admin', 'owner', 'operator'] },
    { icon: PlusCircle, label: 'Operación', href: '/operations', roles: ['admin', 'owner', 'operator'], primary: true },
    { icon: CreditCard, label: 'Cobros', href: '/payments', roles: ['admin', 'owner', 'operator'] },
    { icon: Menu, label: 'Más', href: '/more', roles: ['admin', 'owner', 'operator'] },
  ];

  const desktopMenuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', roles: ['admin', 'owner', 'operator'] },
    { icon: Package, label: 'Stock', href: '/stock', roles: ['admin', 'owner', 'operator'] },
    { icon: Clock, label: 'Movimientos', href: '/movements', roles: ['admin', 'owner', 'operator'] },
    { icon: CreditCard, label: 'Pagos', href: '/payments', roles: ['admin', 'owner', 'operator'] },
    { icon: TrendingUp, label: 'Adeudos', href: '/balances', roles: ['admin', 'owner', 'operator'] },
    { icon: Users, label: 'Clientes', href: '/customers', roles: ['admin', 'owner', 'operator'] },
    { icon: Package, label: 'Productos', href: '/products', roles: ['admin', 'owner'] },
    { icon: FileText, label: 'Reportes', href: '/reports', roles: ['admin', 'owner'] },
    { icon: ShieldCheck, label: 'Usuarios', href: '/users', roles: ['admin', 'owner'] },
    { icon: Settings, label: 'Configuración', href: '/settings', roles: ['admin', 'owner'] },
  ];

  const userRole = user?.platform_role === 'admin' ? 'admin' : (memberships.find(m => m.tenant_id === activeTenant?.id)?.tenant_role || 'operator');
  const visibleDesktopItems = desktopMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="bg-[#EBEEF2] flex flex-col md:flex-row min-h-screen">
      
      {/* SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex w-72 bg-[#1D3146] text-white flex-col fixed top-0 h-screen overflow-y-auto border-r border-slate-800 z-50">
        <div className="p-8 pb-8 flex flex-col items-center gap-6">
           <div className="flex items-center gap-3">
              <div className="bg-[#56CCF2] p-1.5 rounded-lg shadow-lg rotate-[-12deg]">
                <Zap className="w-6 h-6 text-white" fill="white" /> 
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter text-white">EntréGA</h1>
           </div>
           
           {/* TENANT SWITCHER (Platform Admin & Multi-Users) */}
           <div className="relative w-full">
              <div 
                onClick={() => setShowTenantSwitcher(!showTenantSwitcher)}
                className="flex flex-col items-center gap-2 px-6 py-4 bg-white/5 rounded-2xl border border-white/10 w-full text-center cursor-pointer hover:bg-white/10 transition-all group"
              >
                 <img src={activeTenant?.logo_url || '/chocobites.jpg'} alt={activeTenant?.name} className="w-12 h-12 rounded-full border-2 border-white/20 shadow-md" />
                 <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#56CCF2] truncate">{activeTenant?.name || 'Seleccionar Negocio'}</span>
                    {(user?.platform_role === 'admin' || memberships.length > 1) && <ChevronDown size={12} className="text-slate-500" />}
                 </div>
                 {user?.platform_role === 'admin' && (
                    <span className="text-[8px] bg-[#56CCF2]/20 text-[#56CCF2] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Viewing as Admin</span>
                 )}
              </div>

              {showTenantSwitcher && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1D3146] border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                   <div className="p-4 border-b border-white/5 bg-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mis Negocios</p>
                   </div>
                   <div className="max-h-60 overflow-y-auto">
                      {memberships.map((m) => (
                        <div 
                          key={m.tenant_id}
                          onClick={() => { switchTenant(m.tenant_id); setShowTenantSwitcher(false); }}
                          className={`p-4 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-colors ${m.tenant_id === activeTenant?.id ? 'bg-white/5' : ''}`}
                        >
                           <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs text-[#56CCF2]">
                              {m.tenant_name[0]}
                           </div>
                           <div>
                              <p className="text-xs font-bold text-white leading-none mb-1">{m.tenant_name}</p>
                              <p className="text-[10px] text-slate-500 font-medium uppercase">{m.tenant_role}</p>
                           </div>
                        </div>
                      ))}
                      {user?.platform_role === 'admin' && (
                        <div className="p-4 bg-white/2 border-t border-white/5">
                           <p className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2] mb-3">Admin Controls</p>
                           <button className="text-xs text-slate-400 hover:text-white transition-colors w-full text-left flex items-center gap-2">
                              <Plus size={14} /> Registrar nuevo cliente
                           </button>
                        </div>
                      )}
                   </div>
                </div>
              )}
           </div>

           {/* PRIMARY DESKTOP ACTION */}
           <Link href="/operations" className="w-full py-4 bg-[#56CCF2] text-[#1D3146] rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest shadow-lg shadow-[#56CCF2]/20 hover:scale-105 transition-all active:scale-95 group">
              <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              Nueva Operación
           </Link>
        </div>

        <nav className="flex flex-col gap-1.5 px-4 mb-20 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-hide">
           {visibleDesktopItems.map((item, i) => (
              <Link 
                key={i} 
                href={item.href} 
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all text-sm font-semibold group ${
                  pathname === item.href 
                  ? 'bg-[#2B4764] text-white border border-white/5 shadow-inner' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                 <item.icon size={18} className={pathname === item.href ? 'text-[#56CCF2]' : 'text-slate-400 group-hover:text-[#56CCF2] transition-colors'} />
                 {item.label}
              </Link>
           ))}
        </nav>

        <div className="mt-auto p-6 border-t border-white/5 bg-white/2 cursor-pointer flex items-center justify-between group">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-black text-[10px]">{user?.full_name.split(' ').map(n => n[0]).join('')}</div>
              <div className="leading-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">
                 <p className="text-xs font-bold text-white mb-0.5">{user?.full_name}</p>
                 <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{userRole}</p>
              </div>
           </div>
           <Settings size={14} className="text-slate-500 group-hover:text-white transition-colors" />
        </div>
      </aside>

      {/* HEADER (Mobile Only) */}
      <header className="md:hidden flex items-center justify-between px-6 h-20 bg-[#1D3146] text-white sticky top-0 z-[100] border-b border-white/10 shadow-lg">
         <div className="flex items-center gap-3">
            <img src={activeTenant?.logo_url || '/chocobites.jpg'} className="w-10 h-10 rounded-xl border border-white/20 shadow-md" alt="Logo" />
            <div>
               <p className="text-xs font-black text-[#56CCF2] uppercase tracking-tighter leading-none mb-0.5">{activeTenant?.name}</p>
               <h1 className="text-lg font-bold leading-none tracking-tight">EntréGA</h1>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="relative">
              <Bell size={22} className="text-slate-300" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#56CCF2] border-2 border-[#1D3146] rounded-full"></span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#2B4764] border border-white/20 flex items-center justify-center font-black text-xs text-[#56CCF2] shadow-inner">
              {user?.full_name.split(' ').map(n => n[0]).join('')}
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
                 pathname === item.href ? 'text-[#1D3146]' : 'text-slate-400'
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
                     <item.icon size={24} strokeWidth={pathname === item.href ? 2.5 : 2} className="transition-transform active:scale-90" />
                     <span className={`text-[10px] font-black uppercase tracking-tighter ${pathname === item.href ? 'text-[#1D3146]' : 'text-slate-400'}`}>
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
    </div>
  );
}
