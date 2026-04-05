'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Search, 
  Shield, 
  MoreVertical,
  Mail,
  Calendar,
  UserCheck,
  UserX
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function PlatformUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await apiRequest('admin/users', 'GET');
        setUsers(data);
      } catch (err) {
        console.error('Error loading users:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, []);

  const filtered = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUser = async (userId: string) => {
    try {
      await apiRequest(`admin/users/${userId}/toggle-active`, 'POST');
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      console.error('Error toggling user:', err);
      alert('Error al cambiar estado del usuario');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
             <UsersIcon className="text-purple-500" size={32} />
             Directorio Global
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Gestión de identidades a nivel plataforma.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..."
            className="w-full pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-purple-400 transition-all font-medium text-[#1D3146]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-[0.15em]">
              <th className="pl-10 py-6">Identidad</th>
              <th className="px-6 py-6">Email</th>
              <th className="px-6 py-6">Rol Plataforma</th>
              <th className="px-6 py-6 font-center">Estado</th>
              <th className="pr-10 py-6 text-right">Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
               <tr>
                 <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-8 h-8 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Consultando Ecosistema...</p>
                    </div>
                 </td>
               </tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="pl-10 py-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 font-black">
                        {u.full_name?.charAt(0) || 'U'}
                     </div>
                     <p className="font-extrabold text-[#1D3146]">{u.full_name || 'Sin nombre'}</p>
                  </div>
                </td>
                <td className="px-6 py-6">
                   <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                      <Mail size={14} className="opacity-50" />
                      {u.email}
                   </div>
                </td>
                <td className="px-6 py-6">
                   <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      u.platform_role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                   }`}>
                      <Shield size={10} />
                      {u.platform_role}
                   </div>
                </td>
                <td className="px-6 py-6">
                   <button 
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      u.is_active 
                        ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' 
                        : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                   >
                     {u.is_active ? (
                       <>
                         <UserX size={14} />
                         Suspender
                       </>
                     ) : (
                       <>
                         <UserCheck size={14} />
                         Reactivar
                       </>
                     )}
                   </button>
                </td>
                <td className="pr-10 py-6 text-right">
                   <div className="flex items-center justify-end gap-2 text-xs text-slate-400 font-medium">
                      <Calendar size={14} className="opacity-40" />
                      {new Date(u.created_at).toLocaleDateString()}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
