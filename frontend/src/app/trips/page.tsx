'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tripsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Bus,
  Send,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form
  const [form, setForm] = useState({
    vehiclePlate: '',
    departureDate: '',
    departureTime: '',
    endDate: '',
    endTime: '',
    description: '',
    firmTripNumber: '',
  });

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await tripsApi.list({
        page,
        limit: 15,
        status: statusFilter || undefined,
      });
      setTrips(res.data.trips);
      setTotal(res.data.total);
    } catch {
      toast.error('Seferler yüklenemedi');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrips();
  }, [page, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await tripsApi.create(form);
      toast.success('Sefer oluşturuldu');
      setShowCreateModal(false);
      setForm({
        vehiclePlate: '',
        departureDate: '',
        departureTime: '',
        endDate: '',
        endTime: '',
        description: '',
        firmTripNumber: '',
      });
      router.push(`/trips/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sefer oluşturulamadı');
    }
  };

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

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus size={24} className="text-emerald-400" />
            Seferler
          </h1>
          <p className="text-slate-400 mt-1">
            Toplam {total} sefer · Sayfa {page}/{totalPages || 1}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Yeni Sefer
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sefer ara (plaka, numara...)"
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input-field w-auto min-w-[160px]"
        >
          <option value="">Tüm Durumlar</option>
          <option value="draft">Taslak</option>
          <option value="ready">Hazır</option>
          <option value="sent">Gönderildi</option>
          <option value="error">Hata</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      {/* Trips Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                  <th className="px-5 py-3.5">Sefer No</th>
                  <th className="px-5 py-3.5">Plaka</th>
                  <th className="px-5 py-3.5">Hareket</th>
                  <th className="px-5 py-3.5">Bitiş</th>
                  <th className="px-5 py-3.5">Yolcu</th>
                  <th className="px-5 py-3.5">Durum</th>
                  <th className="px-5 py-3.5">UETDS Ref</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {trips.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Sefer bulunamadı
                    </td>
                  </tr>
                )}
                {trips.map((trip) => {
                  const passengerCount =
                    trip.groups?.reduce(
                      (sum: number, g: any) =>
                        sum + (g.passengers?.length || 0),
                      0,
                    ) || 0;
                  return (
                    <tr
                      key={trip.id}
                      className="hover:bg-slate-700/20 transition cursor-pointer"
                      onClick={() => router.push(`/trips/${trip.id}`)}
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-white">
                        {trip.firmTripNumber || trip.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-300 font-mono">
                        {trip.vehiclePlate}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">
                        {trip.departureDate} {trip.departureTime}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">
                        {trip.endDate} {trip.endTime}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">
                        {passengerCount}
                      </td>
                      <td className="px-5 py-3.5">
                        {getStatusBadge(trip.status)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">
                        {trip.uetdsSeferRefNo || '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button className="text-slate-400 hover:text-emerald-400 transition">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-700/50">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Önceki
            </button>
            <span className="text-sm text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
            >
              Sonraki <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 animate-slide-in">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <Plus size={20} className="text-emerald-400" />
              Yeni Sefer Oluştur
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">
                    Araç Plaka
                  </label>
                  <input
                    value={form.vehiclePlate}
                    onChange={(e) =>
                      setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })
                    }
                    className="input-field"
                    placeholder="34 ABC 123"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Hareket Tarihi
                  </label>
                  <input
                    type="date"
                    value={form.departureDate}
                    onChange={(e) =>
                      setForm({ ...form, departureDate: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Hareket Saati
                  </label>
                  <input
                    type="time"
                    value={form.departureTime}
                    onChange={(e) =>
                      setForm({ ...form, departureTime: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Bitiş Saati
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="input-field"
                    rows={2}
                    placeholder="Sefer açıklaması (opsiyonel)"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  Oluştur
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
