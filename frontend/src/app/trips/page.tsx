'use client';
// Version: 1.0.5-ui-flow-deploy-trigger

import { useEffect, useState } from 'react';

const getDefaultTripDateTime = () => {
  const now = new Date();

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
    endDate: toLocalInputDate(now),
    endTime: '23:59',
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
  districts: ReadonlyArray<{ code: number; name: string }>,
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
  {
    value: 'airport:ist',
    label: 'İstanbul Havalimanı',
    districtCode: '2048',
    place: 'İstanbul Havalimanı',
  },
  {
    value: 'airport:saw',
    label: 'Sabiha Gökçen Havalimanı',
    districtCode: '1835',
    place: 'Sabiha Gökçen Havalimanı',
  },
];

const AIRPORT_DISTRICT_OVERRIDES: Record<string, string> = {
  '2048': 'Arnavutköy/İSTANBUL',
  '1835': 'Pendik/İSTANBUL',
};

const getPlaceForOption = (districtCode: string, fallbackPlace: string) =>
  AIRPORT_DISTRICT_OVERRIDES[districtCode] || fallbackPlace;

const getAirportDisplayName = (districtCode: string) =>
  AIRPORT_OPTIONS.find((option) => option.districtCode === districtCode)?.label || '';

const getSelectionLabel = (districtCode: string, place: string) => {
  const airportName = getAirportDisplayName(districtCode);
  return airportName ? `${place} · ${airportName}` : place;
};

const getSelectionState = (
  selected?: { districtCode?: string; place?: string },
) => {
  const districtCode = selected?.districtCode || '';
  const place = districtCode
    ? getPlaceForOption(districtCode, selected?.place || '')
    : selected?.place || '';

  return {
    districtCode,
    place,
    selectionLabel: districtCode ? getSelectionLabel(districtCode, place) : place,
  };
};

const getSelectionStateFromValue = (
  value: string,
  options: ReadonlyArray<{ value: string; districtCode: string; place: string }>,
) => {
  const selected = options.find((option) => option.value === value);
  return getSelectionState(selected);
};

const getSelectionStateFromDistrictCode = (
  districtCode: string,
  options: ReadonlyArray<{ value: string; districtCode: string; place: string }>,
) => {
  const selected = options.find((option) => option.districtCode === districtCode);
  return getSelectionState(selected);
};

const buildTripPlacePayload = (
  selectionValue: string,
  fallbackDistrictCode: string,
  fallbackPlace: string,
  options: ReadonlyArray<{ value: string; districtCode: string; place: string }>,
) => {
  const selectedByValue = options.find((option) => option.value === selectionValue);
  const selected =
    selectedByValue ||
    options.find((option) => option.districtCode === fallbackDistrictCode) ||
    undefined;
  const districtCode = selected?.districtCode || fallbackDistrictCode;
  const place = districtCode
    ? getPlaceForOption(districtCode, selected?.place || fallbackPlace)
    : fallbackPlace;

  return {
    districtCode,
    place,
  };
};

const getSelectionValue = (selectionValue: string, districtCode: string) => {
  if (selectionValue) return selectionValue;
  const airportSelection = AIRPORT_OPTIONS.find(
    (option) => option.districtCode === districtCode,
  )?.value;
  if (airportSelection) return airportSelection;
  return districtCode ? `district:${districtCode}` : '';
};

