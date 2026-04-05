'use client';

import React, { useState, useEffect } from 'react';
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
  Layout,
  LogOut,
  User as UserIcon,
  ArrowLeft,
  Activity,
  HeartPulse,
  Coins
} from 'lucide-react';
import { Providers } from '../lib/context/providers';
import { useTenant } from '../lib/context/tenant-context';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';
import { FEATURES } from '../config/feature-flags';

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  ownerOnly?: boolean;
  sreOnly?: boolean;
}

const tenantMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Clientes', href: '/customers' },
    { icon: Package, label: 'Inventario', href: '/stock' },
    { icon: Layout, label: 'Operaciones', href: '/operations' },
    { icon: Clock, label: 'Movimientos', href: '/movements' },
    { icon: CreditCard, label: 'Pagos', href: '/payments' },
    { icon: FileText, label: 'Reportes', href: '/reports/weekly', ownerOnly: true },
];

const platformMenuItems: MenuItem[] = [
    { icon: Activity, label: 'Resumen', href: '/platform' },
    { icon: Users, label: 'Tenants', href: '/platform/tenants' },
    { icon: UserIcon, label: 'Usuarios', href: '/platform/users' },
    { icon: HeartPulse, label: 'Salud', href: '/platform/health', sreOnly: true },
    { icon: Coins, label: 'Costos', href: '/platform/costs', sreOnly: true },
    { icon: Settings, label: 'Ajustes', href: '/platform/settings' },
];

