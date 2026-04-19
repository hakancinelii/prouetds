import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Bus,
  CarFront,
  FileText,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';

const heroStats = [
  { label: 'UETDS Uyumlu', value: 'Bakanlık akışına hazır' },
  { label: 'Operasyon Hızı', value: 'Dakikalar içinde bildirim' },
  { label: 'Mobil Erişim', value: 'Her cihazdan kullanım' },
];

const advantages = [
  {
    title: 'Tek panelden operasyon',
    description:
      'Araç, şoför, yolcu ve sefer akışını tek ekranda toparlayın; tekrar tekrar aynı veriyi girmeyin.',
    icon: Bus,
  },
  {
    title: 'Bakanlık uyumlu veri akışı',
    description:
      'Kalkış, varış, personel ve yolcu bilgilerini UETDS için doğru sırada hazırlayıp gönderin.',
    icon: ShieldCheck,
  },
  {
    title: 'Raporlama ve görünürlük',
    description:
      'Taslak, gönderildi, hata ve iptal durumlarını operasyonda anlık takip edin.',
    icon: BarChart3,
  },
  {
    title: 'Bildirim ve belge erişimi',
    description:
      'Sefer çıktılarını sistem içinde açın, dış harita uygulamasına rota yönlendirmesi verin.',
    icon: FileText,
  },
];

const steps = [
  'Ulaştırma Bakanlığına bildirim gönderecek kullanıcı bilgilerinizi hazırlayın.',
  'Araç, şoför ve yolcu kayıtlarınızı sisteme bir kez tanımlayın.',
  'Sefer akışını oluşturup UETDS gönderimini birkaç adımda tamamlayın.',
  'Çıktıları, logları ve hata durumlarını aynı panelden yönetin.',
];

const features = [
  {
    title: 'Araç ve personel hafızası',
    description: 'Kayıtlı araç ve şoförleri seferlerde tekrar seçerek operasyon süresini kısaltın.',
    icon: CarFront,
  },
  {
    title: 'Yolcu ekleme araçları',
    description: 'Manuel giriş, metin, Excel ve OCR ile yolcu verisini hızla sisteme alın.',
    icon: Users,
  },
  {
    title: 'Sefer detay çalışma alanı',
    description: 'Rota, UETDS referansı, PDF ve personel bilgilerini tek sayfada yönetin.',
    icon: MapPinned,
  },
  {
    title: 'Mobil uyumlu panel',
    description: 'Sahada telefon ve tablet üzerinden sefer, araç ve şoför yönetimi yapın.',
    icon: Smartphone,
  },
  {
    title: 'Durum ve hata takibi',
    description: 'Gönderildi, taslak, hata ve iptal durumlarını renkli rozetlerle anında görün.',
    icon: Bell,
  },
  {
    title: 'Belge ve çıktı erişimi',
    description: 'UETDS PDF çıktısını uygulama içinde görüntüleyin veya indirin.',
    icon: BadgeCheck,
  },
];

const pricingPlans = [
  {
    code: 'A-10',
    monthlyPrice: '750 ₺',
    yearlyPrice: '7.500 ₺',
    detail: '1-10 Araç / Max.10 Kullanıcı',
  },
  {
    code: 'A-25',
    monthlyPrice: '1.300 ₺',
    yearlyPrice: '13.000 ₺',
    detail: '11-25 Araç / Max.25 Kullanıcı',
  },
  {
    code: 'A-50',
    monthlyPrice: '2.400 ₺',
    yearlyPrice: '24.000 ₺',
    detail: '26-50 Araç / Max.50 Kullanıcı',
  },
  {
    code: 'A-Sınırsız',
    monthlyPrice: '8.000 ₺',
    yearlyPrice: '80.000 ₺',
    detail: 'Limitsiz Araç / Limitsiz Kullanıcı',
  },
];

const faqs = [
  {
    question: 'Bu sistem kimler için uygun?',
    answer:
      'Tarifesiz yolcu taşımacılığı yapan ve UETDS bildirim yükümlülüğü olan firmalar için operasyonu sadeleştirir.',
  },
  {
    question: 'Bakanlık kullanıcı adı ve şifresi gerekli mi?',
    answer:
      'Evet. Ayarlar ekranından kurum tarafından verilen kullanıcı adı ve şifre ile bağlantı testi yapılabilir.',
  },
  {
    question: 'Mobilde çalışıyor mu?',
    answer:
      'Evet. Sefer listeleri, detay ekranları ve araç/şoför modalları mobil kullanım için optimize edildi.',
  },
];

