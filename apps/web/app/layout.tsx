import React from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 min-h-screen">
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
            <h1 className="text-xl font-bold tracking-tight">EntréGA <span className="font-light opacity-80">V1.1</span></h1>
            <nav className="space-x-6 text-sm font-medium">
              <a href="/dashboard" className="hover:text-blue-200 transition-colors">Dashboard</a>
              <a href="/stock" className="hover:text-blue-200 transition-colors">Stock</a>
              <a href="/payments" className="hover:text-blue-200 transition-colors">Pagos</a>
              <a href="/reports/weekly" className="hover:text-blue-200 transition-colors">Reportes</a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-6 md:p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
