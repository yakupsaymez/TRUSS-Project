# TRUSS — Mimari Karar Kayıtları (`DECISIONS.md`)

> **Kural (`P0-to-Rule`):** Her P0/P1 veya mimari karar: Başlık + `Tarih · Kök Neden` + `Kalıcı Kural`.

### ADR-01: `pg` DATE (`OID 1082`) Saf `YYYY-MM-DD` Ayrıştırması
- **2026-11-24 (`V2.1-BE`) · Kök Neden:** `node-postgres` `DATE` kolonlarını yerel gece yarısı `Date` nesnesine çevirip JSON'da UTC-1 gün kayması yaratıyordu.
- **Kalıcı Kural:** `Backend/db.js` içinde `pg.types.setTypeParser(1082, (val) => val)` zorunludur; tüm `DATE` kolonları saf `YYYY-MM-DD` string döner.

### ADR-02: Türkiye (`Europe/Istanbul`) Saat Dilimi Gelecek Tarih Kontrolü
- **2026-11-24 (`V2.1-BE`) · Kök Neden:** `Joi.date().iso().max('now')` UTC bazlı çalıştığından TR 00:00–02:59 arası bugünü gelecek tarih sayıp `400` veriyordu.
- **Kalıcı Kural:** Joi `.max('now')` yasaktır; `Backend/utils/dateUtils.js` (`tarihStr` + `ileriTarihMi`) kullanılır.

### ADR-03: `422 SAYAC_KRONOLOJI_IHLALI` & `FOR UPDATE` Satır Kilidi
- **2026-11-23 (`MP-7/7b`) · Kök Neden:** Eşzamanlı yakıt/bakım eklemelerinde ve geçmiş tarihli kayıtlarda `KM`/`SMH` kronolojisi bozulabiliyordu.
- **Kalıcı Kural:** Yakıt/bakım yazmada `araclariKilitle` (`FOR UPDATE`) + `sayacSinirlari` zorunludur; ihlalde `422` (`SAYAC_KRONOLOJI_IHLALI`) döner ve UI'da `<SayacFieldError />` ile satır içi gösterilir.

### ADR-04: `update` / `delete` Sonrası `aracSayaciniSenkronizeEt`
- **2026-11-23 (`MP-8`/`V2.1-BE`) · Kök Neden:** En yüksek KM silindiğinde, düşürüldüğünde veya taşındığında `araclar.guncel_km` / `guncel_calisma_saati` yüksek değerde asılı kalıyordu.
- **Kalıcı Kural:** Her yakıt/bakım `update`/`delete` işleminde (araç değiştiyse eski+yeni) TX içinde `aracSayaciniSenkronizeEt` çağrılır.

### ADR-05: `[SUPERSEDED -> ADR-17]` Çoklu `FLEET_MANAGER` `org_id` İzolasyonu
- **2026-11-24 (`V2.1-BE`) · Kural:** Eski `EXISTS (SELECT 1 FROM users o ...)` alt sorgusu `ADR-17` doğrudan indeksli `a.org_id = $N` filtresiyle değiştirildi.

