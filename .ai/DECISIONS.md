# TRUSS — Mimari Karar Kayıtları (`DECISIONS.md`)

> **Kural (`P0-to-Rule`):** Çözülen her P0/P1 hatası veya temel mimari karar buraya tam **3 satır** (`Tarih` · `Kök Neden` · `Kalıcı Kural`) olarak işlenir.

### ADR-01: `pg` DATE (`OID 1082`) Saf `YYYY-MM-DD` Ayrıştırması
- **Tarih:** 2026-11-24 (`V2.1-BE`)
- **Kök Neden:** `node-postgres` varsayılan olarak `DATE` kolonlarını yerel gece yarısı `Date` nesnesine çevirip JSON serileştirmede UTC-1 gün kaymasına yol açıyordu.
- **Kalıcı Kural:** `Backend/db.js` içinde `pg.types.setTypeParser(1082, (val) => val)` zorunludur; tüm `DATE` kolonları saf `YYYY-MM-DD` string döner.

### ADR-02: Türkiye (`Europe/Istanbul`) Saat Dilimi Gelecek Tarih Kontrolü
- **Tarih:** 2026-11-24 (`V2.1-BE`)
- **Kök Neden:** `Joi.date().iso().max('now')` UTC bazlı çalıştığı için Türkiye'de gece 00:00–02:59 arasında bugünün tarihini "gelecek tarih" sayıp `400` hatası veriyordu.
- **Kalıcı Kural:** Tarih doğrulamalarında Joi `.max('now')` yasaktır; `Backend/utils/dateUtils.js` (`tarihStr` + `ileriTarihMi`) kullanılır.

### ADR-03: `422` Odometer Guard & `FOR UPDATE` Satır Kilidi
- **Tarih:** 2026-11-23 (`MP-7` / `MP-7b`)
- **Kök Neden:** Eşzamanlı yakıt/bakım eklemelerinde veya geçmiş tarihli kayıtlarda sayaç (`KM`/`SMH`) kronolojisi bozulabiliyordu.
- **Kalıcı Kural:** Yakıt ve bakım yazma işlemlerinde `araclariKilitle` (`FOR UPDATE`) + `sayacSinirlari` kontrolü zorunludur; ihlalde `422` (`ODOMETER_VIOLATION`) döner ve UI'da satır içi gösterilir.

### ADR-04: `update` / `delete` Sonrası `aracSayaciniSenkronizeEt`
- **Tarih:** 2026-11-23 (`MP-8` / `V2.1-BE`)
- **Kök Neden:** En yüksek KM'li hareket silindiğinde, düşürüldüğünde veya başka araca taşındığında `araclar.guncel_km` / `guncel_calisma_saati` eski yüksek değerde asılı kalıyordu.
- **Kalıcı Kural:** Her yakıt/bakım `update` ve `delete` işleminde (araç değiştiyse hem eski hem yeni araç için) transaction içinde `aracSayaciniSenkronizeEt` çağrılır.

### ADR-05: Çoklu `FLEET_MANAGER` Organizasyon (`org_id`) İzolasyonu
- **Tarih:** 2026-11-24 (`V2.1-BE`)
- **Kök Neden:** Aynı organizasyondaki ikinci bir `FLEET_MANAGER`, `a.kullanici_id = user.user_id` filtresi yüzünden organizasyonun diğer araçlarını göremiyordu.
- **Kalıcı Kural:** `buildVehicleAccessFilter` ve `checkVehicleOwnership` içinde `user.org_id` varsa `EXISTS (SELECT 1 FROM users o WHERE o.user_id = a.kullanici_id AND o.org_id = $N)` kullanılır.

