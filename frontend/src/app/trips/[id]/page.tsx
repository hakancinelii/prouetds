'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tripsApi } from '@/lib/api';
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTextParser, setShowTextParser] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedResults, setParsedResults] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');

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
    setLoading(false);
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
    fetchTrip();
  }, [tripId]);

  const handleSendToUetds = async () => {
    if (!confirm('Sefer UETDS sistemine gönderilecek. Emin misiniz?')) return;
    setSending(true);
    try {
      const res = await tripsApi.sendToUetds(tripId);
      toast.success(`UETDS\'ye gönderildi! Ref: ${res.data.uetdsSeferRefNo}`);
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
    </div>
  );
}
