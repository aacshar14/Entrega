'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, LogOut, Clock } from 'lucide-react';

interface SessionTimeoutProps {
  user: { platform_role: string } | null;
  onLogout: () => void;
}

export default function SessionTimeout({ user, onLogout }: SessionTimeoutProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Configuration based on role
  const isPlatformAdmin = user?.platform_role === 'admin';
  const WARNING_TIME = isPlatformAdmin ? 15 * 60 * 1000 : 25 * 60 * 1000;
  const LOGOUT_TIME = isPlatformAdmin ? 20 * 60 * 1000 : 30 * 60 * 1000;
  const COUNTDOWN_DURATION = (LOGOUT_TIME - WARNING_TIME) / 1000;

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setShowWarning(false);
    onLogout();
    router.push('/landing');
  }, [onLogout, router]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setCountdown(0);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [showWarning]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    const checkInactivity = () => {
      const now = Date.now();
      const diff = now - lastActivityRef.current;

      if (diff >= WARNING_TIME && !showWarning) {
        setShowWarning(true);
        const remaining = Math.max(0, Math.floor((LOGOUT_TIME - diff) / 1000));
        setCountdown(remaining);
      }

      if (diff >= LOGOUT_TIME) {
        handleLogout();
      }
    };

    timerRef.current = setInterval(checkInactivity, 10000); // Check every 10s

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user, resetTimer, handleLogout, WARNING_TIME, LOGOUT_TIME, showWarning]);

  useEffect(() => {
    if (showWarning && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showWarning, countdown]);

  // if (!showWarning) return null;
  return null; // TEMPORARY DISABLE TO DEBUG "KICK OUT" ISSUE

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">¿Sigues ahí?</h3>
            <p className="text-slate-500 font-medium">Tu sesión expirará pronto por inactividad.</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 text-center">
          <div className="text-4xl font-black text-slate-800 mb-1">
            {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-xs font-black uppercase text-slate-400 tracking-widest">Segundos restantes</div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={resetTimer}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Mantener sesión iniciada
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-bold hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" /> Cerrar sesión ahora
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          <p className="text-[10px] text-slate-400 font-medium leading-tight">
            Por seguridad, cerramos sesiones inactivas. Los administradores tienen un tiempo de espera más corto (20 min).
          </p>
        </div>
      </div>
    </div>
  );
}
