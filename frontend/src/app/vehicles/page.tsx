'use client';

import { useEffect, useState } from 'react';
import { vehiclesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CarFront, Plus, Edit, Trash2, Loader2 } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    plateNumber: '', brand: '', model: '', year: '', seatCapacity: '',
  });

  const fetchVehicles = async () => {
    try { const res = await vehiclesApi.list(); setVehicles(res.data); } catch { toast.error('Araçlar yüklenemedi'); }
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...form, year: form.year ? parseInt(form.year) : null, seatCapacity: form.seatCapacity ? parseInt(form.seatCapacity) : null };
      if (editId) { await vehiclesApi.update(editId, data); toast.success('Araç güncellendi'); }
      else { await vehiclesApi.create(data); toast.success('Araç eklendi'); }
      setShowModal(false); setEditId(null); setForm({ plateNumber: '', brand: '', model: '', year: '', seatCapacity: '' }); fetchVehicles();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Hata oluştu'); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CarFront size={24} className="text-emerald-400" /> Araçlar
        </h1>
        <button onClick={() => { setEditId(null); setForm({ plateNumber: '', brand: '', model: '', year: '', seatCapacity: '' }); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={18} /> Yeni Araç</button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {vehicles.map((v) => (
              <div key={v.id} className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 hover:border-emerald-500/30 transition group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold font-mono text-white">{v.plateNumber}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => { setForm(v); setEditId(v.id); setShowModal(true); }} className="text-slate-400 hover:text-blue-400"><Edit size={14} /></button>
                    <button onClick={async () => { if (!confirm('Emin misiniz?')) return; await vehiclesApi.remove(v.id); fetchVehicles(); }} className="text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
                <p className="text-sm text-slate-400">{v.brand} {v.model} {v.year ? `(${v.year})` : ''}</p>
                {v.seatCapacity && <p className="text-xs text-slate-500 mt-1">{v.seatCapacity} koltuk</p>}
              </div>
            ))}
            {vehicles.length === 0 && <p className="col-span-full text-center text-slate-500 py-8">Henüz araç eklenmemiş</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-slide-in">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Araç Düzenle' : 'Yeni Araç'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-xs text-slate-400 mb-1">Plaka</label><input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })} className="input-field" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Marka</label><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-field" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Model</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Yıl</label><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="input-field" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Koltuk Sayısı</label><input type="number" value={form.seatCapacity} onChange={(e) => setForm({ ...form, seatCapacity: e.target.value })} className="input-field" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">{editId ? 'Güncelle' : 'Ekle'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
