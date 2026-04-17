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
      <h1 className="text-2xl theme-heading flex items-center gap-2">
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
                  <label htmlFor="settings-company-name" className="label-muted">Şirket Adı</label>
                  <input
                    id="settings-company-name"
                    title="Şirket adı"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Şirket Ünvanı"
                  />
                </div>
                <div>
                  <label htmlFor="settings-environment" className="label-muted">UETDS Ortamı</label>
                  <select
                    id="settings-environment"
                    title="UETDS ortamı"
                    value={formData.uetdsEnvironment}
                    onChange={(e) => setFormData({ ...formData, uetdsEnvironment: e.target.value })}
                    className="input-field"
                  >
                    <option value="test">Test Ortamı (SandBox)</option>
                    <option value="production">Canlı Ortam (Production)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-tax-number" className="label-muted">Vergi No</label>
                  <input
                    id="settings-tax-number"
                    title="Vergi numarası"
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="input-field"
                    placeholder="Vergi No"
                  />
                </div>
                <div>
                  <label htmlFor="settings-unet" className="label-muted">UNET No</label>
                  <input
                    id="settings-unet"
                    title="UNET numarası"
                    type="text"
                    value={formData.uetdsUnetNo}
                    onChange={(e) => setFormData({ ...formData, uetdsUnetNo: e.target.value })}
                    className="input-field"
                    placeholder="Örn: 123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-username" className="label-muted">UETDS Kullanıcı Adı</label>
                  <input
                    id="settings-username"
                    title="UETDS kullanıcı adı"
                    type="text"
                    value={formData.uetdsUsername}
                    onChange={(e) => setFormData({ ...formData, uetdsUsername: e.target.value })}
                    className="input-field"
                    placeholder="TC No veya Kullanıcı Adı"
                  />
                </div>
                <div>
                  <label htmlFor="settings-password" className="label-muted">UETDS Şifre</label>
                  <input
                    id="settings-password"
                    title="UETDS şifre"
                    type="password"
                    value={formData.uetdsPasswordEncrypted}
                    onChange={(e) => setFormData({ ...formData, uetdsPasswordEncrypted: e.target.value })}
                    className="input-field"
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
            <p className="text-xs theme-text-soft mb-6 leading-relaxed">
              Girilen bilgilerin UETDS servisiyle uyuşup uyuşmadığını kontrol edin.
            </p>
            <div className="space-y-3">
              <button type="button" onClick={handleTestConnection} disabled={testing} className="w-full py-2 theme-control rounded-lg text-sm flex items-center justify-center gap-2 transition-all">
                {testing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                Bağlantıyı Test Et
              </button>
              <button type="button" onClick={handleValidateCredentials} disabled={testing} className="w-full py-2 theme-action-soft rounded-lg text-sm flex items-center justify-center gap-2 transition-all">
                <Key size={16} /> Kimlik Doğrula
              </button>
            </div>

            {testResult && (
              <div className={`mt-4 p-4 rounded-xl ${testResult.success ? 'theme-success-panel' : 'theme-danger-panel'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" /> : <Shield size={14} className="text-red-500 dark:text-red-400" />}
                  <span className={`text-xs font-semibold ${testResult.success ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>
                    {testResult.success ? 'Başarılı' : 'Hata Mevcut'}
                  </span>
                </div>
                <pre className="text-[10px] leading-tight theme-text-soft overflow-auto max-h-32 p-2 theme-pre rounded-lg">
                  {JSON.stringify(testResult.data || testResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="glass-card p-6 theme-note">
            <h3 className="text-sm font-semibold mb-2 text-sky-700 dark:text-sky-300 flex items-center gap-2">
              <Shield size={14} /> Güvenlik Notu
            </h3>
            <p className="text-[11px] theme-text-soft leading-normal">
              UETDS şifreleriniz veritabanında şifrelenmiş olarak tutulur. Gerçek zamanlı testler Turkiye.gov.tr servislerine doğrudan istek atar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