const testimonials = [
  {
    quote: 'Önceden saatlerimizi alan bildirim işi artık birkaç dakikada bitiyor.',
    name: 'Bilal Canbolat',
    company: 'Abbasi Tur',
  },
  {
    quote: 'Araç ve personel kayıtlarını bir kez tanımlayıp aynı gün içinde birden fazla seferde kullanabiliyoruz.',
    name: 'Uğur Yılmaz',
    company: 'UY Turizm',
  },
  {
    quote: 'Sefer, PDF ve log akışını tek panelde görmek operasyon ekibine ciddi rahatlık sağladı.',
    name: 'Ferdi Akkoyun',
    company: 'Kent16',
  },
];

const showcaseLinks = [
  {
    label: 'U-ETDS giriş ekranı',
    href: '/login',
  },
  {
    label: 'Sefer detay çalışma alanı',
    href: '/trips',
  },
  {
    label: 'Araç ve personel yönetimi',
    href: '/vehicles',
  },
];

const publicPanels = [
  'Web uyumlu altyapı',
  'Mobil uyumluluk',
  'Araç ve sefer tanımlama',
  'Bildirim ve belge erişimi',
];

const quickLinks = ['Ana Sayfa', 'Hakkımızda', 'Blog', 'İletişim', 'U-ETDS Giriş'];

const whatsappHref = 'https://wa.me/905545812034';
const landingBadge = 'Türkiye’nin UETDS operasyon paneli';
const landingTitle = 'UETDS verilerinizi Ulaştırma Bakanlığına daha hızlı, daha temiz ve daha az hatayla gönderin.';
const landingBody =
  'ProUETDS; araç, şoför, yolcu ve sefer verilerinizi tek panelde toparlayarak Ulaştırma Bakanlığına gönderim sürecini operasyon ekipleri için sadeleştirir.';
const landingAboutTitle = 'Bakanlığa iletilmesi gereken verileri web üzerinden tek merkezde yönetin.';
const landingAboutBody =
  'ProUETDS, tarifesiz yolcu taşımacılığı yapan firmaların araç, personel ve yolcu verilerini tekrar tekrar girmeden sefer bazında hazırlamasına yardımcı olur.';
const landingAboutBody2 =
  'Sistem, bakanlığın talep ettiği veri akışını operasyona daha uygun bir iş sırasına çevirir: sefer oluştur, araç ata, personel ekle, yolcu ekle, gönder.';
const landingSupportTitle = 'UETDS operasyonlarınızı daha az eforla yönetin.';
const landingSupportBody =
  'Ayarlar ekranından kurum bilgilerinizi girin, araç ve personel kayıtlarınızı oluşturun, ardından sefer akışını aynı gün içinde canlı kullanmaya başlayın.';
const pricingIntro = 'Aylık ve yıllık fiyatlandırma ile araç ve kullanıcı kapasitenize göre en uygun paketi seçin.';
const pricingText =
  'Aylık paketler hızlı başlangıç için, yıllık paketler ise iki ay avantajlı uzun dönem kullanım için tasarlandı.';
const pricingNote =
  'Yıllık alımlarda 12 ay yerine 10 aylık ödeme yaparak 2 aylık indirimli kullanabilirsiniz.';

