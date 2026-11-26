# TRUSS — Mimari Karar Kayıtları (`DECISIONS.md`)

> **Kural (`P0-to-Rule`):** Başlık + `Tarih · Neden` + `Kalıcı Kural`.

### ADR-01: `pg` DATE (`OID 1082`) Saf `YYYY-MM-DD`
- **2026-11-24 (`V2.1`) · Neden:** `DATE` UTC-1 gün kayması.
- **Kural:** `Backend/db.js` `setTypeParser(1082, (v) => v)` zorunlu; tüm `DATE` `YYYY-MM-DD` string döner.

### ADR-02: TR (`Europe/Istanbul`) Gelecek Tarih
- **2026-11-24 (`V2.1`) · Neden:** UTC `.max('now')` TR 00:00–02:59'da bugünü reddediyordu.
- **Kural:** `.max('now')` yasak; `dateUtils.js` (`tarihStr`, `ileriTarihMi`) kullanılır.

### ADR-03: `422 SAYAC_KRONOLOJI_IHLALI` & `FOR UPDATE`
- **2026-11-23 (`MP-7/7b`) · Neden:** Eşzamanlı/geçmiş kayıtlar `KM`/`SMH` kronolojisini bozuyordu.
- **Kural:** Yazmada `araclariKilitle` (`FOR UPDATE`) + `sayacSinirlari`; ihlalde `422 SAYAC_KRONOLOJI_IHLALI`, UI `<SayacFieldError />`.

### ADR-04: `update`/`delete` Sonrası `aracSayaciniSenkronizeEt`
- **2026-11-23 (`MP-8`) · Neden:** Silinen/düşürülen yüksek KM sonrası araç sayacı yüksek kalıyordu.
- **Kural:** Yakıt/bakım `update`/`delete` TX'inde (araç değiştiyse eski+yeni) `aracSayaciniSenkronizeEt` çağrılır.

### ADR-05: `[SUPERSEDED -> ADR-17]` Kiracı İzolasyonu
- **2026-11-24 · Kural:** `EXISTS` alt sorgusu `ADR-17` indeksli `a.org_id = $N` ile değişti.

