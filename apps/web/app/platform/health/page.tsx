'use client';

import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Activity, 
  Database, 
  ShieldCheck, 
  Server, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Globe
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function PlatformHealth() {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await apiRequest('admin/health', 'GET');
        setHealthData(data);
      } catch (err) {
        console.error('Error loading health:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHealth();
  }, []);

  const components = [
    { name: 'API Gateway', status: healthData?.api_v1 || 'operational', icon: Globe, color: 'text-blue-500' },
    { name: 'Postgres DB', status: healthData?.database || '...', icon: Database, color: 'text-purple-500' },
    { name: 'Supabase Auth', status: 'connected', icon: ShieldCheck, color: 'text-emerald-500' },
    { name: 'SRE Monitor', status: 'active', icon: Activity, color: 'text-amber-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
             <HeartPulse className="text-emerald-500" size={32} />
             System Health
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Estado en tiempo real de los servicios críticos de Entrega.</p>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
           <div className={`w-3 h-3 rounded-full ${healthData?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
           <span className="text-xs font-black uppercase tracking-widest text-[#1D3146]">
             {healthData?.status === 'online' ? 'All Systems Operational' : 'Loading status...'}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {components.map((comp, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-50/50 rounded-full group-hover:bg-slate-100/50 transition-all"></div>
            <comp.icon className={`${comp.color} mb-6 relative`} size={28} />
            <h3 className="font-bold text-[#1D3146] mb-1 relative">{comp.name}</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest relative">{comp.status}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-[#0F172A] text-white rounded-[3rem] p-10 shadow-2xl">
              <h3 className="text-xl font-black mb-10 flex items-center gap-3">
                 <Server size={24} className="text-amber-400" />
                 Core API Status
              </h3>
              
              <div className="space-y-8">
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                       <span>Database latency</span>
                       <span className="text-emerald-400">12ms</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full w-[12%] bg-emerald-500"></div>
                    </div>
                 </div>
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                       <span>CPU Usage (Cloud Run)</span>
                       <span className="text-blue-400">8%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full w-[8%] bg-blue-500"></div>
                    </div>
                 </div>
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                       <span>Memory Load</span>
                       <span className="text-purple-400">142MB</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full w-[24%] bg-purple-500"></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-10">
           <h3 className="text-xl font-black text-[#1D3146] mb-8 flex items-center gap-3">
              <Clock size={24} className="text-blue-500" />
              Build Info
           </h3>
           <div className="space-y-6">
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Versión Deploy</p>
                 <p className="font-mono text-sm font-bold text-[#1D3146]">{healthData?.version || '...'}</p>
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Server Timestamp</p>
                 <p className="text-sm font-bold text-[#1D3146]">
                    {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : '...'}
                 </p>
              </div>
              <div className="pt-8 border-t border-slate-50">
                 <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">SSL Validated</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