### ADR-06: `radix-luma` Semantik Tema & Eski `truss-*` / Sabit Palet Yasağı
- **Tarih:** 2026-11-23 (`V2.1-FE1`)
- **Kök Neden:** Sabit `zinc-*`, `slate-*`, `truss-*` ve `#hex` renkleri açık/koyu tema geçişlerinde kontrast ve görsel bütünlük kırılmasına yol açıyordu.
- **Kalıcı Kural:** Tüm v2 bileşenlerinde yalnızca `radix-luma` OKLCH semantik tokenları (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`) kullanılır.

### ADR-07: İkonsuz Tipografik `TRU` + `SS` Logo Standardı
- **Tarih:** 2026-11-23 (`V2.1-FE1`)
- **Kök Neden:** Farklı sayfalarda (`AppShell`, `AuthFrame`, `HomePage`) tutarsız SVG/ikon amblemler marka kimliğini parçalıyordu.
- **Kalıcı Kural:** TRUSS logosu her yüzeyde ikonsuz, saf tipografik `TRU` (`text-foreground`) + `SS` (`text-primary`) olarak render edilir.

### ADR-08: Çift Katmanlı RBAC (`ChannelGuard` + Backend Middleware)
- **Tarih:** 2026-11-24 (`V2.1-BE` / `V2.1-FE2`)
- **Kök Neden:** Sadece UI'da gizlenen yönetim/rapor uçları doğrudan API çağrısıyla `DRIVER` rolüne açık kalabiliyordu.
- **Kalıcı Kural:** Her modül Frontend'de `<ChannelGuard />` + `channelAccess.js`, Backend'de ise rol/sahiplik middleware'i (`403`) ile çift taraflı korunur.

### ADR-09: `updateParca` Üzerinde `arac_id` Değişmezliği
- **Tarih:** 2026-11-24 (`V2.1-BE`)
- **Kök Neden:** Bir parçanın `PUT /api/parcalar/:id` ile başka bir araca taşınması takılma KM'si ve araç sayaç geçmişini tutarsızlaştırıyordu.
- **Kalıcı Kural:** `updateParca` farklı bir `arac_id` gönderildiğinde `400` döner ve `UPDATE` sorgusunda `arac_id` kolonunu asla değiştirmez.

### ADR-10: Evrensel Tek Girişli AI-OS (`AGENTS.md` + `.ai/*`)
- **Tarih:** 2026-11-24 (`OPS-1`)
- **Kök Neden:** Dağınık v1 kural ve anayasa dokümanları eski `ABTS` adını ve geçersiz renk/mimari kurallarını ajan bağlamına sızdırıyordu.
- **Kalıcı Kural:** Tüm AI araçları (`CLAUDE.md`, `.cursorrules`, `.windsurfrules`) tek kaynak olan `AGENTS.md` ve `.ai/*` dosyalarına işaret eder; eski dokümanlar silinir veya `.ai/archive/` altında ignore edilir.

### ADR-11: Nullable Katalog Alanlarında `undefined` vs `null` Ayrımı (`PATCH/PUT`)
- **Tarih:** 2026-11-24 (`QA-SWEEP-BE`)
- **Kök Neden:** `aracMutationHandlers.js` içinde `kategori_id ? Number(kategori_id) : mevcut.kategori_id` kontrolü, manuel kategoriye geçişte gönderilen açık `null` değerini eski katalog ID'siyle eziyordu.
- **Kalıcı Kural:** Güncelleme uçlarında temizlenebilir FK/katalog alanları falsy kontrolle değil `field !== undefined ? (field ? Number(field) : null) : mevcut.field` kalıbıyla işlenir.

### ADR-12: Kademeli Async Dropdown İstek İptali & Kısmi Form Hidrasyonu
- **Tarih:** 2026-11-24 (`QA-SWEEP-FE`)
- **Kök Neden:** Üst katalog seçimi veya `MANUAL_OPTION` geçişinde in-flight alt dropdown istekleri iptal edilmiyor ve async hidrasyon tüm formu `setForm(resolved)` ile ezip kullanıcı girdisini siliyordu.
- **Kalıcı Kural:** Kademeli dropdown değişimlerinde alt listeler fetch öncesi temizlenip alt `RequestIdRef` sayaçları artırılır; async hidrasyon/fallback efektleri yalnız ilgili alanları `prev` üzerine kısmi patch'ler.

### ADR-13: `SYSTEM_ADMIN` Organizasyon (`org_id`) Kiracı İzolasyonu
- **Tarih:** 2026-11-24 (`V2.1-HOTFIX-W1`)
- **Kök Neden:** `buildVehicleAccessFilter` içinde `SYSTEM_ADMIN` koşulsuz `'1=1'` döndüğü için organizasyona bağlı adminler rakip kiracı araçlarını görebiliyordu.
- **Kalıcı Kural:** `SYSTEM_ADMIN` için `user.org_id` tanımlıysa `o.org_id = $N` filtresi uygulanır; yalnız `org_id IS NULL` platform yöneticisi `'1=1'` görür.

### ADR-14: `JWT_SECRET` Fail-Fast & Güvenli Araç Sahipliği Devri (`ON DELETE SET NULL`)
- **Tarih:** 2026-11-24 (`V2.1-HOTFIX-W1`)
- **Kök Neden:** Hardcoded JWT fallback zayıf imza riski yaratıyor ve `fk_araclar_kullanici ON DELETE CASCADE` hesap silmede tüm organizasyon filosunu siliyordu.
- **Kalıcı Kural:** `Backend/utils/jwtSecret.js` (`getJwtSecret()`) boot ve auth akışlarında zorunludur; `fk_araclar_kullanici` `ON DELETE SET NULL` olarak tanımlanır ve `DELETE /settings/account` önce araçları aynı org yöneticisine devreder veya `409` döner.

### ADR-15: Sayaç Tipi Kilidi, Başlangıç Sayacı Tabanı, 3-Anahtarlı RBAC & Finans Gizliliği
- **Tarih:** 2026-11-25 (`V2.1-HOTFIX-W2`)
- **Kök Neden:** Boş hareketli araçta başlangıç KM ezilebiliyor, kayıtlı araçta `KM/SMH` değiştirilebiliyor, UI'da etkisiz 6'lı yetki anahtarları sahte `1/6 Yakıt AÇIK` üretiyor ve `analytics` yetkisi olmayan sürücülere tablo/özet tutarları sızıyordu.
- **Kalıcı Kural:** Hareket/parça kaydı olan araçta `sayac_tipi` değişimi `422` ile engellenir ve boş hareketlerde `araclar.guncel_km` tabanı korunur; ekip yetki matrisi yalnız sunucudaki 3 aktif anahtarı (`yakit`, `bakim`, `finans`) esas alır ve finans sütun/özetleri `canAccessChannel(user, 'analytics')` ile gizlenir.

### ADR-16: Yakıt/Bakım Joi Taşma Koruması, `CORS_ORIGIN`, Gate 2 `utils/**` & State/Toast Hijyeni
- **Tarih:** 2026-11-25 (`V2.1-HOTFIX-W3`)
- **Kök Neden:** Kök lockfile ve `index.css` eski `ABTS`/`--truss-*` kalıntıları taşıyor, yakıt/bakım sayısal taşmaları `500` üretiyor, `localStorage.clear()` tema tercihini siliyor ve inline form hataları çift toast basıyordu.
- **Kalıcı Kural:** Yakıt/bakım yazma uçları DB sayısal limitleriyle sınırlı Joi şemaları kullanır, `server.js` `process.env.CORS_ORIGIN` okur, Gate 2 `Frontend/src/utils/**` yolunu da tarar; çıkışta yalnız auth/filo store sıfırlanır, tablolar `autoResetPageIndex: false` kullanır ve inline alan hataları `notifyApiError` tetiklemez.

### ADR-17: Doğrudan `araclar.org_id` Kiracı İzolasyonu, Sıfır Runtime DDL & Fatura/Oluşturan Normalizasyonu
- **Tarih:** 2026-11-25 (`V2.2-DBPERF`)
- **Kök Neden:** Dolaylı `users` alt sorgusu (`EXISTS`) ve eksik kompozit indeksler sorguları yavaşlatıyor, `kullanici_id IS NULL` araçlar org izolasyonundan düşebiliyor, runtime `ALTER TABLE` çağrıları istek yolunu kirletiyor ve fatura/belge/oluşturan bilgisi metin içinde kayboluyordu.
- **Kalıcı Kural:** `buildVehicleAccessFilter` ve atama sorguları doğrudan indeksli `a.org_id = $N` kullanır (`ensureManagerOrgId` TX backfill ile); controller/route içi `ALTER TABLE` yasaktır (tüm şema değişiklikleri idempotent `database.sql` + migration scripti ile yürür) ve `yakitlar`/`bakimlar` `fatura_no`, `belge_url`, `olusturan_user_id` kolonlarını kalıcı olarak tutar.

