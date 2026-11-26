# TRUSS — Mimari Karar Kayıtları (`DECISIONS.md`)

> **Kural (`P0-to-Rule`):** Başlık + `Tarih · Kök Neden` + `Kalıcı Kural`.

### ADR-01: `pg` DATE (`OID 1082`) Saf `YYYY-MM-DD`
- **2026-11-24 (`V2.1`) · Neden:** `node-postgres` `DATE` UTC-1 gün kayması yaratıyordu.
- **Kural:** `Backend/db.js` `pg.types.setTypeParser(1082, (val) => val)` zorunlu; tüm `DATE` değerleri `YYYY-MM-DD` string döner.

### ADR-02: TR (`Europe/Istanbul`) Gelecek Tarih Kontrolü
- **2026-11-24 (`V2.1`) · Neden:** Joi UTC `.max('now')` TR 00:00–02:59'da bugünü reddediyordu.
- **Kural:** `.max('now')` yasak; `Backend/utils/dateUtils.js` (`tarihStr`, `ileriTarihMi`) kullanılır.

### ADR-03: `422 SAYAC_KRONOLOJI_IHLALI` & `FOR UPDATE` Kilidi
- **2026-11-23 (`MP-7/7b`) · Neden:** Eşzamanlı/geçmiş kayıtlar `KM`/`SMH` kronolojisini bozuyordu.
- **Kural:** Yazmada `araclariKilitle` (`FOR UPDATE`) + `sayacSinirlari` zorunlu; ihlalde `422 SAYAC_KRONOLOJI_IHLALI` döner, UI `<SayacFieldError />` gösterir.

### ADR-04: `update` / `delete` Sonrası `aracSayaciniSenkronizeEt`
- **2026-11-23 (`MP-8`) · Neden:** Silinen/düşürülen yüksek KM sonrası araç sayacı yüksek kalıyordu.
- **Kural:** Her yakıt/bakım `update`/`delete` TX içinde (araç değiştiyse eski+yeni) `aracSayaciniSenkronizeEt` çağrılır.

### ADR-05: `[SUPERSEDED -> ADR-17]` Kiracı İzolasyonu
- **2026-11-24 · Kural:** Dolaylı `EXISTS` alt sorgusu `ADR-17` doğrudan indeksli `a.org_id = $N` ile değiştirildi.