export default function Home() {
  return (
    <div className="min-h-screen bg-[rgb(var(--background-start-rgb))] text-[rgb(var(--foreground-rgb))]">
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10 lg:px-10">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-300">
              <BadgeCheck size={16} /> {landingBadge}
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-balance text-5xl font-black tracking-tight text-slate-950 dark:text-white md:text-6xl">
                {landingTitle}
              </h1>
              <p className="max-w-3xl text-pretty text-lg leading-8 text-slate-600 dark:text-slate-300">
                {landingBody}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-6 py-3 text-base font-semibold text-white shadow-[0_18px_42px_-24px_rgba(14,165,233,0.55)] transition hover:translate-y-[-1px]"
              >
                U-ETDS Giriş <ArrowRight size={18} />
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border-rgb))]/40 bg-white/80 px-6 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <MessageCircle size={18} /> Ücretsiz dene
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[rgb(var(--border-rgb))]/28 bg-white/88 p-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[rgb(var(--border-rgb))]/26 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] p-6 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.4)] dark:border-white/8 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94))]">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Operasyon paneli
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Bugün gönderilen 24 sefer</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/12 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  UETDS hazır
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-[rgb(var(--border-rgb))]/24 bg-[rgb(var(--surface-rgb))]/94 p-5 dark:border-white/8 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Öncelikli işler</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Operasyon takibi</p>
                </div>
                {[
                  ['2 şoför ataması bekliyor', 'Bugün'],
                  ['1 araç muayene uyarısı', '3 gün kaldı'],
                  ['4 taslak sefer gönderim bekliyor', 'Hazır'],
                ].map(([title, meta]) => (
                  <div
                    key={title}
                    className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border-rgb))]/18 bg-[rgb(var(--surface-soft-rgb))]/76 px-4 py-3 dark:border-white/8 dark:bg-white/4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tek panelden ilerlet</p>
                    </div>
                    <span className="rounded-full bg-slate-900/6 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/8 dark:text-slate-300">
                      {meta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-24 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
              U-ETDS sistemi nedir?
            </p>
            <h2 className="text-balance text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              {landingAboutTitle}
            </h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-slate-600 dark:text-slate-300">
            <p>{landingAboutBody}</p>
            <p>{landingAboutBody2}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.turkiye.gov.tr/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border-rgb))]/26 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-500/30 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-300"
              >
                E-Devlet üzerinden veri göndermek isterseniz
              </a>
              <a
                href="https://www.resmigazete.gov.tr/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border-rgb))]/26 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-500/30 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-300"
              >
                Yönetmelik detaylarını inceleyin
              </a>
            </div>
          </div>
        </section>

        <section className="mt-24">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Nasıl başlarım?</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">İlk kurulum adımlarını sadeleştirdik.</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Bakanlık kullanıcı bilgilerinizi girdikten sonra paneli gerçek operasyon akışınıza göre kurup dakikalar içinde kullanmaya başlayabilirsiniz.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-[1.6rem] border border-[rgb(var(--border-rgb))]/22 bg-white/92 p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/4"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/12 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {index + 1}
                  </div>
                  <p className="text-base font-medium text-slate-900 dark:text-white">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Avantajlar</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Operasyonu hafifleten araçlar</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              UETDS verilerinizi ücretsiz ve kolay şekilde yönetin.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {['Ücretsiz', 'Hiçbir yardım ve desteğe ihtiyaç duymayan pratik kullanım', 'Raporlama seçenekleri', 'Müşterilere SMS ve Email bildirim', 'Gelişmiş mod ile ek özellikler', 'Ve daha fazlası...'].map((item) => (
              <div
                key={item}
                className="rounded-[1.4rem] border border-[rgb(var(--border-rgb))]/18 bg-[rgb(var(--surface-rgb))]/92 px-5 py-4 text-sm font-semibold text-slate-900 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/4 dark:text-white"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 rounded-[2rem] border border-[rgb(var(--border-rgb))]/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,245,249,0.9))] p-8 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94))]">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Neler sunuyoruz?</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Operasyonu taşıyan ürün özellikleri</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Araç, personel, yolcu, sefer ve bildirim akışlarını tek platformda toplayarak tekrar eden işleri azaltır ve kontrolü merkezileştirir.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-[rgb(var(--border-rgb))]/20 bg-white/88 p-5 dark:border-white/8 dark:bg-white/4"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-500/12 text-sky-700 dark:text-sky-300">
                    <item.icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">{item.title}</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24 rounded-[2rem] border border-[rgb(var(--border-rgb))]/24 bg-white/94 p-8 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] dark:border-white/8 dark:bg-white/4">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Ücretlendirme</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Aylık ve yıllık fiyatlandırma</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300">Aylık ve yıllık fiyatlandırma ile araç ve kullanıcı kapasitenize göre en uygun paketi seçin.</p>
            </div>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">Aylık paketler hızlı başlangıç için, yıllık paketler ise iki ay avantajlı uzun dönem kullanım için tasarlandı.</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            {pricingPlans.map((plan) => (
              <article
                key={plan.code}
                className="rounded-[1.6rem] border border-[rgb(var(--border-rgb))]/22 bg-[rgb(var(--surface-rgb))]/96 p-6 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)] dark:border-white/8 dark:bg-white/4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">{plan.code} Paketi</p>
                <div className="mt-5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Aylık Ücret</p>
                  <p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{plan.monthlyPrice}</p>
                </div>
                <div className="mt-5 border-t border-[rgb(var(--border-rgb))]/22 pt-5 dark:border-white/8">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Yıllık Ücret</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{plan.yearlyPrice}</p>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{plan.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-emerald-500/14 bg-emerald-500/8 px-5 py-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Yıllık alımlarda 12 ay yerine 10 aylık ödeme yaparak 2 aylık indirimli kullanabilirsiniz.
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Araç limiti büyüdükçe aynı panel ve aynı akış üzerinden devam edersiniz.</p>
        </section>

        <section className="mt-24 rounded-[2rem] border border-[rgb(var(--border-rgb))]/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.92))] p-8 shadow-[0_30px_72px_-48px_rgba(15,23,42,0.32)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94))]">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Ekran görüntüleri</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Paneli görerek karar verin</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">Giriş, sefer ve araç yönetimi ekranları ile operasyon ekibinizin gün içinde kullanacağı tüm alanlar tek üründe birleşir.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {showcaseLinks.map((item) => (
              <article
                key={item.label}
                className="rounded-[1.5rem] border border-[rgb(var(--border-rgb))]/20 bg-white/90 p-5 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-white/4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">UETDS Sistemi</p>
                <h3 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">{item.label}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">Panel içindeki ilgili ekranı canlı olarak inceleyin.</p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  Aç <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-[rgb(var(--border-rgb))]/22 bg-white/92 p-8 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Müşteri görüşleri</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Operasyonda zaman kazanan ekiplerin geri bildirimi</h2>
            <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">Araç, personel ve yolcu akışını tek panelde toplamak, sahadaki operasyon yükünü azaltıyor.</p>
            <div className="mt-8 space-y-4">
              {testimonials.map((item) => (
                <article key={item.name} className="rounded-2xl border border-[rgb(var(--border-rgb))]/18 bg-[rgb(var(--surface-soft-rgb))]/68 p-5 dark:border-white/8 dark:bg-white/4">
                  <p className="text-base leading-8 text-slate-700 dark:text-slate-300">“{item.quote}”</p>
                  <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">{item.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.company}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[rgb(var(--border-rgb))]/22 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(14,165,233,0.12))] p-8 shadow-[0_26px_60px_-36px_rgba(15,23,42,0.3)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(14,165,233,0.16))]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 dark:text-white">Hemen başlayın</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              UETDS operasyonlarınızı daha az eforla yönetin.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-200">
              Ayarlar ekranından kurum bilgilerinizi girin, araç ve personel kayıtlarınızı oluşturun, ardından sefer akışını aynı gün içinde canlı kullanmaya başlayın.
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">WhatsApp üzerinden hemen soru sorabilir, fiyat ve başvuru detaylarını hızlıca alabilirsiniz.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Panele giriş yap <ArrowRight size={18} />
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/85 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white dark:border-white/12 dark:bg-white/6 dark:text-white dark:hover:bg-white/10"
              >
                <MessageCircle size={16} /> WhatsApp ile yaz
              </a>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/85 px-5 py-4 text-sm font-semibold text-slate-900 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <MessageCircle size={18} /> WhatsApp ile mesaj gönderin: +90 554 581 20 34
            </a>
          </div>
        </section>

        <section className="mt-24 rounded-[2rem] border border-[rgb(var(--border-rgb))]/22 bg-white/92 p-8 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/4">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Sık sorulanlar</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">U-ETDS hakkında sık sorulanlar</h2>
            </div>
            <div className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              <p>WhatsApp üzerinden hızlı iletişim kurun.</p>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              {faqs.map((item) => (
                <article key={item.question} className="rounded-2xl border border-[rgb(var(--border-rgb))]/18 bg-[rgb(var(--surface-soft-rgb))]/68 p-5 dark:border-white/8 dark:bg-white/4">
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.answer}</p>
                </article>
              ))}
            </div>
            <div className="rounded-[1.7rem] border border-emerald-500/14 bg-emerald-500/8 p-6 dark:border-white/8 dark:bg-white/4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 dark:text-white">Hemen başlayın</p>
              <h3 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white">UETDS operasyonlarınızı daha az eforla yönetin.</h3>
              <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-300">Ayarlar ekranından kurum bilgilerinizi girin, araç ve personel kayıtlarınızı oluşturun, ardından sefer akışını aynı gün içinde canlı kullanmaya başlayın.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Panele giriş yap <ArrowRight size={18} />
                </Link>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/85 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white dark:border-white/12 dark:bg-white/6 dark:text-white dark:hover:bg-white/10"
                >
                  <MessageCircle size={16} /> WhatsApp ile yaz
                </a>
              </div>
              <div className="mt-8 rounded-2xl border border-slate-900/8 bg-white/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                WhatsApp üzerinden hemen soru sorabilir, fiyat ve başvuru detaylarını hızlıca alabilirsiniz.
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-24 flex flex-col gap-8 rounded-[2rem] border border-[rgb(var(--border-rgb))]/22 bg-[rgb(var(--surface-rgb))]/92 p-8 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/4">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">ProUETDS</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">
                Tarifesiz yolcu taşımacılığı için UETDS operasyon paneli.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Hızlı Erişim</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {quickLinks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Sistem Özellikleri</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {publicPanels.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">İletişim</p>
                <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">WhatsApp üzerinden hızlı iletişim kurun.</p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
                >
                  <MessageCircle size={16} /> +90 554 581 20 34
                </a>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">© 2026 ProUETDS, Tüm Hakları Saklıdır</div>
        </footer>
      </main>
    </div>
  );
}
