'use client';

import { useEffect, useState } from 'react';
import { tenantsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Building2,
  Plus,
  Search,
  Power, 
  PowerOff, 
  Edit2, 
  FileText, 
  Users,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
  LayoutGrid,
  List,
  Loader2,
  X,
  Lock,
  AtSign
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const PACKAGE_OPTIONS = [
  { code: 'A-10', label: 'A-10 Paketi', limits: '10 araç · 10 kullanıcı' },
  { code: 'A-25', label: 'A-25 Paketi', limits: '25 araç · 25 kullanıcı' },
  { code: 'A-50', label: 'A-50 Paketi', limits: '50 araç · 50 kullanıcı' },
  { code: 'A-SINIRSIZ', label: 'A-Sınırsız Paketi', limits: 'Sınırsız araç · sınırsız kullanıcı' },
];

const getCapacityText = (tenant: any) => {
  const vehicleMax = tenant?.package?.maxVehicles ?? '∞';
  const userMax = tenant?.package?.maxUsers ?? '∞';
  return `${tenant?.activeVehicleCount ?? 0}/${vehicleMax} araç · ${tenant?.activeUserCount ?? 0}/${userMax} kullanıcı`;
};

export default function TenantsPage() {
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    taxNumber: '',
    d2LicenseNumber: '',
    unetNumber: '',
    uetdsUsername: '',
    uetdsPasswordEncrypted: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    subscriptionPlan: 'A-10',
    isActive: true,
    adminEmail: '',
    adminPassword: '',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await tenantsApi.list();
      // Extract the array from the response object { tenants: [], total: 0 }
      const data = res.data?.tenants || [];
      setTenants(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Şirket listesi yüklenemedi: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handleOpenModal = (tenant: any = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        companyName: tenant.companyName || '',
        taxNumber: tenant.taxNumber || '',
        d2LicenseNumber: tenant.d2LicenseNumber || '',
        unetNumber: tenant.unetNumber || '',
        uetdsUsername: tenant.uetdsUsername || '',
        uetdsPasswordEncrypted: tenant.uetdsPasswordEncrypted || '',
        contactEmail: tenant.contactEmail || '',
        contactPhone: tenant.contactPhone || '',
        address: tenant.address || '',
        subscriptionPlan: tenant.subscriptionPlan || 'A-10',
        isActive: tenant.isActive ?? true,
        adminEmail: '', // Cannot change admin email via update easily without separate logic
        adminPassword: '',
      });
    } else {
      setEditingTenant(null);
      setFormData({
        companyName: '',
        taxNumber: '',
        d2LicenseNumber: '',
        unetNumber: '',
        uetdsUsername: '',
        uetdsPasswordEncrypted: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        subscriptionPlan: 'A-10',
        isActive: true,
        adminEmail: '',
        adminPassword: 'password123',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        // Remove admin fields for update as backend might not expect them here
        const { adminEmail, adminPassword, ...updateData } = formData;
        await tenantsApi.update(editingTenant.id, updateData);
        toast.success('Şirket bilgileri güncellendi');
      } else {
        await tenantsApi.create(formData);
        toast.success('Yeni şirket ve yönetici hesabı başarıyla oluşturuldu');
      }
      setIsModalOpen(false);
      fetchTenants();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bir hata oluştu. Vergi numarası benzersiz olmalıdır.');
    }
  };

  const toggleTenantStatus = async (tenant: any) => {
    try {
      await tenantsApi.toggleActive(tenant.id);
      toast.success(`${tenant.companyName} durumu güncellendi`);
      fetchTenants();
    } catch (err) {
      toast.error('Durum güncellenemedi');
    }
  };

  const filteredTenants = Array.isArray(tenants) ? tenants.filter(t => 
    t.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    t.taxNumber?.includes(search)
  ) : [];

  if (user?.role !== 'super_admin') {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Yetkisiz Erişim</h1>
        <p className="text-slate-400">Bu sayfayı görüntülemek için Süper Admin yetkisine sahip olmanız gerekmektedir.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="text-emerald-400" /> Şirket Yönetimi
          </h1>
          <p className="text-slate-400 mt-1">SaaS üzerindeki tüm şirketleri yönetin ve yapılandırın.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2 self-start ring-offset-2 ring-emerald-500/50 hover:ring-2 transition-all"
        >
          <Plus size={18} /> Yeni Şirket Ekle
        </button>
      </div>

      {/* Stats & Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Toplam Şirket</p>
            <p className="text-2xl font-black text-white">{tenants.length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-cyan-500">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 shadow-inner">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Aktif Şirketler</p>
            <p className="text-2xl font-black text-white">{tenants.filter(t => t.isActive).length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-2 bg-slate-800/10">
          <div className="search-input-shell flex-1">
            <Search className="input-icon-left-search text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Şirket adı veya VKN ile ara..."
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600 input-with-icon"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/50 shadow-inner">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-emerald-400" size={48} />
          <p className="text-slate-500 animate-pulse font-medium">Şirketler Yükleniyor...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
          <div className="glass-card h-64 flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-slate-700/50">
            <Building2 size={48} className="text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-400">Şirket Bulunamadı</h3>
            <p className="text-sm text-slate-500 mt-1">Arama kriterini değiştirin veya yeni bir şirket ekleyin.</p>
          </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
            <div key={tenant.id} className="glass-card group hover:scale-[1.02] transition-all duration-300 overflow-hidden border-t-4 border-t-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 active:scale-[0.98]">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-slate-800/80 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-lg shadow-black/20 group-hover:rotate-6">
                    <Building2 size={28} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenModal(tenant)}
                      className="p-3 bg-slate-800/50 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all border border-transparent hover:border-emerald-500/20 shadow-sm"
                      title="Düzenle"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => toggleTenantStatus(tenant)}
                      className={`p-3 bg-slate-800/50 rounded-xl transition-all border border-transparent ${tenant.isActive ? 'text-red-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20' : 'text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20'} shadow-sm`}
                      title={tenant.isActive ? 'Devre Dışı Bırak' : 'Aktif Et'}
                    >
                      {tenant.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white truncate group-hover:text-emerald-300 transition-colors uppercase tracking-tight">{tenant.companyName}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest ${tenant.isActive ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'}`}>
                      {tenant.isActive ? 'AKTİF' : 'PASİF'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
                      {tenant.package?.label || tenant.subscriptionPlan}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-950/40 border border-slate-800/60 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Kota Kullanımı</p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">{getCapacityText(tenant)}</p>
                </div>

                <div className="space-y-3 pt-2 text-sm text-slate-400 border-t border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-slate-900 border border-slate-700/50 flex items-center justify-center">
                      <FileText size={12} className="text-slate-500" />
                    </div>
                    <span className="font-medium">VKN: <span className="text-slate-300">{tenant.taxNumber || 'Belirtilmedi'}</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-slate-900 border border-slate-700/50 flex items-center justify-center">
                      <Globe size={12} className="text-slate-500" />
                    </div>
                    <span className="font-medium">UETDS: <span className={tenant.uetdsUsername ? "text-emerald-400 font-bold" : "text-slate-500 italic"}>{tenant.uetdsUsername ? '✓ Tanımlı' : '✗ Tanımsız'}</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-slate-900 border border-slate-700/50 flex items-center justify-center">
                      <Mail size={12} className="text-slate-500" />
                    </div>
                    <span className="truncate text-slate-400 italic">{tenant.contactEmail || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-700/50 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Kayıt: {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}</span>
                <button 
                   onClick={() => handleOpenModal(tenant)}
                   className="text-emerald-400 font-black hover:text-emerald-300 hover:translate-x-1 transition-all flex items-center gap-1"
                >
                  YÖNET <span className="text-[14px]">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-slate-900/80 border-b border-slate-700/50">
              <tr>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Şirket Adı</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">VKN</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Plân</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Durum</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">UETDS</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-700/10 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg border border-slate-700/30">
                        <Building2 size={20} />
                      </div>
                      <span className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">{tenant.companyName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-400">{tenant.taxNumber || '-'}</td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <span className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] font-black uppercase ring-1 ring-cyan-500/20">{tenant.package?.label || tenant.subscriptionPlan}</span>
                      <p className="text-[11px] text-slate-500">{getCapacityText(tenant)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-widest ${tenant.isActive ? 'text-emerald-400 bg-emerald-400/10 ring-1 ring-emerald-500/30' : 'text-red-400 bg-red-400/10 ring-1 ring-red-500/30'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tenant.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                      {tenant.isActive ? 'AKTİF' : 'PASİF'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-sm font-bold ${tenant.uetdsUsername ? 'text-emerald-400' : 'text-slate-600 font-normal italic'}`}>
                      {tenant.uetdsUsername ? '✓ Bağlı' : '✗ Eksik'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                      <button onClick={() => handleOpenModal(tenant)} className="p-2.5 text-slate-400 hover:text-emerald-400 bg-slate-800/80 rounded-xl border border-slate-700/30 shadow-lg"><Edit2 size={16} /></button>
                      <button onClick={() => toggleTenantStatus(tenant)} className={`p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/30 shadow-lg ${tenant.isActive ? 'text-red-400 hover:text-red-500' : 'text-emerald-400 hover:text-emerald-500'}`}>
                        {tenant.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_100px_rgba(16,185,129,0.15)] animate-pop-in border-emerald-500/10">
            <div className="sticky top-0 z-10 p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/90 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 ring-1 ring-emerald-500/20">
                  {editingTenant ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {editingTenant ? 'Şirketi Güncelle' : 'SaaS Şirketi Ekle'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-widest font-bold">Lütfen tüm bilgileri eksiksiz doldurun</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"
              >
                <X size={28} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Core Info Section */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">Kurumsal Bilgiler</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Şirket Adı / Ünvan</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pt-0.5" size={18} />
                      <input
                        required
                        type="text"
                        placeholder="Örn: ProUETDS Lojistik A.Ş."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-700"
                        value={formData.companyName}
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Vergi Numarası (VKN)</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pt-0.5" size={18} />
                      <input
                        required
                        type="text"
                        maxLength={11}
                        placeholder="10 veya 11 haneli"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium font-mono placeholder:text-slate-700"
                        value={formData.taxNumber}
                        onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">D2 / Belge No</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                      value={formData.d2LicenseNumber}
                      onChange={(e) => setFormData({...formData, d2LicenseNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">U-NET Numarası</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                      value={formData.unetNumber}
                      onChange={(e) => setFormData({...formData, unetNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="tenant-package" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tenant Paketi</label>
                    <select
                      id="tenant-package"
                      title="Tenant paketi"
                      value={formData.subscriptionPlan}
                      onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                    >
                      {PACKAGE_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label} · {option.limits}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">Paket araç ve alt kullanıcı limitlerini belirler.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">Paket Özeti</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {PACKAGE_OPTIONS.map((option) => (
                    <div
                      key={option.code}
                      className={`rounded-2xl border px-4 py-3 transition-all ${formData.subscriptionPlan === option.code ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}
                    >
                      <p className="text-sm font-bold">{option.label}</p>
                      <p className="mt-1 text-xs">{option.limits}</p>
                    </div>
                  ))}
                </div>
              </div>


              {/* UETDS Credentials Section - CRITCAL */}
              <div className="p-6 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20 rounded-3xl space-y-6 shadow-xl shadow-emerald-500/5">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-black text-emerald-400 flex items-center gap-3 uppercase tracking-[0.2em]">
                    <ShieldCheck size={20} className="animate-pulse" /> UETDS Web Servis Erişimi
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">TEST ORTAMI</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed italic pr-4">Devletin UETDS sistemine (WebService) bağlanmak için gereken kurumsal kullanıcı adı ve şifrenizi aşağıya girin.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kullanıcı Adı (WS_User)</label>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pt-0.5" size={16} />
                      <input
                        type="text"
                        placeholder="ws_vkn_..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all font-mono"
                        value={formData.uetdsUsername}
                        onChange={(e) => setFormData({...formData, uetdsUsername: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">E-Devlet Servis Şifresi</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pt-0.5" size={16} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all font-mono"
                        value={formData.uetdsPasswordEncrypted}
                        onChange={(e) => setFormData({...formData, uetdsPasswordEncrypted: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ADMIN ACCOUNT SUB-FORM - ONLY FOR NEW TENANTS */}
              {!editingTenant && (
                <div className="p-6 bg-slate-800/20 border border-slate-700/50 rounded-3xl space-y-6">
                  <h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-[0.2em]">
                    <Users size={20} className="text-cyan-400" /> Şirket Yönetici Hesabı
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed italic">Şirketin sisteme girebilmesi için bir admin hesabı otomatik oluşturulacaktır.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin E-posta</label>
                      <input
                        required
                        type="email"
                        placeholder="admin@sirket.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 transition-all"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Giriş Şifresi</label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 transition-all font-mono"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] border-l-4 border-slate-700 pl-3">İletişim ve Adres</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Destek E-posta</label>
                    <input
                      type="email"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-slate-500/30 font-medium"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Telefon</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-slate-500/30 font-medium"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Firma Adresi</label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-slate-500/30 resize-none font-medium"
                    placeholder="Adresinizi buraya yazın..."
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-slate-700/50 items-center">
                 <div className="flex-1 flex items-center gap-2 group cursor-pointer" onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                    <div className={`w-10 h-6 rounded-full transition-all relative ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isActive ? 'left-5' : 'left-1'}`}></div>
                    </div>
                    <span className="text-xs font-black text-slate-400 uppercase">Hesabı Aktifleştir</span>
                 </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 rounded-2xl text-sm font-black text-slate-500 hover:text-white hover:bg-slate-800 transition-all uppercase tracking-widest"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl text-sm font-black shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all uppercase tracking-widest"
                >
                  {editingTenant ? 'DEĞİŞİKLİKLERİ KAYDET' : 'ŞİRKETİ KAYDET VE BİTİR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