### ADR-06: `radix-luma` Semantik Tema & Palet Yasağı
- **2026-11-23 (`V2.1`) · Neden:** Sabit `zinc/slate/truss-*` ve `#hex` temayı kırıyordu.
- **Kural:** Yalnız `radix-luma` OKLCH tokenları (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`).

### ADR-07: İkonsuz Tipografik `TRU` + `SS` Logo
- **2026-11-23 (`V2.1`) · Neden:** Dağınık SVG amblemler marka tutarlılığını bozuyordu.
- **Kural:** Her yüzeyde ikonsuz `TRU` (`text-foreground`) + `SS` (`text-primary`).

### ADR-08: Çift Katmanlı RBAC (`ChannelGuard` + Backend)
- **2026-11-24 (`V2.1`) · Neden:** Yalnız UI'da gizlenen uçlar `DRIVER`'a açık kalıyordu.
- **Kural:** FE `<ChannelGuard />` + `channelAccess.js`, BE rol/sahiplik middleware (`403`).

### ADR-09: `updateParca` `arac_id` Değişmezliği
- **2026-11-24 (`V2.1`) · Neden:** `PUT /api/parcalar/:id` ile parça taşıma KM geçmişini bozuyordu.
- **Kural:** Farklı `arac_id` `400` döner; `UPDATE` içinde `arac_id` değişmez.

### ADR-10: Evrensel Tek Girişli AI-OS (`AGENTS.md` + `.ai/*`)
- **2026-11-24 (`OPS-1`) · Neden:** Dağınık dokümanlar eski `ABTS` adını sızdırıyordu.
- **Kural:** `CLAUDE.md`, `.cursorrules`, `.windsurfrules` tek kaynak `AGENTS.md` + `.ai/*` işaret eder.

### ADR-11: Nullable Kataloglarda `undefined` vs `null`
- **2026-11-24 (`QA-BE`) · Neden:** Falsy kontrol `null` FK alanını eski ID ile eziyordu.
- **Kural:** `field !== undefined ? (field ? Number(field) : null) : mevcut.field` kullanılır.

### ADR-12: Async Dropdown İstek İptali & Kısmi Hidrasyon
- **2026-11-24 (`QA-FE`) · Neden:** Geç yanıtlar alt listeyi/formu eziyordu.
- **Kural:** Üst seçimde alt listeler sıfırlanır + `RequestIdRef` artar; async hidrasyon `prev` üstüne kısmi patch yapar.

### ADR-13: `SYSTEM_ADMIN` `org_id` Kiracı İzolasyonu
- **2026-11-24 (`HW1`) · Neden:** Koşulsuz `'1=1'` org adminlerinin rakip kiracıyı görmesine yol açıyordu.
- **Kural:** `user.org_id` varsa `a.org_id = $N` zorunlu; yalnız `org_id IS NULL` platform admini `'1=1'` görür.

### ADR-14: `JWT_SECRET` Fail-Fast & Araç Devri (`ON DELETE SET NULL`)
- **2026-11-24 (`HW1`) · Neden:** Hardcoded secret ve `CASCADE` araç silme riski.
- **Kural:** `getJwtSecret()` zorunlu; `fk_araclar_kullanici` `ON DELETE SET NULL`, `DELETE /settings/account` devreder veya `409`.

### ADR-15: Sayaç Kilidi, 3-Anahtarlı RBAC & Finans Gizliliği
- **2026-11-25 (`HW2`) · Neden:** Hareketli araçta `KM/SMH` değişimi ve `DRIVER`'a finans sızıntısı.
- **Kural:** Hareket/parçalı araçta `sayac_tipi` değişimi `422`; ekip yalnız `yakit/bakim/finans`; finans `canAccessChannel(user, 'analytics')` ile gizlenir.

### ADR-16: Joi Taşma, `CORS_ORIGIN`, Gate 2 `utils/**` & Hijyen
- **2026-11-25 (`HW3`) · Neden:** Sayısal taşma `500`, `localStorage.clear()` tema siliyordu.
- **Kural:** Joi DB limitli, `CORS_ORIGIN` env, Gate 2 `utils/**` tarar; çıkışta yalnız auth/filo sıfırlanır, inline hatada çift toast yok.

### ADR-17: Doğrudan `araclar.org_id`, Sıfır Runtime DDL & Fatura
- **2026-11-25 (`DBPERF`) · Neden:** Alt sorgular yavaş ve runtime `ALTER TABLE` kirleticiydi.
- **Kural:** İndeksli `a.org_id = $N` (`ensureManagerOrgId`); runtime `ALTER TABLE` yasak; `yakitlar`/`bakimlar` `fatura_no`, `belge_url`, `olusturan_user_id` tutar.

### ADR-18: Bildirim Dedup, `predictiveService` TR & Finans RBAC
- **2026-11-25 (`NOTIFY`) · Neden:** Tekrarlı bildirim ve yanlış `UNION ALL` sıralaması.
- **Kural:** `bildirim_olaylari` `UNIQUE (user_id, kategori, referans_anahtar)` + `ON CONFLICT DO NOTHING`; `ORDER BY tarih DESC, km DESC`; `bildirim_tercihleri`/`maliyet_ozeti` `hasFinanceAccess`.

### ADR-19: Yakıt Anomali İdempotensi, Tuple Öncül & İzolasyon
- **2026-11-25 (`ANOMALY`) · Neden:** Tekrarlı tarama/PATCH kiracı sınırını ve incelemeyi bozuyordu.
- **Kural:** `uq_yakit_anomali_kayit_tip` + `ON CONFLICT DO NOTHING`; `curKm > 0` tuple öncülü; yalnız `durum='acik'` yenilenir; `PATCH /anomaliler/:id` `buildVehicleAccessFilter`.

### ADR-20: Gizli E-posta Dedup, Saf Anomali & Tek-Yayın Event
- **2026-11-25 (`POLISH`) · Neden:** Gizli e-posta dedup atlıyor, mutasyonlar çift fetch üretiyordu.
- **Kural:** `meta_json.uygulama_gizli=true` + `okundu_mu=TRUE` (`GET/PATCH` `404`); `fuelAnomalyRules.js` ortak; FE tekil `truss:data-changed` + `requestIdRef`.

### ADR-21: Principal Bar, `/critic` Red-Team & Öz-Denetim
- **2026-11-25 (`OPS-5b`) · Neden:** Yüzeysel onay seam/yarış hatalarını gizliyordu.
- **Kural:** `00-truss-core.md` övgü/menü yasak; `/critic` plan ve QA öncesi seam/stres testi uygular.

### ADR-22: Toplu Yakıt CSV İzolasyonu, Dedup & Kronoloji
- **2026-11-25 (`IMPORT`) · Neden:** `100kb` limit CSV'yi kesiyor, ters ekstre kronolojiyi bozuyordu.
- **Kural:** `/api/yakitlar/toplu-*` rota-lokal `1mb`; `FOR UPDATE` + `arac_id|tarih|litre|tutar|km` dedup; `(tarih ASC, km ASC NULLS LAST, satir_no ASC)` `UNNEST` + `evaluateBatchFuelAnomalies`.

### ADR-23: Soft-Archive (`arsivlendi_mi`) & Denetim İzi
- **2026-11-25 (`AUDIT`) · Neden:** Hareketli araç silme tarihsel maliyeti bozuyordu.
- **Kural:** Hareket/maliyetli parça varsa `DELETE /api/araclar/:id` zimmeti kapatıp `arsivlendi_mi=TRUE` (`409 VEHICLE_ARCHIVED`); `denetim_kayitlari` append-only + `COMMIT` sonrası `logAuditEvent` + `403 FORBIDDEN_ORG_REQUIRED`.

### ADR-24: FORGE Topolojisi & Çekirdek / İnce Kabuk
- **2026-11-25 (`FORGE-M0`) · Neden:** Rol sızıntısı, `req/res`-bağımlı servis, yaprak API importu.
- **Kural:** 5 uzman Frozen Contract + `core-smith -> shell-crafter`; BE `<= 90`L controller + `fn(client, actor, input)` + `AppError`; FE `Sayfa <= 180`L + `use*Controller <= 200`L + `Saf Görünüm <= 200`L + `dataEvents.js`.

### ADR-25: `schema_migrations`, `token_version`, Cron & `test:core`
- **2026-11-25 (`FORGE-M1`) · Neden:** Checksum/kilit, JWT iptali, tam arşiv ve runtime test eksikti.
- **Kural:** `db:migrate` (`pg_advisory_lock` + SHA-256 `schema_migrations`), `fk_denetim_kayitlari_org ON DELETE SET NULL`, `token_version` (`401 TOKEN_REVOKED`), `pg_try_advisory_lock` cron, `arsivliAracEngelle` `POST/PUT/DELETE`, `ai-gate` ratchet, `npm run test:core`.

### ADR-26: `*WriteService` (`withTransaction`), `dataEvents` & Chunk
- **2026-11-25 (`FORGE-M2`) · Neden:** Controller TX ve wildcard Recharts (`Legend`) chunk'ı şişiriyordu.
- **Kural:** Mutasyonlar `*WriteService` + `AppError` + `withTransaction` (`ROLLBACK` hatasında `release(true)`); FE named Recharts + `vendor-charts`/`vendor-charts-core`, sıkı `dataEvents.js`, 3 katmanlı `Hareketler`/`BudgetVarianceCard`.

### ADR-27: İş Emri Kilit Sırası, Tek-TX Bakım & `DATA_SCOPES`
- **2026-11-25 (`FORGE-M3A`) · Neden:** `AB-BA` kilit yarışı ve `SMH` ondalık/DATE sapması.
- **Kural:** Kilit-öncesi kiracı (`404`/`403`) + `araclar -> is_emirleri` kilit sırası + `planlanan_tarih::text`; `completeWorkOrderTx` `assertOdometerChronology` + `Math.round` -> `createBakimTx`; `DATA_SCOPES.WORK_ORDER = 'work-order'`.

### ADR-28: Üretim Zırhı, Boş-DB & PG 16 CI (`FORGE-C0`)
- **2026-11-26 (`FORGE-C0`) · Neden:** Fail-fast env, rate/headers, `/api/health`, shutdown ve DB/CI yoktu.
- **Kural:** `0`-npm `validateEnv`, `securityHeaders`, `rateLimiter` (`429 RATE_LIMITED`), single-flight `/api/health` + DI `gracefulShutdown`, `000_base_schema` (`typnamespace = current_schema()::regnamespace`) + `runMigrations(..., { schema })`, PG 16 CI.

### ADR-29: Kiracı-İzole DOC-VAULT, SigV4 & Yerel HMAC (`FORGE-C1`)
- **2026-11-26 (`FORGE-C1`) · Neden:** Dış URL kırılganlığı ve finansal belge sızıntısı.
- **Kural:** `belge_kasasi` (`org_<id>/<varlik>/<YYYY-MM>/<uuid>.<ext>`), `0`-npm SigV4 `UNSIGNED-PAYLOAD` + ASCII sorgu (`prod`da `local` yasak, dev `local`da `fs.stat`); `DRIVER` yalnız taslak yükler/siler, finansal görüntüleme `hasFinanceAccess`, `WorkOrderComplete -> bakimlar.belge_url`.

### ADR-30: Dijital Zimmet Muayenesi, Yeni `atama_id` & Tek-TX (`FORGE-C2`)
- **2026-11-26 (`FORGE-C2`) · Neden:** `ON CONFLICT DO UPDATE` tarihçeyi eziyor, kusurlu teslimlerde konsolide iş emri ve görsel kotası eksikti.
- **Kural:** `arac_sofor_atamalari` (`WHERE aktif = TRUE`) yeni `atama_id` üretir; `recordHandoverInspectionTx` tek TX'te `zimmet_muayeneleri` (`19.` tablo) + `<= 4` görsel (`image/jpeg|png|webp`) + kusurda `options.lockedArac` ile `1` konsolide `ariza` iş emri (`KRITIK->kritik`, `KUSURLU->yuksek`) + `aracSayaciniSenkronizeEt`.

### ADR-31: `0`-Paket UTF-8 BOM CSV, `raporController` Slim & `GenelBakis` (`FORGE-C3`)
- **2026-11-26 (`FORGE-C3`) · Neden:** `raporController` (`334`L)/`GenelBakis` (`209`L) şişkindi, formula-safe CSV export yoktu.
- **Kural:** `0`-npm `csvSerializer` (`\uFEFF`, `\r\n`, OWASP `'`, RFC 4180, sayısal `-` korunur) + `raporQueryService` (`MAX_EXPORT_ROWS=10000`, `LIMIT 10001`, `buildVehicleAccessFilter`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Export-*`); `raporController` (`76`L) slim, `GenelBakis` (`158`L) + `useGenelBakisController` (`144`L) + `ExecExportMenu` (`86`L).

### ADR-32: `userSettings` Ayrımı, `V2.3` X-Ray Dikişleri & Ratchet `12 -> 6` (`FORGE-C4`)
- **2026-11-26 (`FORGE-C4`) · Neden:** `userRoutes`/`qaSeed`/4 FE modülü şişkindi; `database.sql` şema kilidi ve `forge-meter` 1M kalibrasyonu eksikti.
- **Kural:** `userSettingsController` (`76`L) + `req/res`-bağımsız `userSettingsService` (`237`L, `ADR-14`/`token_version` korunur); `database.sql` `typnamespace = current_schema()::regnamespace`; `forge-meter` `ctx > 200k` cezası kalktı + salt-okunur `xray/audit` `$0.90` zarfı; 6 dosya daraltılıp ratchet `12 -> 6` (`14 -> 6`) kilitlendi (`0` P0 X-Ray).
