"use client";

import React, { useState, useEffect } from "react";
import "./globals.css";
import { Loader2 } from "lucide-react";
import { Providers } from "../lib/context/providers";
import { useTenant } from "../lib/context/tenant-context";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import Logo from "@/components/logo";

function UI_Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeTenant, isLoading } = useTenant();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isPlatformPath = pathname.startsWith("/platform");
  const isAdmin = user?.platform_role === "admin";

  // Protection logic: Platform access
  useEffect(() => {
    if (isPlatformPath && !isAdmin && !isLoading) {
      router.replace("/dashboard");
    }
  }, [isPlatformPath, isAdmin, isLoading, router]);

  // Public Paths (Static & Legal)
  const isPublicPath = [
    "/landing",
    "/login",
    "/",
    "/privacy-policy",
    "/terms",
    "/data-deletion",
  ].includes(pathname);

  // 🛡️ Auth Protection: Redirect logged-in users from landing to dashboard
  useEffect(() => {
    if (pathname === "/" && user && !isLoading) {
      router.replace("/dashboard");
    }
  }, [pathname, user, isLoading, router]);

  if (pathname === "/" && user && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1D3146] gap-8">
        <div className="animate-pulse">
           <Logo variant="master" className="h-16 w-auto" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#56CCF2]" size={24} />
          <p className="text-[10px] font-black text-[#56CCF2] uppercase tracking-[0.4em] animate-pulse">
            Sincronizando EntréGA Intelligence
          </p>
        </div>
      </div>
    );
  }

  if (isPublicPath) return children;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest animate-pulse">
          Protegiendo tu sesión
        </p>
      </div>
    );
  }

  if (!user) return null;

  // Tenant Access Protection
  const isTenantSetupPath =
    pathname.startsWith("/select-tenant") || pathname.startsWith("/onboarding");
  if (!activeTenant && !isTenantSetupPath && !isPlatformPath) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#EBEEF2] font-sans antialiased text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {!isTenantSetupPath && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Modern Sidebar component */}
      {!isTenantSetupPath && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div
        className={`flex-grow ${
          !isTenantSetupPath ? "pl-0 lg:pl-60 xl:pl-64 2xl:pl-80" : "pl-0"
        } flex flex-col min-h-screen max-w-full overflow-x-hidden`}
      >
        <Header onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Viewport content */}
        <main className="flex-grow p-4 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="antialiased font-sans">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
        <meta name="theme-color" content="#1D3146" />
        <link rel="apple-touch-icon" href="/logo_official.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Providers>
          <UI_Shell>{children}</UI_Shell>
        </Providers>
      </body>
    </html>
  );
}