### ADR-06: `radix-luma` Semantik Tema & Eski Palet Yasağı
- **2026-11-23 (`V2.1`) · Neden:** Sabit `zinc/slate/truss-*` ve `#hex` koyu/açık temayı kırıyordu.
- **Kural:** Tüm v2 bileşenlerde yalnız `radix-luma` OKLCH semantik tokenları (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`) kullanılır.

### ADR-07: İkonsuz Tipografik `TRU` + `SS` Logo
- **2026-11-23 (`V2.1`) · Neden:** Dağınık SVG amblemler marka tutarlılığını bozuyordu.
- **Kural:** Logo her yüzeyde ikonsuz `TRU` (`text-foreground`) + `SS` (`text-primary`) olarak render edilir.

### ADR-08: Çift Katmanlı RBAC (`ChannelGuard` + Backend)
- **2026-11-24 (`V2.1`) · Neden:** Yalnız UI'da gizlenen uçlar `DRIVER`'a açık kalabiliyordu.
- **Kural:** Her modül FE'de `<ChannelGuard />` + `channelAccess.js`, BE'de rol/sahiplik middleware (`403`) ile korunur.

### ADR-09: `updateParca` Üzerinde `arac_id` Değişmezliği
- **2026-11-24 (`V2.1`) · Neden:** `PUT /api/parcalar/:id` ile parça taşıma KM geçmişini bozuyordu.
- **Kural:** Farklı `arac_id` `400` döner; `UPDATE` içinde `arac_id` değişmez.

### ADR-10: Evrensel Tek Girişli AI-OS (`AGENTS.md` + `.ai/*`)
- **2026-11-24 (`OPS-1`) · Neden:** Dağınık dokümanlar eski `ABTS` adını sızdırıyordu.
- **Kural:** `CLAUDE.md`, `.cursorrules`, `.windsurfrules` tek kaynak `AGENTS.md` + `.ai/*` işaret eder.

### ADR-11: Nullable Kataloglarda `undefined` vs `null`
- **2026-11-24 (`QA-BE`) · Neden:** Falsy kontrol `null` ile temizlenen FK alanını eski ID ile eziyordu.
- **Kural:** Temizlenebilir FK'lar `field !== undefined ? (field ? Number(field) : null) : mevcut.field` kalıbıyla işlenir.

### ADR-12: Async Dropdown İstek İptali & Kısmi Hidrasyon
- **2026-11-24 (`QA-FE`) · Neden:** Geç yanıtlar alt listeyi ve kullanıcı formunu eziyordu.
- **Kural:** Üst seçimde alt listeler sıfırlanıp `RequestIdRef` artırılır; async hidrasyon `prev` üstüne kısmi patch yapar.

### ADR-13: `SYSTEM_ADMIN` `org_id` Kiracı İzolasyonu
- **2026-11-24 (`HW1`) · Neden:** Koşulsuz `'1=1'` org adminlerinin rakip kiracıyı görmesine yol açıyordu.
- **Kural:** `user.org_id` varsa `a.org_id = $N` zorunlu; yalnız `org_id IS NULL` platform yöneticisi `'1=1'` görür.

### ADR-14: `JWT_SECRET` Fail-Fast & Araç Devri (`ON DELETE SET NULL`)
- **2026-11-24 (`HW1`) · Neden:** Hardcoded secret ve `CASCADE` araç silme riski vardı.
- **Kural:** `getJwtSecret()` zorunlu; `fk_araclar_kullanici` `ON DELETE SET NULL`, `DELETE /settings/account` önce devir yapar veya `409` döner.

### ADR-15: Sayaç Tipi Kilidi, 3-Anahtarlı RBAC & Finans Gizliliği
- **2026-11-25 (`HW2`) · Neden:** Hareketli araçta `KM/SMH` değişimi ve `DRIVER`'a finans sızıntısı önlendi.
- **Kural:** Hareket/parçalı araçta `sayac_tipi` değişimi `422`; ekip yetkisi yalnız `yakit/bakim/finans`; finans `canAccessChannel(user, 'analytics')` ile gizlenir.

### ADR-16: Joi Taşma Koruması, `CORS_ORIGIN`, Gate 2 `utils/**` & Hijyen
- **2026-11-25 (`HW3`) · Neden:** Sayısal taşmalar `500`, `localStorage.clear()` tema siliyordu.
- **Kural:** Yakıt/bakım Joi DB limitli, `CORS_ORIGIN` env, Gate 2 `utils/**` tarar; çıkışta yalnız auth/filo sıfırlanır, inline hatada çift toast yok.

### ADR-17: Doğrudan `araclar.org_id`, Sıfır Runtime DDL & Fatura Alanları
- **2026-11-25 (`DBPERF`) · Neden:** Alt sorgular yavaşlıyor ve runtime `ALTER TABLE` yolu kirletiyordu.
- **Kural:** İndeksli `a.org_id = $N` (`ensureManagerOrgId`); runtime `ALTER TABLE` yasak; `yakitlar`/`bakimlar` `fatura_no`, `belge_url`, `olusturan_user_id` tutar.

### ADR-18: Bildirim Dedup, `predictiveService` TR Takvimi & Finansal RBAC
- **2026-11-25 (`NOTIFY`) · Neden:** Tekrarlı bildirim ve yanlış `UNION ALL` sıralaması vardı.
- **Kural:** `bildirim_olaylari` `UNIQUE (user_id, kategori, referans_anahtar)` + `ON CONFLICT DO NOTHING`; `ORDER BY tarih DESC, km DESC`; `bildirim_tercihleri`/`maliyet_ozeti` `hasFinanceAccess` zorunlu.

### ADR-19: Yakıt Anomali İdempotensi, Tuple Öncül & Kiracı İzolasyonu
- **2026-11-25 (`ANOMALY`) · Neden:** Tekrarlı tarama/PATCH kiracı sınırını ve inceleme kararını bozabilirdi.
- **Kural:** `uq_yakit_anomali_kayit_tip` + `ON CONFLICT DO NOTHING`; `curKm > 0` tuple öncülü; yalnız `durum = 'acik'` yenilenir; `PATCH /anomaliler/:id` `buildVehicleAccessFilter` zorunlu.

### ADR-20: Gizli E-posta Dedup, Saf Anomali Kuralları & Tek-Yayın Event
- **2026-11-25 (`POLISH`) · Neden:** Gizli e-posta dedup atlıyor ve mutasyonlar çift fetch üretiyordu.
- **Kural:** `meta_json.uygulama_gizli = true` + `okundu_mu = TRUE` (`GET/PATCH` `404`); `fuelAnomalyRules.js` tekil/toplu paylaşılır; FE tekil `truss:data-changed` + `requestIdRef` kullanır.

### ADR-21: Principal Bar, `/critic` Red-Team & Faz 1 Öz-Denetimi
- **2026-11-25 (`OPS-5b`) · Neden:** Yüzeysel onay/menüler seam/yarış hatalarını gizliyordu.
- **Kural:** `00-truss-core.md` Principal Bar ile övgü/menü yasak; `/critic` plan ve QA öncesi seam/stres testi uygular.

### ADR-22: Toplu Yakıt CSV İzolasyonu, İmza Dedup & Kronoloji
- **2026-11-25 (`IMPORT`) · Neden:** Global `100kb` JSON CSV'yi kesiyor ve ters ekstre kronolojiyi bozuyordu.
- **Kural:** `/api/yakitlar/toplu-*` rota-lokal `1mb` parser; `FOR UPDATE` + `arac_id|tarih|litre|tutar|km` dedup; `(tarih ASC, km ASC NULLS LAST, satir_no ASC)` `UNNEST` + `evaluateBatchFuelAnomalies`.

### ADR-23: Araç Soft-Archive (`arsivlendi_mi`) & Denetim İzi (`denetim_kayitlari`)
- **2026-11-25 (`AUDIT`) · Neden:** Hareketli aracın silinmesi tarihsel maliyeti bozuyordu.
- **Kural:** Hareket/maliyetli parça varsa `DELETE /api/araclar/:id` zimmeti kapatıp `arsivlendi_mi = TRUE` yapar (yazmada `409 VEHICLE_ARCHIVED`); `denetim_kayitlari` append-only + `COMMIT` sonrası `logAuditEvent` + `403 FORBIDDEN_ORG_REQUIRED`.

### ADR-24: FORGE Topolojisi & Fonksiyonel Çekirdek / İnce Kabuk
- **2026-11-25 (`FORGE-M0`) · Neden:** Rol sızıntısı, `req/res`-bağımlı servis ve yaprak API importu regresyon üretiyordu.
- **Kural:** `FORGE` 5 uzman Frozen Contract + ardışık `core-smith -> shell-crafter`; BE `<= 90`L controller + `fn(client, actor, input)` + `AppError`; FE `Sayfa <= 180`L + `use*Controller <= 200`L + `Saf Görünüm <= 200`L + `dataEvents.js`.

### ADR-25: `schema_migrations`, `token_version`, Cron Kilidi, Arşiv & `test:core`
- **2026-11-25 (`FORGE-M1`) · Neden:** Checksum/kilit, JWT iptali, tam arşiv ve runtime test eksikti.
- **Kural:** `db:migrate` (`pg_advisory_lock` + SHA-256 `schema_migrations`), `fk_denetim_kayitlari_org ON DELETE SET NULL`, `token_version` (`401 TOKEN_REVOKED`), `pg_try_advisory_lock` cron, `arsivliAracEngelle` tam `POST/PUT/DELETE`, `ai-gate` `14` dosya ratchet, `npm run test:core`.

### ADR-26: `*WriteService` (`withTransaction`), Sıkı `dataEvents` & Chunk Ayrımı
- **2026-11-25 (`FORGE-M2`) · Neden:** Controller TX ve wildcard Recharts importu (`Legend`) chunk'ı şişiriyordu.
- **Kural:** Mutasyonlar `req/res`-bağımsız `*WriteService` + `AppError` + `withTransaction` (`ROLLBACK` hatasında `release(true)`); FE named Recharts + `vendor-charts`/`vendor-charts-core`, sıkı `dataEvents.js`, 3 katmanlı `Hareketler`/`BudgetVarianceCard`.

### ADR-27: İş Emri Kilit Sırası, Tek-TX Bakım & `DATA_SCOPES`
- **2026-11-25 (`FORGE-M3A`) · Neden:** `AB-BA` kilit yarışı ve `SMH` ondalık/DATE sapması riski vardı.
- **Kural:** Kilit-öncesi kiracı (`404`/`403`) + `araclar -> is_emirleri` kilit sırası + `planlanan_tarih::text`; `completeWorkOrderTx` `assertOdometerChronology` + `Math.round` ile `createBakimTx`'e bağlanır; `DATA_SCOPES.WORK_ORDER = 'work-order'`.

### ADR-28: Üretim Zırhı, Boş-DB Bootstrap & PG 16 CI (`FORGE-C0`)
- **2026-11-26 (`FORGE-C0`) · Neden:** Fail-fast env doğrulaması, rate limit, security headers, single-flight `/api/health`, graceful shutdown ve sıfırdan DB bootstrap/CI yoktu.
- **Kural:** Sıfır yeni npm paketiyle `validateEnv` (`DATABASE_URL`/prod `JWT_SECRET>=32`/CORS), `securityHeaders`, NAT-dostu 2 katmanlı `rateLimiter` (`429 RATE_LIMITED`), single-flight `GET /api/health` + DI `gracefulShutdown`, `000_base_schema` (`typnamespace = current_schema()::regnamespace`) + `runMigrations(..., { schema })` ve `.github/workflows/ci.yml` PG 16 CI zorunludur.

### ADR-29: Kiracı-İzole DOC-VAULT, Sıfır-Paket SigV4 & Yerel HMAC Sürücü (`FORGE-C1`)
- **2026-11-26 (`FORGE-C1`) · Neden:** Dış URL yapıştırma kırılganlığı, finansal belge sızıntısı ve SDK bağımlılığı olmadan güvenli belge yükleme/erişim gerekti.
- **Kural:** `belge_kasasi` (`belge_id SERIAL PK`, `org_<id>/<varlik>/<YYYY-MM>/<uuid>.<ext>`), sıfır-npm SigV4 `UNSIGNED-PAYLOAD` + ASCII sorgu sırası (`prod`da `local` sürücü yasak, dev `local`da `fs.stat` zorunlu) kullanılır; `DRIVER` yalnızca yükleme/taslak silme yapar, finansal belge indirme/görüntüleme `hasFinanceAccess` ile kısıtlanır ve `WorkOrderComplete -> bakimlar.belge_url` bağlanır.

### ADR-30: Dijital Zimmet Muayenesi, Yeni `atama_id` & Tek-TX İş Emri (`FORGE-C2`)
- **2026-11-26 (`FORGE-C2`) · Neden:** `ON CONFLICT DO UPDATE` zimmet tarihçesini eziyor, kusurlu teslimlerde konsolide arıza iş emri ve `doc-vault` görsel kotası ayrı kalıyordu.
- **Kural:** `arac_sofor_atamalari` kısmi indeksle (`WHERE aktif = TRUE`) her atamada aktif zimmeti kapatıp yeni `atama_id` üretir; `recordHandoverInspectionTx` tek TX'te `zimmet_muayeneleri` (`19.` tablo) + en fazla `4` görsel (`image/jpeg|png|webp`) + kusurda `options.lockedArac` ile yalnız `1` konsolide `ariza` iş emri (`KRITIK->kritik`, `KUSURLU->yuksek`) + `aracSayaciniSenkronizeEt` çalıştırır.
