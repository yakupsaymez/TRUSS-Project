# TRUSS — Mühendislik Korkulukları (`ENGINEERING_GUARDRAILS.md`)

## 1. Tasarım Sistemi (`radix-luma` & Tailwind v4)
- **Zorunlu Semantik Tokenlar:** `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-destructive`, `ring-ring`.
- **Kesin Yasaklı Sınıflar & Renkler:**
  - Ham `#hex`, `rgb()`, `hsl()` renk değerleri (grafik/harita CSS değişkenleri hariç).
  - Eski/sabit paletler: `zinc-*`, `slate-*`, `purple-*`, `emerald-*`, `amber-*`, `truss-*`.
  - Ağır GPU efektleri: `blur-3xl` ve aşırı dekoratif glow katmanları.
- **Logo Standardı:** İkonsuz tipografik `TRU` (`text-foreground`) + `SS` (`text-primary`) — harici SVG/ikon amblem kullanılmaz.
- **Tipografi & Sayısal Veri:** Tüm plaka, KM, çalışma saati (`SMH`), tutar (₺), litre ve tarih sütunlarında `tabular-nums` (`font-mono` veya `tabular-nums`) zorunludur.

## 2. Yasaklı Importlar & Tarayıcı Çağrıları
- Next.js kalıntıları: `"use client"`, `next/*` (`next/link`, `next/navigation`, `next/image`).
- Bildirim/Takvim: `sonner` (yalnızca `react-hot-toast` kullanılır), `components/ui/calendar` (yalnızca `<TrussDatePicker />` kullanılır).
- Native diyaloglar: `window.confirm`, `window.alert`, `window.prompt` (yalnızca `<ConfirmDialog />` veya `<AppSheet />` kullanılır).

## 3. Tarih, Zaman Dilimi ve `<TrussDatePicker />`
- Tüm tarih girişlerinde `<TrussDatePicker />` (`Frontend/src/components/ui/truss-date-picker.jsx`) zorunludur.
- Backend `pg` sürücüsünde `DATE` (`OID 1082`) saf `YYYY-MM-DD` string olarak parse edilir (`Backend/db.js`).
- Gelecek tarih kontrolleri UTC `Joi.date().max('now')` ile değil, `Backend/utils/dateUtils.js` (`tarihStr` + `ileriTarihMi`, `Europe/Istanbul`) ile yapılır.

## 4. RBAC & Çoklu Kiracı (`org_id`) Güvenliği
- **Frontend:** Rota seviyesinde `<ChannelGuard channel="..." />` ve bileşen seviyesinde `channelAccess.js` (`canAccessChannel`, `isFleetManager`) zorunludur.
- **Backend:** Tüm korumalı uçlarda `authMiddleware` + `rbacMiddleware` (`buildVehicleAccessFilter`, `checkVehicleOwnership`) zorunludur.
- **SQL & `org_id` İzolasyonu:** Tüm sorgular parametreli (`$1, $2`) olmalıdır. `FLEET_MANAGER` erişimi kullanıcının `org_id` sınırıyla (`EXISTS (SELECT 1 FROM users o WHERE o.user_id = a.kullanici_id AND o.org_id = $N)`) izole edilir.

## 5. `422` Odometer Guard & Hata Bildirim disiplini
- Sayaç (`KM` / `SMH`) kronolojik sınırlarını ihlal eden kayıtlar Backend'den `422` (`code: 'ODOMETER_VIOLATION'` veya `'SAYAC_GERI_GIDEMEZ'`) döner.
- Frontend `422` hatalarında global toast **göstermez**; hata `<SayacFieldError />` ile ilgili form alanının altında satır içi (inline) gösterilir.
- `403` yetki hatalarında interceptor ile sayfa bileşeni arasında çift toast (double-toast) tetiklenmesi yasaktır.

## 6. Dosya Boyutu, Modülerlik & Bundle Bütçesi
- **Satır Limitleri (Ratchet):**
  - `≤ 300` satır: İdeal hedef.
  - `301 – 450` satır: Uyarı bölgesi (yeni özellik eklenirken bölünmeli).
  - `> 600` satır: **Sert Ret** (`OPS-2` `ai-gate` tarafından engellenir; mevcut büyük dosyalar tek satır bile büyüyemez).
- **`> 400` Satır Feature-Module Kuralı:** 400 satırı aşan her sayfa veya modül `FeatureName/index.jsx` + alt bileşen/hook klasör yapısına bölünür.
- **Entry Chunk Bütçesi:** Vite production build ana giriş paketi (`index-*.js`) için hedef `≤ 350 KB`, sert üst sınır **`450 KB`**'dır.
