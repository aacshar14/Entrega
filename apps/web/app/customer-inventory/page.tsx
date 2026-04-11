"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Package,
  Search,
  RefreshCcw,
  Calendar,
  Layers,
  TrendingDown,
  Trash2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useTenant } from "@/lib/context/tenant-context";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface CustomerSummary {
  customer_id: string;
  customer_name: string;
  quantities: Record<string, number>;
  total_outside: number;
  last_movement_at: string;
}

export default function CustomerInventoryPage() {
  const { activeTenant } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Drilldown state
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [customerMovements, setCustomerMovements] = useState<any[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const fetchData = async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      // 1. Fetch active product catalog for columns
      const productData = await apiRequest(
        "products",
        "GET",
        null,
        activeTenant.id,
      );
      setProducts(productData || []);

      // 2. Fetch inventory summary
      const summaryData = await apiRequest(
        "movements/customer-inventory/summary",
        "GET",
        null,
        activeTenant.id,
      );
      setSummary(summaryData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (
    customerId: string,
    customerName: string,
  ) => {
    if (!activeTenant) return;
    try {
      setSelectedCustomer({ id: customerId, name: customerName });
      setDrilldownLoading(true);
      const allMovements = await apiRequest(
        "movements",
        "GET",
        null,
        activeTenant.id,
      );
      const filtered = (allMovements || []).filter(
        (m: any) => m.customer_id === customerId,
      );
      setCustomerMovements(filtered);
    } catch (error) {
      console.error("Error fetching customer details:", error);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleDeleteMovement = async (movementId: string) => {
    if (
      !activeTenant ||
      !confirm(
        "¿Estás seguro de eliminar este registro? Esto afectará los saldos automáticamente.",
      )
    )
      return;
    try {
      await apiRequest(
        `movements/${movementId}`,
        "DELETE",
        null,
        activeTenant.id,
      );
      // Refresh local movement list
      setCustomerMovements((prev) => prev.filter((m) => m.id !== movementId));
      // Refresh global summary
      fetchData();
    } catch (error) {
      alert("Error al eliminar movimiento");
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchData();
    }
  }, [activeTenant]);

  const filtered = summary.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (item.customer_name || "").toLowerCase().includes(search);
  });

  // Filter products to only show those that have at least one unit outside in any customer
  const productsToShow = products.filter((p) =>
    summary.some((item) => (item.quantities[p.sku] || 0) > 0),
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-[#1D3146]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h2 className="text-xl font-black text-[#1D3146]">
                  {selectedCustomer.name}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Historial completo de movimientos
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              {drilldownLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCcw
                    size={32}
                    className="text-[#56CCF2] animate-spin"
                  />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Consultando registros...
                  </p>
                </div>
              ) : customerMovements.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-sm font-bold text-slate-300">
                    No hay movimientos registrados para este cliente.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerMovements.map((move: any) => (
                    <div
                      key={move.id}
                      className="group flex items-center justify-between p-6 bg-slate-50/50 hover:bg-white rounded-3xl border border-transparent hover:border-slate-100 transition-all hover:shadow-xl hover:shadow-slate-100/50"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            move.type === "delivery" ||
                            move.type === "delivery_to_customer"
                              ? "bg-orange-50 text-orange-600"
                              : move.type === "sale_reported"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {move.type === "delivery" ||
                          move.type === "delivery_to_customer" ? (
                            <TrendingDown size={20} />
                          ) : move.type === "sale_reported" ? (
                            <Layers size={20} />
                          ) : (
                            <RefreshCcw size={20} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-[#1D3146]">
                              {move.type === "delivery" ||
                              move.type === "delivery_to_customer"
                                ? "Entrega"
                                : move.type === "sale_reported"
                                  ? "Venta"
                                  : "Devolución"}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              {move.sku} • {Math.abs(move.quantity)} uds
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                            <Calendar size={10} />
                            {new Date(move.created_at).toLocaleString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                          <p className="text-sm font-black text-[#1D3146]">
                            $
                            {parseFloat(
                              move.total_amount || 0,
                            ).toLocaleString()}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            Importe
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteMovement(move.id)}
                          className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Eliminar Registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50/30">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                ⚠️ Las eliminaciones disparan una reconciliación automática de
                saldos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Contextual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-[#1D3146] p-4 rounded-3xl text-[#56CCF2] shadow-xl shadow-[#1D3146]/20">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-[#1D3146] tracking-tight">
              Resumen de Inventario
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Vista Operativa • Por Cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-[#1D3146] hover:border-slate-200 transition-all shadow-sm active:scale-95"
          >
            <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#56CCF2] transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-14 pl-12 pr-6 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-[#1D3146] outline-none w-full md:w-64 focus:border-[#56CCF2] focus:ring-4 focus:ring-[#56CCF2]/10 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50/50 z-10">
                  Cliente
                </th>
                {productsToShow.map((p) => (
                  <th
                    key={p.id}
                    className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center"
                  >
                    {p.name}
                  </th>
                ))}
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center bg-slate-50/30">
                  Total Fuera
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Último Mov.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td
                        colSpan={productsToShow.length + 3}
                        className="px-8 py-8"
                      >
                        <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                      </td>
                    </tr>
                  ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={productsToShow.length + 3}
                    className="px-8 py-20 text-center text-slate-300"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <TrendingDown size={48} className="opacity-20" />
                      <p className="font-bold text-sm uppercase tracking-widest">
                        No hay stock fuera de almacén
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.customer_id}
                    onClick={() =>
                      fetchCustomerDetails(item.customer_id, item.customer_name)
                    }
                    className="hover:bg-slate-50 group transition-colors cursor-pointer"
                  >
                    <td className="px-8 py-6 font-bold text-[#1D3146] text-sm sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-[#1D3146] group-hover:text-white transition-all">
                          {item.customer_name?.charAt(0)}
                        </div>
                        {item.customer_name}
                      </div>
                    </td>

                    {productsToShow.map((p) => {
                      const qty = item.quantities[p.sku] || 0;
                      return (
                        <td key={p.id} className="px-4 py-6 text-center">
                          <span
                            className={`text-sm font-black ${qty > 0 ? "text-[#1D3146]" : "text-slate-200"}`}
                          >
                            {qty || "-"}
                          </span>
                        </td>
                      );
                    })}

                    <td className="px-6 py-6 text-center bg-slate-50/30 group-hover:bg-slate-100/50 transition-colors">
                      <span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-sm font-black ring-1 ring-orange-200 shadow-sm">
                        {item.total_outside}
                      </span>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-[#1D3146] flex items-center gap-2">
                          <Calendar size={12} className="text-slate-400" />
                          {item.last_movement_at
                            ? new Date(
                                item.last_movement_at,
                              ).toLocaleDateString("es-MX", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "N/A"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.last_movement_at
                            ? new Date(
                                item.last_movement_at,
                              ).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center pt-4">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
          Haz clic en un cliente para ver el historial detallado de entregas y
          ventas
          <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
        </p>
      </div>
    </div>
  );
}
