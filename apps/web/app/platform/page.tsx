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
  LucideIcon
} from 'lucide-react';
import { useTenant } from '@/lib/context/tenant-context';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
  text: string;
  bg: string;
}

export default function PlatformOverview() {
  const { memberships } = useTenant();
  const [view, setView] = React.useState<'overview' | 'users'>('overview');
  const [queueStats, setQueueStats] = React.useState<any>(null);
  const [capacity, setCapacity] = React.useState<any>(null);
  const [pressure, setPressure] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [q, cap, pres, u] = await Promise.all([
        apiRequest('admin/queue/stats', 'GET'),
        apiRequest('admin/capacity/advisor', 'GET'),
        apiRequest('admin/tenants/pressure', 'GET'),
        apiRequest('admin/users', 'GET')
      ]);
      setQueueStats(q);
      setCapacity(cap);
      setPressure(pres || []);
      setUsers(u || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiRequest(`admin/users/${userId}/status?is_active=${!currentStatus}`, 'PATCH');
      loadData();
    } catch (err) {
      alert('Error updating user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario permanentemente?')) return;
    try {
      await apiRequest(`admin/users/${userId}`, 'DELETE');
      loadData();
    } catch (err) {
      alert('Error deleting user');
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1D3146] tracking-tight">Platform Overview</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Global infrastructure control & user management.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
           <button 
             onClick={() => setView('overview')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Métricas
           </button>
           <button 
             onClick={() => setView('users')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Usuarios
           </button>
        </div>
      </div>

      {view === 'overview' ? (
        <>
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
        </>
      ) : (
        /* Users Management View */
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
           <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-xl font-black text-[#1D3146] flex items-center gap-3">
                 <Users className="text-blue-500" size={24} />
                 User Directory
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{users.length} Registrados</p>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Usuario</th>
                       <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tenants (Roles)</th>
                       <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
                    </tr>
                 </thead>
                 <tbody>
                    {users.map((user) => (
                       <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-10 py-6">
                             <div className="flex flex-col">
                                <span className="text-sm font-bold text-[#1D3146]">{user.full_name || 'Sin nombre'}</span>
                                <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                             </div>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex flex-wrap gap-2">
                                {user.memberships.length > 0 ? user.memberships.map((m: any, idx: number) => (
                                   <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                      <Building2 size={10} />
                                      {m.tenant_name} ({m.role})
                                   </span>
                                )) : (
                                   <span className="text-[10px] font-bold text-slate-300 italic">No memberships</span>
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-6">
                             <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {user.is_active ? 'Activo' : 'Suspendido'}
                             </span>
                          </td>
                          <td className="px-10 py-6 text-right">
                             <div className="flex items-center justify-end gap-3">
                                <button 
                                  onClick={() => handleToggleStatus(user.id, user.is_active)}
                                  className={`p-2 rounded-xl transition-all ${user.is_active ? 'hover:bg-rose-50 text-rose-400 hover:text-rose-600' : 'hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600'}`}
                                  title={user.is_active ? 'Suspender' : 'Activar'}
                                >
                                   {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl transition-all"
                                  title="Eliminar permanentemente"
                                >
                                   <Trash2 size={18} />
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
}
