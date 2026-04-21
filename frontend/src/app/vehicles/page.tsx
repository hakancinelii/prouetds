'use client';

import { useEffect, useMemo, useState } from 'react';
import { driversApi, uetdsApi, vehiclesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CarFront,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Rows3,
  CopyPlus,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';

const getEmptyVehicleForm = () => ({
  plateNumber: '',
  brand: '',
  model: '',
  defaultDriverId: '',
  hasInspectionDate: false,
  inspectionExpiry: '',
});

const BULK_EXAMPLE = `34ABC123
34XYZ987`;

const normalizePlate = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, '');

const formatLookupDate = (value?: string | null) => {
  if (!value) return '';
  const normalized = String(value).trim();
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const tr = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (tr) return `${tr[3]}-${tr[2]}-${tr[1]}`;
  return '';
};

const getInspectionInfo = (inspectionExpiry?: string | null) => {
  if (!inspectionExpiry) {
    return {
      label: 'Muayene tarihi girilmedi',
      className: 'badge badge-cancelled',
    };
  }

  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiry = new Date(`${inspectionExpiry}T00:00:00`);
  const diffDays = Math.round(
    (expiry.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (Number.isNaN(diffDays)) {
    return {
      label: 'Muayene tarihi okunamadı',
      className: 'badge badge-error',
    };
  }

  if (diffDays < 0) {
    return {
      label: `${Math.abs(diffDays)} gün geçti`,
      className: 'badge badge-error',
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Bugün son gün',
      className: 'badge badge-sending',
    };
  }

  if (diffDays <= 30) {
    return {
      label: `${diffDays} gün kaldı`,
      className: 'badge badge-ready',
    };
  }

  return {
    label: `${diffDays} gün kaldı`,
    className: 'badge badge-sent',
  };
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [form, setForm] = useState(getEmptyVehicleForm);
  const [inspectionLookupLoading, setInspectionLookupLoading] = useState(false);
  const [inspectionLookupResult, setInspectionLookupResult] = useState<any | null>(null);
  const [eligibilityLookupLoading, setEligibilityLookupLoading] = useState(false);
  const [eligibilityLookupResult, setEligibilityLookupResult] = useState<any | null>(null);

  const fetchVehicles = async () => {
    try {
      const res = await vehiclesApi.list();
      setVehicles(res.data);
    } catch {
      toast.error('Araçlar yüklenemedi');
    }
    setLoading(false);
  };

  const fetchDrivers = async () => {
    try {
      const res = await driversApi.list();
      setDrivers(res.data);
    } catch {
      toast.error('Şoförler yüklenemedi');
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  const resetLookupState = () => {
    setInspectionLookupResult(null);
    setEligibilityLookupResult(null);
  };

  const resetSingleModal = () => {
    setEditId(null);
    setForm(getEmptyVehicleForm());
    resetLookupState();
    setShowModal(false);
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm(getEmptyVehicleForm());
    resetLookupState();
    setShowModal(true);
  };

  const openEditModal = (vehicle: any) => {
    setForm({
      plateNumber: vehicle.plateNumber || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      defaultDriverId: vehicle.defaultDriverId || vehicle.defaultDriver?.id || '',
      hasInspectionDate: Boolean(vehicle.inspectionExpiry),
      inspectionExpiry: vehicle.inspectionExpiry || '',
    });
    setEditId(vehicle.id);
    resetLookupState();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        plateNumber: normalizePlate(form.plateNumber),
        brand: form.brand.trim(),
        model: form.model.trim(),
        defaultDriverId: form.defaultDriverId || null,
        inspectionExpiry: form.hasInspectionDate ? form.inspectionExpiry : '',
      };
      if (editId) {
        await vehiclesApi.update(editId, data);
        toast.success('Araç güncellendi');
      } else {
        await vehiclesApi.create(data);
        toast.success('Araç eklendi');
      }
      resetSingleModal();
      fetchVehicles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Araç kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspectionLookup = async () => {
    const plate = normalizePlate(form.plateNumber);
    if (!plate) {
      toast.error('Önce plaka girin');
      return;
    }

    setInspectionLookupLoading(true);
    try {
      const res = await uetdsApi.checkVehicleInspection(plate);
      const inspectionExpiry = formatLookupDate(res.data.inspectionExpiry);
      const nextResult = { ...res.data, inspectionExpiry };
      setInspectionLookupResult(nextResult);

      if (inspectionExpiry) {
        setForm((prev) => ({
          ...prev,
          plateNumber: plate,
          hasInspectionDate: true,
          inspectionExpiry,
        }));
        toast.success('Muayene tarihi resmi sorgudan alındı');
      } else if (res.data.ok) {
        toast.success('Muayene sorgusu tamamlandı');
      } else {
        toast.error(res.data.message || 'Muayene bilgisi alınamadı');
      }
    } catch (err: any) {
      setInspectionLookupResult(null);
      toast.error(err.response?.data?.message || 'Muayene sorgusu başarısız');
    } finally {
      setInspectionLookupLoading(false);
    }
  };

  const handleEligibilityLookup = async () => {
    const plate = normalizePlate(form.plateNumber);
    if (!plate) {
      toast.error('Önce plaka girin');
      return;
    }

    setEligibilityLookupLoading(true);
    try {
      const res = await uetdsApi.checkVehicleEligibility(plate);
      setEligibilityLookupResult(res.data);
      if (res.data.ok) {
        toast.success('Yetki belgesi sorgusu başarılı');
      } else {
        toast.error(res.data.message || 'Yetki belgesi bilgisi alınamadı');
      }
    } catch (err: any) {
      setEligibilityLookupResult(null);
      toast.error(err.response?.data?.message || 'Yetki belgesi sorgusu başarısız');
    } finally {
      setEligibilityLookupLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSubmitting(true);
    try {
      const plates = bulkText
        .split(/\r?\n/)
        .map((line) => normalizePlate(line))
        .filter(Boolean);

      if (!plates.length) {
        toast.error('En az bir plaka girin');
        return;
      }

      let createdCount = 0;
      const errors: number[] = [];

      for (const [index, plateNumber] of plates.entries()) {
        try {
          await vehiclesApi.create({ plateNumber, brand: '', model: '' });
          createdCount += 1;
        } catch {
          errors.push(index + 1);
        }
      }

      if (createdCount > 0) {
        toast.success(`${createdCount} araç eklendi`);
      }

      if (errors.length > 0) {
        toast.error(`Eklenemeyen satırlar: ${errors.join(', ')}`);
      }

      setShowBulkModal(false);
      setBulkText('');
      fetchVehicles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Toplu araç ekleme başarısız');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const vehicleCountLabel = useMemo(() => {
    if (!vehicles.length) return 'Henüz araç eklenmemiş';
    return `${vehicles.length} aktif araç`;
  }, [vehicles.length]);

  const lookupSummary = useMemo(() => {
    return {
      inspectionText: inspectionLookupResult?.inspectionExpiry
        ? `Muayene: ${inspectionLookupResult.inspectionExpiry}`
        : inspectionLookupResult?.message,
      eligibilityText: eligibilityLookupResult?.documentNumber
        ? `${eligibilityLookupResult.documentType || 'Belge'}: ${eligibilityLookupResult.documentNumber}`
        : eligibilityLookupResult?.message,
    };
  }, [inspectionLookupResult, eligibilityLookupResult]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl theme-heading flex items-center gap-2">
            <CarFront size={24} className="text-emerald-400" /> Araçlar
          </h1>
          <p className="theme-text-soft mt-1">{vehicleCountLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Rows3 size={18} /> Toplu Ekle
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Yeni Araç
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {vehicles.map((vehicle) => {
              const inspectionInfo = getInspectionInfo(vehicle.inspectionExpiry);
              return (
                <div key={vehicle.id} className="theme-card-soft rounded-xl p-4 transition group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg theme-plate">{vehicle.plateNumber}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => openEditModal(vehicle)}
                        className="theme-text-soft hover:text-blue-500 transition"
                        title="Araç düzenle"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Araç silinecek. Emin misiniz?')) return;
                          await vehiclesApi.remove(vehicle.id);
                          fetchVehicles();
                        }}
                        className="theme-text-soft hover:text-red-500 transition"
                        title="Araç sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm theme-text">
                    {vehicle.brand || 'Marka girilmedi'} · {vehicle.model || 'Model girilmedi'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={inspectionInfo.className}>{inspectionInfo.label}</span>
                    {vehicle.defaultDriver && (
                      <span className="badge badge-ready">
                        Şoför: {vehicle.defaultDriver.firstName} {vehicle.defaultDriver.lastName}
                      </span>
                    )}
                    {vehicle.documentNumber && (
                      <span className="badge badge-ready">Belge: {vehicle.documentNumber}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {vehicles.length === 0 && (
              <p className="col-span-full text-center theme-empty py-8">
                Henüz araç eklenmemiş
              </p>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 theme-overlay-strong backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card theme-modal theme-panel-soft w-full max-w-md p-6 animate-slide-in">
            <h3 className="text-lg theme-heading mb-4">
              {editId ? 'Araç Düzenle' : 'Yeni Araç'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="vehicle-plate" className="label-muted">
                  Plaka
                </label>
                <input
                  id="vehicle-plate"
                  title="Araç plakası"
                  value={form.plateNumber}
                  onChange={(e) =>
                    setForm({ ...form, plateNumber: e.target.value.toUpperCase() })
                  }
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleInspectionLookup}
                  disabled={inspectionLookupLoading}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  {inspectionLookupLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CalendarDays size={16} />
                  )}
                  {inspectionLookupLoading ? 'Sorgulanıyor...' : 'Muayene Sorgula'}
                </button>
                <button
                  type="button"
                  onClick={handleEligibilityLookup}
                  disabled={eligibilityLookupLoading}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  {eligibilityLookupLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  {eligibilityLookupLoading ? 'Sorgulanıyor...' : 'Yetki Belgesi Sorgula'}
                </button>
              </div>

              {(lookupSummary.inspectionText || lookupSummary.eligibilityText) && (
                <div className="theme-note rounded-xl p-3 space-y-2 text-sm">
                  {lookupSummary.inspectionText && (
                    <p className="theme-text-soft">{lookupSummary.inspectionText}</p>
                  )}
                  {lookupSummary.eligibilityText && (
                    <p className="theme-text-soft">{lookupSummary.eligibilityText}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vehicle-brand" className="label-muted">
                    Marka
                  </label>
                  <input
                    id="vehicle-brand"
                    title="Araç markası"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="vehicle-model" className="label-muted">
                    Model
                  </label>
                  <input
                    id="vehicle-model"
                    title="Araç modeli"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vehicle-default-driver" className="label-muted">
                  Varsayılan Şoför
                </label>
                <select
                  id="vehicle-default-driver"
                  title="Varsayılan şoför"
                  value={form.defaultDriverId}
                  onChange={(e) => setForm({ ...form, defaultDriverId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Şoför seçilmedi</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName} · {driver.tcKimlikNo}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] theme-text-soft">
                  Bu araç seçildiğinde yeni seferde önerilen şoför olarak gelir.
                </p>
              </div>

              {form.defaultDriverId && (
                <div className="theme-note rounded-xl p-3 text-sm theme-text-soft">
                  Önerilen şoför, sefer oluştururken otomatik gelir; isterseniz seferde değiştirebilirsiniz.
                </div>
              )}

              <div className="theme-form-shell rounded-xl p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm theme-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasInspectionDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hasInspectionDate: e.target.checked,
                        inspectionExpiry: e.target.checked ? form.inspectionExpiry : '',
                      })
                    }
                    className="accent-emerald-500"
                  />
                  Araç muayene tarihi eklemek ister misiniz?
                </label>
                {form.hasInspectionDate && (
                  <div>
                    <label htmlFor="vehicle-inspection" className="label-muted">
                      Muayene Son Tarihi
                    </label>
                    <input
                      id="vehicle-inspection"
                      title="Muayene son tarihi"
                      type="date"
                      value={form.inspectionExpiry}
                      onChange={(e) =>
                        setForm({ ...form, inspectionExpiry: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ekle'}
                </button>
                <button type="button" onClick={resetSingleModal} className="btn-secondary">
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 theme-overlay-strong backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card theme-modal w-full max-w-2xl p-6 animate-slide-in">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg theme-heading flex items-center gap-2">
                  <CopyPlus size={18} className="text-emerald-400" /> Toplu Araç Ekle
                </h3>
                <p className="theme-text-soft mt-1">
                  Her satıra yalnızca bir plaka gir. Marka ve model sonra düzenlenebilir.
                </p>
              </div>
            </div>
            <div className="theme-note rounded-2xl p-4 mb-4 text-sm theme-text-soft">
              <p className="theme-heading text-sm mb-2">Örnek giriş</p>
              <pre className="theme-pre rounded-xl p-3 text-xs theme-code whitespace-pre-wrap">
                {BULK_EXAMPLE}
              </pre>
            </div>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label htmlFor="vehicle-bulk-text" className="label-muted">
                  Plaka listesi
                </label>
                <textarea
                  id="vehicle-bulk-text"
                  title="Toplu plaka listesi"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="input-field min-h-[220px] resize-y"
                  placeholder={BULK_EXAMPLE}
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="btn-secondary"
                >
                  İptal
                </button>
                <button type="submit" disabled={bulkSubmitting} className="btn-primary">
                  {bulkSubmitting ? 'İşleniyor...' : 'Toplu Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
