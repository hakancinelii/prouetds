'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { authApi, resetAuthSession } from '@/lib/api';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetAuthSession();

    try {
      const res = await authApi.login(email, password);
      login(res.data.accessToken, res.data.refreshToken, res.data.user);
      toast.success('Giriş başarılı!');
      router.push('/trips');
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-2xl shadow-emerald-500/30 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            ProUETDS
          </h1>
          <p className="text-slate-300 mt-2 text-sm">
            Tarifesiz Yolcu Taşımacılığı Bildirim Sistemi
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                E-posta Adresi
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="ornek@sirket.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          {/* New Registration CTA */}
          <div className="mt-8 pt-6 border-t border-slate-700/50 text-center space-y-3">
             <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Yeni misiniz?</p>
             <button 
               type="button"
               onClick={() => window.location.href = '/register'}
               className="inline-flex items-center gap-2 text-emerald-400 font-black hover:text-emerald-300 transition-all group text-sm cursor-pointer relative z-[100] outline-none"
             >
               Sistemi İnceleme Talebi Oluşturun <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          © 2026 ProUETDS - Tüm hakları saklıdır
        </p>
      </div>
    </div>
  );
}
