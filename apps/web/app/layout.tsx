import { Providers } from '../lib/context/providers';
import MainLayout from '../components/main-layout';
import './globals.css';

export const metadata = {
  title: 'EntréGA Dashboard',
  description: 'Gestión logística inteligente multi-tenant.',
  manifest: '/manifest.json',
  icons: {
    apple: '/chocobites.jpg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#1D3146',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="antialiased font-sans">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#1D3146" />
        <link rel="apple-touch-icon" href="/chocobites.jpg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Providers>
           <MainLayout>
              {children}
           </MainLayout>
        </Providers>
      </body>
    </html>
  );
}
