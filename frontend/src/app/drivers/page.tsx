'use client';

import { useEffect, useState } from 'react';
import { driversApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Plus, Edit, Trash2, Loader2 } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', tcKimlikNo: '', phone: '',
    nationalityCode: 'TR', gender: 'E', srcCertificate: '', address: '',
  });

  const fetchDrivers = async () => {
    try {
      const res = await driversApi.list();
      setDrivers(res.data);
    } catch { toast.error('Şoförler yüklenemedi'); }
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await driversApi.update(editId, form);
        toast.success('Şoför güncellendi');
      } else {
        await driversApi.create(form);
        toast.success('Şoför eklendi');
      }
      setShowModal(false);
      setEditId(null);
      setForm({ firstName: '', lastName: '', tcKimlikNo: '', phone: '', nationalityCode: 'TR', gender: 'E', srcCertificate: '', address: '' });
      fetchDrivers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Hata oluştu'); }
  };

  const handleEdit = (driver: any) => {
    setForm(driver);
    setEditId(driver.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Şoför silinecek. Emin misiniz?')) return;
    try {
      await driversApi.remove(id);
      toast.success('Şoför silindi');
      fetchDrivers();
    } catch { toast.error('Silinemedi'); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={24} className="text-emerald-400" />
          Şoförler
        </h1>
        <button onClick={() => { setEditId(null); setForm({ firstName: '', lastName: '', tcKimlikNo: '', phone: '', nationalityCode: 'TR', gender: 'E', srcCertificate: '', address: '' }); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Yeni Şoför
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                <th className="px-5 py-3.5">Ad Soyad</th>
                <th className="px-5 py-3.5">TC Kimlik</th>
                <th className="px-5 py-3.5">Telefon</th>
                <th className="px-5 py-3.5">SRC</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-700/20 transition">
                  <td className="px-5 py-3.5 text-sm font-medium text-white">{d.firstName} {d.lastName}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-300 font-mono">{d.tcKimlikNo}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-300">{d.phone}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-300">{d.srcCertificate || '-'}</td>
                  <td className="px-5 py-3.5 flex gap-2">
                    <button onClick={() => handleEdit(d)} className="text-slate-400 hover:text-blue-400 transition"><Edit size={15} /></button>
                    <button onClick={() => handleDelete(d.id)} className="text-slate-400 hover:text-red-400 transition"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-slide-in">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Şoför Düzenle' : 'Yeni Şoför'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Ad</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field" required /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Soyad</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field" required /></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">TC Kimlik No</label><input value={form.tcKimlikNo} onChange={(e) => setForm({ ...form, tcKimlikNo: e.target.value })} className="input-field" required /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Telefon</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">SRC Belgesi</label><input value={form.srcCertificate} onChange={(e) => setForm({ ...form, srcCertificate: e.target.value })} className="input-field" /></div>
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
