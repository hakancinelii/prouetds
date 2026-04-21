'use client';
// Version: 1.0.5-ui-flow-deploy-trigger

import { useEffect, useState } from 'react';

const getDefaultTripDateTime = () => {
  const now = new Date();
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const toLocalInputDate = (value: Date) => {
    const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  };

  const toLocalInputTime = (value: Date) => {
    const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(11, 16);
  };

  return {
    departureDate: toLocalInputDate(now),
    departureTime: toLocalInputTime(now),
    endDate: toLocalInputDate(end),
    endTime: toLocalInputTime(end),
  };
};

const PRIORITY_ISTANBUL_DISTRICTS = [
  'ARNAVUTKÖY',
  'PENDİK',
  'BEYOĞLU',
  'ŞİŞLİ',
  'FATİH',
  'AVCILAR',
  'BEYLİKDÜZÜ',
  'ESENYURT',
];

const sortDistrictsForTripFlow = (
  provinceCode: number,
  districts: Array<{ code: number; name: string }>,
) => {
  if (provinceCode !== 34) return districts;

  const priorityMap = new Map(
    PRIORITY_ISTANBUL_DISTRICTS.map((name, index) => [name, index]),
  );

  return [...districts].sort((a, b) => {
    const aPriority = priorityMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = priorityMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return a.name.localeCompare(b.name, 'tr');
  });
};

const DEFAULT_TRIP_DESCRIPTION = 'İstanbul içi Transfer';

const AIRPORT_OPTIONS = [
  { key: 'airport:ist', label: 'İstanbul Havalimanı', districtCode: '2048', place: 'İstanbul Havalimanı' },
  { key: 'airport:saw', label: 'Sabiha Gökçen Havalimanı', districtCode: '1835', place: 'Sabiha Gökçen Havalimanı' },
];

const getDistrictSelectOptions = (
  provinceCode: number,
  districts: Array<{ code: number; name: string }>,
) => {
  if (provinceCode !== 34) {
    return districts.map((district) => ({
      value: `district:${district.code}`,
      label: `${district.name} (${district.code})`,
      districtCode: String(district.code),
      place: `${district.name}/İSTANBUL`,
    }));
  }

  return [
    ...AIRPORT_OPTIONS,
    ...districts.map((district) => ({
      value: `district:${district.code}`,
      label: `${district.name} (${district.code})`,
      districtCode: String(district.code),
      place: `${district.name}/İSTANBUL`,
    })),
  ];
};

const getDefaultCreateForm = () => ({
  originSelection: '',
  destSelection: '',
  vehiclePlate: '',
  selectedDriverId: '',
  ...getDefaultTripDateTime(),
  description: DEFAULT_TRIP_DESCRIPTION,
  firmTripNumber: '',
  originIlCode: 34,
  originIlceCode: '',
  originPlace: '',
  destIlCode: 34,
  destIlceCode: '',
  destPlace: '',
});

const normalizePlate = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, '');

const getSuggestedDriverId = (vehiclePlate: string, vehicles: any[], drivers: any[]) => {
  const normalizedPlate = normalizePlate(vehiclePlate);
  return (
    vehicles.find((vehicle) => normalizePlate(vehicle.plateNumber) === normalizedPlate)
      ?.defaultDriver?.id ||
    drivers.find((driver) => normalizePlate(driver.plateNumber || '') === normalizedPlate)?.id ||
    ''
  );
};

const getSuggestedDriver = (selectedDriverId: string, drivers: any[]) =>
  drivers.find((driver) => driver.id === selectedDriverId) || null;

const handleVehiclePlateSelect = (
  nextPlate: string,
  vehicles: any[],
  drivers: any[],
  currentForm: ReturnType<typeof getDefaultCreateForm>,
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof getDefaultCreateForm>>>,
) => {
  const normalizedPlate = normalizePlate(nextPlate);
  const suggestedDriverId = getSuggestedDriverId(normalizedPlate, vehicles, drivers);
  setForm({
    ...currentForm,
    vehiclePlate: normalizedPlate,
    selectedDriverId: suggestedDriverId,
  });
};

