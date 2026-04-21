'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tripsApi, driversApi } from '@/lib/api';
import { MERNIS_LOCATIONS, getProvinceByCode } from '@/lib/mernis-locations';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Send,
  FileDown,
  Users,
  Plus,
  UserPlus,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clipboard,
  Trash2,
  UploadCloud,
  ScanFace,
  Eye,
  ExternalLink,
  ShieldCheck,
  Pencil,
} from 'lucide-react';

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

const getEditTripForm = (trip: any) => ({
  vehiclePlate: trip?.vehiclePlate || '',
  departureDate: trip?.departureDate || '',
  departureTime: trip?.departureTime || '',
  endDate: trip?.endDate || '',
  endTime: trip?.endTime || '',
  description: trip?.description || 'İstanbul içi Transfer',
  originIlCode: trip?.originIlCode || 34,
  originSelection: trip?.originIlceCode ? `district:${trip.originIlceCode}` : '',
  originIlceCode: trip?.originIlceCode ? String(trip.originIlceCode) : '',
  originPlace: trip?.originPlace || '',
  destIlCode: trip?.destIlCode || 34,
  destSelection: trip?.destIlceCode ? `district:${trip.destIlceCode}` : '',
  destIlceCode: trip?.destIlceCode ? String(trip.destIlceCode) : '',
  destPlace: trip?.destPlace || '',
});

const getTripEditabilityNote = (status: string) =>
  status === 'sent'
    ? 'Bu sefer UETDS’ye gönderildiği için doğrudan düzenlenemez.'
    : status === 'cancelled'
      ? 'İptal edilmiş seferlerde yalnızca geçmiş kayıt görüntülenir.'
      : 'Sefer bilgilerini bu ekranda güncelleyebilirsiniz.';

const getTripEditabilityTone = (status: string) =>
  status === 'sent'
    ? 'theme-callout-warning'
    : status === 'cancelled'
      ? 'theme-callout-neutral'
      : 'theme-callout-info';

const DEFAULT_TRIP_DESCRIPTION = 'İstanbul içi Transfer';

const AIRPORT_OPTIONS = [
  { value: 'airport:ist', label: 'İstanbul Havalimanı', districtCode: '2048', place: 'İstanbul Havalimanı' },
  { value: 'airport:saw', label: 'Sabiha Gökçen Havalimanı', districtCode: '1835', place: 'Sabiha Gökçen Havalimanı' },
];

const getDistrictSelectOptions = (
  provinceCode: number,
  provinceName: string,
  districts: Array<{ code: number; name: string }>,
) => {
  const baseOptions = districts.map((district) => ({
    value: `district:${district.code}`,
    label: `${district.name} (${district.code})`,
    districtCode: String(district.code),
    place: `${district.name}/${provinceName}`,
  }));

  if (provinceCode !== 34) {
    return baseOptions;
  }

  return [...AIRPORT_OPTIONS, ...baseOptions];
};

const getPlaceFromDistrict = (
  districtCode: string,
  province: { name: string } | undefined,
  districts: Array<{ code: number; name: string }>,
) => {
  const selected = districts.find((district) => String(district.code) === districtCode);
  return selected ? `${selected.name}/${province?.name || ''}` : '';
};