function UI_Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeTenant, activeRole, isLoading, clearTenant } = useTenant();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isPlatformPath = pathname.startsWith('/platform');
  const isAdmin = user?.platform_role === 'admin';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 1. Protection for Platform routes
  if (isPlatformPath && !isAdmin && !isLoading) {
    router.replace('/dashboard');
    return null;
  }

  // 1b. Feature Flag Check
  if (isPlatformPath && !FEATURES.ENABLE_PLATFORM) {
    router.replace('/dashboard');
    return null;
  }

  // 2. Protection for Owner-Only routes
  const isOwnerOnlyRoute = tenantMenuItems.find(i => i.href === pathname)?.ownerOnly;
  if (isOwnerOnlyRoute && activeRole !== 'owner' && !isLoading) {
    return null; // The Provider should have redirected, but as a shell gate: stay blank
  }

  // No shell for landing or login
  const isPublicPath = ['/landing', '/login', '/'].includes(pathname);
  if (isPublicPath) return children;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest animate-pulse">Protegiendo tu sesión</p>
      </div>
    );
  }

  // 3. User block (Single Source of Truth)
  if (!user) return null;

  // 4. Tenant Selection Guard
  const isTenantSetupPath = pathname.startsWith('/select-tenant') || pathname.startsWith('/onboarding');
  if (!activeTenant && !isTenantSetupPath && !isPlatformPath) {
    // If authenticated but no active tenant, you can't be on dashboard/stock/etc.
    return null; 
  }

  const displayUser = {
    name: user.full_name || 'Usuario',
    role: user.platform_role === 'admin' ? 'Plataforma Admin' : (activeRole === 'owner' ? 'Dueño / Admin' : 'Operador')
  };

  const displayTenant = {
    name: activeTenant?.name || 'Seleccionar Negocio'
  };

  const currentMenu = isPlatformPath ? platformMenuItems : tenantMenuItems;

  return (
    <div className="flex min-h-screen bg-[#EBEEF2] font-sans antialiased text-slate-900">
      {/* Sidebar (Desktop) */}
      <aside className={`fixed inset-y-0 left-0 w-64 ${isPlatformPath ? 'bg-[#0F172A]' : 'bg-[#1D3146]'} text-white flex flex-col z-50 transition-colors duration-500`}>
        <div className="p-8 pb-12">
            <div className="flex items-center gap-3">
               <div className={`${isPlatformPath ? 'bg-amber-400' : 'bg-[#56CCF2]'} p-2 rounded-xl text-[#0F172A] transition-colors`}>
                  <Zap size={24} fill="currentColor" />
               </div>
               <div>
                  <h1 className="text-xl font-black tracking-tighter">Entrega</h1>
                  {isPlatformPath && <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 leading-none mt-1">Platform Admin</p>}
               </div>
            </div>
        </div>

        <nav className="flex-grow px-4 space-y-1">
          {currentMenu
            .filter(item => (!item.ownerOnly || activeRole === 'owner') && (!item.sreOnly || FEATURES.ENABLE_SRE))
            .map((item) => {
              const isActive = pathname === item.href;
              const activeColor = isPlatformPath ? 'bg-amber-400 text-[#0F172A]' : 'bg-[#56CCF2] text-[#1D3146]';
              const hoverColor = isPlatformPath ? 'hover:text-amber-400' : 'hover:text-[#56CCF2]';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm group ${
                    isActive ? `${activeColor} shadow-lg` : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className={isActive ? '' : `text-slate-500 group-${hoverColor}`} />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {isPlatformPath ? (
           <div className="p-8 border-t border-white/5">
              <div className="bg-white/5 rounded-2xl p-4">
                 <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Status Global</p>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-xs font-bold">API Operativa</p>
                 </div>
              </div>
           </div>
        ) : (
           <>
              {isAdmin && (
                 <button 
                  onClick={clearTenant}
                  className="mx-4 mb-2 flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 group"
                 >
                    <ArrowLeft size={16} />
                    Regresar a Plataforma
                 </button>
              )}
              <Link href="/settings" className="p-8 border-t border-white/5 hover:bg-white/5 transition-all block cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                       <Settings size={20} className="text-[#56CCF2]" />
                    </div>
                    <div>
                       <p className="text-xs font-black text-white/50 uppercase tracking-widest leading-none mb-1">Configuración</p>
                       <p className="text-xs font-bold text-white">Panel Central</p>
                    </div>
                 </div>
              </Link>
           </>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow pl-64 flex flex-col min-h-screen">
         {/* Top Header */}
         <header className="h-20 bg-white/70 backdrop-blur-md sticky top-0 z-40 px-8 lg:px-10 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-4">
               <div className={`${isPlatformPath ? 'bg-amber-100' : 'bg-[#56CCF2]/20'} px-3 py-1 rounded-full flex items-center gap-2 transition-colors`}>
                  <ShieldCheck size={14} className={isPlatformPath ? 'text-amber-600' : 'text-[#56CCF2]'} />
                  <span className={`text-[10px] font-black uppercase ${isPlatformPath ? 'text-amber-900' : 'text-[#1D3146]'} tracking-tighter`}>
                    {isPlatformPath ? 'Infra Administration' : 'Premium Enterprise'}
                  </span>
               </div>
               <span className="text-slate-400 text-sm font-medium">/</span>
               <h2 className="text-sm font-black text-[#1D3146] uppercase tracking-widest">
                  {isPlatformPath ? 'Global Control' : displayTenant.name}
               </h2>
            </div>
            
            <div className="flex items-center gap-6">
               <div className="relative cursor-pointer">
                  <Bell size={20} className="text-slate-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">2</span>
               </div>
               
               <div className="h-10 w-[1px] bg-slate-100"></div>

               <div className="relative">
                  <div 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-4 px-2 py-1 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group"
                  >
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
                     <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                  </div>

                  {showUserMenu && (
                    <div className="absolute right-0 top-14 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-4">
                        <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa Activa</p>
                           <p className="text-sm font-black text-[#1D3146]">{displayTenant.name}</p>
                        </div>
                        <div className="space-y-1">
                           <Link 
                             href="/settings"
                             onClick={() => setShowUserMenu(false)}
                             className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-[#56CCF2]/5 hover:text-[#56CCF2] rounded-xl transition-all"
                           >
                              <UserIcon size={18} />
                              Mi Perfil
                           </Link>
                           <button 
                             onClick={handleLogout}
                             className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                           >
                              <LogOut size={18} />
                              Cerrar Sesión
                           </button>
                        </div>
                    </div>
                  )}
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
