'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

const publicPaths = new Set(['/', '/login', '/register']);

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPage = publicPaths.has(pathname || '');

  return (
    <>
      {!isPublicPage && <Sidebar />}
      <main
        className={
          isPublicPage
            ? 'adaptive-page min-h-screen'
            : 'adaptive-page lg:ml-64 min-h-screen pt-[calc(env(safe-area-inset-top)+4.75rem)] lg:pt-0'
        }
      >
        {children}
      </main>
    </>
  );
}
