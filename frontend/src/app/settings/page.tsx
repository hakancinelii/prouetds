'use client';

import { useState, useEffect } from 'react';
import { uetdsApi, tenantsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings, Wifi, CheckCircle2, Loader2, Shield, Key, Save, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    uetdsUsername: '',
    uetdsPasswordEncrypted: '',
    uetdsUnetNo: '',
    taxNumber: '',
    uetdsEnvironment: 'test',
  });

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      const res = await tenantsApi.get('me');
      const data = res.data;
      setFormData({
        name: data.companyName || '',
        uetdsUsername: data.uetdsUsername || '',
        uetdsPasswordEncrypted: data.uetdsPasswordEncrypted || '',
        uetdsUnetNo: data.unetNumber || '',
        taxNumber: data.taxNumber || '',
        uetdsEnvironment: data.settings?.uetdsEnvironment || 'test',
      });
    } catch (err) {
      toast.error('Şirket bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        companyName: formData.name,
        taxNumber: formData.taxNumber,
        uetdsUsername: formData.uetdsUsername,
        uetdsPasswordEncrypted: formData.uetdsPasswordEncrypted,
        unetNumber: formData.uetdsUnetNo,
        settings: {
          uetdsEnvironment: formData.uetdsEnvironment
        }
      };
      await tenantsApi.update('me', payload);
      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (err: any) {
      toast.error('Kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await uetdsApi.test();
      setTestResult({ success: true, data: res.data });
      toast.success('UETDS bağlantısı başarılı!');
    } catch (err: any) {
      setTestResult({ success: false, error: err.response?.data?.message || err.message });
      toast.error('UETDS bağlantısı başarısız');
    }
    setTesting(false);
  };

  const handleValidateCredentials = async () => {
    setTesting(true);
    try {
      const res = await uetdsApi.validate();
      setTestResult({ success: true, data: res.data });
      toast.success(`Kimlik doğrulandı! Firma: ${res.data.firmaUnvan || 'OK'}`);
    } catch (err: any) {
      setTestResult({ success: false, error: err.response?.data?.message });
      toast.error('Kimlik doğrulama başarısız');
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings size={24} className="text-emerald-400" /> Ayarlar
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 size={18} className="text-blue-400" /> Şirket & UETDS Bilgileri
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Şirket Adı</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Şirket Ünvanı"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">UETDS Ortamı</label>
                  <select
                    value={formData.uetdsEnvironment}
                    onChange={(e) => setFormData({ ...formData, uetdsEnvironment: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="test">Test Ortamı (SandBox)</option>
                    <option value="production">Canlı Ortam (Production)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Vergi No</label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Vergi No"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">UNET No</label>
                  <input
                    type="text"
                    value={formData.uetdsUnetNo}
                    onChange={(e) => setFormData({ ...formData, uetdsUnetNo: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Örn: 123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">UETDS Kullanıcı Adı</label>
                  <input
                    type="text"
                    value={formData.uetdsUsername}
                    onChange={(e) => setFormData({ ...formData, uetdsUsername: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="TC No veya Kullanıcı Adı"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">UETDS Şifre</label>
                  <input
                    type="password"
                    value={formData.uetdsPasswordEncrypted}
                    onChange={(e) => setFormData({ ...formData, uetdsPasswordEncrypted: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="******"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Ayarları Kaydet
            </button>
          </div>
        </form>

        {/* Connection Tests Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Wifi size={18} className="text-cyan-400" /> Bağlantı Testi
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Girilen bilgilerin UETDS servisiyle uyuşup uyuşmadığını kontrol edin.
            </p>
            <div className="space-y-3">
              <button onClick={handleTestConnection} disabled={testing} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-all">
                {testing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                Bağlantıyı Test Et
              </button>
              <button onClick={handleValidateCredentials} disabled={testing} className="w-full py-2 bg-slate-800/50 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-sm flex items-center justify-center gap-2 transition-all">
                <Key size={16} /> Kimlik Doğrula
              </button>
            </div>

            {testResult && (
              <div className={`mt-4 p-4 rounded-xl border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Shield size={14} className="text-red-400" />}
                  <span className={`text-xs font-semibold ${testResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                    {testResult.success ? 'Başarılı' : 'Hata Mevcut'}
                  </span>
                </div>
                <pre className="text-[10px] leading-tight text-slate-400 overflow-auto max-h-32 p-2 bg-black/30 rounded-lg">
                  {JSON.stringify(testResult.data || testResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
            <h3 className="text-sm font-semibold mb-2 text-blue-300 flex items-center gap-2">
              <Shield size={14} /> Güvenlik Notu
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              UETDS şifreleriniz veritabanında şifrelenmiş olarak tutulur. Gerçek zamanlı testler Turkiye.gov.tr servislerine doğrudan istek atar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
