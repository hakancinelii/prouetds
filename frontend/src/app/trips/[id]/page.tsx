'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tripsApi, driversApi } from '@/lib/api';
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
} from 'lucide-react';

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
  const [selectedPersonnelType, setSelectedPersonnelType] = useState(0);
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
    try {
      await tripsApi.addPersonnel(tripId, buildPersonPayload(driver));
      toast.success(`${getPersonnelTypeLabel(selectedPersonnelType)} eklendi`);
      setShowAddPersonnel(false);
      fetchTrip();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Personel eklenemedi');
    }
  };

  const handleAddPersonnel = addPersonnel;

  const selectedGroup = trip?.groups?.find((g: any) => g.id === selectedGroupId);
  void selectedGroup;

  const getSelectedGroupSummary = () => {
    if (!selectedGroup) return 'Grup seçilmedi';
    return `${selectedGroup.groupName} / ${selectedGroup.originPlace} → ${selectedGroup.destPlace}`;
  };

  void getSelectedGroupSummary;

  const canSendToUetds = Boolean(trip?.personnel?.length) && Boolean(totalPassengers) && Boolean(hasGroups);

  // File upload refs
  const [uploading, setUploading] = useState(false);

  // Add passenger form
  const [showAddPassenger, setShowAddPassenger] = useState(false);
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

  const handleDownloadPdf = async () => {
    try {
      const res = await tripsApi.getPdf(tripId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sefer-${tripId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('PDF indirilemedi');
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
      toast.error('İptal başarısız');
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
      <div className="p-8 text-center text-slate-400">Sefer bulunamadı</div>
    );
  }

  const statusInfo = getStatusInfo(trip.status);
  const totalPassengers =
    trip.groups?.reduce(
      (sum: number, g: any) => sum + (g.passengers?.length || 0),
      0,
    ) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Sefer: {trip.firmTripNumber || trip.vehiclePlate}
              <span className={statusInfo.class}>{statusInfo.label}</span>
            </h1>
            <p className="text-slate-400 mt-1">
              {trip.departureDate} {trip.departureTime} → {trip.endDate}{' '}
              {trip.endTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(trip.status === 'draft' || trip.status === 'error') && (
            <button
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
            <>
              <button
                onClick={handleDownloadPdf}
                className="btn-secondary flex items-center gap-2"
              >
                <FileDown size={16} />
                PDF İndir
              </button>
              <button
                onClick={handleCancel}
                className="btn-danger flex items-center gap-2"
              >
                <XCircle size={16} />
                İptal Et
              </button>
            </>
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

      {/* Trip Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Plaka</p>
          <p className="text-lg font-bold text-white mt-1 font-mono">
            {trip.vehiclePlate}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Toplam Yolcu
          </p>
          <p className="text-lg font-bold text-white mt-1">{totalPassengers}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            UETDS Referans
          </p>
          <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">
            {trip.uetdsSeferRefNo || 'Henüz yok'}
          </p>
        </div>
      </div>

      {/* Personnel Section */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-blue-400" />
            Personel / Şoförler ({trip.personnel?.length || 0})
          </h2>
          {trip.status !== 'sent' && trip.status !== 'cancelled' && (
            <button
              onClick={openPersonnelModal}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Plus size={14} />
              Personel Ekle
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
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
                    <td className="px-5 py-3 text-sm font-medium text-white">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300 font-mono">
                      {p.tcPassportNo}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300">
                      {getPersonnelTypeLabel(p.personnelType)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300">
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
                onClick={() => setShowAddPassenger(true)}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <UserPlus size={14} />
                Manuel Ekle
              </button>
              <button
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
                    <td className="px-5 py-3 text-sm font-medium text-white">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300 font-mono">
                      {p.tcPassportNo}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300">
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
                onClick={handleParseText}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                Parse Et ve Ekle
              </button>
              <button
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
                    key={d.id}
                    onClick={() => handleAddPersonnel(d)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 transition group"
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium text-white group-hover:text-emerald-400">
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