### ADR-06: `radix-luma` Semantik Tema & Eski `truss-*` / Sabit Palet Yasağı
- **2026-11-23 (`V2.1-FE1`) · Kök Neden:** Sabit `zinc-*`, `slate-*`, `truss-*` ve `#hex` açık/koyu tema geçişinde kontrastı kırıyordu.
- **Kalıcı Kural:** Tüm v2 bileşenlerde yalnız `radix-luma` OKLCH semantik tokenları (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`) kullanılır.

### ADR-07: İkonsuz Tipografik `TRU` + `SS` Logo Standardı
- **2026-11-23 (`V2.1-FE1`) · Kök Neden:** Farklı sayfalarda (`AppShell`, `AuthFrame`, `HomePage`) tutarsız SVG amblemler marka kimliğini parçalıyordu.
- **Kalıcı Kural:** TRUSS logosu her yüzeyde ikonsuz, saf tipografik `TRU` (`text-foreground`) + `SS` (`text-primary`) olarak render edilir.

### ADR-08: Çift Katmanlı RBAC (`ChannelGuard` + Backend Middleware)
- **2026-11-24 (`V2.1-BE/FE2`) · Kök Neden:** Sadece UI'da gizlenen yönetim/rapor uçları doğrudan API çağrısıyla `DRIVER` rolüne açık kalabiliyordu.
- **Kalıcı Kural:** Her modül FE'de `<ChannelGuard />` + `channelAccess.js`, BE'de rol/sahiplik middleware'i (`403`) ile çift taraflı korunur.

### ADR-09: `updateParca` Üzerinde `arac_id` Değişmezliği
- **2026-11-24 (`V2.1-BE`) · Kök Neden:** `PUT /api/parcalar/:id` ile parçayı başka araca taşımak takılma KM ve araç geçmişini bozuyordu.
- **Kalıcı Kural:** `updateParca` farklı `arac_id` gönderildiğinde `400` döner ve `UPDATE` içinde `arac_id` kolonunu asla değiştirmez.

### ADR-10: Evrensel Tek Girişli AI-OS (`AGENTS.md` + `.ai/*`)
- **2026-11-24 (`OPS-1`) · Kök Neden:** Dağınık v1 dokümanları eski `ABTS` adını ve geçersiz renk/mimari kurallarını bağlama sızdırıyordu.
- **Kalıcı Kural:** `CLAUDE.md`, `.cursorrules`, `.windsurfrules` tek kaynak `AGENTS.md` + `.ai/*` işaret eder; eski dokümanlar silinir veya `.ai/archive/` altına alınır.

### ADR-11: Nullable Katalog Alanlarında `undefined` vs `null` Ayrımı (`PATCH/PUT`)
- **2026-11-24 (`QA-SWEEP-BE`) · Kök Neden:** `aracMutationHandlers.js` falsy kontrolü manuel kategoriye geçişte gönderilen `null` değerini eski ID ile eziyordu.
- **Kalıcı Kural:** Temizlenebilir FK/katalog alanları `field !== undefined ? (field ? Number(field) : null) : mevcut.field` kalıbıyla işlenir.

### ADR-12: Kademeli Async Dropdown İstek İptali & Kısmi Form Hidrasyonu
- **2026-11-24 (`QA-SWEEP-FE`) · Kök Neden:** In-flight alt dropdown istekleri iptal edilmiyor ve async hidrasyon `setForm(resolved)` ile kullanıcı girdisini siliyordu.
- **Kalıcı Kural:** Üst seçimde alt listeler temizlenip `RequestIdRef` artırılır; async hidrasyon yalnız ilgili alanları `prev` üzerine kısmi patch'ler.

### ADR-13: `SYSTEM_ADMIN` Organizasyon (`org_id`) Kiracı İzolasyonu
- **2026-11-24 (`V2.1-HOTFIX-W1`) · Kök Neden:** `buildVehicleAccessFilter` içinde `SYSTEM_ADMIN` koşulsuz `'1=1'` döndüğü için org adminleri rakip kiracıyı görebiliyordu.
- **Kalıcı Kural:** `SYSTEM_ADMIN` için `user.org_id` tanımlıysa `a.org_id = $N` uygulanır; yalnız `org_id IS NULL` platform yöneticisi `'1=1'` görür.

### ADR-14: `JWT_SECRET` Fail-Fast & Güvenli Araç Devri (`ON DELETE SET NULL`)
- **2026-11-24 (`V2.1-HOTFIX-W1`) · Kök Neden:** Hardcoded JWT fallback zayıf imza riski yaratıyor ve `fk_araclar_kullanici ON DELETE CASCADE` hesap silmede filoyu siliyordu.
- **Kalıcı Kural:** `Backend/utils/jwtSecret.js` (`getJwtSecret()`) zorunludur; `fk_araclar_kullanici` `ON DELETE SET NULL` olur ve `DELETE /settings/account` önce araçları devreder veya `409` döner.

### ADR-15: Sayaç Tipi Kilidi, Başlangıç Tabanı, 3-Anahtarlı RBAC & Finans Gizliliği
- **2026-11-25 (`V2.1-HOTFIX-W2`) · Kök Neden:** Kayıtlı araçta `KM/SMH` değişebiliyor, 6'lı sahte UI yetki anahtarları ve `DRIVER`'a finans tutarı sızıyordu.
- **Kalıcı Kural:** Hareket/parçalı araçta `sayac_tipi` değişimi `422` ile engellenir, boş hareketlerde `guncel_km` tabanı korunur; ekip yetkisi yalnız `yakit/bakim/finans` kullanır ve finans `canAccessChannel(user, 'analytics')` ile gizlenir.

### ADR-16: Yakıt/Bakım Joi Taşma Koruması, `CORS_ORIGIN`, Gate 2 `utils/**` & State/Toast Hijyeni
- **2026-11-25 (`V2.1-HOTFIX-W3`) · Kök Neden:** Sayısal taşmalar `500` üretiyor, `localStorage.clear()` temayı siliyor ve inline hatalar çift toast basıyordu.
- **Kalıcı Kural:** Yakıt/bakım Joi DB limitlidir, `server.js` `process.env.CORS_ORIGIN` okur, Gate 2 `utils/**` tarar; çıkışta yalnız auth/filo sıfırlanır, `autoResetPageIndex: false`, inline hatalarda `notifyApiError` tetiklenmez.

### ADR-17: Doğrudan `araclar.org_id` Kiracı İzolasyonu, Sıfır Runtime DDL & Fatura Normalizasyonu
- **2026-11-25 (`V2.2-DBPERF`) · Kök Neden:** Dolaylı `users` alt sorgusu yavaşlıyor, `kullanici_id IS NULL` araçlar izolasyondan düşüyor ve runtime `ALTER TABLE` istek yolunu kirletiyordu.
- **Kalıcı Kural:** `buildVehicleAccessFilter` ve atamalar indeksli `a.org_id = $N` (`ensureManagerOrgId` backfill) kullanır; controller/route içi `ALTER TABLE` yasak, `yakitlar`/`bakimlar` `fatura_no`, `belge_url`, `olusturan_user_id` tutar.

### ADR-18: Bildirim Dedup Kilidi, `predictiveService` TR Takvimi & Finansal RBAC
- **2026-11-25 (`V2.2-NOTIFY`) · Kök Neden:** Tekrarlı uyarılar tekilleşmiyor, `UNION ALL` `kayit_id DESC` ile yanlış son 2 hareketi seçiyor ve finans yetkisi denetlenmiyordu.
- **Kalıcı Kural:** `bildirim_olaylari` üzerinde `UNIQUE (user_id, kategori, referans_anahtar)` + `ON CONFLICT DO NOTHING` uygulanır; `predictiveService` `ORDER BY tarih DESC, km DESC` + `dateUtils` kullanır; `bildirim_tercihleri` ve `maliyet_ozeti` `hasFinanceAccess` zorunludur.

### ADR-19: Yakıt Anomali İdempotensi, Tuple Öncül & Kiracı İzolasyonu
- **2026-11-25 (`V2.2-ANOMALY-BE`) · Kök Neden:** Tekrarlı taramalar mükerrer anomali üretebilir, incelenmiş kararları silebilir ve `PATCH` kiracı sınırını aşabilirdi.
- **Kalıcı Kural:** `yakit_anomalileri` `uq_yakit_anomali_kayit_tip` + `ON CONFLICT DO NOTHING` kullanır; `curKm > 0` iken `(tarih, km, yakit_id) < (...)` tuple öncülü seçilir; `update` yalnız `durum = 'acik'` yeniler ve `PATCH /anomaliler/:id` `FROM araclar a` + `buildVehicleAccessFilter` zorunlu kılar.

### ADR-20: Gizli E-posta Dedup Kilidi, Saf Anomali Kuralları & Tek-Yayın Event
- **2026-11-25 (`V2.2-POLISH`) · Kök Neden:** `uygulama: false, email: true` dedup atlıyor, TCO/anomali taramaları ayrışıyor ve mutasyonlar çift fetch üretiyordu.
- **Kalıcı Kural:** E-posta `meta_json.uygulama_gizli = true` + `okundu_mu = TRUE` yazılır (`GET/PATCH` `404`); `fuelAnomalyRules.js` tekil/toplu (`UNNEST`) taramada paylaşılır; FE tekil `truss:data-changed` + `requestIdRef` kullanır.

### ADR-21: Principal Bar, `/critic` Red-Team & Zorunlu Faz 1 Öz-Denetimi
- **2026-11-25 (`OPS-5b`) · Kök Neden:** Övgü, seçenek menüsü ve yüzeysel happy-path pratikleri yarış/kiracı/dikiş (`seam`) hatalarını gizliyordu.
- **Kalıcı Kural:** `00-truss-core.md` Principal Bar ile övgü/seçenek menüsü yasak; `/critic` öz-denetimi plan ve QA öncesi seam/stres testi uygular.

### ADR-22: Toplu Yakıt CSV İzolasyonu, Fiziksel İmza Dedup & Kronoloji Sıralaması
- **2026-11-25 (`V2.2-IMPORT-BE`) · Kök Neden:** Global `100kb` JSON CSV'yi kesiyor, tekil `fatura_no` sahte çakışma üretiyor ve ters-sıralı ekstreler kronolojiyi bozuyordu.
- **Kalıcı Kural:** `/api/yakitlar/toplu-*` rota-lokal `1mb` `bulkJsonParser` kullanır; `FOR UPDATE` altında `arac_id|tarih|litre|tutar|km` imzasıyla dedup yapılır, adaylar `(tarih ASC, km ASC NULLS LAST, satir_no ASC)` sıralanıp `UNNEST` ile yazılır ve `evaluateBatchFuelAnomalies` çalışır.

### ADR-23: Araç Soft-Archive (`arsivlendi_mi`) & Değişmez Denetim İzi (`denetim_kayitlari`)
- **2026-11-25 (`V2.2-AUDIT-BE`) · Kök Neden:** Hareketli aracın fiziksel silinmesi tarihsel maliyeti bozuyor, maliyetsiz başlangıç şablonu ise hard-delete olabilmeli ve kritik mutasyonlar izlenmeliydi.
- **Kalıcı Kural:** `DELETE /api/araclar/:id` yakıt/bakım veya `COALESCE(maliyet, 0) > 0` parça varsa zimmeti kapatıp `arsivlendi_mi = TRUE` yapar (arşivli araca yazma `409 VEHICLE_ARCHIVED`); `denetim_kayitlari` (`GET /api/denetim-kayitlari`) FK/`CASCADE` olmadan append-only tutulur, `COMMIT` sonrası `auditService.logAuditEvent` ile yazılır ve `ADR-13` `403 FORBIDDEN_ORG_REQUIRED` uygular.

### ADR-24: FORGE Topolojisi & Fonksiyonel Çekirdek / İnce Kabuk Standardı
- **2026-11-25 (`FORGE-M0`) · Kök Neden:** Eski 5'li Swarm rol sızıntıları, `req/res` kelepçeli servisler, doğrudan API import eden yaprak UI'lar ve `11.5K` tok bağlam şişmesi regresyon ve hız kaybı yaratıyordu.
- **Kalıcı Kural:** `FORGE` 5 uzmanı (`keystone`, `core-smith`, `shell-crafter`, `sentinel`, `radar`) zorunlu **Frozen Contract** + yeni şema/iş kuralında ardışık `core-smith -> shell-crafter` uygular; BE `<= 90`L controller + `req/res`-bağımsız `fn(client, actor, input)` + `AppError`, FE `Sayfa <= 180`L + `use*Controller <= 200`L + `Saf Görünüm <= 200`L (yaprakta API importu yasak) + merkezi `utils/dataEvents.js` kullanır.
