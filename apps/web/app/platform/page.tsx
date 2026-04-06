'use client';

import React from 'react';
import { 
  Users, 
  Building2, 
  Activity, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Zap,
  BarChart3,
  AlertTriangle,
  Trash2,
  Settings,
  UserCheck,
  UserX,
  LucideIcon,
  History
} from 'lucide-react';
import { useTenant } from '@/lib/context/tenant-context';
import { apiRequest } from '@/lib/api';

export default function PlatformOverview() {
  const [queueStats, setQueueStats] = React.useState<any>(null);
  const [capacity, setCapacity] = React.useState<any>(null);
  const [pressure, setPressure] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function loadData() {
      try {
        const [q, cap, pres] = await Promise.all([
          apiRequest('admin/queue/stats', 'GET'),
          apiRequest('admin/capacity/advisor', 'GET'),
          apiRequest('admin/tenants/pressure', 'GET')
        ]);
        setQueueStats(q);
        setCapacity(cap);
        setPressure(pres || []);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return { text: 'text-emerald-600', bg: 'bg-emerald-100', iconColor: 'text-emerald-400' };
      case 'degraded': return { text: 'text-amber-600', bg: 'bg-amber-100', iconColor: 'text-amber-400' };
      case 'critical': return { text: 'text-rose-600', bg: 'bg-rose-100', iconColor: 'text-rose-400' };
      default: return { text: 'text-slate-600', bg: 'bg-slate-100', iconColor: 'text-slate-400' };
    }
  };

  const stats: any[] = [
    { 
      label: 'Backlog Actual', 
      value: queueStats?.backlog?.toLocaleString() ?? 'No data', 
      icon: History, 
      ...getStatusColor(queueStats?.backlog > 500 ? 'degraded' : 'healthy')
    },
    ...(queueStats?.latency?.p95 ? [{ 
      label: 'Latencia p95', 
      value: `${queueStats.latency.p95}s`, 
      icon: Zap, 
      ...getStatusColor(queueStats.latency.p95 > 10 ? 'degraded' : 'healthy')
    }] : []),
    ...(capacity?.metrics?.['24h_volume'] ? [{ 
      label: 'Volumen (24h)', 
      value: capacity.metrics['24h_volume'].toLocaleString(), 
      icon: Activity, 
      ...getStatusColor('healthy')
    }] : []),
    { 
      label: 'Infra Status', 
      value: queueStats?.health_status === 'healthy' ? 'Estable' : queueStats?.health_status === 'degraded' ? 'Degradado' : 'Crítico', 
      icon: ShieldCheck, 
      ...getStatusColor(queueStats?.health_status)
    },
  ];

  const statusMap = getStatusColor(queueStats?.health_status);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Welcome */}
      <div>
        <h1 className="text-4xl font-black text-[#1D3146] tracking-tight">Platform Overview</h1>
        <p className="text-slate-500 mt-2 font-medium">Global infrastructure and observability control center.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all">
              <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-6`}>
                 <Icon className={stat.text} size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-[#1D3146]">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Load Distribution */}
        {pressure && pressure.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
               <h3 className="text-xl font-black text-[#1D3146] flex items-center gap-3">
                  <BarChart3 className="text-blue-500" size={24} />
                  Distribución de Carga
               </h3>
               <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-3 py-1 rounded-full tracking-widest">
                  Últimas 24h
               </span>
            </div>
            <div className="p-8">
               <div className="space-y-6">
                  {pressure.map((p, idx) => (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-sm font-bold text-[#1D3146]">{p.tenant_name || 'Desconocido'}</span>
                         <span className="text-xs font-black text-blue-600">{p.event_count.toLocaleString()} ev</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                           style={{ width: `${(p.event_count / (pressure[0]?.event_count || 1)) * 100}%` }}
                         ></div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* Actionable Insights & Status */}
        <div className={pressure && pressure.length > 0 ? "space-y-6" : "lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8"}>
           <div className="bg-[#0F172A] text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full group-hover:bg-blue-500/20 transition-all"></div>
              
              <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                 <Activity size={24} className={statusMap.iconColor} />
                 Runtime Health
              </h3>
              
              <div className="space-y-6 relative z-10">
                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-xs font-bold text-slate-400">Backlog Age</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${queueStats?.oldest_pending_seconds > 300 ? 'text-amber-400' : 'text-emerald-400'}`}>
                       {queueStats?.oldest_pending_seconds ? `${Math.floor(queueStats.oldest_pending_seconds / 60)}m` : '0m'}
                    </span>
                 </div>
                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-xs font-bold text-slate-400">Async Workers</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${queueStats?.active_processing > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {queueStats?.active_processing ?? 0} Active
                    </span>
                 </div>
                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-xs font-bold text-slate-400">DB Connections</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${queueStats?.db_connections > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                       {queueStats?.db_connections === -1 ? 'Unknown' : queueStats?.db_connections ?? 'No data'}
                    </span>
                 </div>
              </div>

              <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/10">
                 <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className={statusMap.iconColor} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Capacity Advisor</span>
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    {capacity?.advice || "No advice available"}
                 </p>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all h-fit self-end">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">System Pulse</p>
              <div className="flex items-center gap-4">
                 <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${queueStats?.health_status === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'} w-full animate-[pulse_2s_infinite]`}></div>
                 </div>
                 <span className="text-xs font-black text-[#1D3146]">
                    {queueStats?.health_status === 'critical' ? 'Degraded performance' : '99.9% Uptime'}
                 </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