const getTripFormPayload = (
  form: any,
  originOptions: Array<{ value: string; districtCode: string; place: string }>,
  destOptions: Array<{ value: string; districtCode: string; place: string }>,
) => {
  const originOption = originOptions.find((option) => option.value === form.originSelection);
  const destOption = destOptions.find((option) => option.value === form.destSelection);

  return {
    vehiclePlate: form.vehiclePlate.trim().toUpperCase().replace(/\s+/g, ''),
    departureDate: form.departureDate,
    departureTime: form.departureTime,
    endDate: form.endDate,
    endTime: form.endTime,
    description: form.description.trim(),
    originIlCode: Number(form.originIlCode),
    originIlceCode: originOption?.districtCode ? Number(originOption.districtCode) : undefined,
    originPlace: (originOption?.place || form.originPlace).trim(),
    destIlCode: Number(form.destIlCode),
    destIlceCode: destOption?.districtCode ? Number(destOption.districtCode) : undefined,
    destPlace: (destOption?.place || form.destPlace).trim(),
  };
};

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTextParser, setShowTextParser] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedResults, setParsedResults] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [showAddPersonnel, setShowAddPersonnel] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [addingPersonnelId, setAddingPersonnelId] = useState<string | null>(null);
  const [selectedPersonnelType, setSelectedPersonnelType] = useState(0);
  const [editTripForm, setEditTripForm] = useState(() => getEditTripForm(null));
  const [editOriginDistricts, setEditOriginDistricts] = useState<Array<{ code: number; name: string }>>([]);
  const [editDestDistricts, setEditDestDistricts] = useState<Array<{ code: number; name: string }>>([]);
  const canEditTrip = trip?.status !== 'sent' && trip?.status !== 'cancelled';
  const tripEditabilityNote = getTripEditabilityNote(trip?.status || 'draft');
  const tripEditabilityTone = getTripEditabilityTone(trip?.status || 'draft');
  const editOriginProvince = getProvinceByCode(Number(editTripForm.originIlCode));
  const editDestProvince = getProvinceByCode(Number(editTripForm.destIlCode));
  const editOriginDistrictOptions = getDistrictSelectOptions(
    Number(editTripForm.originIlCode),
    editOriginProvince?.name || '',
    editOriginDistricts,
  );
  const editDestDistrictOptions = getDistrictSelectOptions(
    Number(editTripForm.destIlCode),
    editDestProvince?.name || '',
    editDestDistricts,
  );

  const handleEditDistrictSelection = (
    field: 'originSelection' | 'destSelection',
    value: string,
    options: Array<{ value: string; districtCode: string; place: string }>,
  ) => {
    const selected = options.find((option) => option.value === value);

    if (field === 'originSelection') {
      setEditTripForm({
        ...editTripForm,
        originSelection: value,
        originIlceCode: selected?.districtCode || '',
        originPlace: selected?.place || '',
      });
      return;
    }

    setEditTripForm({
      ...editTripForm,
      destSelection: value,
      destIlceCode: selected?.districtCode || '',
      destPlace: selected?.place || '',
    });
  };
  const personnelTypeOptions = [
    { value: 0, label: 'Şoför' },
    { value: 1, label: 'Şoför Yardımcısı' },
    { value: 2, label: 'Host' },
    { value: 3, label: 'Hostes' },
    { value: 4, label: 'Diğer' },
    { value: 5, label: 'Rehber' },
  ];

  const getPersonnelTypeLabel = (type: number) =>
    personnelTypeOptions.find((item) => item.value === type)?.label || 'Diğer';

  const openPersonnelModal = () => {
    setSelectedPersonnelType(0);
    setShowAddPersonnel(true);
  };

  const openGroupCreateModal = () => {
    toast('Bir sonraki adımda gerçek grup oluşturma formunu ekleyeceğim. Şimdilik mevcut grup ile devam ediyoruz.');
  };

  const startPassengerSyncDebug = () => {
    toast('Yolcu gönderimi debug adımını bir sonraki iterasyonda açacağız.');
  };

  const importGovernmentTripPlaceholder = () => {
    toast('Kamu sistemindeki seferleri içe alma akışı ayrı senkronizasyon işi olarak planlandı.');
  };

  const getDriverRoleHint = () => {
    if (selectedPersonnelType === 5) return 'Rehber olarak eklenecek';
    if (selectedPersonnelType === 1) return 'Şoför yardımcısı olarak eklenecek';
    return 'Seçilen rol UETDS turKodu ile gönderilecek';
  };

  const buildPersonPayload = (driver: any) => ({
    driverId: driver.id,
    firstName: driver.firstName,
    lastName: driver.lastName,
    tcPassportNo: driver.tcKimlikNo,
    nationalityCode: driver.nationalityCode || 'TR',
    gender: driver.gender || 'E',
    phone: driver.phone,
    personnelType: selectedPersonnelType,
  });

  const getGroupLabel = (group: any) => {
    const fee = group?.groupFee ? `₺${group.groupFee}` : 'Ücret girilmemiş';
    return `${group.groupName} · ${fee}`;
  };

  const getPassengerDebugHint = () => {
    return 'Yolcular seçili grup içine gönderilir; UETDS debug logu backend tarafında aktif.';
  };

  const hasGroups = Boolean(trip?.groups?.length);
  const canOpenPassengerTools = hasGroups && selectedGroupId;
  const tripActionNote = 'Devlet ekranındaki sırayı yakalamak için grup → personel → yolcu mantığına gidiyoruz.';

  const getTripSectionTitle = () => 'Sefer Çalışma Alanı';

  const noop = () => {};

  void openGroupCreateModal;
  void startPassengerSyncDebug;
  void importGovernmentTripPlaceholder;
  void getDriverRoleHint;
  void getGroupLabel;
  void getPassengerDebugHint;
  void tripActionNote;
  void getTripSectionTitle;
  void noop;

  const addPersonnel = async (driver: any) => {
    if (addingPersonnelId) return;

    setAddingPersonnelId(driver.id);
    try {
      await tripsApi.addPersonnel(tripId, buildPersonPayload(driver));
      toast.success(`${getPersonnelTypeLabel(selectedPersonnelType)} eklendi`);
      setShowAddPersonnel(false);
      fetchTrip();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Personel eklenemedi');
    } finally {
      setAddingPersonnelId(null);
    }
  };

  const handleAddPersonnel = addPersonnel;

  const selectedGroup = trip?.groups?.find((g: any) => g.id === selectedGroupId);
  void selectedGroup;

  const getSelectedGroupSummary = () => {
    if (!selectedGroup) return 'Grup seçilmedi';
    return `${selectedGroup.groupName} / ${selectedGroup.originPlace} → ${selectedGroup.destPlace}`;
  };

  const getQuickFlowChecklist = (tripData: any, passengerCount: number) => [
    {
      title: '1. Seferi oluştur',
      done: Boolean(tripData?.id),
      detail: 'Plaka, saat, rota ve açıklamayı tek formdan tamamlayın.',
    },
    {
      title: '2. Şoför / personel ekle',
      done: Boolean(tripData?.personnel?.length),
      detail: 'En az bir şoför eklenmeden UETDS gönderimi açılmıyor.',
    },
    {
      title: '3. Yolcuları ekle',
      done: passengerCount > 0,
      detail: 'Manuel, metin, Excel veya OCR ile aynı ekrandan ekleyin.',
    },
    {
      title: '4. UETDS’ye gönder',
      done: tripData?.status === 'sent',
      detail: 'Hazır olduğunda resmi gönderimi tamamlayın.',
    },
  ];

  const getQuickFlowTone = (done: boolean) =>
    done
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'theme-callout-neutral';

  void getSelectedGroupSummary;

  // File upload refs
  const [uploading, setUploading] = useState(false);

  // Add passenger form
  const [showAddPassenger, setShowAddPassenger] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [passengerForm, setPassengerForm] = useState({
    firstName: '',
    lastName: '',
    tcPassportNo: '',
    nationalityCode: 'TR',
    gender: '',
    phone: '',
  });

  const fetchTrip = async () => {
    try {
      const res = await tripsApi.get(tripId);
      setTrip(res.data);
      setEditTripForm(getEditTripForm(res.data));
      if (res.data.groups?.length > 0 && !selectedGroupId) {
        setSelectedGroupId(res.data.groups[0].id);
      }
    } catch {
      toast.error('Sefer yüklenemedi');
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await driversApi.list();
      setDrivers(res.data);
    } catch { }
  };


  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroupId) return;

    setUploading(true);
    const toastId = toast.loading('Excel/CSV işleniyor...');
    try {
      const res = await tripsApi.parseExcel(selectedGroupId, file);
      toast.success(`${res.data.totalParsed} satırdan ${res.data.data.length} yolcu eklendi`, { id: toastId });
      fetchTrip();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Dosya okunamadı', { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroupId) return;

    setUploading(true);
    const toastId = toast.loading('Pasaport OCR ile taranıyor...');
    try {
      const res = await tripsApi.parsePassport(selectedGroupId, file);
      toast.success('Yolcu OCR ile eklendi', { id: toastId });
      fetchTrip();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Pasaport okunamadı', { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchTrip(), fetchDrivers()]);
      setLoading(false);
    };
    init();
  }, [tripId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    const originProvince = getProvinceByCode(Number(editTripForm.originIlCode));
    const destProvince = getProvinceByCode(Number(editTripForm.destIlCode));
    setEditOriginDistricts(
      sortDistrictsForTripFlow(
        Number(editTripForm.originIlCode),
        originProvince?.districts || [],
      ),
    );
    setEditDestDistricts(
      sortDistrictsForTripFlow(
        Number(editTripForm.destIlCode),
        destProvince?.districts || [],
      ),
    );
  }, [editTripForm.originIlCode, editTripForm.destIlCode]);

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

  const fetchPdfBlob = async (download = false) => {
    const res = await tripsApi.getPdf(tripId, download ? { download: true } : undefined);
    const contentType = res.headers['content-type'];
    if (contentType && !contentType.includes('application/pdf')) {
      throw new Error(await parsePdfError(res.data));
    }
    return res.data as Blob;
  };

  const handleSendToUetds = async () => {
    if (!confirm('Sefer UETDS sistemine gönderilecek. Emin misiniz?')) return;
    setSending(true);
    try {
      const res = await tripsApi.sendToUetds(tripId);
      const passengerSummary = Array.isArray(res.data.passengerSummary)
        ? res.data.passengerSummary
            .map((item: any) => `${item.groupName}: ${item.successCount}/${item.expected}`)
            .join(' · ')
        : '';
      toast.success(
        passengerSummary
          ? `UETDS'ye gönderildi! Ref: ${res.data.uetdsSeferRefNo} · ${passengerSummary}`
          : `UETDS'ye gönderildi! Ref: ${res.data.uetdsSeferRefNo}`,
      );
      // Frontend deploy trigger for trip detail success summary (v2)
      fetchTrip();
    } catch (err: any) {
      toast.error(
        err.response?.data?.details || err.response?.data?.message || 'Gönderim başarısız',
      );
    }
    setSending(false);
  };

  const triggerPdfDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sefer-${tripId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleOpenPdfInNewTab = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenPdf = async () => {
    setPdfLoading(true);
    try {
      const pdfBlob = await fetchPdfBlob();
      replacePdfUrl(window.URL.createObjectURL(pdfBlob));
      setShowPdfViewer(true);
    } catch (err: any) {
      toast.error(err.message || 'PDF görüntülenemedi');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePdfViewer = () => {
    setShowPdfViewer(false);
    replacePdfUrl(null);
  };

  const handleDownloadPdf = async () => {
    try {
      if (pdfUrl) {
        triggerPdfDownload(pdfUrl);
        return;
      }

      const pdfBlob = await fetchPdfBlob(true);
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      triggerPdfDownload(downloadUrl);
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err: any) {
      toast.error(err.message || 'PDF indirilemedi');
    }
  };

  const handleParseText = async () => {
    if (!pasteText.trim() || !selectedGroupId) return;
    try {
      const res = await tripsApi.parseText(selectedGroupId, pasteText);
      setParsedResults(res.data);
      toast.success(`${res.data.totalSaved} yolcu eklendi`);
      fetchTrip();
    } catch (err: any) {
      toast.error('Yolcu parse edilemedi');
    }
  };

  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    try {
      await tripsApi.addPassenger(selectedGroupId, passengerForm);
      toast.success('Yolcu eklendi');
      setShowAddPassenger(false);
      setPassengerForm({
        firstName: '',
        lastName: '',
        tcPassportNo: '',
        nationalityCode: 'TR',
        gender: '',
        phone: '',
      });
      fetchTrip();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Yolcu eklenemedi');
    }
  };

  const handleCancel = async () => {
    const reason = prompt('İptal nedeni:');
    if (!reason) return;
    try {
      await tripsApi.cancel(tripId, reason);
      toast.success("UETDS'de iptal edildi");
      fetchTrip();
    } catch (err: any) {
      const rawMessage = err.response?.data?.message || err.response?.data?.details || 'İptal başarısız';
      const readableMessage = rawMessage.includes('Servis kullanımı yetkisi için servis sağlayıcısı kurum ile görüşünüz')
        ? 'Bu UETDS hesabında sefer iptal servisi yetkisi tanımlı değil. Kurum yetkisi açılmadan iptal gönderimi yapılamaz.'
        : rawMessage;
      toast.error(readableMessage);
    }
  };

  const handleOpenEditTrip = () => {
    setEditTripForm(getEditTripForm(trip));
    setShowEditTrip(true);
  };

  const handleCloseEditTrip = () => {
    setShowEditTrip(false);
    setEditTripForm(getEditTripForm(trip));
  };

  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTrip(true);
    try {
      await tripsApi.update(
        tripId,
        getTripFormPayload(editTripForm, editOriginDistrictOptions, editDestDistrictOptions),
      );
      toast.success('Sefer bilgileri güncellendi');
      setShowEditTrip(false);
      fetchTrip();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sefer güncellenemedi');
    } finally {
      setSavingTrip(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; class: string; icon: any }> = {
      draft: { label: 'Taslak', class: 'badge badge-draft', icon: FileText },
      ready: { label: 'Hazır', class: 'badge badge-ready', icon: CheckCircle2 },
      sending: { label: 'Gönderiliyor', class: 'badge badge-sending', icon: Loader2 },
      sent: { label: 'Gönderildi', class: 'badge badge-sent', icon: CheckCircle2 },
      error: { label: 'Hata', class: 'badge badge-error', icon: AlertCircle },
      cancelled: { label: 'İptal', class: 'badge badge-cancelled', icon: XCircle },
    };
    return map[status] || map.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-8 text-center theme-empty">Sefer bulunamadı</div>
    );
  }

  const statusInfo = getStatusInfo(trip.status);
  const totalPassengers =
    trip.groups?.reduce(
      (sum: number, g: any) => sum + (g.passengers?.length || 0),
      0,
    ) || 0;
  const canSendToUetds = Boolean(trip?.personnel?.length) && Boolean(totalPassengers) && Boolean(hasGroups);
  const quickFlowChecklist = getQuickFlowChecklist(trip, totalPassengers);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            title="Listeye geri dön"
            aria-label="Listeye geri dön"
            onClick={() => router.back()}
            className="theme-text-soft theme-muted-hover transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl theme-heading flex items-center gap-3">
              Sefer: {trip.firmTripNumber || trip.vehiclePlate}
              <span className={statusInfo.class}>{statusInfo.label}</span>
            </h1>
            <p className="theme-text-soft mt-1">
              {trip.departureDate} {trip.departureTime} → {trip.endDate}{' '}
              {trip.endTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(trip.status === 'draft' || trip.status === 'error') && (
            <button
              type="button"
              onClick={handleSendToUetds}
              disabled={sending}
              className="btn-primary flex items-center gap-2"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              UETDS&apos;ye Gönder
            </button>
          )}
          {trip.status === 'sent' && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn-danger flex items-center gap-2"
            >
              <XCircle size={16} />
              İptal Et
            </button>
          )}
        </div>
      </div>

      {/* UETDS Error Message */}
      {trip.status === 'error' && trip.uetdsErrorMessage && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">UETDS Hata</p>
              <p className="text-sm text-red-400 mt-1">
                {trip.uetdsErrorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {showPdfViewer && pdfUrl && (
        <div className="fixed inset-0 z-50 theme-overlay-strong backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card theme-modal w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 theme-divider-bottom">
              <div>
                <p className="text-sm theme-heading">UETDS PDF Önizleme</p>
                <p className="text-xs theme-text-soft">Sefer {trip.firmTripNumber || trip.vehiclePlate}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPdfInNewTab}
                  disabled={!pdfUrl}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink size={16} />
                  Yeni sekmede aç
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="btn-secondary flex items-center gap-2"
                >
                  <FileDown size={16} />
                  İndir
                </button>
                <button
                  type="button"
                  onClick={handleClosePdfViewer}
                  className="btn-danger flex items-center gap-2"
                >
                  <XCircle size={16} />
                  Kapat
                </button>
              </div>
            </div>
            <div className="px-4 py-2 theme-divider-bottom theme-panel-soft flex flex-wrap items-center justify-between gap-2 text-xs theme-text-soft">
              <span>Belge yüklendi. Gerekirse yeni sekmede açarak tarayıcının yerel PDF aracını kullanabilirsiniz.</span>
              <span className="font-mono theme-code">Ref: {trip.uetdsSeferRefNo || '—'}</span>
            </div>
            <iframe
              src={pdfUrl}
              title="UETDS PDF"
              className="w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}

      <div className={`glass-card p-5 ${tripEditabilityTone}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold theme-text-strong">Sefer bilgileri</p>
            <p className="text-xs mt-1 opacity-90">{tripEditabilityNote}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEditTrip && (
              <button
                type="button"
                onClick={handleOpenEditTrip}
                className="btn-secondary flex items-center gap-2"
              >
                <Pencil size={16} />
                Seferi Düzenle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trip Info Cards */}
      <div className="mobile-trip-detail-grid">
        <div className="glass-card p-5">
          <p className="text-xs theme-text-soft uppercase tracking-wider">Plaka</p>
          <p className="text-lg font-bold theme-text-strong mt-1 font-mono">
            {trip.vehiclePlate}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs theme-text-soft uppercase tracking-wider">
            Toplam Yolcu
          </p>
          <p className="text-lg font-bold theme-text-strong mt-1">{totalPassengers}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs theme-text-soft uppercase tracking-wider">
            UETDS Referans
          </p>
          <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">
            {trip.uetdsSeferRefNo || 'Henüz yok'}
          </p>
        </div>
      </div>

      <div className="route-box rounded-2xl p-5 space-y-5 border theme-panel-dark theme-surface-on-dark">
        <div>
          <p className="route-box-label text-xs uppercase tracking-wider">Rota Özeti</p>
          <p className="route-box-value mt-2 text-sm">Kalkış ve varış noktalarını tek karttan görüntüleyin ve haritada açın.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="theme-panel-dark theme-surface-on-dark rounded-xl p-4">
            <p className="route-box-label text-xs uppercase tracking-wider">Kalkış Noktası</p>
            <p className="route-box-value mt-2 text-base font-semibold">{trip.originPlace || 'Kalkış bilgisi yok'}</p>
          </div>
          <div className="theme-panel-dark theme-surface-on-dark rounded-xl p-4">
            <p className="route-box-label text-xs uppercase tracking-wider">Varış Noktası</p>
            <p className="route-box-value mt-2 text-base font-semibold">{trip.destPlace || 'Varış bilgisi yok'}</p>
          </div>
        </div>
        <div className="theme-route-actions">
          <button
            type="button"
            onClick={() => {
              const origin = encodeURIComponent(trip.originPlace || '');
              const destination = encodeURIComponent(trip.destPlace || '');
              const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            disabled={!trip.originPlace || !trip.destPlace}
            className="theme-map-button rounded-xl px-4 py-3 theme-map-route-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink size={16} /> Yol Tarifi Al
          </button>
        </div>
      </div>

      {trip.status === 'sent' && (
        <div className="glass-card p-5 border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_45%),rgba(16,185,129,0.05)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck size={18} />
                <span className="text-sm font-semibold">UETDS resmi çıktısı hazır</span>
              </div>
              <div>
                <p className="text-sm theme-text-strong">
                  Belgeyi uygulama içinde görüntüleyebilir veya doğrudan indirebilirsiniz.
                </p>
                <p className="text-xs theme-text-soft mt-1">
                  Referans: <span className="font-mono theme-code">{trip.uetdsSeferRefNo || 'Henüz yok'}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={handleOpenPdf}
                disabled={pdfLoading}
                className="btn-secondary flex items-center gap-2"
              >
                {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                {pdfLoading ? 'Belge hazırlanıyor...' : 'PDF Görüntüle'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="btn-secondary flex items-center gap-2"
              >
                <FileDown size={16} />
                PDF İndir
              </button>
            </div>
          </div>
        </div>
      )}

      {trip.status !== 'sent' && trip.status !== 'cancelled' && (
        <div className="glass-card p-5 theme-note-strong">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold theme-text-strong">Hızlı UETDS akışı</p>
              <p className="text-xs theme-text-soft mt-1">
                Aynı ekranda seferi tamamlayıp şoför, yolcu ve gönderim adımlarını sırayla bitirin.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Amaç: manuel UETDS gönderim adımlarına en yakın hızlı operasyon akışı.
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {quickFlowChecklist.map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl border px-4 py-3 ${getQuickFlowTone(item.done)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.done ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                </div>
                <p className="mt-2 text-xs leading-5 opacity-80">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personnel Section */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-blue-400" />
            Personel / Şoförler ({trip.personnel?.length || 0})
          </h2>
          {trip.status !== 'sent' && trip.status !== 'cancelled' && (
            <button
              type="button"
              onClick={openPersonnelModal}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Plus size={14} />
              Personel Ekle
            </button>
          )}
        </div>
        <div className="theme-mobile-cards-only p-4">
          {trip.personnel?.length > 0 ? (
            trip.personnel.map((person: any) => (
              <div key={person.id} className="theme-mobile-card-shell rounded-2xl p-4">
                <p className="text-base font-semibold theme-card-strong">{person.firstName} {person.lastName}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="theme-card-copy-soft">TC Kimlik</p>
                    <p className="mt-1 theme-card-strong font-mono">{person.tcPassportNo}</p>
                  </div>
                  <div>
                    <p className="theme-card-copy-soft">Tip</p>
                    <p className="mt-1 theme-card-strong">{getPersonnelTypeLabel(person.personnelType)}</p>
                  </div>
                  <div>
                    <p className="theme-card-copy-soft">Telefon</p>
                    <p className="mt-1 theme-card-strong">{person.phone || '-'}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="theme-mobile-card-shell rounded-2xl p-6 text-center theme-empty">
              Henüz personel eklenmemiş (Şoför eklemeden UETDS'ye gönderemezsiniz)
            </div>
          )}
        </div>
        <div className="theme-desktop-tables-only overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                <th className="px-5 py-3">Ad Soyad</th>
                <th className="px-5 py-3">TC Kimlik</th>
                <th className="px-5 py-3">Tip</th>
                <th className="px-5 py-3">Telefon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {trip.personnel?.length > 0 ? (
                trip.personnel.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-700/20 transition">
                    <td className="px-5 py-3 text-sm font-medium theme-text-strong">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-5 py-3 text-sm theme-table-code font-mono">
                      {p.tcPassportNo}
                    </td>
                    <td className="px-5 py-3 text-sm theme-table-cell">
                      {getPersonnelTypeLabel(p.personnelType)}
                    </td>
                    <td className="px-5 py-3 text-sm theme-table-cell">
                      {p.phone || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    Henüz personel eklenmemiş (Şoför eklemeden UETDS'ye gönderemezsiniz)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Passengers Section */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-emerald-400" />
            Yolcular ({totalPassengers})
          </h2>
          {trip.status !== 'sent' && trip.status !== 'cancelled' && (
            <div className="flex gap-2">
              <button
                type="button"
                title="Manuel yolcu ekle"
                onClick={() => setShowAddPassenger(true)}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <UserPlus size={14} />
                Manuel Ekle
              </button>
              <button
                type="button"
                onClick={() => setShowTextParser(true)}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <Clipboard size={14} />
                Metin
              </button>
              <label className={`btn-secondary text-sm flex items-center gap-1.5 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <UploadCloud size={14} />
                Excel
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} disabled={uploading} />
              </label>
              <label className={`btn-secondary text-sm flex items-center gap-1.5 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <ScanFace size={14} />
                OCR
                <input type="file" accept="image/*" className="hidden" onChange={handlePassportUpload} disabled={uploading} />
              </label>
            </div>
          )}
        </div>

        {/* Group Selection */}
        {trip.groups?.length > 0 && (
          <div className="px-5 pt-4 flex gap-2 flex-wrap">
            {trip.groups.map((g: any) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${selectedGroupId === g.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-700/30 text-slate-400 border border-slate-600/30 hover:bg-slate-700/50'
                  }`}
              >
                {g.groupName} ({g.passengers?.length || 0})
              </button>
            ))}
          </div>
        )}

        {/* Passenger List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Ad Soyad</th>
                <th className="px-5 py-3">TC/Pasaport</th>
                <th className="px-5 py-3">Uyruk</th>
                <th className="px-5 py-3">Kaynak</th>
                <th className="px-5 py-3">UETDS Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {trip.groups
                ?.find((g: any) => g.id === selectedGroupId)
                ?.passengers?.map((p: any, i: number) => (
                  <tr key={p.id} className="hover:bg-slate-700/20 transition">
                    <td className="px-5 py-3 text-sm text-slate-500">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium theme-text-strong">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-5 py-3 text-sm theme-table-code font-mono">
                      {p.tcPassportNo}
                    </td>
                    <td className="px-5 py-3 text-sm theme-table-cell">
                      {p.nationalityCode}
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge badge-draft text-[10px]">
                        {p.source || 'manual'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-400 font-mono">
                      {p.uetdsYolcuRefNo || '-'}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      {trip.groups?.length === 0
                        ? 'Önce bir yolcu grubu ekleyin'
                        : 'Bu grupta yolcu yok'}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Passenger Modal */}
      {showAddPassenger && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-slide-in">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-emerald-400" />
              Yolcu Ekle
            </h3>
            <form onSubmit={handleAddPassenger} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ad</label>
                  <input
                    aria-label="Yolcu adı"
                    value={passengerForm.firstName}
                    onChange={(e) =>
                      setPassengerForm({ ...passengerForm, firstName: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Soyad</label>
                  <input
                    aria-label="Yolcu soyadı"
                    value={passengerForm.lastName}
                    onChange={(e) =>
                      setPassengerForm({ ...passengerForm, lastName: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  TC Kimlik / Pasaport No
                </label>
                <input
                  aria-label="Yolcu TC kimlik veya pasaport numarası"
                  value={passengerForm.tcPassportNo}
                  onChange={(e) =>
                    setPassengerForm({ ...passengerForm, tcPassportNo: e.target.value })
                  }
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Uyruk</label>
                  <input
                    value={passengerForm.nationalityCode}
                    onChange={(e) =>
                      setPassengerForm({
                        ...passengerForm,
                        nationalityCode: e.target.value.toUpperCase(),
                      })
                    }
                    className="input-field"
                    placeholder="TR"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cinsiyet</label>
                  <select
                    aria-label="Yolcu cinsiyeti"
                    value={passengerForm.gender}
                    onChange={(e) =>
                      setPassengerForm({ ...passengerForm, gender: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="">Seçiniz</option>
                    <option value="E">Erkek</option>
                    <option value="K">Kadın</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPassenger(false)}
                  className="btn-secondary"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Text Parser Modal */}
      {showTextParser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl p-6 animate-slide-in">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clipboard size={18} className="text-emerald-400" />
              Yolcu Listesi Yapıştır
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              Her satıra bir yolcu gelecek şekilde isim, soyisim, TC/Pasaport ve
              uyruk bilgilerini yapıştırın.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="input-field font-mono text-sm"
              rows={8}
              placeholder={`Ahmet Yılmaz 12345678901 TR\nJohn Smith P12345678 GB\nMarie Dupont F98765432 FR`}
            />
            {parsedResults && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-300">
                  ✓ {parsedResults.totalSaved} yolcu eklendi (
                  {parsedResults.totalParsed} satır parse edildi)
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleParseText}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                Parse Et ve Ekle
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTextParser(false);
                  setParsedResults(null);
                  setPasteText('');
                }}
                className="btn-secondary"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-3xl p-6 animate-slide-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Pencil size={18} className="text-cyan-400" />
              Seferi Düzenle
            </h3>
            <form onSubmit={handleUpdateTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">Araç Plaka</label>
                  <input
                    value={editTripForm.vehiclePlate}
                    onChange={(e) =>
                      setEditTripForm({ ...editTripForm, vehiclePlate: e.target.value.toUpperCase() })
                    }
                    className="input-field"
                    placeholder="34ABC123"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Hareket Tarihi</label>
                  <input
                    type="date"
                    title="Hareket tarihi"
                    aria-label="Hareket tarihi"
                    value={editTripForm.departureDate}
                    onChange={(e) => setEditTripForm({ ...editTripForm, departureDate: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Hareket Saati</label>
                  <input
                    type="time"
                    title="Hareket saati"
                    aria-label="Hareket saati"
                    value={editTripForm.departureTime}
                    onChange={(e) => setEditTripForm({ ...editTripForm, departureTime: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    title="Bitiş tarihi"
                    aria-label="Bitiş tarihi"
                    value={editTripForm.endDate}
                    onChange={(e) => setEditTripForm({ ...editTripForm, endDate: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Bitiş Saati</label>
                  <input
                    type="time"
                    title="Bitiş saati"
                    aria-label="Bitiş saati"
                    value={editTripForm.endTime}
                    onChange={(e) => setEditTripForm({ ...editTripForm, endTime: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">Açıklama</label>
                  <textarea
                    title="Sefer açıklaması"
                    aria-label="Sefer açıklaması"
                    value={editTripForm.description}
                    onChange={(e) => setEditTripForm({ ...editTripForm, description: e.target.value })}
                    className="input-field"
                    rows={2}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-700/30 p-3 rounded-lg space-y-3">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Kalkış Noktası</span>
                  <select
                    title="Kalkış ili"
                    aria-label="Kalkış ili"
                    value={editTripForm.originIlCode}
                    onChange={(e) =>
                      setEditTripForm({
                        ...editTripForm,
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
                  <select
                    title="Kalkış ilçesi"
                    aria-label="Kalkış ilçesi"
                    value={editTripForm.originSelection || (editTripForm.originIlceCode ? `district:${editTripForm.originIlceCode}` : '')}
                    onChange={(e) =>
                      handleEditDistrictSelection('originSelection', e.target.value, editOriginDistrictOptions)
                    }
                    className="input-field py-1.5"
                    required
                  >
                    <option value="">İlçe seçiniz</option>
                    {editOriginDistrictOptions.map((district) => (
                      <option key={district.value} value={district.value}>
                        {district.label}
                      </option>
                    ))}
                  </select>
                  <input
                    title="Kalkış yeri"
                    aria-label="Kalkış yeri"
                    value={editTripForm.originPlace}
                    onChange={(e) => setEditTripForm({ ...editTripForm, originPlace: e.target.value })}
                    className="input-field py-1.5"
                    placeholder="İlçe adı / terminal / havalimanı"
                    required
                  />
                </div>

                <div className="bg-slate-700/30 p-3 rounded-lg space-y-3">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Varış Noktası</span>
                  <select
                    title="Varış ili"
                    aria-label="Varış ili"
                    value={editTripForm.destIlCode}
                    onChange={(e) =>
                      setEditTripForm({
                        ...editTripForm,
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
                  <select
                    title="Varış ilçesi"
                    aria-label="Varış ilçesi"
                    value={editTripForm.destSelection || (editTripForm.destIlceCode ? `district:${editTripForm.destIlceCode}` : '')}
                    onChange={(e) =>
                      handleEditDistrictSelection('destSelection', e.target.value, editDestDistrictOptions)
                    }
                    className="input-field py-1.5"
                    required
                  >
                    <option value="">İlçe seçiniz</option>
                    {editDestDistrictOptions.map((district) => (
                      <option key={district.value} value={district.value}>
                        {district.label}
                      </option>
                    ))}
                  </select>
                  <input
                    title="Varış yeri"
                    aria-label="Varış yeri"
                    value={editTripForm.destPlace}
                    onChange={(e) => setEditTripForm({ ...editTripForm, destPlace: e.target.value })}
                    className="input-field py-1.5"
                    placeholder="İlçe adı / terminal / havalimanı"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingTrip} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {savingTrip ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                  {savingTrip ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
                <button type="button" onClick={handleCloseEditTrip} className="btn-secondary">
                  Kapat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Personnel Modal */}
      {showAddPersonnel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-slide-in">
            <h3 className="text-lg font-bold mb-4">Personel Ekle</h3>
            <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 space-y-1">
              <p>Seçilen personel tipi devlete turKodu olarak gider.</p>
              <p>Şoför / Şoför Yardımcısı / Host / Hostes / Rehber türleri destekleniyor.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs text-slate-400 uppercase tracking-wider">Personel Türü</label>
                <select
                  title="Personel türü"
                  aria-label="Personel türü"
                  value={selectedPersonnelType}
                  onChange={(e) => setSelectedPersonnelType(Number(e.target.value))}
                  className="input-field"
                >
                  {personnelTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{getDriverRoleHint()}</p>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
              {drivers.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  Kayıtlı personel bulunamadı. Önce Şoförler sayfasından personel kaydı ekleyin.
                </div>
              ) : (
                drivers.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => handleAddPersonnel(d)}
                    disabled={addingPersonnelId !== null}
                    className="w-full flex items-center justify-between p-3 rounded-lg theme-card-soft hover:bg-[rgb(var(--surface-elevated-rgb))]/80 border theme-border transition group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium theme-text-strong group-hover:text-emerald-400">
                        {d.firstName} {d.lastName}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {d.tcKimlikNo}
                      </p>
                    </div>
                    <Plus size={16} className="text-slate-500 group-hover:text-emerald-400" />
                  </button>
                ))
              )}
              </div>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setShowAddPersonnel(false)}
                className="btn-secondary w-full"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
