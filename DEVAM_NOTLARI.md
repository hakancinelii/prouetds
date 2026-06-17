# prouetds — Devam Notları (Kaldığımız Yer)

> PC sıfırlandıktan sonra VS Code + Claude kurulunca buradan devam et.
> Son güncelleme: 17 Haziran 2026

---

## 🟢 EN SON NE YAPILDI

**Özellik: Otopilot WhatsApp mesajından REHBER ismini otomatik algılıyor** (commit `52fb60e`)
- Dosya: `backend/src/modules/trips/trips.service.ts`
- Eklenen metot: `inferAutopilotGuide(message)` — mesajdaki `"Rehber: Ad Soyad [TC]"` kalıbını ayrıştırır.
- Otopilot sefer oluşturduktan sonra rehberi **personel tipi 5** olarak ekler:
  - `"Rehber: Ahmet Yılmaz"` → TC'siz ekler
  - `"Rehber Mehmet Demir 12345678901"` → TC ile ekler
- Otopilot `decisions` listesine rehber kararı da eklendi.
- **Durum: Canlıda (backend deploy edildi + frontend deploy edildi).**

**Önceki ilgili işler:**
- `4e70749` — Personel modalına "yeni rehber" inline formu (Personel Ekle → Rehber → iki sekme: kayıtlı seç / yeni ekle)
- `55dfb26` — Otopilot kalkış saatini mesajdan ayrıştırıyor (sabit 23:00 değil)
- `7a29b14` — Sürücü onboarding'de "+90" tek başına telefon = eksik sayılıyor

---

## 🏗️ CANLIDA NE NEREDE ÇALIŞIYOR

| Parça | Teknoloji | Nerede çalışıyor | Deploy |
|-------|-----------|------------------|--------|
| **backend/** | NestJS (`node dist/main`) | **Hetzner sunucu** `46.224.206.123` (prouetds-prod), PM2 adı **`prouetds-api`** | SSH + git pull + build + pm2 restart |
| **frontend/** | Next.js | **Vercel** (otomatik) | `git push` → Vercel otomatik deploy |
| **mobile/** | Expo (prouetds-mobile) | (mağaza/expo) | ayrı |
| **Veritabanı** | PostgreSQL | Hetzner sunucuda, backend `.env` içindeki `POSTGRES_URL` | — |

- Backend kodu sunucuda: **`/root/prouetds/backend`**
- Sunucu SSH anahtarı: **`~/.ssh/hetzner_nopass`** (parolasız) ← **SIFIRLAMADA KAYBOLUR, YEDEKLE!**

---

## 🚀 DEPLOY KOMUTLARI

**Frontend (Vercel):** sadece push yeter
```bash
git push origin main
```

**Backend (Hetzner sunucu):**
```bash
ssh -i ~/.ssh/hetzner_nopass -o IdentitiesOnly=yes root@46.224.206.123 \
  "cd /root/prouetds && git pull origin main && cd backend && npm run build && pm2 restart prouetds-api"
```
> PM2 process adı **`prouetds-api`** (sakın `backend` deme, o ad yok).
> Durum kontrol: `pm2 status prouetds-api`

---

## 🔄 SIFIRLAMADAN SONRA KURULUM

1. **Repo'yu klonla:** `git clone https://github.com/hakancinelii/prouetds.git`
2. **Bağımlılıklar:** `cd prouetds/backend && npm install` ve `cd ../frontend && npm install`
3. **.env'leri geri koy** (USB yedeğinden — GitHub'da YOK):
   - `backend/.env` (POSTGRES_URL vb.)
   - `frontend/.env.local`
4. **SSH anahtarını geri koy:** USB'den `~/.ssh/hetzner_nopass` (ve `.pub`) → `chmod 600 ~/.ssh/hetzner_nopass`
5. Çalıştır: `cd backend && npm run start:dev` / `cd frontend && npm run dev`

> USB yedeği: `PC_YEDEK_2026-06-16/_ARSIVLER/prouetds-TAM.tgz` (tüm proje, .git dahil).
> Çıkarmak için: `tar -xzf prouetds-TAM.tgz`

---

## ⚠️ GİZLİ / YEDEKLENMESİ ŞART (GitHub'da yok)
- `backend/.env` (POSTGRES_URL, sırlar)
- `frontend/.env.local`
- `~/.ssh/hetzner_nopass` (sunucu erişimi) — repo dışında!
- Repo kökündeki `hetzner_*.json` ve `hetzner_ed25519` dosyaları (Hetzner API/SSH)

> Güvenlik notu: git remote adresinde gömülü bir GitHub token var. İstersen sıfırlama sonrası
> GitHub → Settings → Developer settings'ten iptal edip yenile.
