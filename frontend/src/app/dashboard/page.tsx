'use client';

import { useEffect, useState } from 'react';
import { logsApi, tripsApi } from '@/lib/api';
import {
  Bus,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  TrendingUp,
  Zap,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      logsApi.getStats().catch(() => ({ data: null })),
      tripsApi.list({ limit: 5 }).catch(() => ({ data: null })),
    ]).then(([statsRes, tripsRes]) => {
      if (statsRes.data) setStats(statsRes.data);
      if (tripsRes.data) setRecentTrips(tripsRes.data);
      setLoading(false);
    });
  }, []);

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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="glass-card p-5 animate-slide-in"
            style={{ animationDelay: `${i * 100}ms` }}
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
        <div className="overflow-x-auto">
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
    </div>
  );
}