const getDistrictSelectOptions = (
  provinceCode: number,
  districts: ReadonlyArray<{ code: number; name: string }>,
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

const getSuggestedPlateByDriver = (selectedDriverId: string, drivers: any[]) =>
  normalizePlate(
    drivers.find((driver) => driver.id === selectedDriverId)?.plateNumber || '',
  );

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

const handleDriverSelect = (
  nextDriverId: string,
  vehicles: any[],
  drivers: any[],
  currentForm: ReturnType<typeof getDefaultCreateForm>,
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof getDefaultCreateForm>>>,
) => {
  const selectedDriver = getSuggestedDriver(nextDriverId, drivers);
  if (!selectedDriver) {
    setForm((prev) => ({
      ...prev,
      selectedDriverId: '',
    }));
    return;
  }

  const suggestedPlate = getSuggestedPlateByDriver(nextDriverId, drivers);
  const matchedVehicle = vehicles.find(
    (vehicle) => normalizePlate(vehicle.plateNumber) === suggestedPlate,
  );

  setForm((prev) => ({
    ...prev,
    selectedDriverId: nextDriverId,
    vehiclePlate: matchedVehicle?.plateNumber
      ? normalizePlate(matchedVehicle.plateNumber)
      : suggestedPlate || currentForm.vehiclePlate,
  }));
};

const getDriverLabel = (driver: any) =>
  driver ? `${driver.firstName} ${driver.lastName} · ${driver.tcKimlikNo}` : '';

const TRIPS_HELPER_TEXT_CLASS = 'mt-1 text-[11px] text-slate-200 dark:text-slate-400';
const TRIPS_SUGGESTED_BADGE_CLASS = 'mt-2 rounded-xl theme-note px-3 py-2 text-xs text-slate-100 dark:text-slate-300';

void getDriverLabel;
void getSuggestedDriver;
void getSuggestedDriverId;
void getSuggestedPlateByDriver;
void normalizePlate;
void TRIPS_HELPER_TEXT_CLASS;
void TRIPS_SUGGESTED_BADGE_CLASS;
import { useRouter } from 'next/navigation';
import api, { driversApi, tripsApi, vehiclesApi } from '@/lib/api';
import { MERNIS_LOCATIONS, getProvinceByCode } from '@/lib/mernis-locations';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Bus,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BrainCircuit,
  X,
  UploadCloud,
  MessageCircle,
} from 'lucide-react';

