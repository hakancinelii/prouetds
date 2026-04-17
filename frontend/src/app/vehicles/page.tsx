'use client';

import { useEffect, useMemo, useState } from 'react';
import { vehiclesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CarFront,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Rows3,
  CopyPlus,
} from 'lucide-react';

const getEmptyVehicleForm = () => ({
  plateNumber: '',
  brand: '',
  model: '',
});

const BULK_EXAMPLE = `34ABC123, Mercedes, Sprinter
34XYZ987, Volkswagen, Crafter`;

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [form, setForm] = useState(getEmptyVehicleForm);

  const fetchVehicles = async () => {
    try {
      const res = await vehiclesApi.list();
      setVehicles(res.data);
    } catch {
      toast.error('Araçlar yüklenemedi');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const resetSingleModal = () => {
    setEditId(null);
    setForm(getEmptyVehicleForm());
    setShowModal(false);
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm(getEmptyVehicleForm());
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        plateNumber: form.plateNumber.trim().toUpperCase().replace(/\s+/g, ''),
        brand: form.brand.trim(),
        model: form.model.trim(),
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

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSubmitting(true);
    try {
      const res = await vehiclesApi.bulkCreate(bulkText);
      const data = res.data;
      const successSummary = [
        data.createdCount ? `${data.createdCount} yeni araç` : null,
        data.reactivatedCount ? `${data.reactivatedCount} yeniden aktif` : null,
        data.skippedCount ? `${data.skippedCount} tekrar satır` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      if (data.errors?.length) {
        toast.success(successSummary || 'Toplu araç işlemi tamamlandı');
        toast.error(`Hatalı satır: ${data.errors.map((item: any) => item.line).join(', ')}`);
      } else {
        toast.success(successSummary || 'Araçlar eklendi');
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
          <button type="button" onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Yeni Araç
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="theme-card-soft rounded-xl p-4 transition group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg theme-plate">{vehicle.plateNumber}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          plateNumber: vehicle.plateNumber || '',
                          brand: vehicle.brand || '',
                          model: vehicle.model || '',
                        });
                        setEditId(vehicle.id);
                        setShowModal(true);
                      }}
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
                <p className="text-sm theme-text">{vehicle.brand || 'Marka girilmedi'} · {vehicle.model || 'Model girilmedi'}</p>
              </div>
            ))}
            {vehicles.length === 0 && <p className="col-span-full text-center theme-empty py-8">Henüz araç eklenmemiş</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 theme-overlay-strong backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card theme-modal w-full max-w-md p-6 animate-slide-in">
            <h3 className="text-lg theme-heading mb-4">{editId ? 'Araç Düzenle' : 'Yeni Araç'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="vehicle-plate" className="label-muted">Plaka</label>
                <input
                  id="vehicle-plate"
                  title="Araç plakası"
                  value={form.plateNumber}
                  onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vehicle-brand" className="label-muted">Marka</label>
                  <input
                    id="vehicle-brand"
                    title="Araç markası"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="vehicle-model" className="label-muted">Model</label>
                  <input
                    id="vehicle-model"
                    title="Araç modeli"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ekle'}
                </button>
                <button type="button" onClick={resetSingleModal} className="btn-secondary">İptal</button>
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
                  Her satırı <span className="theme-code">PLAKA, MARKA, MODEL</span> formatında gir.
                </p>
              </div>
            </div>
            <div className="theme-note rounded-2xl p-4 mb-4 text-sm theme-text-soft">
              <p className="theme-heading text-sm mb-2">Örnek giriş</p>
              <pre className="theme-pre rounded-xl p-3 text-xs theme-code whitespace-pre-wrap">{BULK_EXAMPLE}</pre>
            </div>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label htmlFor="vehicle-bulk-text" className="label-muted">Araç listesi</label>
                <textarea
                  id="vehicle-bulk-text"
                  title="Toplu araç listesi"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="input-field min-h-[220px] resize-y"
                  placeholder={BULK_EXAMPLE}
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowBulkModal(false)} className="btn-secondary">İptal</button>
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
