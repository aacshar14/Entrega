'use client';

import React from 'react';
import { 
  Users, 
  Building2, 
  Activity, 
  ShieldCheck, 
  Database, 
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTenant } from '@/lib/context/tenant-context';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

export default function PlatformOverview() {
  const { memberships } = useTenant();
  const [statsData, setStatsData] = React.useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  
  React.useEffect(() => {
    async function loadStats() {
      try {
        const data = await apiRequest('admin/stats', 'GET');
        setStatsData(data);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    }
    loadStats();
  }, []);

  const stats = [
    { label: 'Tenants Activos', value: statsData?.tenants?.toString() || memberships.length.toString(), icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Usuarios Globales', value: statsData?.users?.toString() || '...', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Movimientos (24h)', value: statsData?.active_24h?.toString() || '...', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Status Sistema', value: statsData?.health === 'healthy' ? 'Óptimo' : '...', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Welcome */}
      <div>
        <h1 className="text-4xl font-black text-[#1D3146] tracking-tight">Platform Overview</h1>
        <p className="text-slate-500 mt-2 font-medium">Panel de control global de infraestructura y observabilidad.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all">
            <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-6`}>
               <stat.icon className={stat.color} size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-[#1D3146]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tenants */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-[#1D3146] flex items-center gap-3">
              <Building2 className="text-amber-500" size={24} />
              Últimos Tenants
            </h3>
            <Link href="/platform/tenants" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="p-4">
             <div className="divide-y divide-slate-50">
                {memberships.slice(0, 5).map((m) => (
                  <div key={m.tenant.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-3xl group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black group-hover:bg-white group-hover:shadow-md transition-all">
                        {m.tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#1D3146]">{m.tenant.name}</p>
                        <p className="text-xs text-slate-400 font-medium">Status: {m.tenant.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-xs font-black text-[#1D3146] uppercase tracking-widest">{m.role}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Habilitado</p>
                       </div>
                       <button 
                        onClick={() => {/* Use clearTenant or similar to enter */}}
                        className="p-3 bg-slate-100 rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all"
                       >
                         <ArrowRight size={20} />
                       </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* System Health Area */}
        <div className="space-y-6">
           <div className="bg-[#0F172A] text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full"></div>
              <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                 <Activity size={24} className="text-amber-400" />
                 SRE Monitor
              </h3>
              
              <div className="space-y-6">
                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-xs font-bold text-slate-400 italic">API Gateway</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Normal</span>
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>
                 </div>
                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-xs font-bold text-slate-400 italic">Auth Service</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Normal</span>
                       <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    </div>
                 </div>
                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-xs font-bold text-slate-400 italic">Database Pool</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Normal</span>
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>
                 </div>
              </div>
              
              <button className="w-full mt-10 py-4 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10">
                 System Logs
              </button>
           </div>

           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Costo Estimado (Hoy)</p>
              <div className="flex items-end gap-2">
                 <p className="text-3xl font-black text-[#1D3146] tracking-tighter">$14.20 <span className="text-sm text-slate-300 font-bold uppercase tracking-widest ml-1">USD</span></p>
                 <div className="mb-1 text-emerald-500 flex items-center gap-0.5 font-bold text-xs">
                    <TrendingUp size={14} />
                    +2%
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
