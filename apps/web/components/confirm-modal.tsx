'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1D3146]/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 md:p-10 animate-in zoom-in-95 duration-300">
        <button 
          onClick={onCancel}
          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-lg ${
            variant === 'danger' ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-blue-50 text-blue-500 shadow-blue-100'
          }`}>
            <AlertTriangle size={32} />
          </div>

          <h3 className="text-xl font-black text-[#1D3146] tracking-tight mb-3">
            {title}
          </h3>
          
          <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10">
            {message}
          </p>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={onCancel}
              className="py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`py-4 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                variant === 'danger' 
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
                  : 'bg-[#1D3146] hover:brightness-125 shadow-slate-200'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
