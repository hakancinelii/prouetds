import Link from 'next/link';

const deletionSteps = [
  'Hesap e-postanızı, bağlı olduğunuz firma adını ve silme talebinizi WhatsApp üzerinden ProUETDS destek hattına iletin.',
  'Talebin yetkili kullanıcıdan geldiğini doğrulamak için ek bilgi istenebilir.',
  'Doğrulama tamamlandıktan sonra kullanıcı hesabınız pasifleştirilir ve silme süreci başlatılır.',
  'Silme işlemi tamamlandığında talebi ileten kişiye destek kanalı üzerinden bilgi verilir.',
];

const deletedData = [
  'Kullanıcı hesabı bilgileri: e-posta, ad, soyad, telefon ve oturum bilgileri',
  'Firma hesabıyla ilişkili operasyon kayıtları: araç, şoför, yolcu ve sefer kayıtları',
  'Kullanıcı tarafından yüklenen belge, görsel veya dosya içerikleri',
  'Destek talebine konu olan iletişim kayıtları',
];

const retainedData = [
  'Yasal yükümlülükler, güvenlik, sahtekarlık önleme, muhasebe veya uyuşmazlık çözümü için saklanması gereken kayıtlar mevzuatta öngörülen süre boyunca saklanabilir.',
  'UETDS bildirim geçmişi, işlem logları ve entegrasyon kayıtları operasyonel doğrulama ve yasal gereklilikler kapsamında sınırlı süreyle saklanabilir.',
  'Saklanması gerekmeyen kişisel veriler silinir, anonimleştirilir veya erişimi kısıtlanır.',
];

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--background-start-rgb))] px-6 py-10 text-slate-800 dark:text-slate-100 lg:px-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-[rgb(var(--border-rgb))]/24 bg-white/94 p-6 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/4 md:p-10">
        <Link href="/" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300">
          ← Ana sayfaya dön
        </Link>

        <div className="mt-8 border-b border-[rgb(var(--border-rgb))]/24 pb-8 dark:border-white/8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">ProUETDS</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Hesap ve Veri Silme Talebi</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Bu sayfa, ProUETDS kullanıcılarının hesaplarının ve ilişkili verilerinin silinmesini nasıl talep edebileceğini açıklar.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-emerald-500/16 bg-emerald-500/8 p-5">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Silme talebi nasıl gönderilir?</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {deletionSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <a href="https://wa.me/905545812034" className="mt-5 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">
            WhatsApp ile silme talebi gönder
          </a>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Silinebilecek veri türleri</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {deletedData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Saklanabilecek veri türleri ve saklama süresi</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {retainedData.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-sky-500/16 bg-sky-500/8 p-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Kısmi veri silme talepleri</h2>
          <p className="mt-3">
            Hesabınızın tamamını silmeden belirli araç, şoför, yolcu, sefer veya belge kayıtlarının silinmesini talep edebilirsiniz. Talebiniz, firma yetkileri ve yasal saklama yükümlülükleri dikkate alınarak değerlendirilir.
          </p>
        </section>

        <p className="mt-8 text-xs leading-6 text-slate-500 dark:text-slate-400">
          Son güncelleme: 29 Nisan 2026
        </p>
      </div>
    </main>
  );
}
