'use client';

import { useEffect, useState } from 'react';
import { logsApi, tripsApi, tenantsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Bus,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  TrendingUp,
  Zap,
  BarChart3,
  MapPin,
  Building2,
} from 'lucide-react';

interface Stats {
  totalCalls: number;
  todayCalls: number;
  errorCalls: number;
  errorRate: string | number;
  avgResponseTimeMs: number;
}

interface TripStats {
  total: number;
  trips: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTrips, setRecentTrips] = useState<TripStats | null>(null);
  const [fleetStats, setFleetStats] = useState<any>(null);
  const [fleetPeriod, setFleetPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<{ total: number; active: number; passive: number; plans: Record<string, number> } | null>(null);
  const { user } = useAuthStore();

  const fetchFleetStats = (period: string) => {
    tripsApi.getStats({ period }).then((res: any) => {
      if (res.data) setFleetStats(res.data);
    }).catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      logsApi.getStats().catch(() => ({ data: null })),
      tripsApi.list({ limit: 5 }).catch(() => ({ data: null })),
      tripsApi.getStats({ period: 'monthly' }).catch(() => ({ data: null })),
    ]).then(([statsRes, tripsRes, fleetRes]) => {
      if (statsRes.data) setStats(statsRes.data);
      if (tripsRes.data) setRecentTrips(tripsRes.data);
      if (fleetRes.data) setFleetStats(fleetRes.data);
      setLoading(false);
    });
  }, []);

  // Platform overview (super admin only): aggregate all tenants.
  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    tenantsApi
      .list()
      .then((res: any) => {
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data?.tenants || [];
        const total = list.length;
        const active = list.filter((t: any) => t.isActive).length;
        const plans: Record<string, number> = {};
        list.forEach((t: any) => {
          const p = t.subscriptionPlan || 'basic';
          plans[p] = (plans[p] || 0) + 1;
        });
        setPlatform({ total, active, passive: total - active, plans });
      })
      .catch(() => {});
  }, [user?.role]);

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setFleetPeriod(period);
    fetchFleetStats(period);
  };

  const statCards = [
    {
      title: 'Toplam UETDS Çağrısı',
      value: stats?.totalCalls || 0,
      icon: Activity,
      color: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/20',
    },
    {
      title: 'Bugün Gönderilen',
      value: stats?.todayCalls || 0,
      icon: Zap,
      color: 'from-emerald-500 to-cyan-500',
      shadow: 'shadow-emerald-500/20',
    },
    {
      title: 'Hata Oranı',
      value: `%${stats?.errorRate || 0}`,
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20',
    },
    {
      title: 'Ort. Yanıt Süresi',
      value: `${stats?.avgResponseTimeMs || 0}ms`,
      icon: Clock,
      color: 'from-blue-500 to-indigo-500',
      shadow: 'shadow-blue-500/20',
    },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'badge badge-draft',
      ready: 'badge badge-ready',
      sending: 'badge badge-sending',
      sent: 'badge badge-sent',
      error: 'badge badge-error',
      cancelled: 'badge badge-cancelled',
    };
    const labels: Record<string, string> = {
      draft: 'Taslak',
      ready: 'Hazır',
      sending: 'Gönderiliyor',
      sent: 'Gönderildi',
      error: 'Hata',
      cancelled: 'İptal',
    };
    return (
      <span className={map[status] || map.draft}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl theme-heading">Dashboard</h1>
        <p className="theme-text-soft mt-1">UETDS bildirim sistemi genel durumu</p>
      </div>

      {/* Platform Özeti (sadece süper admin) */}
      {platform && (
        <div className="space-y-4">
          <h2 className="theme-section-title flex items-center gap-2">
            <Building2 size={20} className="text-emerald-400" />
            Platform Özeti
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { title: 'Toplam Firma', value: platform.total, icon: Building2, color: 'from-emerald-500 to-cyan-500', shadow: 'shadow-emerald-500/20' },
              { title: 'Aktif Firma', value: platform.active, icon: CheckCircle2, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
              { title: 'Pasif Firma', value: platform.passive, icon: AlertTriangle, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
              { title: 'Plan Türleri', value: Object.keys(platform.plans).length, icon: BarChart3, color: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/20' },
            ].map((card, i) => (
              <div key={i} className="glass-card p-5 animate-slide-in">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-lg ${card.shadow}`}>
                    <card.icon size={20} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl theme-heading">{card.value}</p>
                <p className="text-sm theme-text-soft mt-1">{card.title}</p>
              </div>
            ))}
          </div>
          {Object.keys(platform.plans).length > 0 && (
            <p className="text-xs theme-text-soft">
              Plan dağılımı: {Object.entries(platform.plans).map(([p, c]) => `${p}: ${c}`).join(' · ')}
            </p>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="glass-card p-5 animate-slide-in"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-lg ${card.shadow}`}
              >
                <card.icon size={20} className="text-white" />
              </div>
              <TrendingUp size={16} className="theme-icon-muted" />
            </div>
            <p className="text-2xl theme-heading">{card.value}</p>
            <p className="text-sm theme-text-soft mt-1">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Recent Trips */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 theme-divider-bottom flex items-center justify-between">
          <h2 className="theme-section-title flex items-center gap-2">
            <Bus size={20} className="text-emerald-400" />
            Son Seferler
          </h2>
          <a
            href="/trips"
            className="text-sm theme-link transition"
          >
            Tümünü Gör →
          </a>
        </div>
        <div className="theme-mobile-recent-list p-4">
          {recentTrips?.trips?.length === 0 ? (
            <div className="dashboard-trip-card rounded-2xl p-5 text-center theme-empty">
              Henüz sefer bulunmuyor
            </div>
          ) : (
            recentTrips?.trips?.map((trip: any) => (
              <button
                key={trip.id}
                type="button"
                onClick={() => (window.location.href = `/trips/${trip.id}`)}
                className="dashboard-trip-card rounded-2xl p-5 text-left theme-safe-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold dashboard-trip-value">{trip.firmTripNumber || trip.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm dashboard-trip-meta font-mono">{trip.vehiclePlate}</p>
                  </div>
                  <span className="theme-mobile-status">{getStatusBadge(trip.status)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="dashboard-trip-meta">Kalkış</p>
                    <p className="mt-1 dashboard-trip-value">{trip.departureDate} {trip.departureTime}</p>
                  </div>
                  <div>
                    <p className="dashboard-trip-meta">UETDS Ref</p>
                    <p className="mt-1 dashboard-trip-code font-mono">{trip.uetdsSeferRefNo || '-'}</p>
                  </div>
                </div>
                <div className="mt-4 theme-inline-action dashboard-trip-link">
                  <span>Detaya git</span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="theme-desktop-recent-table overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs theme-text-soft uppercase tracking-wider theme-table-head">
                <th className="px-5 py-3">Sefer No</th>
                <th className="px-5 py-3">Plaka</th>
                <th className="px-5 py-3">Tarih</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3">UETDS Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-table-body">
              {recentTrips?.trips?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center theme-empty">
                    Henüz sefer bulunmuyor
                  </td>
                </tr>
              )}
              {recentTrips?.trips?.map((trip: any) => (
                <tr
                  key={trip.id}
                  className="theme-table-row transition cursor-pointer"
                  onClick={() => (window.location.href = `/trips/${trip.id}`)}
                >
                  <td className="px-5 py-3.5 text-sm font-medium theme-table-cell-strong">
                    {trip.firmTripNumber || trip.id.slice(0, 8)}
                  </td>
                  <td className="px-5 py-3.5 text-sm theme-table-code">
                    {trip.vehiclePlate}
                  </td>
                  <td className="px-5 py-3.5 text-sm theme-table-cell">
                    {trip.departureDate} {trip.departureTime}
                  </td>
                  <td className="px-5 py-3.5">{getStatusBadge(trip.status)}</td>
                  <td className="px-5 py-3.5 text-sm theme-table-cell-soft">
                    {trip.uetdsSeferRefNo || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filo İstatistikleri */}
      {fleetStats && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="theme-section-title flex items-center gap-2">
              <BarChart3 size={20} className="text-violet-400" />
              Filo İstatistikleri
            </h2>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    fleetPeriod === p
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {p === 'daily' ? 'Günlük' : p === 'weekly' ? 'Haftalık' : 'Aylık'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* En Yoğun Rotalar */}
            <div className="glass-card p-6 rounded-3xl">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={18} className="text-emerald-500" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">En Yoğun Rotalar</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                {fleetStats.periodDays} günde toplam {fleetStats.totalTrips} sefer
              </p>
              {fleetStats.topRoutes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Bu dönemde sefer bulunamadı</p>
              ) : (
                <div className="space-y-4">
                  {fleetStats.topRoutes.map((r: any, idx: number) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate mr-2">{r.route}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">{r.count} sefer</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max((r.count / (fleetStats.topRoutes[0]?.count || 1)) * 100, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saatlik Yoğunluk */}
            <div className="glass-card p-6 rounded-3xl">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={18} className="text-violet-500" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Saatlik Yoğunluk</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Araçlar en çok hangi saatlerde lazım?
              </p>
              <div className="flex items-end gap-[3px] h-40 pb-6 relative">
                {fleetStats.hourlyDistribution.map((h: any, idx: number) => {
                  const maxCount = Math.max(...fleetStats.hourlyDistribution.map((x: any) => x.count), 1);
                  const pct = (h.count / maxCount) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-violet-600 to-violet-400 dark:from-violet-500 dark:to-violet-300 opacity-80 hover:opacity-100 transition-all cursor-pointer"
                        style={{ height: `${pct}%`, minHeight: h.count > 0 ? '4px' : '0' }}
                      />
                      {idx % 3 === 0 && (
                        <span className="text-[9px] text-slate-400 mt-1 absolute -bottom-5">
                          {h.hour.split(':')[0]}
                        </span>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-7 bg-slate-900 dark:bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap transition-opacity z-10">
                        {h.hour} → {h.count} sefer
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
