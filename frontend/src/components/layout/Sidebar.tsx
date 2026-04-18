'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  LayoutDashboard,
  Building2, // Üst kısma taşıdık
  Bus,
  Users,
  CarFront,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Sun,
  Moon,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Şirketler', href: '/tenants', icon: Building2, superAdminOnly: true },
  { name: 'Seferler', href: '/trips', icon: Bus },
  { name: 'Şoförler', href: '/drivers', icon: Users },
  { name: 'Araçlar', href: '/vehicles', icon: CarFront },
  { name: 'Loglar', href: '/logs', icon: FileText },
  { name: 'Ayarlar', href: '/settings', icon: Settings },
];

const getVisibleNavigation = (role?: string) =>
  navigation.filter((item) => !item.superAdminOnly || role === 'super_admin');

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading, loadFromStorage } =
    useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const applyTheme = (nextTheme: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem('theme-preference', nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem('theme-preference');
    const initialTheme = storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

    document.documentElement.dataset.theme = initialTheme;
    document.documentElement.style.colorScheme = initialTheme;
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    // Allow access to login and register pages without authentication
    const publicPaths = ['/login', '/register'];
    if (!isLoading && !isAuthenticated && !publicPaths.includes(pathname || '')) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const isPublicPage = pathname === '/login' || pathname === '/register';
  if (isLoading || !isAuthenticated || isPublicPage) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const deltaX = touchEndX - touchStartX;

    if (!sidebarOpen && touchStartX < 28 && deltaX > 72) {
      setSidebarOpen(true);
    }

    if (sidebarOpen && deltaX < -72) {
      setSidebarOpen(false);
    }

    setTouchStartX(null);
  };

  return (
    <>
      <div className="lg:hidden fixed inset-y-0 left-0 w-7 z-20" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />

      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-5 left-4 z-50 lg:hidden mobile-menu-shell text-[rgb(var(--foreground-rgb))] p-2.5 rounded-2xl shadow-lg theme-menu-touch"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className="fixed top-4 right-4 z-50 lg:hidden">
        <div className="theme-toggle-pill theme-toggle-group shadow-lg">
          <button
            type="button"
            data-active={theme === 'light'}
            onClick={() => applyTheme('light')}
            className="theme-toggle-chip theme-toggle-touch"
            title="Açık tema"
            aria-label="Açık tema"
          >
            <Sun size={16} />
          </button>
          <button
            type="button"
            data-active={theme === 'dark'}
            onClick={() => applyTheme('dark')}
            className="theme-toggle-chip theme-toggle-touch"
            title="Koyu tema"
            aria-label="Koyu tema"
          >
            <Moon size={16} />
          </button>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[linear-gradient(180deg,rgb(var(--sidebar-start)),rgb(var(--sidebar-mid))_38%,rgb(var(--sidebar-end)))] text-[rgb(var(--foreground-rgb))] z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col border-r theme-border`}
      >
        {/* Logo */}
        <div className="p-6 theme-divider-bottom">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10 ring-1 ring-slate-200/70 dark:ring-slate-700/50">
              <Shield size={22} className="text-slate-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                ProUETDS
              </h1>
              <p className="text-[10px] theme-text-soft tracking-wider uppercase">
                Yolcu Taşımacılığı
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {getVisibleNavigation(user?.role).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-700 dark:text-emerald-300 shadow-lg shadow-emerald-500/5 border border-emerald-500/20'
                    : 'theme-text hover:text-[rgb(var(--foreground-rgb))] hover:bg-[rgb(var(--surface-elevated-rgb))]/70'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block px-4 pb-2 desktop-theme-slot">
          <div className="theme-toggle-pill theme-toggle-group w-full justify-center">
            <button
              type="button"
              data-active={theme === 'light'}
              onClick={() => applyTheme('light')}
              className="theme-toggle-chip theme-toggle-compact theme-toggle-touch"
            >
              <Sun size={16} /> Açık
            </button>
            <button
              type="button"
              data-active={theme === 'dark'}
              onClick={() => applyTheme('dark')}
              className="theme-toggle-chip theme-toggle-compact theme-toggle-touch"
            >
              <Moon size={16} /> Koyu
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 theme-divider-top">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user?.tenant?.companyName || user?.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={16} />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}
