'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, ShieldCheck, Trash2, UserCog, Users, Edit } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const getEmptyForm = () => ({
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  phone: '',
  plateNumber: '',
  tcKimlikNo: '',
  nationalityCode: 'TR',
  gender: 'E',
  srcCertificate: '',
  address: '',
  isActive: true,
});

const getCapacityText = (capacity: any) => {
  if (!capacity) return '';
  const userMax = capacity.package?.maxUsers ?? '∞';
  const vehicleMax = capacity.package?.maxVehicles ?? '∞';
  return `${capacity.activeUserCount}/${userMax} kullanıcı · ${capacity.activeVehicleCount}/${vehicleMax} araç`;
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [capacity, setCapacity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState(getEmptyForm());

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setItems(res.data?.items || []);
      setCapacity(res.data?.capacity || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const userLimitReached = useMemo(() => {
    if (!capacity?.package) return false;
    if (capacity.package.maxUsers === null) return false;
    return capacity.activeUserCount >= capacity.package.maxUsers;
  }, [capacity]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(getEmptyForm());
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingUser(item);
    setForm({
      email: item.email || '',
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      password: '',
      phone: item.phone || '',
      plateNumber: item.plateNumber || '',
      tcKimlikNo: item.driver?.tcKimlikNo || '',
      nationalityCode: item.driver?.nationalityCode || 'TR',
      gender: item.driver?.gender || 'E',
      srcCertificate: item.driver?.srcCertificate || '',
      address: item.driver?.address || '',
      isActive: item.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password.trim(),
        phone: form.phone.trim(),
        plateNumber: form.plateNumber.trim().toUpperCase(),
        tcKimlikNo: form.tcKimlikNo.trim(),
        nationalityCode: form.nationalityCode.trim(),
        gender: form.gender.trim(),
        srcCertificate: form.srcCertificate.trim(),
        address: form.address.trim(),
      };

      if (editingUser) {
        const { password, ...updatePayload } = payload;
        await usersApi.update(editingUser.id, password ? payload : updatePayload);
        toast.success('Alt kullanıcı güncellendi');
      } else {
        await usersApi.createDriver(payload);
        toast.success('Alt kullanıcı oluşturuldu');
      }

      setShowModal(false);
      setEditingUser(null);
      setForm(getEmptyForm());
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await usersApi.toggleActive(id);
      toast.success('Kullanıcı durumu güncellendi');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Durum güncellenemedi');
    }
  };

  if (user?.role === 'driver') {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Yetkisiz Erişim</h1>
        <p className="text-slate-400">Bu sayfayı görüntülemek için şirket yönetici yetkisine sahip olmanız gerekir.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl theme-heading flex items-center gap-2">
            <UserCog size={24} className="text-cyan-400" /> Kullanıcılar
          </h1>
          <p className="theme-text-soft mt-1">Tenant admin tarafından yönetilen giriş yapabilen şoför kullanıcılar.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={userLimitReached}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} /> Yeni Alt Kullanıcı
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-emerald-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 px-6 text-center text-slate-400">
              Henüz alt kullanıcı oluşturulmamış.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {items.map((item) => (
                <div key={item.id} className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{item.firstName} {item.lastName}</p>
                    <p className="text-sm text-slate-400">{item.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>TC: {item.driver?.tcKimlikNo || '-'}</span>
                      <span>Plaka: {item.plateNumber || '-'}</span>
                      <span>SRC: {item.driver?.srcCertificate || '-'}</span>
                      <span>{item.isActive ? 'Aktif' : 'Pasif'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Kullanıcıyı düzenle"
                      onClick={() => openEditModal(item)}
                      className="theme-icon-button rounded-xl p-3"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      title="Kullanıcıyı aktif/pasif yap"
                      onClick={() => handleToggleActive(item.id)}
                      className="theme-icon-button rounded-xl p-3"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="glass-card p-5 space-y-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">Paket Özeti</p>
            <h2 className="mt-2 text-xl font-semibold theme-text-strong">{capacity?.package?.label || 'Paket yükleniyor'}</h2>
            <p className="mt-2 text-sm theme-text-soft">{getCapacityText(capacity)}</p>
          </div>
          <div className="rounded-2xl theme-panel-dark theme-surface-on-dark p-4 text-sm theme-text-strong">
            {userLimitReached
              ? 'Kullanıcı limiti doldu. Yeni kullanıcı eklemek için paketi yükseltin veya pasif kullanıcı açın.'
              : 'Kalan kullanıcı hakkı oldukça tenant admin yeni şoför kullanıcı açabilir.'}
          </div>
        </aside>
      </div>

      {showModal && (
        <div className="fixed inset-0 theme-overlay-strong backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card theme-modal theme-panel-soft w-full max-w-2xl p-6 animate-slide-in">
            <h3 className="text-lg theme-heading text-white mb-4">{editingUser ? 'Alt Kullanıcı Düzenle' : 'Yeni Alt Kullanıcı'}</h3>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="user-first-name" className="label-muted">Ad</label>
                <input id="user-first-name" title="Ad" className="input-field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="user-last-name" className="label-muted">Soyad</label>
                <input id="user-last-name" title="Soyad" className="input-field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="user-email" className="label-muted">E-posta</label>
                <input id="user-email" title="E-posta" type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="user-password" className="label-muted">Şifre {editingUser ? '(değişecekse girin)' : ''}</label>
                <input id="user-password" title="Şifre" type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingUser} />
              </div>
              <div>
                <label htmlFor="user-phone" className="label-muted">Telefon</label>
                <input id="user-phone" title="Telefon" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label htmlFor="user-plate" className="label-muted">Plaka</label>
                <input id="user-plate" title="Plaka" className="input-field" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })} placeholder="34ABC123" />
              </div>
              <div>
                <label htmlFor="user-tc" className="label-muted">TC Kimlik No</label>
                <input id="user-tc" title="TC Kimlik No" className="input-field" value={form.tcKimlikNo} onChange={(e) => setForm({ ...form, tcKimlikNo: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="user-gender" className="label-muted">Cinsiyet</label>
                <select id="user-gender" title="Cinsiyet" className="input-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="E">Erkek</option>
                  <option value="K">Kadın</option>
                </select>
              </div>
              <div>
                <label htmlFor="user-src" className="label-muted">SRC</label>
                <input id="user-src" title="SRC" className="input-field" value={form.srcCertificate} onChange={(e) => setForm({ ...form, srcCertificate: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="user-address" className="label-muted">Adres</label>
                <textarea id="user-address" title="Adres" className="input-field min-h-24" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  Kullanıcı aktif başlasın
                </label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Vazgeç</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                    {editingUser ? 'Kaydet' : 'Kullanıcıyı Oluştur'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
