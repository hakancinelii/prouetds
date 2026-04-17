import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';
import vitoIcon from './vito.png';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://prouetds.com.tr'),
  title: 'ProUETDS - Yolcu Taşımacılığı Bildirim Sistemi',
  description:
    'UETDS Tarifesiz (Arızi) Yolcu Taşımacılığı Bildirim ve Yönetim Platformu',
  applicationName: 'ProUETDS',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: vitoIcon.src, type: 'image/png' }],
    shortcut: [{ url: vitoIcon.src, type: 'image/png' }],
    apple: [{ url: vitoIcon.src, type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'ProUETDS',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'ProUETDS',
    description:
      'UETDS Tarifesiz (Arızi) Yolcu Taşımacılığı Bildirim ve Yönetim Platformu',
    images: [vitoIcon.src],
    type: 'website',
    locale: 'tr_TR',
  },
  twitter: {
    card: 'summary',
    title: 'ProUETDS',
    description:
      'UETDS Tarifesiz (Arızi) Yolcu Taşımacılığı Bildirim ve Yönetim Platformu',
    images: [vitoIcon.src],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
    { media: '(prefers-color-scheme: light)', color: '#f8f5ef' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} app-shell bg-[rgb(var(--background-start-rgb))] text-[rgb(var(--foreground-rgb))]`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgb(var(--toast-bg))',
              color: 'rgb(var(--toast-fg))',
              border: '1px solid rgba(148, 163, 184, 0.18)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
        <Sidebar />
        <main className="adaptive-page lg:ml-64 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
