# Pro UETDS Mobil Mağaza Hazırlığı

## Uygulama kimliği
- Uygulama adı (mağaza): `Pro UETDS`
- Android package: `com.prouetds.mobile`
- iOS bundle identifier: `com.prouetds.mobile`
- EAS owner: `hakancineli`
- WebView hedefi: `https://www.prouetds.com.tr`

## Mağaza içerikleri
- Kısa açıklama / Uzun açıklama
- Gizlilik politikası: https://www.prouetds.com.tr/gizlilik-politikasi
- Hesap silme: https://www.prouetds.com.tr/hesap-silme
- Destek e-posta / URL
- 1024x1024 ikon (assets/icon.png)
- Telefon + tablet ekran görüntüleri

## Build
```bash
cd mobile
npm install
npx eas login
npx eas build --platform android --profile production   # .aab
npx eas build --platform ios --profile production        # .ipa (Apple hesabı gerekir)
```

## Android submit (Google Play)
1. Play Console'da `com.prouetds.mobile` paketiyle uygulamayı oluştur.
2. Google Cloud'da bir **service account** aç, Play Console > API access'ten yetki ver,
   JSON anahtarını indir ve `mobile/google-service-account.json` olarak kaydet
   (BU DOSYA GIT'E EKLENMEZ — .gitignore'da).
3. **İLK sürümü Play Console'dan ELLE yükle** (Google, yeni uygulamanın ilk .aab'ını
   API ile kabul etmez). Sonraki sürümler için:
```bash
npx eas submit --platform android --latest
```

## iOS submit (App Store) — Apple Developer hesabı hazır olunca
```bash
npx eas submit --platform ios --latest
```

## Yayın öncesi kontrol
- Giriş akışı çalışıyor mu
- Pasaport fotoğrafı yükleme/OCR (kamera+galeri izinleri) çalışıyor mu
- Splash ve ikonlar doğru mu
- Sürüm numaraları (remote/autoIncrement EAS yönetiyor)
