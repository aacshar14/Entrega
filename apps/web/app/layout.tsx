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
  Coins,
  Layers,
  Menu,
  X
} from 'lucide-react';
import { Providers } from '../lib/context/providers';
import { useTenant } from '../lib/context/tenant-context';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';
import { FEATURES } from '../config/feature-flags';
import Logo from '@/components/logo';

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
    { icon: Layers, label: 'Inventario por Cliente', href: '/customer-inventory' },
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isPlatformPath = pathname.startsWith('/platform');
  const isAdmin = user?.platform_role === 'admin';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Protection logic... (skipped for brevity but kept in mind)
  if (isPlatformPath && !isAdmin && !isLoading) {
    router.replace('/dashboard');
    return null;
  }
  if (isPlatformPath && !FEATURES.ENABLE_PLATFORM) {
    router.replace('/dashboard');
    return null;
  }
  const isOwnerOnlyRoute = tenantMenuItems.find(i => i.href === pathname)?.ownerOnly;
  if (isOwnerOnlyRoute && activeRole !== 'owner' && !isLoading) {
    return null; 
  }
  const isPublicPath = ['/landing', '/login', '/', '/privacy-policy'].includes(pathname);
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

  if (!user) return null;

  const isTenantSetupPath = pathname.startsWith('/select-tenant') || pathname.startsWith('/onboarding');
  if (!activeTenant && !isTenantSetupPath && !isPlatformPath) {
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

  const SidebarContent = () => (
    <>
      <div className="p-8 pb-12 flex justify-between items-center">
          <Link href="/dashboard" className="flex flex-col items-center justify-center w-full">
             <Logo variant="master" className="w-56 h-auto drop-shadow-2xl" />
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-white/50 hover:text-white"
          >
            <X size={24} />
          </button>
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
      <div className="p-4 border-t border-white/5 opacity-40 text-center hidden lg:block">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Entrega v1.1</p>
        <p className="text-[7px] font-bold text-slate-400 leading-tight">Entrega is a SaaS platform for business inventory and delivery operations.</p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#EBEEF2] font-sans antialiased text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {!isPublicPath && !isTenantSetupPath && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      {!isPublicPath && !isTenantSetupPath && (
        <aside className={`fixed inset-y-0 left-0 w-64 ${isPlatformPath ? 'bg-[#0F172A]' : 'bg-[#1D3146]'} text-white flex flex-col z-[70] transition-all duration-500 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}>
          <SidebarContent />
        </aside>
      )}

      {/* Main Content Area */}
      <div className={`flex-grow ${!isPublicPath && !isTenantSetupPath ? 'pl-0 lg:pl-64' : 'pl-0'} flex flex-col min-h-screen`}>
         {/* Top Header */}
         <header className="h-16 md:h-20 bg-white/70 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 lg:px-10 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
               {/* Mobile Menu Toggle */}
               {!isPublicPath && !isTenantSetupPath && (
                 <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-[#1D3146] transition-colors"
                 >
                   <Menu size={24} />
                 </button>
               )}
               
               <div className={`${isPlatformPath ? 'bg-amber-100' : 'bg-[#56CCF2]/20'} px-2 py-0.5 md:px-3 md:py-1 rounded-full hidden sm:flex items-center gap-2 transition-colors flex-shrink-0`}>
                  <ShieldCheck size={14} className={isPlatformPath ? 'text-amber-600' : 'text-[#56CCF2]'} />
                  <span className={`text-[9px] md:text-[10px] font-black uppercase ${isPlatformPath ? 'text-amber-900' : 'text-[#1D3146]'} tracking-tighter`}>
                    {isPlatformPath ? 'Infra Administration' : 'Premium Enterprise'}
                  </span>
               </div>
               <span className="text-slate-200 text-sm font-medium hidden sm:block">/</span>
               <h2 className="text-[10px] md:text-sm font-black text-[#1D3146] uppercase tracking-widest truncate max-w-[150px] md:max-w-none">
                  {isPlatformPath ? 'Global Control' : displayTenant.name}
               </h2>
            </div>
            
            <div className="flex items-center gap-3 md:gap-6">
               <div className="relative cursor-pointer">
                  <Bell size={18} className="text-slate-400" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[7px] font-black flex items-center justify-center rounded-full border-2 border-white">2</span>
               </div>
               
               <div className="h-8 w-[1px] bg-slate-100"></div>

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
