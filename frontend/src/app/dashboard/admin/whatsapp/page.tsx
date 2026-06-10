'use client';

import { useEffect, useRef, useState } from 'react';
import { whatsappApi } from '@/lib/api';
import {
  MessageCircle,
  CheckCircle2,
  QrCode,
  Power,
  Loader2,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsappAdminPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await whatsappApi.status();
      setInfo(res.data);
    } catch {
      /* ignore transient errors while polling */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await whatsappApi.connect();
      toast.success('Bağlantı başlatıldı, QR oluşturuluyor...');
      setTimeout(fetchStatus, 1500);
    } catch {
      toast.error('Bağlantı başlatılamadı');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await whatsappApi.disconnect();
      toast.success('Bağlantı kesildi');
      await fetchStatus();
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };

  const status: string = info?.status || 'UNKNOWN';
  const connected = status === 'CONNECTED';
  const qrPending = status === 'QR_PENDING' && info?.qr;

  const badge = () => {
    if (connected)
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30">
          <CheckCircle2 size={14} /> Bağlı
        </span>
      );
    if (qrPending)
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30">
          <QrCode size={14} /> QR Bekleniyor
        </span>
      );
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-500 ring-1 ring-slate-500/30">
        Bağlı Değil
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl theme-heading flex items-center gap-2">
            <MessageCircle size={24} className="text-emerald-500" />
            WhatsApp Bağlantısı
          </h1>
          <p className="theme-text-soft mt-1">
            Pro UETDS hattı — sefer PDF&apos;leri şoförlere bu numaradan gönderilir.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStatus}
          className="p-2.5 rounded-xl theme-text-soft hover:text-emerald-500 hover:bg-emerald-500/10 transition"
          title="Yenile"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone size={20} className="theme-text-soft" />
            <div>
              <p className="text-sm theme-text-soft">Oturum: {info?.sessionId || '-'}</p>
              {connected && info?.phone && (
                <p className="text-base font-semibold theme-heading">+{info.phone}</p>
              )}
            </div>
          </div>
          {loading ? <Loader2 size={18} className="animate-spin theme-text-soft" /> : badge()}
        </div>

        {qrPending && (
          <div className="flex flex-col items-center gap-3 py-4 border-t theme-border">
            <p className="text-sm theme-text-soft text-center">
              Telefonda <b>WhatsApp → Ayarlar → Bağlı Cihazlar → Cihaz Bağla</b> ile aşağıdaki kodu okutun.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.qr}
              alt="WhatsApp QR"
              className="w-64 h-64 rounded-2xl bg-white p-3 shadow-lg"
            />
            <p className="text-xs theme-text-soft">Kod birkaç saniyede bir yenilenir.</p>
          </div>
        )}

        {connected && (
          <div className="py-3 border-t theme-border text-sm theme-text-soft">
            ✅ Hat bağlı. Bir sefer UETDS&apos;ye gönderildiğinde resmi PDF otomatik olarak şoförün
            WhatsApp numarasına iletilecek.
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t theme-border">
          {!connected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              {qrPending ? "QR'ı Yenile" : 'Bağlan / QR Oluştur'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-500 text-sm font-semibold hover:bg-red-500/20 transition disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
              Bağlantıyı Kes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
