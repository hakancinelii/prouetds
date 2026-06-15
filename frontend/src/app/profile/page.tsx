'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { usersApi, driversApi } from '@/lib/api';
import { User, Car, Phone, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{ matched: number; results: any[] } | null>(null);

  useEffect(() => {
    usersApi.getMe().then((res) => {
      setPhone(res.data.phone || '');
      setPlateNumber(res.data.plateNumber || '');
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await usersApi.updateMe({ phone: phone || null, plateNumber: plateNumber || null });
      updateUser({ phone: res.data.phone, plateNumber: res.data.plateNumber });
      setSaveMsg({ type: 'success', text: 'Profil güncellendi.' });
    } catch {
      setSaveMsg({ type: 'error', text: 'Kayıt başarısız.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoMatch = async () => {
    setMatching(true);
    setMatchResult(null);
    try {
      const res = await driversApi.autoMatchPlates();
      setMatchResult(res.data);
      if (res.data.matched > 0) {
        // Refresh own plate in case it changed
        const meRes = await usersApi.getMe();
        setPlateNumber(meRes.data.plateNumber || '');
        updateUser({ plateNumber: meRes.data.plateNumber });
      }
    } catch {
      setMatchResult({ matched: -1, results: [] });
    } finally {
      setMatching(false);
    }
  };

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Profilim</h1>

      {/* Read-only info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Ad Soyad</p>
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 text-gray-400 text-sm flex items-center justify-center">@</span>
          <div>
            <p className="text-xs text-gray-500">E-posta</p>
            <p className="font-medium">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Phone className="w-4 h-4" /> Telefon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+90 5xx xxx xx xx"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Car className="w-4 h-4" /> Araç Plakası <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
          </label>
          <input
            type="text"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="34 ABC 123"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          />
          <p className="text-xs text-gray-400 mt-1">AI Autopilot seferlerinde bu plaka otomatik kullanılır.</p>
        </div>

        {saveMsg && (
          <div className={`flex items-center gap-2 text-sm ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {saveMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {saveMsg.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {/* Admin: auto-match plates */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <h2 className="font-semibold mb-1">UETDS Geçmişinden Plaka Eşleştir</h2>
          <p className="text-sm text-gray-500 mb-4">
            Gönderilmiş seferlerdeki şoför–araç eşleşmelerini otomatik olarak şoför profillerine atar.
          </p>

          <button
            onClick={handleAutoMatch}
            disabled={matching}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${matching ? 'animate-spin' : ''}`} />
            {matching ? 'Eşleştiriliyor...' : 'Otomatik Eşleştir'}
          </button>

          {matchResult && (
            <div className="mt-4">
              {matchResult.matched === -1 ? (
                <p className="text-sm text-red-500">Eşleştirme başarısız.</p>
              ) : matchResult.matched === 0 ? (
                <p className="text-sm text-gray-500">Eşleştirilecek yeni şoför bulunamadı.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-green-600 font-medium">{matchResult.matched} şoför eşleştirildi:</p>
                  {matchResult.results.map((r: any) => (
                    <div key={r.driverId} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-mono">{r.plate}</span>
                      {r.updated && <span className="text-xs text-green-500">(yeni)</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
