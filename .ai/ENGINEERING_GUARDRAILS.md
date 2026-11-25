# TRUSS — Mühendislik Korkulukları (`ENGINEERING_GUARDRAILS.md`)

## 1. Tasarım Sistemi (`radix-luma` & Tailwind v4)
- **Zorunlu Tokenlar:** `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-destructive`, `ring-ring`.
- **Yasaklar:** Ham `#hex`/`rgb()`/`hsl()` (grafik/harita CSS değişkenleri hariç), `zinc-*`, `slate-*`, `purple-*`, `emerald-*`, `amber-*`, `truss-*`, `blur-3xl`.
- **Logo & Sayısal Veri:** İkonsuz `TRU` (`text-foreground`) + `SS` (`text-primary`); plaka, `KM`, `SMH`, `₺`, litre ve tarihlerde `tabular-nums`.

## 2. Yasaklı Importlar & Tarih Standardı
- **Yasak:** `"use client"`, `next/*`, `sonner` (`react-hot-toast` kullan), `components/ui/calendar` (`<TrussDatePicker />`), `window.confirm/alert/prompt` (`<ConfirmDialog />`/`<AppSheet />`).
- **Tarih (`ADR-01/02`):** `pg` `DATE` (`OID 1082`) saf `YYYY-MM-DD`; gelecek tarih kontrolü UTC `.max('now')` yerine `Backend/utils/dateUtils.js` (`tarihStr` + `ileriTarihMi`) ile yapılır.

## 3. RBAC, `a.org_id` İzolasyonu & Hata Kodları
- **FE RBAC (`ADR-08/15`):** `<ChannelGuard />` + `channelAccess.js` (`canAccessChannel`, `isFleetManager`), `403` double-toast yasak.
- **BE RBAC & Kiracı (`ADR-13/17`):** Korumalı uçlarda `authMiddleware` + `rbacMiddleware`; tüm `pg` sorguları parametreli (`$1, $2`) ve doğrudan indeksli **`a.org_id = $N`** (`SYSTEM_ADMIN` `org_id` varsa `a.org_id = $N`, yalnız `NULL` iken `'1=1'`).
- **`422 SAYAC_KRONOLOJI_IHLALI` & `409 VEHICLE_ARCHIVED` (`ADR-03/23`):** Sayaç ihlallerinde `422` (`SAYAC_KRONOLOJI_IHLALI`) döner ve UI'da global toast yerine `<SayacFieldError />` gösterilir; arşivli araca yeni hareket/parça/zimmet `409` (`VEHICLE_ARCHIVED`) döner.

## 4. Fonksiyonel Çekirdek & 3 Katmanlı UI (`ADR-24`)
- **BE Çekirdek / Kabuk:** Controller `<= 90`L; iş mantığı `req/res`-bağımsız `*WriteService` / `*Rules` `fn(client, actor, input)` + `AppError`; `pool.connect()` için `try/finally client.release()`, yazmada `FOR UPDATE`, cron'da `pg_try_advisory_lock`.
- **FE 3 Katmanlı Dikey Dilim:** Sayfa Kabuğu `<= 180`L + `use*Controller <= 200`L + Saf Görünüm `<= 200`L; yaprak görünümde API importu **yasak** (yalnız props+callback); Frozen Contract sıfır tahmin; çapraz event yalnız `utils/dataEvents.js` (`DATA_SCOPES` + `truss:data-changed`).

## 5. Dosya Boyutu & Bundle Bütçesi
- **Satır Limiti:** `<= 300`L ideal, `301-600`L uyarı, `> 600`L **sert ret** (`ai-gate`).
- **Entry Chunk Bütçesi:** Hedef `<= 350 KB`, sert sınır `450 KB` (vendor ratchet `maxChunkKb: 352 KB`).
