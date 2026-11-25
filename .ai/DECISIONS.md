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

### ADR-18: Bildirim Dedup Kilidi, `predictiveService` TR Takvimi & Finansal Bildirim RBAC Gizliliği
- **Tarih:** 2026-11-25 (`V2.2-NOTIFY`)
- **Kök Neden:** Eski cron yalnız ham e-posta/SMS atıyor, tekrarlı uyarıları tekilleştirmiyor, `UNION ALL` içinde `kayit_id DESC` ile yanlış son 2 hareketi seçip yerel `Date` kayması yaşıyor ve `bildirim_tercihleri` ile `maliyet_ozeti` finans yetkisi denetimi yapmıyordu.
- **Kalıcı Kural:** `bildirim_olaylari` üzerinde `UNIQUE (user_id, kategori, referans_anahtar)` + `ON CONFLICT DO NOTHING` dedup kilidi uygulanır; `predictiveService` `ORDER BY tarih DESC, km DESC` ve `dateUtils` TR takvimiyle sıfır-bölünme korumalı çalışır; tüm bildirim/aksiyon uçlarında `users.bildirim_tercihleri` matrisi ve `maliyet_ozeti`/bütçe uyarıları için `hasFinanceAccess` RBAC filtresi zorunludur.

### ADR-19: Yakıt Anomali Motoru İdempotensi, Tuple Sıralı Öncül & Kiracı İzolasyonu
- **Tarih:** 2026-11-25 (`V2.2-ANOMALY-BE`)
- **Kök Neden:** Tekrarlı taramalar veya yakıt güncellemeleri aynı kayıt için mükerrer anomali üretebilir, incelenmiş kararları silebilir, `km <= 0`/eksik kayıtlarda yanlış ardışık dolum seçebilir veya `PATCH` ucunda kiracı sınırını aşabilirdi.
- **Kalıcı Kural:** `yakit_anomalileri` üzerinde `uq_yakit_anomali_kayit_tip` + `ON CONFLICT DO NOTHING` idempotensi uygulanır; önceki kayıt yalnız `curKm > 0` iken `(tarih, km, yakit_id) < (...)` tuple sırasıyla seçilir; `update` yalnız `durum = 'acik'` kayıtları yenileyip `incelendi`/`yoksayildi` kararlarını korur ve `PATCH /anomaliler/:id` `FROM araclar a` + `buildVehicleAccessFilter` ile kiracı izolasyonu sağlar.

### ADR-20: Gizli E-posta Dedup Kilidi, Ortak Saf Anomali Kuralları & Tek-Yayın Event Senkronu
- **Tarih:** 2026-11-25 (`V2.2-POLISH`)
- **Kök Neden:** `uygulama: false, email: true` tercihinde dedup `INSERT`'i atlanıyor, TCO CTE'leri tüm tabloyu tarıyor, toplu anomali taraması N+1 sorgu + kural ayrışması riski taşıyor ve `VehicleSheet`/`Parcalar`/`BudgetVarianceCard` mutasyonları `truss:data-changed` eksikliği/çift fetch üretiyordu.
- **Kalıcı Kural:** E-posta bildirimleri `meta_json.uygulama_gizli = true` + `okundu_mu = TRUE` ile `bildirim_olaylari` dedup kilidine yazılır ve controller `GET`/`PATCH` uçlarında gizli satırlara `404` döner; `fuelAnomalyRules.js` saf kural yardımcılarını tekil ve toplu (`UNNEST ... RETURNING anomali_id`) tarama paylaşır; FE mutasyonları tekil `truss:data-changed` (`component`, `vehicle`, `budget`) ve `requestIdRef` ile çift fetch olmadan senkronize edilir.

### ADR-21: Principal Bar, `/critic` Red-Team Skilli & Zorunlu Faz 1 Öz-Denetimi
- **Tarih:** 2026-11-25 (`OPS-5b`)
- **Kök Neden:** Onaylayıcı (sycophantic) açılışlar, seçenek menüsü sunma ve yüzeysel happy-path planlama/QA pratikleri yarış durumu, kiracı sızıntısı ve dikiş (`seam`) hatalarını tasarım aşamasında gizleyebiliyordu.
- **Kalıcı Kural:** `.agent/rules/00-truss-core.md` §5 always-on Principal Bar ile övgü/seçenek menüsü yasaklanır; `.agent/skills/critic/SKILL.md` (`/critic`) ve `truss/SKILL.md` Faz 1 zorunlu okumasıyla plan/QA öncesi seam/stres öz-denetimi uygulanır (`.agent/*` `<= 55` satır, Always-On artış `<= 180` tok).

### ADR-22: Toplu Yakıt CSV İçe Aktarım İzolasyonu, Fiziksel İmza Dedup & Kronoloji Sıralaması
- **Tarih:** 2026-11-25 (`V2.2-IMPORT-BE`)
- **Kök Neden:** Global `100kb` JSON limiti büyük CSV gövdelerini kesebilir, tek başına `fatura_no` gerçek çift dolumları kaçırıp sahte çakışma üretebilir ve aynı gün ters-sıralı (`DESC`) CSV ekstreleri kronolojik sayaç doğrulamasında sahte `SAYAC_TUTARSIZ` reddine yol açabilirdi.
- **Kalıcı Kural:** `/api/yakitlar/toplu-*` için global JSON parser atlanıp rota-lokal `1mb` `bulkJsonParser` uygulanır; `FOR UPDATE` kilidi altında `arac_id|tarih|litre|tutar|km` fiziksel dolum imzası (tek başına `fatura_no` yasak) ile dedup yapılır, adaylar `(tarih ASC, km ASC NULLS LAST, satir_no ASC)` sıralanıp tek `UNNEST` ile yazılır ve ardından `evaluateBatchFuelAnomalies` çalıştırılır.

### ADR-23: Araç Soft-Archive (`arsivlendi_mi`) & Değişmez Denetim İzi (`denetim_kayitlari`)
- **Tarih:** 2026-11-25 (`V2.2-AUDIT-BE`)
- **Kök Neden:** Geçmiş yakıt/bakım/maliyetli parça kaydı olan araçların fiziksel silinmesi tarihsel finansal bütünlüğü bozuyor, ancak `parca_takip` başlangıç şablonu (maliyetsiz) hard-delete'i engellememeli; kritik mutasyonlar için de silinmeyen, kurcalanamayan ve kiracı izoleli denetim izi gerekiyordu.
- **Kalıcı Kural:** `DELETE /api/araclar/:id` geçmiş yakıt/bakım veya `COALESCE(maliyet, 0) > 0` parça varsa aktif zimmetleri kapatıp `araclar.arsivlendi_mi = TRUE` yapar (arşivli araca yeni yakıt/bakım/CSV/zimmet `409 VEHICLE_ARCHIVED` ile engellenir, geçmiş maliyetler korunur); `denetim_kayitlari` `varlik_id` üzerinde FK/`CASCADE` olmadan append-only (`GET /api/denetim-kayitlari`) tutulur, `COMMIT` sonrası maskeli `auditService.logAuditEvent` ile yazılır ve `ADR-13` `org_id` izolasyonu (`403 FORBIDDEN_ORG_REQUIRED`) uygular.

