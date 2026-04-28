import Link from 'next/link';

const sections = [
  {
    title: '1. Veri sorumlusu',
    body: [
      'ProUETDS, tarifesiz yolcu taşımacılığı yapan firmaların UETDS operasyonlarını yönetmesine yardımcı olan bir yazılım hizmetidir. Bu gizlilik politikası, ProUETDS web sitesi, yönetim paneli ve mobil uygulaması üzerinden işlenen kişisel verilere ilişkin bilgilendirme amacıyla hazırlanmıştır.',
      'İletişim: +90 554 581 20 34',
    ],
  },
  {
    title: '2. İşlenen veri türleri',
    body: [
      'Hizmetin kullanımına göre firma yetkilisi bilgileri, kullanıcı hesap bilgileri, ad-soyad, telefon, e-posta, araç bilgileri, şoför/personel bilgileri, yolcu bilgileri, kimlik veya pasaport bilgileri, sefer ve rota bilgileri, UETDS referansları, işlem logları ve destek talepleri işlenebilir.',
      'Pasaport veya belge okuma gibi özellikler kullanıldığında, kullanıcı tarafından yüklenen görseller yalnızca ilgili operasyonel kaydın oluşturulması ve doğrulanması amacıyla işlenir.',
    ],
  },
  {
    title: '3. Verilerin işlenme amaçları',
    body: [
      'Kişisel veriler; kullanıcı hesabı oluşturma, firma ve operasyon yönetimi, araç/şoför/yolcu/sefer kayıtlarının tutulması, UETDS bildirim süreçlerinin yürütülmesi, belge ve çıktıların oluşturulması, hata kayıtlarının izlenmesi, güvenlik, destek ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.',
    ],
  },
  {
    title: '4. Verilerin aktarımı',
    body: [
      'UETDS bildirimi için gerekli bilgiler, yetkili kullanıcı talebiyle ilgili kamu kurumlarının sistemlerine veya entegrasyon servislerine iletilebilir. Ayrıca barındırma, veritabanı, güvenlik, analiz, e-posta ve teknik altyapı hizmeti alınan hizmet sağlayıcılar verileri yalnızca hizmetin sunulması amacıyla işleyebilir.',
      'ProUETDS, kişisel verileri reklam amacıyla üçüncü taraflara satmaz.',
    ],
  },
  {
    title: '5. Saklama süresi',
    body: [
      'Veriler, hizmetin sunulması, sözleşmesel ilişkilerin yürütülmesi, mevzuattan doğan yükümlülüklerin yerine getirilmesi ve olası uyuşmazlıkların çözümlenmesi için gerekli süre boyunca saklanır. Yasal veya operasyonel gereklilik ortadan kalktığında veriler silinir, anonimleştirilir veya mevzuata uygun şekilde arşivlenir.',
    ],
  },
  {
    title: '6. Güvenlik',
    body: [
      'ProUETDS, verilerin yetkisiz erişime, kayba, değiştirilmeye veya kötüye kullanıma karşı korunması için teknik ve idari güvenlik önlemleri uygular. Veri aktarımı güvenli bağlantılar üzerinden yapılır; kullanıcı hesaplarına erişim yetkilendirme mekanizmalarıyla sınırlandırılır.',
    ],
  },
  {
    title: '7. Kullanıcı hakları',
    body: [
      'Kullanıcılar, yürürlükteki mevzuat kapsamında kişisel verilerine erişme, yanlış veya eksik verilerin düzeltilmesini isteme, işleme şartları ortadan kalkmışsa silme veya anonimleştirme talep etme, işleme faaliyetleri hakkında bilgi isteme ve ilgili diğer haklarını kullanma hakkına sahiptir.',
      'Bu haklara ilişkin talepler WhatsApp veya destek kanalları üzerinden ProUETDS ekibine iletilebilir.',
    ],
  },
  {
    title: '8. Çerezler ve benzeri teknolojiler',
    body: [
      'Web sitesi ve panelde oturum yönetimi, güvenlik, performans ve kullanım deneyiminin iyileştirilmesi amacıyla çerezler veya benzeri teknolojiler kullanılabilir. Tarayıcı ayarlarından çerez tercihleri yönetilebilir; ancak bazı çerezlerin devre dışı bırakılması hizmetin belirli bölümlerini etkileyebilir.',
    ],
  },
  {
    title: '9. Politika değişiklikleri',
    body: [
      'Bu politika, ürün özellikleri, yasal gereklilikler veya operasyonel süreçlerdeki değişikliklere göre güncellenebilir. Güncel metin her zaman bu sayfada yayımlanır.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--background-start-rgb))] px-6 py-10 text-slate-800 dark:text-slate-100 lg:px-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-[rgb(var(--border-rgb))]/24 bg-white/94 p-6 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/4 md:p-10">
        <Link href="/" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300">
          ← Ana sayfaya dön
        </Link>
        <div className="mt-8 border-b border-[rgb(var(--border-rgb))]/24 pb-8 dark:border-white/8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">ProUETDS</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Gizlilik Politikası</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Son güncelleme: 28 Nisan 2026
          </p>
        </div>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-emerald-500/16 bg-emerald-500/8 p-5 text-sm leading-7 text-slate-700 dark:text-slate-200">
          Gizlilik politikası hakkında sorularınız için WhatsApp üzerinden bizimle iletişime geçebilirsiniz: <a href="https://wa.me/905545812034" className="font-semibold text-emerald-700 dark:text-emerald-300">+90 554 581 20 34</a>
        </div>
      </div>
    </main>
  );
}
