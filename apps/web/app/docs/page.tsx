"use client";

import React from "react";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  MessageCircle,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Logo from "@/components/logo";

export default function DocsHub() {
  const resources = [
    {
      icon: FileText,
      title: "Importación de Clientes",
      desc: "Aprende a estructurar tu CSV para una carga masiva sin fallos.",
      href: "/learning/customers",
    },
    {
      icon: MessageCircle,
      title: "Conexión WhatsApp",
      desc: "Configuración técnica para el envío de alertas tácticas en tiempo real.",
      href: "/learning/whatsapp",
    },
    {
      icon: BookOpen,
      title: "Manual de Operaciones",
      desc: "Guía completa sobre el flujo de pedidos y gestión de inventario.",
      href: "/learning/ops",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1D3146] font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-100 h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-4 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-bold">Volver al Inicio</span>
          </Link>
          <Logo variant="light" className="h-10 w-auto" />
          <div className="w-20"></div> {/* Spacer */}
        </div>
      </header>

      {/* HERO */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Know How <span className="text-[#56CCF2] italic">Hub</span>.
          </h1>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto italic">
            Documentación táctica diseñada por y para operadores de campo. Todo
            lo necesario para profesionalizar tu flota.
          </p>
        </div>
      </section>

      {/* RESOURCES GRID */}
      <section className="pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {resources.map((item, i) => (
            <div
              key={i}
              className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group hover:-translate-y-2"
            >
              <div className="w-14 h-14 bg-[#1D3146] text-[#56CCF2] rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-[#1D3146]/20">
                <item.icon size={28} />
              </div>
              <h4 className="text-xl font-black mb-4 tracking-tight">
                {item.title}
              </h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10">
                {item.desc}
              </p>
              <Link
                href={item.href}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#56CCF2] group-hover:gap-4 transition-all"
              >
                Ver Guía <ChevronRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER MINI */}
      <footer className="py-12 bg-[#1D3146] text-center">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
          Entrega V1.1 - Secure Multi-Tenant Framework
        </p>
      </footer>
    </div>
  );
}