const getDriverLabel = (driver: any) =>
  driver ? `${driver.firstName} ${driver.lastName} · ${driver.tcKimlikNo}` : '';

void getDriverLabel;
void handleVehiclePlateSelect;
void getSuggestedDriver;
void getSuggestedDriverId;
void normalizePlate;

import { useRouter } from 'next/navigation';
import { driversApi, tripsApi, vehiclesApi } from '@/lib/api';
import { MERNIS_LOCATIONS, getProvinceByCode } from '@/lib/mernis-locations';
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importRefNo, setImportRefNo] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Create form
  const [form, setForm] = useState(getDefaultCreateForm);

  const originProvince = getProvinceByCode(Number(form.originIlCode));
  const destProvince = getProvinceByCode(Number(form.destIlCode));
  const originDistricts = sortDistrictsForTripFlow(
    Number(form.originIlCode),
    originProvince?.districts || [],
  );
  const destDistricts = sortDistrictsForTripFlow(
    Number(form.destIlCode),
    destProvince?.districts || [],
  );
  const originDistrictOptions = getDistrictSelectOptions(Number(form.originIlCode), originDistricts);
  const destDistrictOptions = getDistrictSelectOptions(Number(form.destIlCode), destDistricts);

  const getOptionByValue = (value: string, options: Array<{ value: string; districtCode: string; place: string }>) =>
    options.find((option) => option.value === value);

  const originSelection = form.originSelection || (form.originIlceCode ? `district:${form.originIlceCode}` : '');
  const destSelection = form.destSelection || (form.destIlceCode ? `district:${form.destIlceCode}` : '');

  const suggestedDriver = getSuggestedDriver(form.selectedDriverId, drivers);

  const getTripSubmitPayload = () => {
    const originOption = getOptionByValue(originSelection, originDistrictOptions);
    const destOption = getOptionByValue(destSelection, destDistrictOptions);

    return {
      ...form,
      vehiclePlate: normalizePlate(form.vehiclePlate),
      selectedDriverId: form.selectedDriverId || undefined,
      originIlCode: Number(form.originIlCode),
      originIlceCode: originOption?.districtCode ? Number(originOption.districtCode) : undefined,
      originPlace: (originOption?.place || form.originPlace).trim(),
      destIlCode: Number(form.destIlCode),
      destIlceCode: destOption?.districtCode ? Number(destOption.districtCode) : undefined,
      destPlace: (destOption?.place || form.destPlace).trim(),
    };
  };

  const handleVehicleChange = (nextPlate: string) => {
    handleVehiclePlateSelect(nextPlate, vehicles, drivers, form, setForm);
  };

  const clearSuggestedDriver = () => {
    setForm((prev) => ({ ...prev, selectedDriverId: '' }));
  };

  void clearSuggestedDriver;
  void handleVehicleChange;
  void suggestedDriver;

  const handleDistrictSelection = (
    field: 'originSelection' | 'destSelection',
    value: string,
    options: Array<{ value: string; districtCode: string; place: string }>,
  ) => {
    const selected = getOptionByValue(value, options);

    if (field === 'originSelection') {
      setForm({
        ...form,
        originSelection: value,
        originIlceCode: selected?.districtCode || '',
        originPlace: selected?.place || '',
      });
      return;
    }

    setForm({
      ...form,
      destSelection: value,
      destIlceCode: selected?.districtCode || '',
      destPlace: selected?.place || '',
    });
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await tripsApi.list({
        page,
        limit: 15,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setTrips(res.data.trips);
      setTotal(res.data.total);
    } catch {
      toast.error('Seferler yüklenemedi');
    }
    setLoading(false);
  };

  const fetchVehicles = async () => {
    try {
      const res = await vehiclesApi.list();
      setVehicles(res.data);
    } catch {
      console.error('Araçlar yüklenemedi');
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await driversApi.list();
      setDrivers(res.data);
    } catch {
      console.error('Şoförler yüklenemedi');
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchVehicles();
    fetchDrivers();
  }, [page, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchTrips();
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await tripsApi.create(getTripSubmitPayload());
      toast.success('Sefer oluşturuldu');
      setShowCreateModal(false);
      setForm(getDefaultCreateForm());
      router.push(`/trips/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sefer oluşturulamadı');
    }
  };

  const handleImportFromUetds = async (e: React.FormEvent) => {
    e.preventDefault();
    const uetdsSeferReferansNo = Number(importRefNo);
    if (!uetdsSeferReferansNo || Number.isNaN(uetdsSeferReferansNo)) {
      toast.error('Geçerli UETDS sefer referans numarası girin');
      return;
    }

    setImporting(true);
    try {
      const res = await tripsApi.importFromUetds(uetdsSeferReferansNo);
      toast.success('Sefer UETDS üzerinden içe aktarıldı');
      setShowImportModal(false);
      setImportRefNo('');
      fetchTrips();
      router.push(`/trips/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'UETDS seferi içe aktarılamadı');
    } finally {
      setImporting(false);
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
          <h1 className="text-2xl theme-heading flex items-center gap-2">
            <Bus size={24} className="text-emerald-400" />
            Seferler
          </h1>
          <p className="theme-text-soft mt-1">
            Toplam {total} sefer · Sayfa {page}/{totalPages || 1}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText size={18} />
            UETDS'den İçe Aktar
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Yeni Sefer
          </button>
        </div>
      </div>
      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 theme-panel-border">
        <div className="search-input-shell flex-1">
          <Search
            size={16}
            className="input-icon-left-search theme-icon-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sefer ara (plaka, numara...)"
            className="input-field input-with-icon"
          />
        </div>
        <select
          aria-label="Durum filtresi"
          title="Durum filtresi"
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
      <div className="glass-card overflow-hidden theme-panel-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
          </div>
        ) : trips.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
            Sefer bulunamadı
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {trips.map((trip) => {
                const passengerCount =
                  trip.groups?.reduce(
                    (sum: number, g: any) =>
                      sum + (g.passengers?.length || 0),
                    0,
                  ) || 0;
                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => router.push(`/trips/${trip.id}`)}
                    className="mobile-trip-card text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {trip.firmTripNumber || trip.id.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                          {trip.vehiclePlate}
                        </p>
                      </div>
                      {getStatusBadge(trip.status)}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Hareket</p>
                        <p className="mt-1 font-medium text-slate-700 dark:text-slate-100">{trip.departureDate} {trip.departureTime}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Bitiş</p>
                        <p className="mt-1 font-medium text-slate-700 dark:text-slate-100">{trip.endDate} {trip.endTime}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Kalkış</p>
                        <p className="mt-1 font-medium text-slate-700 dark:text-slate-100">{trip.originPlace || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Varış</p>
                        <p className="mt-1 font-medium text-slate-700 dark:text-slate-100">{trip.destPlace || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Yolcu</p>
                        <p className="mt-1 font-medium text-slate-700 dark:text-slate-100">{passengerCount}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">UETDS Ref</p>
                        <p className="mt-1 font-medium font-mono text-slate-700 dark:text-slate-100">{trip.uetdsSeferRefNo || '-'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-300">
                      <Eye size={16} />
                      <span className="text-xs font-medium">Detaya git</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs theme-table-head uppercase tracking-wider border-b theme-divider-bottom">
                    <th className="px-5 py-3.5">Sefer No</th>
                    <th className="px-5 py-3.5">Plaka</th>
                    <th className="px-5 py-3.5">Hareket</th>
                    <th className="px-5 py-3.5">Bitiş</th>
                    <th className="px-5 py-3.5">Yolcu</th>
                    <th className="px-5 py-3.5">Durum</th>
                    <th className="px-5 py-3.5">UETDS Ref</th>
                    <th className="px-5 py-3.5 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-table-body">
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
                        className="theme-table-row transition cursor-pointer"
                        onClick={() => router.push(`/trips/${trip.id}`)}
                      >
                        <td className="px-5 py-3.5 text-sm font-medium theme-table-cell-strong">
                          {trip.firmTripNumber || trip.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5 text-sm theme-table-code font-mono">
                          {trip.vehiclePlate}
                        </td>
                        <td className="px-5 py-3.5 text-sm theme-table-cell">
                          {trip.departureDate} {trip.departureTime}
                        </td>
                        <td className="px-5 py-3.5 text-sm theme-table-cell">
                          {trip.endDate} {trip.endTime}
                        </td>
                        <td className="px-5 py-3.5 text-sm theme-table-cell">
                          {passengerCount}
                        </td>
                        <td className="px-5 py-3.5">
                          {getStatusBadge(trip.status)}
                        </td>
                        <td className="px-5 py-3.5 text-sm theme-table-cell-soft font-mono">
                          {trip.uetdsSeferRefNo || '-'}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            title="Sefer detayını aç"
                            aria-label="Sefer detayını aç"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/trips/${trip.id}`);
                            }}
                            className="theme-icon-muted hover:text-emerald-400 transition"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-700/50">
            <button
              type="button"
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
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
            >
              Sonraki <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card theme-modal w-full max-w-md p-6 animate-slide-in">
            <h2 className="text-xl theme-heading mb-4 flex items-center gap-2">
              <FileText size={20} className="text-emerald-400" />
              UETDS Seferini İçe Aktar
            </h2>
            <form onSubmit={handleImportFromUetds} className="space-y-4">
              <div>
                <label className="label-muted text-sm">UETDS Sefer Referans No</label>
                <input
                  type="number"
                  value={importRefNo}
                  onChange={(e) => setImportRefNo(e.target.value)}
                  className="input-field"
                  placeholder="Örn: 2604206112446680"
                  required
                />
                <p className="mt-1 text-[11px] theme-text-soft">
                  E-Devlet / UETDS üzerinden manuel girilmiş seferi referans numarasıyla arayüze aktarır.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary"
                >
                  Vazgeç
                </button>
                <button type="submit" disabled={importing} className="btn-primary">
                  {importing ? 'İçe aktarılıyor...' : 'İçe Aktar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="glass-card theme-modal w-full max-w-lg p-4 sm:p-6 animate-slide-in my-[calc(env(safe-area-inset-top)+0.75rem)] mb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto">
            <h2 className="text-xl theme-heading mb-5 flex items-center gap-2">
              <Plus size={20} className="text-emerald-400" />
              Yeni Sefer Oluştur
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-muted text-sm">
                    Araç Plaka
                  </label>
                  <input
                    list="registered-vehicles"
                    value={form.vehiclePlate}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="input-field"
                    placeholder="Listeden seçin veya elle yazın (örn: 34ABC123)"
                    required
                  />
                  <datalist id="registered-vehicles">
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.brand ? `${v.plateNumber} (${v.brand})` : v.plateNumber}
                      </option>
                    ))}
                  </datalist>
                  {suggestedDriver && (
                    <div className="mt-2 rounded-xl theme-note px-3 py-2 text-xs theme-text-soft">
                      Önerilen şoför: <span className="theme-text-strong">{getDriverLabel(suggestedDriver)}</span>
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="label-muted text-sm">
                    Seferde Kullanılacak Şoför
                  </label>
                  <div className="flex gap-2">
                    <select
                      title="Seferde kullanılacak şoför"
                      aria-label="Seferde kullanılacak şoför"
                      value={form.selectedDriverId}
                      onChange={(e) => setForm({ ...form, selectedDriverId: e.target.value })}
                      className="input-field flex-1"
                    >
                      <option value="">Şoför seçilmedi</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {getDriverLabel(driver)}
                        </option>
                      ))}
                    </select>
                    {form.selectedDriverId && (
                      <button
                        type="button"
                        onClick={clearSuggestedDriver}
                        className="btn-secondary"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] theme-text-soft">
                    Araç için varsayılan şoför tanımlıysa otomatik gelir; isterseniz değiştirebilirsiniz.
                  </p>
                </div>
                <div>
                  <label className="label-muted text-sm">
                    Hareket Tarihi
                  </label>
                  <input
                    type="date"
                    title="Hareket tarihi"
                    aria-label="Hareket tarihi"
                    value={form.departureDate}
                    onChange={(e) =>
                      setForm({ ...form, departureDate: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-muted text-sm">
                    Hareket Saati
                  </label>
                  <input
                    type="time"
                    title="Hareket saati"
                    aria-label="Hareket saati"
                    value={form.departureTime}
                    onChange={(e) =>
                      setForm({ ...form, departureTime: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-muted text-sm">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    title="Bitiş tarihi"
                    aria-label="Bitiş tarihi"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-muted text-sm">
                    Bitiş Saati
                  </label>
                  <input
                    type="time"
                    title="Bitiş saati"
                    aria-label="Bitiş saati"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="label-muted text-sm">
                    Açıklama
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="input-field"
                    rows={2}
                    placeholder="Sefer açıklaması / grup açıklaması (örn: İstanbul içi Transfer)"
                    required
                  />
                  <p className="mt-1 text-[11px] theme-text-soft">
                    Varsayılan açıklama hazır gelir; isterseniz sefere göre düzenleyebilirsiniz.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="theme-form-shell p-3 rounded-lg space-y-3">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">Kalkış Noktası</span>
                  <div>
                    <label className="label-muted text-[11px]">İl Kodu (MERNIS)</label>
                    <select
                      id="origin-il-code"
                      aria-label="Kalkış ili"
                      title="Kalkış ili"
                      value={form.originIlCode}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          originIlCode: Number(e.target.value),
                          originSelection: '',
                          originIlceCode: '',
                          originPlace: '',
                        })
                      }
                      className="input-field py-1.5"
                      required
                    >
                      {MERNIS_LOCATIONS.map((province) => (
                        <option key={province.code} value={province.code}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-muted text-[11px]">İlçe Kodu (MERNIS)</label>
                    <select
                      id="origin-ilce-code"
                      aria-label="Kalkış ilçesi"
                      title="Kalkış ilçesi"
                      value={originSelection}
                      onChange={(e) =>
                        handleDistrictSelection('originSelection', e.target.value, originDistrictOptions)
                      }
                      className="input-field py-1.5"
                      required
                    >
                      <option value="">İlçe seçiniz</option>
                      {originDistrictOptions.map((district) => (
                        <option key={district.value} value={district.value}>
                          {district.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-muted text-[11px]">Başlangıç Yeri (İlçe Adı / Havalimanı)</label>
                    <input
                      type="text"
                      value={form.originPlace}
                      onChange={(e) => setForm({ ...form, originPlace: e.target.value })}
                      className="input-field py-1.5"
                      placeholder="İlçe seçimiyle otomatik dolar; gerekirse terminal / havaalanı detayını yazın"
                      required
                    />
                  </div>
                </div>

                <div className="theme-form-shell p-3 rounded-lg space-y-3">
                  <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Varış Noktası</span>
                  <div>
                    <label className="label-muted text-[11px]">İl Kodu (MERNIS)</label>
                    <select
                      id="dest-il-code"
                      aria-label="Varış ili"
                      title="Varış ili"
                      value={form.destIlCode}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          destIlCode: Number(e.target.value),
                          destSelection: '',
                          destIlceCode: '',
                          destPlace: '',
                        })
                      }
                      className="input-field py-1.5"
                      required
                    >
                      {MERNIS_LOCATIONS.map((province) => (
                        <option key={province.code} value={province.code}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-muted text-[11px]">İlçe Kodu (MERNIS)</label>
                    <select
                      id="dest-ilce-code"
                      aria-label="Varış ilçesi"
                      title="Varış ilçesi"
                      value={destSelection}
                      onChange={(e) =>
                        handleDistrictSelection('destSelection', e.target.value, destDistrictOptions)
                      }
                      className="input-field py-1.5"
                      required
                    >
                      <option value="">İlçe seçiniz</option>
                      {destDistrictOptions.map((district) => (
                        <option key={district.value} value={district.value}>
                          {district.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-muted text-[11px]">Bitiş Yeri (İlçe Adı / Havalimanı)</label>
                    <input
                      type="text"
                      value={form.destPlace}
                      onChange={(e) => setForm({ ...form, destPlace: e.target.value })}
                      className="input-field py-1.5"
                      placeholder="İlçe seçimiyle otomatik dolar; gerekirse terminal / havaalanı detayını yazın"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
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
