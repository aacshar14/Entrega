"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Building2,
  MessageCircle,
  Save,
  Settings as SettingsIcon,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  DollarSign,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { useTenant } from "@/lib/context/tenant-context";
import { apiRequest } from "@/lib/api";
import Link from "next/link";
import ConfirmModal from "@/components/confirm-modal";

export default function SettingsPage() {
  const { user, activeTenant, activeRole, refreshUser } = useTenant();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: activeTenant?.name || "",
    whatsapp: activeTenant?.business_whatsapp_number || "",
    timezone: activeTenant?.timezone || "America/Mexico_City",
    currency: activeTenant?.currency || "MXN",
  });

  const [metaFormData, setMetaFormData] = useState({
    waba_id: "",
    phone_id: "",
    token: "",
  });

  const [team, setTeam] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "operator",
  });
  const [showManualMeta, setShowManualMeta] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // Platform Level Settings (Admin Only)
  const [platformConfig, setPlatformConfig] = useState<Record<string, string>>(
    {},
  );
  const [platformLoading, setPlatformLoading] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    operational: true,
    critical: true,
  });

  const fetchPlatformSettings = async () => {
    if (user?.platform_role !== "admin") return;
    try {
      const data = await apiRequest(
        "/admin/settings",
        "GET",
        null,
        activeTenant?.id,
      );
      if (data && data.db_backed) {
        setPlatformConfig(data.db_backed);
      }
    } catch (err) {
      console.error("Error fetching platform settings:", err);
    }
  };

  useEffect(() => {
    if (user?.platform_role === "admin") {
      fetchPlatformSettings();
    }
  }, [user]);

  const handleUpdatePlatformSetting = async (key: string, value: string) => {
    setPlatformLoading(true);
    try {
      await apiRequest(
        `/admin/settings/${key}?value=${encodeURIComponent(value || "")}`,
        "PUT",
        null,
        activeTenant?.id,
      );
      setSuccess(true);
      await fetchPlatformSettings();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError("Error admin: " + err.message);
    } finally {
      setPlatformLoading(false);
    }
  };

  const fetchTeam = async () => {
    if (!activeTenant) return;
    try {
      const data = await apiRequest("/users", "GET", null, activeTenant.id);
      setTeam(data || []);
    } catch (err) {
      console.error("Error fetching team:", err);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchTeam();
    }
  }, [activeTenant]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setLoading(true);
    try {
      await apiRequest(
        "/users",
        "POST",
        {
          email: newUser.email,
          full_name: newUser.name,
          role: newUser.role,
        },
        activeTenant.id,
      );
      setNewUser({ email: "", name: "", role: "operator" });
      await fetchTeam();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    setMemberToDelete(null); // Close modal
    setLoading(true);
    try {
      await apiRequest(
        `/users/${targetUserId}`,
        "DELETE",
        null,
        activeTenant?.id,
      );
      await fetchTeam();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setLoading(true);
    try {
      await apiRequest(
        "/whatsapp/auth/setup/manual",
        "POST",
        {
          waba_id: metaFormData.waba_id,
          phone_number_id: metaFormData.phone_id,
          access_token: metaFormData.token,
        },
        activeTenant.id,
      );
      setSuccess(true);
      setShowManualMeta(false);
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      await apiRequest(
        "/tenants/active",
        "PATCH",
        {
          name: formData.name,
          business_whatsapp_number: formData.whatsapp,
          timezone: formData.timezone,
          currency: formData.currency,
        },
        activeTenant.id,
      );
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error al guardar configuración");
    } finally {
      setLoading(false);
    }
  };

  if (!activeTenant) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      {/* Header Contextual */}
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-[#1D3146] transition-colors shadow-sm active:scale-95"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
            <div className="bg-[#1D3146] p-2 rounded-xl text-[#56CCF2]">
              <SettingsIcon size={24} />
            </div>
            Configuración
          </h2>
          <p className="text-sm text-slate-500 font-medium italic underline decoration-[#56CCF2]/30">
            Gestión de la plataforma operativa de {activeTenant.name}.
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          ¡Configuración guardada correctamente!
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in slide-in-from-top-4">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Business Identity */}
        <form
          onSubmit={handleSave}
          className="md:col-span-12 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100 grid md:grid-cols-2 gap-8"
        >
          <h3 className="md:col-span-2 text-xs font-black uppercase tracking-[0.2em] text-[#1D3146] mb-8 flex items-center gap-2">
            <Building2 size={16} /> Identidad del Negocio
          </h3>

          <div className="space-y-3">
            <label
              htmlFor="biz_name"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2"
            >
              Nombre Comercial
            </label>
            <input
              id="biz_name"
              type="text"
              className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej: ChocoBites"
              title="Nombre del negocio"
            />
          </div>
          <div className="space-y-3">
            <label
              htmlFor="biz_slug"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2"
            >
              Slug (ID Único)
            </label>
            <input
              id="biz_slug"
              type="text"
              readOnly
              className="w-full h-16 px-6 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-400 outline-none cursor-not-allowed"
              value={activeTenant.slug}
              title="Slug del negocio"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              Guardar Identidad
            </button>
          </div>
        </form>

        {/* Team Management */}
        <div className="md:col-span-12 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1D3146] mb-8 flex items-center gap-2">
            <SettingsIcon size={16} /> Gestión de Equipo ({activeTenant.name})
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Current Team */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                Miembros Activos
              </h4>
              <div className="space-y-2">
                {team.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1D3146] rounded-xl flex items-center justify-center text-[#56CCF2] font-black text-xs">
                        {member.full_name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1D3146]">
                          {member.full_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          member.role === "owner"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {member.role}
                      </span>
                      {(activeRole === "owner" ||
                        user?.platform_role === "admin") &&
                        member.id !== user?.id && (
                          <button
                            onClick={() => setMemberToDelete(member.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            title="Eliminar miembro"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Member Form */}
            <form
              onSubmit={handleAddUser}
              className="space-y-4 bg-[#EBEEF2]/50 p-6 rounded-[2rem] border border-dashed border-slate-200"
            >
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">
                Invitar Nuevo Miembro
              </h4>
              <input
                type="email"
                placeholder="Correo Electrónico"
                className="w-full h-14 px-5 bg-white border-none rounded-xl text-xs font-bold text-[#1D3146] outline-none shadow-sm"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
                title="Email del nuevo usuario"
              />
              <input
                type="text"
                placeholder="Nombre Completo"
                className="w-full h-14 px-5 bg-white border-none rounded-xl text-xs font-bold text-[#1D3146] outline-none shadow-sm"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                required
                title="Nombre del nuevo usuario"
              />
              <select
                className="w-full h-14 px-5 bg-white border-none rounded-xl text-xs font-bold text-[#1D3146] outline-none shadow-sm appearance-none"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
                title="Rol del nuevo usuario"
              >
                <option value="owner">Owner (Acceso Total)</option>
                <option value="operator">Operador (Solo Registros)</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#56CCF2] text-[#1D3146] font-black rounded-xl text-xs uppercase tracking-widest hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-[#56CCF2]/20"
              >
                {loading ? (
                  <Loader2 className="animate-spin mx-auto" size={18} />
                ) : (
                  "Agregar al Equipo"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* WhatsApp Section */}
        <div className="md:col-span-12 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1D3146] flex items-center gap-2">
              <Smartphone size={16} /> WhatsApp Cloud API
            </h3>
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                activeTenant.business_whatsapp_connected
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${activeTenant.business_whatsapp_connected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
              ></div>
              {activeTenant.business_whatsapp_connected
                ? "Conectado"
                : "No Conectado"}
            </div>
          </div>

          <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col items-stretch gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-4">
              <div className="flex items-center gap-6">
                <div
                  className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg ${
                    activeTenant.business_whatsapp_connected
                      ? "bg-emerald-100 text-emerald-600 shadow-emerald-200/50"
                      : "bg-blue-100 text-blue-600 shadow-blue-200/50"
                  }`}
                >
                  <MessageCircle size={32} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-[#1D3146] tracking-tight">
                    {activeTenant.business_whatsapp_connected
                      ? "WhatsApp Conectado"
                      : "Automatización WhatsApp"}
                  </h4>
                  <p className="text-sm text-slate-400 font-medium max-w-sm mt-1">
                    {activeTenant.business_whatsapp_connected
                      ? "Tu negocio está listo para procesar pedidos automáticamente."
                      : "Conecta tu cuenta oficial para enviar notificaciones automáticas."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/settings/integrations/whatsapp"
                  className={`px-8 py-4 font-black rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-xl ${
                    activeTenant.business_whatsapp_connected
                      ? "bg-white text-[#1D3146] border border-slate-100 hover:bg-slate-50"
                      : "bg-[#1D3146] text-[#56CCF2] hover:scale-105 shadow-[#1D3146]/20"
                  }`}
                >
                  <SettingsIcon size={16} />
                  Gestionar Integración
                </Link>
              </div>
            </div>

            {/* Manual Meta Form */}
            {showManualMeta && (
              <form
                onSubmit={handleManualMeta}
                className="p-8 bg-white rounded-3xl border border-[#1D3146]/10 space-y-6 animate-in slide-in-from-top-4"
              >
                <h4 className="text-xs font-black text-[#1D3146] flex items-center gap-2">
                  <Smartphone size={14} className="text-[#56CCF2]" />{" "}
                  Configuración Manual de Meta
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                      WABA ID
                    </label>
                    <input
                      className="w-full h-12 px-4 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-[#56CCF2]"
                      value={metaFormData.waba_id}
                      onChange={(e) =>
                        setMetaFormData({
                          ...metaFormData,
                          waba_id: e.target.value,
                        })
                      }
                      placeholder="ID de la Business Account"
                      required
                      title="WABA ID de Meta"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                      Phone Number ID
                    </label>
                    <input
                      className="w-full h-12 px-4 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-[#56CCF2]"
                      value={metaFormData.phone_id}
                      onChange={(e) =>
                        setMetaFormData({
                          ...metaFormData,
                          phone_id: e.target.value,
                        })
                      }
                      placeholder="ID del número de teléfono"
                      required
                      title="Phone Number ID de Meta"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                      System User Access Token
                    </label>
                    <input
                      type="password"
                      className="w-full h-12 px-4 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-[#56CCF2]"
                      value={metaFormData.token}
                      onChange={(e) =>
                        setMetaFormData({
                          ...metaFormData,
                          token: e.target.value,
                        })
                      }
                      placeholder="EAA..."
                      required
                      title="Meta Access Token"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-[#1D3146] text-white font-black rounded-xl text-[10px] uppercase tracking-widest"
                >
                  Guardar Configuración de Meta
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="md:col-span-12 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1D3146] mb-8 flex items-center gap-2">
            <Bell size={16} /> Configuración de Notificaciones
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div
              onClick={() =>
                setNotifSettings((prev) => ({
                  ...prev,
                  operational: !prev.operational,
                }))
              }
              className="p-6 bg-[#EBEEF2]/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white transition-all cursor-pointer"
            >
              <div className="space-y-1">
                <p className="text-sm font-black text-[#1D3146]">
                  Señales de Operación
                </p>
                <p className="text-[10px] text-slate-400 font-medium italic underline decoration-[#56CCF2]/30">
                  Alertas sobre stock, cierres y movimientos.
                </p>
              </div>
              <div
                className={`w-12 h-6 ${notifSettings.operational ? "bg-[#1D3146]" : "bg-slate-300"} rounded-full relative p-1 transition-colors duration-300`}
              >
                <div
                  className={`w-4 h-4 bg-[#56CCF2] rounded-full shadow-sm shadow-[#56CCF2]/40 transition-all duration-300 transform ${notifSettings.operational ? "translate-x-6" : "translate-x-0"}`}
                ></div>
              </div>
            </div>

            <div
              onClick={() =>
                setNotifSettings((prev) => ({
                  ...prev,
                  critical: !prev.critical,
                }))
              }
              className="p-6 bg-[#EBEEF2]/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white transition-all cursor-pointer"
            >
              <div className="space-y-1">
                <p className="text-sm font-black text-[#1D3146]">
                  Alertas Críticas
                </p>
                <p className="text-[10px] text-slate-400 font-medium italic underline decoration-[#56CCF2]/30">
                  Notificaciones de alta prioridad y errores.
                </p>
              </div>
              <div
                className={`w-12 h-6 ${notifSettings.critical ? "bg-[#1D3146]" : "bg-slate-300"} rounded-full relative p-1 transition-colors duration-300`}
              >
                <div
                  className={`w-4 h-4 bg-[#56CCF2] rounded-full shadow-sm shadow-[#56CCF2]/40 transition-all duration-300 transform ${notifSettings.critical ? "translate-x-6" : "translate-x-0"}`}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Regions */}
        <div className="md:col-span-12 bg-[#1D3146] rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-white grid md:grid-cols-2 gap-8">
          <h3 className="md:col-span-2 text-xs font-black uppercase tracking-[0.2em] text-[#56CCF2]">
            Preferencias Regionales
          </h3>
          <div className="space-y-4">
            <label
              htmlFor="timezone"
              className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]/50"
            >
              Zona Horaria
            </label>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <Globe size={20} className="text-[#56CCF2]" />
              <select
                id="timezone"
                className="bg-transparent border-none outline-none w-full appearance-none font-bold text-sm"
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                title="Zona horaria"
              >
                <option value="America/Mexico_City" className="text-slate-900">
                  Ciudad de México (GMT-6)
                </option>
                <option value="America/Bogota" className="text-slate-900">
                  Bogotá (GMT-5)
                </option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <label
              htmlFor="currency"
              className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]/50"
            >
              Moneda
            </label>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <DollarSign size={20} className="text-[#56CCF2]" />
              <select
                id="currency"
                className="bg-transparent border-none outline-none w-full appearance-none font-bold text-sm"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                title="Moneda"
              >
                <option value="MXN" className="text-slate-900">
                  Peso Mexicano (MXN)
                </option>
                <option value="USD" className="text-slate-900">
                  Dólar (USD)
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Platform Admin Central (Admin Only) */}
        {user?.platform_role === "admin" && (
          <div className="md:col-span-12 bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border-2 border-dashed border-[#56CCF2]/40 mt-10 animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-10">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1D3146] flex items-center gap-3">
                  <SettingsIcon size={20} className="text-[#56CCF2]" /> Zona de
                  Infraestructura
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Panel de Control Global (Hugo Only)
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#1D3146] text-[#56CCF2] rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-lg">
                <CheckCircle2 size={12} />
                Modo SuperUser Activo
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-8 group hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="space-y-2">
                  <p className="text-base font-black text-[#1D3146] flex items-center gap-2">
                    <Smartphone size={18} className="text-[#56CCF2]" />
                    WhatsApp Meta App ID (Global)
                  </p>
                  <p className="text-xs text-slate-400 font-medium max-w-xl leading-relaxed">
                    Identidad maestra de Meta. Si un tenant no tiene su propio
                    ID, usará este.
                    <span className="text-rose-400 font-bold ml-1 italic">
                      Advertencia: Cambiar esto afecta a todos los usuarios en
                      tiempo real.
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                  <input
                    type="text"
                    className="h-14 px-6 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black text-[#1D3146] outline-none focus:border-[#56CCF2] transition-colors flex-1 lg:w-72 shadow-inner"
                    value={platformConfig.whatsapp_app_id || ""}
                    onChange={(e) =>
                      setPlatformConfig({
                        ...platformConfig,
                        whatsapp_app_id: e.target.value,
                      })
                    }
                    placeholder="Ej: 825875709540441"
                    title="Global Meta App ID"
                  />
                  <button
                    onClick={() =>
                      handleUpdatePlatformSetting(
                        "whatsapp_app_id",
                        platformConfig.whatsapp_app_id,
                      )
                    }
                    disabled={platformLoading}
                    className="h-14 px-8 bg-[#1D3146] text-[#56CCF2] rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-125 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {platformLoading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-8 group hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="space-y-2">
                  <p className="text-base font-black text-[#1D3146] flex items-center gap-2">
                    <AlertCircle
                      size={18}
                      className={
                        platformConfig.maintenance_mode === "true"
                          ? "text-rose-500"
                          : "text-emerald-500"
                      }
                    />
                    Interruptor de Mantenimiento
                  </p>
                  <p className="text-xs text-slate-400 font-medium max-w-xl leading-relaxed">
                    Activa el bloqueo global de la plataforma para realizar
                    actualizaciones críticas. Status actual:{" "}
                    <span
                      className={
                        platformConfig.maintenance_mode === "true"
                          ? "text-rose-500 font-black"
                          : "text-emerald-500 font-black"
                      }
                    >
                      {platformConfig.maintenance_mode === "true"
                        ? "BLOQUEADO"
                        : "OPERATIVO"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleUpdatePlatformSetting(
                      "maintenance_mode",
                      platformConfig.maintenance_mode === "true"
                        ? "false"
                        : "true",
                    )
                  }
                  disabled={platformLoading}
                  className={`h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-3 ${
                    platformConfig.maintenance_mode === "true"
                      ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200"
                      : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200"
                  }`}
                >
                  {platformConfig.maintenance_mode === "true"
                    ? "Desbloquear Plataforma"
                    : "Activar Bloqueo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!memberToDelete}
        title="Eliminar Miembro"
        message="¿Estás seguro de que deseas eliminar a este miembro? Perderá el acceso a este tenant de forma inmediata."
        confirmLabel="Eliminar Definitivamente"
        onConfirm={() => memberToDelete && handleRemoveMember(memberToDelete)}
        onCancel={() => setMemberToDelete(null)}
      />
    </div>
  );
}