export default function TripsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiPassports, setAiPassports] = useState<File[]>([]);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importRefNo, setImportRefNo] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTrip, setPdfTrip] = useState<any>(null);
  const [pdfLoadingTripId, setPdfLoadingTripId] = useState<string | null>(null);

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

  const originSelection = getSelectionValue(form.originSelection, form.originIlceCode);
  const destSelection = getSelectionValue(form.destSelection, form.destIlceCode);

  const originSelectionState = getSelectionStateFromDistrictCode(
    form.originIlceCode,
    originDistrictOptions,
  );
  const destSelectionState = getSelectionStateFromDistrictCode(
    form.destIlceCode,
    destDistrictOptions,
  );

  const suggestedDriver = getSuggestedDriver(form.selectedDriverId, drivers);

  const getTripSubmitPayload = () => {
    const originPayload = buildTripPlacePayload(
      originSelection,
      form.originIlceCode,
      form.originPlace,
      originDistrictOptions,
    );
    const destPayload = buildTripPlacePayload(
      destSelection,
      form.destIlceCode,
      form.destPlace,
      destDistrictOptions,
    );

    return {
      ...form,
      vehiclePlate: normalizePlate(form.vehiclePlate),
      selectedDriverId: form.selectedDriverId || undefined,
      originIlCode: Number(form.originIlCode),
      originIlceCode: originPayload.districtCode ? Number(originPayload.districtCode) : undefined,
      originPlace: originPayload.place.trim(),
      destIlCode: Number(form.destIlCode),
      destIlceCode: destPayload.districtCode ? Number(destPayload.districtCode) : undefined,
      destPlace: destPayload.place.trim(),
    };
  };

  const syncSelectionState = (
    field: 'originSelection' | 'destSelection',
    value: string,
    options: ReadonlyArray<{ value: string; districtCode: string; place: string }>,
  ) => {
    const selectionState = getSelectionStateFromValue(value, options);

    if (field === 'originSelection') {
      setForm({
        ...form,
        originSelection: value,
        originIlceCode: selectionState.districtCode,
        originPlace: selectionState.place,
      });
      return;
    }

    setForm({
      ...form,
      destSelection: value,
      destIlceCode: selectionState.districtCode,
      destPlace: selectionState.place,
    });
  };

  void suggestedDriver;

  const handleDistrictSelection = (
    field: 'originSelection' | 'destSelection',
    value: string,
    options: ReadonlyArray<{ value: string; districtCode: string; place: string }>,
  ) => {
    syncSelectionState(field, value, options);
  };

  const handleVehicleChange = (nextPlate: string) => {
    handleVehiclePlateSelect(nextPlate, vehicles, drivers, form, setForm);
  };

  const clearSuggestedDriver = () => {
    setForm((prev) => ({
      ...prev,
      selectedDriverId: '',
    }));
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

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const parsePdfError = async (blob: Blob) => {
    try {
      const text = await blob.text();
      const json = JSON.parse(text);
      return json.message || json.sonucMesaji || 'PDF alınamadı';
    } catch {
      return 'PDF alınamadı';
    }
  };

  const replacePdfUrl = (nextUrl: string | null) => {
    setPdfUrl((currentUrl) => {
      if (currentUrl) {
        window.URL.revokeObjectURL(currentUrl);
      }
      return nextUrl;
    });
  };

  const handleOpenTripPdf = async (trip: any) => {
    if (!trip?.uetdsSeferRefNo) {
      toast.error('Bu sefer için UETDS PDF referansı yok');
      return;
    }

    setPdfLoadingTripId(trip.id);
    try {
      const res = await tripsApi.getPdf(trip.id);
      const contentType = res.headers['content-type'];
      if (contentType && !contentType.includes('application/pdf')) {
        throw new Error(await parsePdfError(res.data));
      }
      replacePdfUrl(window.URL.createObjectURL(res.data as Blob));
      setPdfTrip(trip);
    } catch (err: any) {
      toast.error(err.message || 'PDF görüntülenemedi');
    } finally {
      setPdfLoadingTripId(null);
    }
  };

  const handleClosePdfViewer = () => {
    setPdfTrip(null);
    replacePdfUrl(null);
  };

  const handleOpenPdfInNewTab = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

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

  const handleAiPassportChange = (files: FileList | null) => {
    if (!files) return;
    setAiPassports(Array.from(files));
    setAiResult(null);
  };

  const handleAiAutopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim() && aiPassports.length === 0) {
      toast.error('Mesaj yazın veya pasaport görseli yükleyin');
      return;
    }

    setAiRunning(true);
    setAiResult(null);
    try {
      const res = await tripsApi.createWithAiAutopilot(aiMessage, aiPassports);
      setAiResult(res.data);
      if (res.data.success) {
        toast.success('AI Autopilot seferi oluşturdu ve UETDS’ye gönderdi');
      } else {
        toast.error('Sefer oluşturuldu ama UETDS gönderimi tamamlanamadı');
      }
      fetchTrips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'AI Autopilot çalıştırılamadı');
      setAiResult(err.response?.data || null);
    } finally {
      setAiRunning(false);
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

  const normalizePhoneForWhatsApp = (value?: string | null) => {
    const raw = String(value || '').replace(/[^0-9+]/g, '');
    if (!raw) return '';

    if (raw.startsWith('+')) return raw;
    if (raw.startsWith('90')) return `+${raw}`;
    if (raw.startsWith('0')) return `+90${raw.slice(1)}`;
    return `+90${raw}`;
  };

  const getPrimaryDriver = (trip: any) => trip.personnel?.[0] || null;

  const buildDriverWhatsAppMessage = (trip: any, driver: any, pdfLink?: string) => {
    const route = [trip?.originPlace, trip?.destPlace].filter(Boolean).join(' → ');
    return [
      `Merhaba ${driver?.firstName || 'şoför'},`,
      `${trip?.firmTripNumber || trip?.vehiclePlate || 'Sefer'} için UETDS gönderimi tamamlandı.`,
      `Tarih/Saat: ${trip?.departureDate || '-'} ${trip?.departureTime || '-'} - ${trip?.endDate || '-'} ${trip?.endTime || '-'}`,
      `Rota: ${route || '-'}`,
      `Plaka: ${trip?.vehiclePlate || '-'}`,
      `UETDS Ref: ${trip?.uetdsSeferRefNo || '-'}`,
      pdfLink ? `PDF: ${pdfLink}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const getApiBaseUrl = () =>
    (api.defaults.baseURL || window.location.origin || '').replace(/\/$/, '');

  const openDriverWhatsApp = async (trip: any) => {
    const primaryDriver = getPrimaryDriver(trip);
    const phone = normalizePhoneForWhatsApp(primaryDriver?.phone || primaryDriver?.driver?.phone);

    if (!phone) {
      toast.error('Şoför için WhatsApp telefon numarası bulunamadı');
      return;
    }

    try {
      const shareRes = await tripsApi.getPdfShareLink(trip.id, getApiBaseUrl());
      const pdfShareUrl = shareRes.data?.pdfShareUrl || '';
      const message = buildDriverWhatsAppMessage(trip, primaryDriver, pdfShareUrl);
      const whatsappUrl = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'PDF paylaşım linki oluşturulamadı');
    }
  };

  const canSendDriverWhatsapp = (trip: any) =>
    user?.role === 'company_admin' && trip?.status === 'sent';

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() => setShowAiPanel(true)}
        className="fixed bottom-6 right-6 z-40 group flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-emerald-300/30 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,.92),rgba(15,23,42,.96)_58%)] text-white shadow-[0_18px_48px_rgba(2,6,23,.38)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(16,185,129,.34)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50"
        aria-label="AI Sefer Autopilot"
        title="AI Sefer Autopilot"
      >
        <BrainCircuit size={30} strokeWidth={1.8} />
        <span className="pointer-events-none absolute right-20 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-emerald-100 shadow-2xl group-hover:block">
          AI Sefer Autopilot
        </span>
      </button>

      {showAiPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm">
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-emerald-300/20 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 px-6 py-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">AI Autopilot</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Mesajdan UETDS seferi oluştur</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Hareket zamanı otomatik şimdiki saat, bitiş aynı gün 23:59 alınır; pasaportlardan yolcular okunur ve sefer UETDS’ye gönderilir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiPanel(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  aria-label="AI panelini kapat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAiAutopilot} className="space-y-5 px-6 py-6">
              <div>
                <label className="text-sm font-medium text-slate-200">Operasyon mesajı</label>
                <textarea
                  value={aiMessage}
                  onChange={(e) => {
                    setAiMessage(e.target.value);
                    setAiResult(null);
                  }}
                  rows={6}
                  className="mt-2 w-full resize-none rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/60 focus:ring-4 focus:ring-emerald-300/10"
                  placeholder="Örn: İstanbul Havalimanı’ndan Şişli Hilton’a transfer. Plaka 34ABC123. Şoför Mehmet. Pasaportlar ektedir."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200">Pasaport görselleri</label>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-300/35 bg-emerald-300/[0.04] px-4 py-8 text-center transition hover:bg-emerald-300/[0.08]">
                  <UploadCloud size={28} className="text-emerald-300" />
                  <span className="mt-3 text-sm font-medium text-slate-200">Görselleri seç veya kameradan yükle</span>
                  <span className="mt-1 text-xs text-slate-500">JPEG, PNG, WEBP, HEIC · çoklu seçim desteklenir</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    multiple
                    onChange={(e) => handleAiPassportChange(e.target.files)}
                    className="sr-only"
                  />
                </label>
                {aiPassports.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Yüklenecek pasaportlar</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {aiPassports.map((file) => (
                        <span key={`${file.name}-${file.size}`} className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                          {file.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={aiRunning}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiRunning ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
                {aiRunning ? 'Autopilot seferi hazırlıyor' : 'Autopilot’u çalıştır ve UETDS’ye gönder'}
              </button>
            </form>

            {aiResult && (
              <div className="mx-6 mb-8 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sonuç</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      {aiResult.success ? 'Sefer UETDS’ye gönderildi' : 'Sefer oluşturuldu, UETDS hata verdi'}
                    </h3>
                  </div>
                  {aiResult.tripId && (
                    <button
                      type="button"
                      onClick={() => router.push(`/trips/${aiResult.tripId}`)}
                      className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                    >
                      Detaya git
                    </button>
                  )}
                </div>

                {aiResult.uetds?.uetdsSeferRefNo && (
                  <div className="mt-4 rounded-2xl bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                    UETDS Referans No: <span className="font-semibold">{aiResult.uetds.uetdsSeferRefNo}</span>
                  </div>
                )}

                {Array.isArray(aiResult.decisions) && aiResult.decisions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {aiResult.decisions.map((decision: string) => (
                      <p key={decision} className="rounded-2xl bg-white/[0.035] px-3 py-2 text-xs text-slate-300">
                        {decision}
                      </p>
                    ))}
                  </div>
                )}

                {Array.isArray(aiResult.passportResults) && aiResult.passportResults.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pasaport OCR</p>
                    <div className="mt-2 space-y-2">
                      {aiResult.passportResults.map((item: any) => (
                        <div key={item.fileName} className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-100">{item.fileName}</span>
                            <span className={item.success ? 'text-emerald-300' : 'text-rose-300'}>
                              {item.success ? 'okundu' : 'okunamadı'}
                            </span>
                          </div>
                          {item.passenger && (
                            <p className="mt-1 text-slate-400">
                              {item.passenger.firstName} {item.passenger.lastName} · {item.passenger.tcPassportNo} · {item.passenger.nationalityCode}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.uetdsError && (
                  <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                    {typeof aiResult.uetdsError === 'string'
                      ? aiResult.uetdsError
                      : aiResult.uetdsError?.details || aiResult.uetdsError?.message || 'UETDS gönderimi başarısız'}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      {pdfUrl && pdfTrip && (
        <div className="fixed inset-0 z-50 theme-overlay-strong backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card theme-modal w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 theme-divider-bottom">
              <div>
                <p className="text-sm theme-heading">UETDS PDF Önizleme</p>
                <p className="text-xs theme-text-soft">Sefer {pdfTrip.firmTripNumber || pdfTrip.vehiclePlate}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPdfInNewTab}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Eye size={16} />
                  Yeni sekmede aç
                </button>
                <button
                  type="button"
                  onClick={handleClosePdfViewer}
                  className="btn-danger flex items-center gap-2"
                >
                  <X size={16} />
                  Kapat
                </button>
              </div>
            </div>
            <div className="px-4 py-2 theme-divider-bottom theme-panel-soft flex flex-wrap items-center justify-between gap-2 text-xs theme-text-soft">
              <span>Sefer PDF'i yüklendi. Gerekirse yeni sekmede açabilirsiniz.</span>
              <span className="font-mono theme-code">Ref: {pdfTrip.uetdsSeferRefNo || '—'}</span>
            </div>
            <iframe
              src={pdfUrl}
              title="UETDS PDF"
              className="w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}

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
                  <div key={trip.id} className="mobile-trip-card text-left">
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
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {canSendDriverWhatsapp(trip) && (
                        <button
                          type="button"
                          onClick={() => openDriverWhatsApp(trip)}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 dark:text-emerald-200"
                        >
                          <MessageCircle size={16} />
                          WhatsApp'tan gönder
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenTripPdf(trip)}
                        disabled={pdfLoadingTripId === trip.id}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pdfLoadingTripId === trip.id ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                        {pdfLoadingTripId === trip.id ? 'PDF açılıyor' : 'Sefer gör'}
                      </button>
                    </div>
                  </div>
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
                          <div className="flex items-center justify-end gap-2">
                            {canSendDriverWhatsapp(trip) && (
                              <button
                                type="button"
                                title="Şoföre WhatsApp'tan gönder"
                                aria-label="Şoföre WhatsApp'tan gönder"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDriverWhatsApp(trip);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 dark:text-emerald-200"
                              >
                                <MessageCircle size={14} />
                                WhatsApp
                              </button>
                            )}
                            <button
                              type="button"
                              title="Seferi görüntüle"
                              aria-label="Seferi görüntüle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTripPdf(trip);
                              }}
                              disabled={pdfLoadingTripId === trip.id}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {pdfLoadingTripId === trip.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                              {pdfLoadingTripId === trip.id ? 'Açılıyor' : 'Sefer gör'}
                            </button>
                          </div>
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
            <h2 className="text-xl theme-heading text-white mb-5 flex items-center gap-2">
              <Plus size={20} className="text-emerald-400" />
              Yeni Sefer Oluştur
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-muted text-sm">
                    Seferde Kullanılacak Şoför
                  </label>
                  <div className="flex gap-2">
                    <select
                      title="Seferde kullanılacak şoför"
                      aria-label="Seferde kullanılacak şoför"
                      value={form.selectedDriverId}
                      onChange={(e) =>
                        handleDriverSelect(e.target.value, vehicles, drivers, form, setForm)
                      }
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
                  <p className={TRIPS_HELPER_TEXT_CLASS}>
                    Araç için varsayılan şoför tanımlıysa otomatik gelir; isterseniz değiştirebilirsiniz.
                  </p>
                </div>
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
                    <div className="mt-2 rounded-xl theme-note px-3 py-2 text-xs text-slate-100 dark:text-slate-300">
                      Önerilen şoför: <span className="theme-text-strong">{getDriverLabel(suggestedDriver)}</span>
                    </div>
                  )}
                  <p className={TRIPS_HELPER_TEXT_CLASS}>
                    Şoför seçildiğinde plaka bilgisi varsa araç alanı da otomatik dolar.
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
                      value={originSelectionState.selectionLabel || form.originPlace}
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
                      value={destSelectionState.selectionLabel || form.destPlace}
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
