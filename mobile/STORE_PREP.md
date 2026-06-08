# ProUETDS Mobil Mağaza Hazırlığı

## Uygulama kimliği
- Android package: `com.prouetds.mobile`
- iOS bundle identifier: `com.prouetds.mobile`
- Uygulama adı: `ProUETDS`
- Kısa ad: `ProUETDS`

## Gerekli mağaza içerikleri
- Kısa açıklama
- Uzun açıklama
- Gizlilik politikası URL'si
- Destek URL'si
- 1024x1024 ikon
- Telefon ve tablet screenshot setleri

## Build komutları
```bash
cd mobile
npm install
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

## Yayın öncesi kontrol
- Giriş akışı çalışıyor mu
- Backend production URL doğru mu
- Splash ve ikonlar doğru mu
- iOS/Android sürüm numaraları artırıldı mı
- Apple App Store Connect ve Google Play Console kayıtları hazır mı
