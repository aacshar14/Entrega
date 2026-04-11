"use client";

import React from "react";
import {
  Users,
  Building2,
  Trash2,
  UserCheck,
  UserX,
  Search,
  Filter,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function PlatformUsersPage() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest("admin/users", "GET");
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiRequest(
        `admin/users/${userId}/status?is_active=${!currentStatus}`,
        "PATCH",
      );
      loadUsers();
    } catch (err) {
      alert("Error updating user status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario permanentemente?"))
      return;
    try {
      await apiRequest(`admin/users/${userId}`, "DELETE");
      loadUsers();
    } catch (err) {
      alert("Error deleting user");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name &&
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1D3146] tracking-tight">
            Directorio de Usuarios
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Gestión global de identidades y membresías.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <h3 className="text-xl font-black text-[#1D3146] flex items-center gap-3">
            <Users className="text-blue-500" size={24} />
            Platform Directory
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {filteredUsers.length} de {users.length} Usuarios
          </p>
        </div>

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
              Cargando usuarios...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Usuario
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Tenants & Roles
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Status
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#1D3146]">
                          {user.full_name || "Sin nombre"}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-wrap gap-2">
                        {user.memberships && user.memberships.length > 0 ? (
                          user.memberships.map((m: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter"
                            >
                              <Building2 size={10} />
                              {m.tenant_name} ({m.role})
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 italic px-3 py-1 border border-dashed border-slate-200 rounded-full">
                            Sin membresías
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.is_active ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                      >
                        {user.is_active ? "Activo" : "Suspendido"}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() =>
                            handleToggleStatus(user.id, user.is_active)
                          }
                          className={`p-2 rounded-xl transition-all ${user.is_active ? "hover:bg-rose-50 text-rose-400 hover:text-rose-600" : "hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600"}`}
                          title={user.is_active ? "Suspender" : "Activar"}
                        >
                          {user.is_active ? (
                            <UserX size={18} />
                          ) : (
                            <UserCheck size={18} />
                          )}
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
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-10 py-20 text-center text-slate-400 text-sm italic font-medium"
                    >
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
