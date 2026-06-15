'use client';

import { useState } from 'react';
import { Phone, Car, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function DriverOnboardingModal() {
  const { user, updateUser } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user || user.role !== 'driver') return null;
  if (user.phone && user.plateNumber) return null;

  const missingPhone = !user.phone;
  const missingPlate = !user.plateNumber;

  async function handleSave() {
    if (!user) return;
    if (missingPhone && !phone.trim()) {
      toast.error('Telefon numarası gerekli');
      return;
    }
    if (missingPlate && !plateNumber.trim()) {
      toast.error('Araç plakası gerekli');
      return;
    }

    setSaving(true);
    try {
      const patch: Record<string, string> = {};
      if (missingPhone) patch.phone = phone.trim();
      if (missingPlate) patch.plateNumber = plateNumber.trim().toUpperCase();

      await usersApi.update(user.id, patch);
      updateUser(patch);
      toast.success('Bilgiler kaydedildi');
    } catch {
      toast.error('Kaydedilemedi, tekrar deneyin');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-8 rounded-3xl space-y-6 animate-slide-in">
        <div className="space-y-1">
          <h2 className="text-xl font-bold theme-heading">Hesabınızı tamamlayın</h2>
          <p className="text-sm theme-text-soft">
            WhatsApp üzerinden sefer oluşturabilmek için aşağıdaki bilgileri girin.
          </p>
        </div>

        <div className="space-y-4">
          {missingPhone && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium theme-text-soft">WhatsApp Telefon Numarası</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 theme-icon-muted" />
                <input
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl theme-input text-sm"
                />
              </div>
            </div>
          )}

          {missingPlate && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium theme-text-soft">Araç Plakası</label>
              <div className="relative">
                <Car size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 theme-icon-muted" />
                <input
                  type="text"
                  placeholder="34 ABC 123"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl theme-input text-sm uppercase"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Kaydet ve Devam Et
        </button>
      </div>
    </div>
  );
}
