import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import AppShell from '@/components/layout/AppShell';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://prouetds.com.tr'),
  title: 'ProUETDS - Yolcu Taşımacılığı Bildirim Sistemi',
  description:
    'UETDS Tarifesiz (Arızi) Yolcu Taşımacılığı Bildirim ve Yönetim Platformu',
  applicationName: 'ProUETDS',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/vito.png', type: 'image/png' }],
    shortcut: [{ url: '/vito.png', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
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
    images: ['/vito.png'],
    type: 'website',
    locale: 'tr_TR',
  },
  twitter: {
    card: 'summary',
    title: 'ProUETDS',
    description:
      'UETDS Tarifesiz (Arızi) Yolcu Taşımacılığı Bildirim ve Yönetim Platformu',
    images: ['/vito.png'],
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
        <Script id="theme-preference" strategy="beforeInteractive">
          {`try { const theme = localStorage.getItem('theme-preference'); if (theme === 'light' || theme === 'dark') { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } } catch (error) {}`}
        </Script>
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
