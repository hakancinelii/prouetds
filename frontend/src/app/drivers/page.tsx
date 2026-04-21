'use client';

import { useEffect, useMemo, useState } from 'react';
import { driversApi, uetdsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';

const getEmptyDriverForm = () => ({
  firstName: '',
  lastName: '',
  tcKimlikNo: '',
  phone: '',
  nationalityCode: 'TR',
  gender: 'E',
  srcCertificate: '',
  address: '',
});

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(getEmptyDriverForm());
  const [submitting, setSubmitting] = useState(false);
  const [qualificationLoading, setQualificationLoading] = useState(false);
  const [qualificationResult, setQualificationResult] = useState<any | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityResult, setIdentityResult] = useState<any | null>(null);

  const fetchDrivers = async () => {
    try {
      const res = await driversApi.list();
      setDrivers(res.data);
    } catch {
      toast.error('Şoförler yüklenemedi');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const resetLookupState = () => {
    setQualificationResult(null);
    setIdentityResult(null);
  };

  const resetModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(getEmptyDriverForm());
    resetLookupState();
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm(getEmptyDriverForm());
    resetLookupState();
    setShowModal(true);
  };

  const openEditModal = (driver: any) => {
    setForm({
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      tcKimlikNo: driver.tcKimlikNo || '',
      phone: driver.phone || '',
      nationalityCode: driver.nationalityCode || 'TR',
      gender: driver.gender || 'E',
      srcCertificate: driver.srcCertificate || '',
      address: driver.address || '',
    });
    setEditId(driver.id);
    resetLookupState();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        tcKimlikNo: form.tcKimlikNo.trim(),
        phone: form.phone.trim(),
        srcCertificate: form.srcCertificate.trim(),
        address: form.address.trim(),
      };

      if (editId) {
        await driversApi.update(editId, payload);
        toast.success('Şoför güncellendi');
      } else {
        await driversApi.create(payload);
        toast.success('Şoför eklendi');
      }
      resetModal();
      fetchDrivers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Şoför silinecek. Emin misiniz?')) return;
    try {
      await driversApi.remove(id);
      toast.success('Şoför silindi');
      fetchDrivers();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const handleQualificationLookup = async () => {
    const tcKimlikNo = form.tcKimlikNo.trim();
    if (!tcKimlikNo) {
      toast.error('Önce TC Kimlik No girin');
      return;
    }

    setQualificationLoading(true);
    try {
      const res = await uetdsApi.checkDriverQualification(tcKimlikNo);
      setQualificationResult(res.data);
      if (res.data.srcCertificate) {
        setForm((prev) => ({ ...prev, srcCertificate: res.data.srcCertificate }));
      }
      if (res.data.ok) {
        toast.success('Mesleki yeterlilik sorgusu başarılı');
      } else {
        toast.error(res.data.message || 'Mesleki yeterlilik bilgisi alınamadı');
      }
    } catch (err: any) {
      setQualificationResult(null);
      toast.error(err.response?.data?.message || 'SRC sorgusu başarısız');
    } finally {
      setQualificationLoading(false);
    }
  };

  const handleIdentityLookup = async () => {
    const tcKimlikNo = form.tcKimlikNo.trim();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!tcKimlikNo || !firstName || !lastName) {
      toast.error('Kimlik doğrulama için TC, ad ve soyad zorunlu');
      return;
    }

    setIdentityLoading(true);
    try {
      const res = await uetdsApi.verifyIdentity(tcKimlikNo, firstName, lastName);
      setIdentityResult(res.data);
      if (res.data.ok) {
        toast.success('Kimlik doğrulama başarılı');
      } else {
        toast.error(res.data.message || 'Kimlik doğrulama başarısız');
      }
    } catch (err: any) {
      setIdentityResult(null);
      toast.error(err.response?.data?.message || 'Kimlik doğrulama başarısız');
    } finally {
      setIdentityLoading(false);
    }
  };

  const validationSummary = useMemo(() => {
    return {
      qualificationText: qualificationResult?.srcCertificate
        ? `SRC: ${qualificationResult.srcCertificate}`
        : qualificationResult?.message,
      identityText: identityResult?.ok
        ? 'Kimlik bilgileri eşleşti'
        : identityResult?.message,
    };
  }, [qualificationResult, identityResult]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl theme-heading flex items-center gap-2">
          <Users size={24} className="text-emerald-400" />
          Şoförler
        </h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Yeni Şoför
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
          </div>
        ) : (
          <>
            <div className="theme-driver-mobile-list p-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="theme-driver-mobile-card rounded-2xl p-4 theme-safe-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold theme-table-cell-strong">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <p className="mt-1 text-sm theme-table-code">{driver.tcKimlikNo}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="Şoförü düzenle"
                        aria-label="Şoförü düzenle"
                        onClick={() => openEditModal(driver)}
                        className="theme-icon-button theme-mobile-control rounded-xl p-2"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        type="button"
                        title="Şoförü sil"
                        aria-label="Şoförü sil"
                        onClick={() => handleDelete(driver.id)}
                        className="theme-icon-button theme-mobile-control rounded-xl p-2"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="theme-card-copy-soft">Telefon</p>
                      <p className="mt-1 theme-card-value-bold">{driver.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="theme-card-copy-soft">SRC</p>
                      <p className="mt-1 theme-card-value-bold">{driver.srcCertificate || '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="theme-driver-desktop-list">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs theme-text-soft uppercase tracking-wider theme-table-head">
                    <th className="px-5 py-3.5">Ad Soyad</th>
                    <th className="px-5 py-3.5">TC Kimlik</th>
                    <th className="px-5 py-3.5">Telefon</th>
                    <th className="px-5 py-3.5">SRC</th>
                    <th className="px-5 py-3.5">
                      <span className="sr-only">İşlemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-table-body">
                  {drivers.map((driver) => (
                    <tr key={driver.id} className="theme-table-row transition">
                      <td className="px-5 py-3.5 text-sm font-medium theme-table-cell-strong">
                        {driver.firstName} {driver.lastName}
                      </td>
                      <td className="px-5 py-3.5 text-sm theme-table-code">{driver.tcKimlikNo}</td>
                      <td className="px-5 py-3.5 text-sm theme-table-cell">{driver.phone}</td>
                      <td className="px-5 py-3.5 text-sm theme-table-cell">{driver.srcCertificate || '-'}</td>
                      <td className="px-5 py-3.5 flex gap-2">
                        <button
                          type="button"
                          title="Şoförü düzenle"
                          aria-label="Şoförü düzenle"
                          onClick={() => openEditModal(driver)}
                          className="theme-text-soft hover:text-blue-500 transition"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          title="Şoförü sil"
                          aria-label="Şoförü sil"
                          onClick={() => handleDelete(driver.id)}
                          className="theme-text-soft hover:text-red-500 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 theme-overlay-strong backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card theme-modal theme-panel-soft w-full max-w-md p-6 animate-slide-in">
            <h3 className="text-lg theme-heading text-white mb-4">
              {editId ? 'Şoför Düzenle' : 'Yeni Şoför'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="driver-first-name" className="label-muted">
                    Ad
                  </label>
                  <input
                    id="driver-first-name"
                    title="Ad"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="driver-last-name" className="label-muted">
                    Soyad
                  </label>
                  <input
                    id="driver-last-name"
                    title="Soyad"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="driver-identity" className="label-muted">
                  TC Kimlik No
                </label>
                <input
                  id="driver-identity"
                  title="TC Kimlik No"
                  value={form.tcKimlikNo}
                  onChange={(e) => setForm({ ...form, tcKimlikNo: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleQualificationLookup}
                  disabled={qualificationLoading}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  {qualificationLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <BadgeCheck size={16} />
                  )}
                  {qualificationLoading ? 'Sorgulanıyor...' : 'SRC Sorgula'}
                </button>
                <button
                  type="button"
                  onClick={handleIdentityLookup}
                  disabled={identityLoading}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  {identityLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  {identityLoading ? 'Doğrulanıyor...' : 'Kimlik Doğrula'}
                </button>
              </div>

              {(validationSummary.qualificationText || validationSummary.identityText) && (
                <div className="theme-note rounded-xl p-3 space-y-2 text-sm">
                  {validationSummary.qualificationText && (
                    <p className="theme-text-soft">{validationSummary.qualificationText}</p>
                  )}
                  {validationSummary.identityText && (
                    <p className="theme-text-soft">{validationSummary.identityText}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="driver-phone" className="label-muted">
                  Telefon
                </label>
                <input
                  id="driver-phone"
                  title="Telefon"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="driver-src" className="label-muted">
                  SRC Belgesi
                </label>
                <input
                  id="driver-src"
                  title="SRC Belgesi"
                  value={form.srcCertificate}
                  onChange={(e) => setForm({ ...form, srcCertificate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="driver-address" className="label-muted">
                  Adres
                </label>
                <input
                  id="driver-address"
                  title="Adres"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ekle'}
                </button>
                <button type="button" onClick={resetModal} className="btn-secondary theme-panel-border">
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
