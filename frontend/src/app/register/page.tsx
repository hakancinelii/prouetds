'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight,
  FileText,
  MapPin,
  Loader2
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    taxNumber: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    email: '', // Admin email
    password: '', // Admin password
    firstName: '',
    lastName: '',
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.register(formData);
      setIsSuccess(true);
      toast.success('Kayıt talebiniz başarıyla alındı!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse delay-700" />
        
        <div className="glass-card max-w-lg w-full p-10 text-center space-y-8 animate-pop-in relative z-10 border-t-8 border-emerald-500">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
            <CheckCircle2 size={48} className="text-emerald-400" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-white tracking-tight">Talep Alındı!</h1>
            <p className="text-slate-400 leading-relaxed">
              ProUETDS sistemine kaydınız ve satın alma inceleme talebiniz başarıyla bize ulaştı. Ekibimiz en kısa sürede firmanızı inceleyip onay süreci hakkında bilgilendirme yapacaktır.
            </p>
          </div>
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-sm text-emerald-400 font-medium italic">
            "Desteğiniz ve ilginiz için teşekkürler! Sizi aramızda görmek için sabırsızlanıyoruz."
          </div>
          <Link 
            href="/login" 
            className="btn-primary w-full flex items-center justify-center gap-2 group py-4 h-auto text-base"
          >
            Giriş Sayfasına Dön <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-xl z-10 space-y-8 animate-fade-in">
        {/* Logo Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-4 bg-slate-900/50 p-4 rounded-3xl border border-slate-800 shadow-2xl mb-4">
             <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck size={28} className="text-white" />
             </div>
             <div className="text-left">
                <h2 className="text-2xl font-black text-white leading-none">ProUETDS</h2>
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Yeni Kayıt / Satın Alma</span>
             </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Sistemi İncelemeye Başlayın</h1>
          <p className="text-slate-400">Firmanızı dakikalar içinde kaydedin, UETDS dünyasına adım atın.</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-between gap-4 px-10 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
          <div className={`absolute top-1/2 left-0 h-0.5 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500 ${step === 2 ? 'w-full' : 'w-0'}`} />
          
          {[1, 2].map((i) => (
            <div 
              key={i} 
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${
                step >= i ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/10' : 'bg-slate-900 border-slate-800 text-slate-600'
              }`}
            >
              {step > i ? <CheckCircle2 size={20} /> : i}
              <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest font-black w-max ${step === i ? 'text-emerald-400' : 'text-slate-600'}`}>
                {i === 1 ? 'ŞİRKET' : 'YÖNETİCİ'}
              </span>
            </div>
          ))}
        </div>

        {/* Form Container */}
        <div className="glass-card p-8 md:p-10 shadow-2xl relative">
          <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-8">
            {/* STEP 1: COMPANY INFO */}
            {step === 1 && (
              <div className="space-y-6 animate-slide-right">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Şirket Ünvanı / Adı</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-400 transition-colors" size={20} />
                      <input
                        required
                        type="text"
                        placeholder="Örn: Öz Turizm Nakliyat"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                        value={formData.companyName}
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Vergi Numarası</label>
                      <div className="relative group">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-400 transition-colors" size={18} />
                        <input
                          required
                          type="text"
                          maxLength={11}
                          placeholder="VKN / TCKN"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-mono"
                          value={formData.taxNumber}
                          onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Telefon</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-400 transition-colors" size={18} />
                        <input
                          required
                          type="text"
                          placeholder="05..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                          value={formData.contactPhone}
                          onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">İletişim E-postası</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-400 transition-colors" size={18} />
                      <input
                        required
                        type="email"
                        placeholder="sirket@example.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Merkez Adresi</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors" size={18} />
                      <textarea
                        rows={2}
                        placeholder="Sirket genel merkez adresi..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" className="btn-primary flex items-center gap-2 group px-10 py-4 h-auto text-base">
                    Yönetici Bilgilerine Geç <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ADMIN INFO */}
            {step === 2 && (
              <div className="space-y-6 animate-slide-left">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Adınız</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Soyadınız</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Giriş E-postasınız</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-400 transition-colors" size={20} />
                      <input
                        required
                        type="email"
                        placeholder="yonetici@gmail.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 ml-1 italic font-medium">Bu e-posta sisteme giriş yaparken kullanılacaktır.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Giriş Şifreniz</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-400 transition-colors" size={20} />
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-mono"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-[11px] text-slate-400 leading-relaxed italic">
                    Kaydı tamamladığınızda talebiniz incelenecek ve profiliniz onaylandıktan sonra bu bilgilerle giriş yapabileceksiniz.
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4">
                  <button type="button" onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-2 font-black uppercase text-[11px] tracking-widest transition-all">
                    <ArrowLeft size={16} /> Geri
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="btn-primary flex items-center gap-2 px-12 py-4 h-auto text-base"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Talebi Gönder'}
                    {!isLoading && <ChevronRight size={20} />}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
           <p className="text-slate-500 text-sm">Zaten üye misiniz? <Link href="/login" className="text-emerald-400 font-black hover:text-emerald-300 transition-colors">Şimdi Giriş Yapın</Link></p>
        </div>
      </div>
    </div>
  );
}
