# TRUSS — Filo Yönetim Sistemi

Araç filonuzu tek ekrandan yönetin. TRUSS; yakıt takibi, bakım planlaması ve gerçek zamanlı bildirimlerle kurumsal filo operasyonlarını kolaylaştıran modern bir web uygulamasıdır.

## Özellikler

- **Yönetim Merkezi** — Tüm araçların anlık durumu, yakıt tüketimi ve bakım özeti tek panelde
- **Araç Takibi** — Araç ekleme, düzenleme, yakıt girişi ve bakım geçmişi
- **Bakım Planlama** — Periyodik bakım hatırlatmaları ve servis takibi
- **Bildirim Sistemi** — E-posta ve SMS ile otomatik hatırlatmalar
- **Raporlama** — PDF çıktı desteğiyle yakıt ve bakım raporları
- **Karanlık Tema** — Shadcn tabanlı, tamamen özelleştirilebilir arayüz

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Shadcn UI |
| State | Zustand |
| Routing | React Router v7 |
| Grafik | Recharts |
| Form | Zod |
| Backend | Node.js, Express |
| Veritabanı | PostgreSQL |
| Auth | JWT |
| Bildirim | Nodemailer (SMTP) |

## Kurulum

### Gereksinimler

- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd Backend
cp .env.example .env
# .env dosyasını kendi bilgilerinizle düzenleyin
npm install
npm run dev
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde çalışır.

## Proje Yapısı

```
ABTS/
├── Backend/
│   ├── routes/          # API rotaları
│   ├── services/        # E-posta, SMS, bildirim servisleri
│   ├── db.js            # Veritabanı bağlantısı
│   └── server.js        # Express sunucusu
└── Frontend/
    └── src/
        ├── components/  # Shadcn UI bileşenleri
        ├── pages/       # Sayfa bileşenleri
        └── store/       # Zustand store
```

## Lisans

MIT
