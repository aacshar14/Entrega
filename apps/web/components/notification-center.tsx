'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  MessageCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  TrendingUp,
  Zap,
  Package,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';
import Link from 'next/link';

interface Notification {
  id: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  cta_label?: string;
  cta_link?: string;
  created_at: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { activeTenant, user } = useTenant();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const resp = await apiRequest('notifications', 'GET');
      setNotifications(resp);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 min poll
    return () => clearInterval(interval);
  }, [activeTenant?.id]);

  const markRead = async (id: string) => {
    try {
      await apiRequest(`notifications/${id}/read`, 'PATCH');
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales': return <TrendingUp className="text-emerald-500" size={18} />;
      case 'action_required': return <AlertTriangle className="text-rose-500" size={18} />;
      case 'operations': return <Package className="text-amber-500" size={18} />;
      case 'growth': return <Zap className="text-emerald-500" size={18} />;
      case 'sales_opp': return <MessageCircle className="text-blue-500" size={18} />;
      default: return <Info className="text-slate-400" size={18} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-rose-500 bg-rose-50/30';
      case 'high': return 'border-l-amber-500 bg-amber-50/30';
      default: return 'border-l-slate-200 bg-white';
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 hover:bg-white/10 rounded-xl transition-all group"
      >
        <Bell size={22} className={notifications.length > 0 ? "text-[#56CCF2]" : "text-slate-300"} />
        {notifications.length > 0 && (
          <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-[#1D3146] rounded-full animate-bounce"></span>
        )}
      </button>

      {/* Drawer / Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 top-full mt-4 w-96 max-h-[70vh] bg-white rounded-[2.5rem] shadow-2xl z-[200] overflow-hidden border border-slate-100 flex flex-col animate-in slide-in-from-top-4 duration-300">
            
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <h3 className="text-xl font-black text-[#1D3146] tracking-tight flex items-center gap-2">
                  Notificaciones
                  {notifications.length > 0 && <span className="text-xs px-2 py-0.5 bg-[#1D3146] text-[#56CCF2] rounded-full font-black">{notifications.length}</span>}
               </h3>
               <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                   <Loader2 size={32} className="animate-spin opacity-20" />
                   <p className="text-[10px] uppercase font-black tracking-widest italic">Sincronizando señales...</p>
                </div>
              )}

              {notifications.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 opacity-40">
                   <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center border border-slate-200 shadow-inner">
                      <CheckCircle2 size={32} />
                   </div>
                   <p className="text-xs font-black uppercase tracking-widest text-[#1D3146]">Todo al día</p>
                </div>
              )}

              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-5 rounded-3xl border border-slate-50 border-l-4 shadow-sm group relative transition-all hover:shadow-md ${getPriorityColor(n.priority)}`}
                >
                  <div className="flex gap-4">
                     <div className="pt-1">{getCategoryIcon(n.category)}</div>
                     <div className="flex-1">
                        <h4 className="text-sm font-black text-[#1D3146] pr-8">{n.title}</h4>
                        <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                        
                        {n.cta_label && n.cta_link && (
                          <Link 
                            href={n.cta_link}
                            onClick={() => { markRead(n.id); setIsOpen(false); }}
                            className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1D3146] hover:text-blue-600 transition-all"
                          >
                             {n.cta_label}
                             <ArrowRight size={14} />
                          </Link>
                        )}
                        
                        <button 
                          onClick={() => markRead(n.id)}
                          className="absolute top-4 right-4 text-slate-300 hover:text- rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                          title="Marcar como leído"
                        >
                           <CheckCircle2 size={16} />
                        </button>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 italic flex justify-center">
                 <p className="text-[10px] font-medium text-slate-400">Las señales operativas ayudan a ganar eficiencia.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
