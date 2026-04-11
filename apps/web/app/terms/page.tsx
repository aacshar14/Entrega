'use client';

import React from 'react';
import { Shield, FileText, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/logo';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo variant="master" className="h-10 w-auto" />
        </Link>
        <Link 
          href="/login" 
          className="px-6 py-2 bg-[#1D3146] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-lg shadow-slate-200"
        >
          Iniciar Sesión
        </Link>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full mb-6">
            <Shield size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Legal & Privacidad</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#1D3146] tracking-tight mb-6">
            Términos de Servicio y Privacidad
          </h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Nuestra prioridad es la seguridad de tus datos operativos y el cumplimiento de las normativas de Meta.
          </p>
        </div>
      </section>

      {/* content */}
      <main className="pb-32 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Section: Terms */}
          <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-50">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <h2 className="text-2xl font-black text-[#1D3146]">Términos de Uso</h2>
            </div>
            
            <div className="prose prose-slate max-w-none text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                Al utilizar EntréGA Intelligence, aceptas que nuestra plataforma actúe como una herramienta de gestión de inventario y logística para tu negocio. No somos responsables del mal uso de las integraciones de mensajería (WhatsApp) fuera de los límites de las políticas de Meta.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Uso exclusivo para operaciones comerciales legítimas.</li>
                <li>Responsabilidad de mantener la confidencialidad de las credenciales.</li>
                <li>Cumplimiento estricto de las políticas de comercio de WhatsApp/Meta.</li>
              </ul>
            </div>
          </section>

          {/* Section: Privacy */}
          <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-50">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                <Shield size={24} />
              </div>
              <h2 className="text-2xl font-black text-[#1D3146]">Política de Privacidad</h2>
            </div>
            
            <div className="prose prose-slate max-w-none text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                EntréGA recopila datos de clientes, movimientos de inventario y logs de mensajes únicamente para facilitar la operación del negocio. Utilizamos encriptación AES-256 para tokens sensibles.
              </p>
              <p>
                No compartimos, vendemos ni distribuimos bases de datos de clientes con terceros para fines publicitarios.
              </p>
            </div>
          </section>

          {/* Section: Data Deletion */}
          <section className="bg-[#1D3146] rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-900/20 text-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-white/10 text-[#56CCF2] rounded-2xl flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Solicitud de Eliminación de Datos</h2>
            </div>
            
            <div className="text-white/70 font-medium space-y-6 leading-relaxed">
              <p>
                De acuerdo con los requisitos de la plataforma de Meta, proporcionamos un método claro para solicitar la eliminación de tus datos asociados a la integración de WhatsApp.
              </p>
              
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-black uppercase text-[10px] tracking-widest mb-4">Instrucciones Paso a Paso:</h3>
                <ol className="list-decimal pl-6 space-y-3 text-sm">
                  <li>Inicia sesión en tu cuenta de EntréGA.</li>
                  <li>Ve a <strong>Configuración / Perfil</strong>.</li>
                  <li>En la sección "Seguridad y Datos", selecciona la opción <strong>"Eliminar Integración de WhatsApp"</strong>.</li>
                  <li>Esto revocará todos los tokens de acceso y eliminará permanentemente los datos cacheados de Meta de nuestros servidores operativos.</li>
                  <li>Para una eliminación total de cuenta, contacta a <strong>legal@entrega.space</strong>.</li>
                </ol>
              </div>
              
              <p className="text-xs italic text-white/40">
                Nota: La eliminación de datos de EntréGA no afecta el historial de mensajes dentro de la aplicación oficial de WhatsApp del cliente.
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-200 text-center">
        <Logo variant="master" className="h-8 w-auto grayscale opacity-30 mx-auto mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          © {new Date().getFullYear()} EntréGA Intelligence Logistics. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
