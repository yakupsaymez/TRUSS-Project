# TRUSS — Mimari Karar Kayıtları (`DECISIONS.md`)
> **Kural:** `### ADR-XX: <Başlık>` + `- **<Tarih>:** <Kalıcı Kural>.`

### ADR-01: `pg` DATE (`OID 1082`) Saf `YYYY-MM-DD`
- **2026-11-24:** `Backend/db.js` `setTypeParser(1082, (v) => v)` zorunlu; tüm `DATE` `YYYY-MM-DD` string döner.
### ADR-02: TR (`Europe/Istanbul`) Gelecek Tarih
- **2026-11-24:** `.max('now')` yasak; `dateUtils.js` (`tarihStr`, `ileriTarihMi`) kullanılır.
### ADR-03: `422 SAYAC_KRONOLOJI_IHLALI` & `FOR UPDATE`
- **2026-11-23:** Yazmada `araclariKilitle` (`FOR UPDATE`) + `sayacSinirlari`; ihlalde `422 SAYAC_KRONOLOJI_IHLALI`, UI `<SayacFieldError />`.
### ADR-04: `update`/`delete` Sonrası `aracSayaciniSenkronizeEt`
- **2026-11-23:** Yakıt/bakım `update`/`delete` TX'inde (araç değiştiyse eski+yeni) `aracSayaciniSenkronizeEt` çağrılır.
### ADR-05: `[SUPERSEDED -> ADR-17]` Kiracı İzolasyonu
- **2026-11-24:** `EXISTS` alt sorgusu `ADR-17` indeksli `a.org_id = $N` ile değişti.
### ADR-06: `radix-luma` Semantik Tema & Palet Yasağı
- **2026-11-23:** Sabit `zinc/slate/truss-*`/`#hex` yasak; yalnız `radix-luma` OKLCH (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`).
### ADR-07: İkonsuz Tipografik `TRU` + `SS` Logo
- **2026-11-23:** Her yüzeyde ikonsuz `TRU` (`text-foreground`) + `SS` (`text-primary`).
### ADR-08: Çift Katmanlı RBAC (`ChannelGuard` + Backend)
- **2026-11-24:** FE `<ChannelGuard />` + `channelAccess.js`, BE rol/sahiplik middleware (`403`).
### ADR-09: `updateParca` `arac_id` Değişmezliği
- **2026-11-24:** Farklı `arac_id` `400` döner; `UPDATE` içinde `arac_id` değişmez.
### ADR-10: Evrensel Tek Girişli AI-OS (`AGENTS.md` + `.ai/*`)
- **2026-11-24:** `CLAUDE.md`, `.cursorrules`, `.windsurfrules` tek kaynak `AGENTS.md` + `.ai/*` işaret eder (`ABTS` adı yasak).
### ADR-11: Nullable Kataloglarda `undefined` vs `null`
- **2026-11-24:** `field !== undefined ? (field ? Number(field) : null) : mevcut.field` kullanılır.
### ADR-12: Async Dropdown İstek İptali & Kısmi Hidrasyon
- **2026-11-24:** Üst seçimde alt listeler sıfırlanır + `RequestIdRef` artar; async hidrasyon `prev` üstüne kısmi patch yapar.
### ADR-13: `SYSTEM_ADMIN` `org_id` Kiracı İzolasyonu
- **2026-11-24:** `user.org_id` varsa `a.org_id = $N` zorunlu; yalnız `org_id IS NULL` platform admini `'1=1'` görür.
### ADR-14: `JWT_SECRET` Fail-Fast & Araç Devri (`ON DELETE SET NULL`)
- **2026-11-24:** `getJwtSecret()` zorunlu; `fk_araclar_kullanici` `ON DELETE SET NULL`, `DELETE /settings/account` devreder veya `409`.
### ADR-15: Sayaç Kilidi, 3-Anahtarlı RBAC & Finans Gizliliği
- **2026-11-25:** Hareket/parçalı araçta `sayac_tipi` değişimi `422`; ekip yalnız `yakit/bakim/finans`; finans `canAccessChannel(user, 'analytics')` ile gizlenir.
### ADR-16: Joi Taşma, `CORS_ORIGIN`, Gate 2 `utils/**` & Hijyen
- **2026-11-25:** Joi DB limitli, `CORS_ORIGIN` env, Gate 2 `utils/**` tarar; çıkışta yalnız auth/filo sıfırlanır, inline hatada çift toast yok.
### ADR-17: Doğrudan `araclar.org_id`, Sıfır Runtime DDL & Fatura
- **2026-11-25:** İndeksli `a.org_id = $N` (`ensureManagerOrgId`); runtime `ALTER TABLE` yasak; `yakitlar`/`bakimlar` `fatura_no`, `belge_url`, `olusturan_user_id` tutar.
### ADR-18: Bildirim Dedup, `predictiveService` TR & Finans RBAC
- **2026-11-25:** `bildirim_olaylari` `UNIQUE (user_id, kategori, referans_anahtar)` + `ON CONFLICT DO NOTHING`; `ORDER BY tarih DESC, km DESC`; `bildirim_tercihleri`/`maliyet_ozeti` `hasFinanceAccess`.
### ADR-19: Yakıt Anomali İdempotensi, Tuple Öncül & İzolasyon
- **2026-11-25:** `uq_yakit_anomali_kayit_tip` + `ON CONFLICT DO NOTHING`; `curKm > 0` tuple öncülü; yalnız `durum='acik'` yenilenir; `PATCH /anomaliler/:id` `buildVehicleAccessFilter`.
### ADR-20: Gizli E-posta Dedup, Saf Anomali & Tek-Yayın Event
- **2026-11-25:** `meta_json.uygulama_gizli=true` + `okundu_mu=TRUE` (`GET/PATCH` `404`); `fuelAnomalyRules.js` ortak; FE tekil `truss:data-changed` + `requestIdRef`.
### ADR-21: Principal Bar, `/critic` Red-Team & Öz-Denetim
- **2026-11-25:** `00-truss-core.md` övgü/menü yasak; `/critic` plan ve QA öncesi seam/stres testi uygular.
### ADR-22: Toplu Yakıt CSV İzolasyonu, Dedup & Kronoloji
- **2026-11-25:** `/api/yakitlar/toplu-*` rota-lokal `1mb`; `FOR UPDATE` + `arac_id|tarih|litre|tutar|km` dedup; `(tarih ASC, km ASC NULLS LAST, satir_no ASC)` `UNNEST` + `evaluateBatchFuelAnomalies`.
### ADR-23: Soft-Archive (`arsivlendi_mi`) & Denetim İzi
- **2026-11-25:** Hareket/maliyetli parça varsa `DELETE /api/araclar/:id` zimmeti kapatıp `arsivlendi_mi=TRUE` (`409 VEHICLE_ARCHIVED`); `denetim_kayitlari` append-only + `COMMIT` sonrası `logAuditEvent` + `403 FORBIDDEN_ORG_REQUIRED`.
### ADR-24: FORGE Topolojisi & Çekirdek / İnce Kabuk
- **2026-11-25:** 5 uzman Frozen Contract + `core-smith -> shell-crafter`; BE `<= 90`L controller + `fn(client, actor, input)` + `AppError`; FE `Sayfa <= 180`L + `use*Controller <= 200`L + `Saf Görünüm <= 200`L + `dataEvents.js`.
### ADR-25: `schema_migrations`, `token_version`, Cron & `test:core`
- **2026-11-25:** `db:migrate` (`pg_advisory_lock` + SHA-256 `schema_migrations`), `fk_denetim_kayitlari_org ON DELETE SET NULL`, `token_version` (`401 TOKEN_REVOKED`), `pg_try_advisory_lock` cron, `arsivliAracEngelle` `POST/PUT/DELETE`, `ai-gate` ratchet, `npm run test:core`.
### ADR-26: `*WriteService` (`withTransaction`), `dataEvents` & Chunk
- **2026-11-25:** Mutasyonlar `*WriteService` + `AppError` + `withTransaction` (`ROLLBACK` hatasında `release(true)`); FE named Recharts + `vendor-charts`/`vendor-charts-core`, sıkı `dataEvents.js`, 3 katmanlı `Hareketler`/`BudgetVarianceCard`.
### ADR-27: İş Emri Kilit Sırası, Tek-TX Bakım & `DATA_SCOPES`
- **2026-11-25:** Kilit-öncesi kiracı (`404`/`403`) + `araclar -> is_emirleri` kilit sırası + `planlanan_tarih::text`; `completeWorkOrderTx` `assertOdometerChronology` + `Math.round` -> `createBakimTx`; `DATA_SCOPES.WORK_ORDER = 'work-order'`.
### ADR-28: Üretim Zırhı, Boş-DB & PG 16 CI (`FORGE-C0`)
- **2026-11-26:** `0`-npm `validateEnv`, `securityHeaders`, `rateLimiter` (`429 RATE_LIMITED`), single-flight `/api/health` + DI `gracefulShutdown`, `000_base_schema` (`typnamespace = current_schema()::regnamespace`) + `runMigrations(..., { schema })`, PG 16 CI.
### ADR-29: Kiracı-İzole DOC-VAULT, SigV4 & Yerel HMAC (`FORGE-C1`)
- **2026-11-26:** `belge_kasasi` (`org_<id>/<varlik>/<YYYY-MM>/<uuid>.<ext>`), `0`-npm SigV4 `UNSIGNED-PAYLOAD` + ASCII sorgu (`prod`da `local` yasak, dev `local`da `fs.stat`); `DRIVER` yalnız taslak yükler/siler, finansal görüntüleme `hasFinanceAccess`, `WorkOrderComplete -> bakimlar.belge_url`.
### ADR-30: Dijital Zimmet Muayenesi, Yeni `atama_id` & Tek-TX (`FORGE-C2`)
- **2026-11-26:** `arac_sofor_atamalari` (`WHERE aktif = TRUE`) yeni `atama_id` üretir; `recordHandoverInspectionTx` tek TX'te `zimmet_muayeneleri` (`19.` tablo) + `<= 4` görsel (`image/jpeg|png|webp`) + kusurda `options.lockedArac` ile `1` konsolide `ariza` iş emri (`KRITIK->kritik`, `KUSURLU->yuksek`) + `aracSayaciniSenkronizeEt`.
### ADR-31: `0`-Paket UTF-8 BOM CSV, `raporController` Slim & `GenelBakis` (`FORGE-C3`)
- **2026-11-26:** `0`-npm `csvSerializer` (`\uFEFF`, `\r\n`, OWASP `'`, RFC 4180) + `raporQueryService` (`MAX_EXPORT_ROWS=10000`, `LIMIT 10001`, `buildVehicleAccessFilter`, `no-store`/`nosniff`, `X-Export-*`); `raporController` (`76`L), `GenelBakis` (`158`L) + `useGenelBakisController` (`144`L) + `ExecExportMenu` (`86`L).
### ADR-32: `userSettings` Ayrımı, `V2.3` X-Ray Dikişleri & Ratchet `12 -> 6` (`FORGE-C4`)
- **2026-11-26:** `userSettingsController` (`76`L) + `userSettingsService` (`237`L, `ADR-14`/`token_version`); `database.sql` `typnamespace = current_schema()::regnamespace`; `forge-meter` `1M`/`$0.90`; 6 dosya daraltılıp ratchet `12 -> 6` (`0` P0 X-Ray).
### ADR-33: Parça Çekirdeği (`parcaQuery/WriteService`) & Ratchet `6 -> 5` (`FORGE-D0`)
- **2026-11-26:** `parcaQueryService` (`73`L) + `parcaWriteService` (`188`L: `araclar -> parca_takip` kilit, `ADR-09`, `!hasFinanceAccess` maliyet koruma/maskeleme, `23505 -> 409`, `PARCA_*` audit); `parcaController` (`84`L) slim, ratchet `6 -> 5`.
### ADR-34: `complianceUtils`, `FleetHealth`/`Takvim` 3-Katman & Ratchet `5 -> 3` (`FORGE-D1`)
- **2026-11-26:** `complianceUtils` (`UTC+3` kaymasız `YYYY-MM-DD`, vade aciliyeti), `FleetHealthWidget`/`Takvim` 3-katman (`AbortController`+`requestIdRef`, `DRIVER`/arşivde mutasyon gizli), `IsEmirleri` `prefillWorkOrder` (`state: null`), ratchet `5 -> 3`.
### ADR-35: `CreateMemberSheet` & `CostTrendChart` 3-Katman + Ratchet `3 -> 1` (`FORGE-D2`)
- **2026-11-26:** `CreateMemberSheet` (`useRef` kilit, `arsivlendi_mi` filtre, `DATA_SCOPES`) ve `CostTrendChart` (`0`-lazy, `effectiveTab`, sıfır-bölme) 3-katman; ratchet `3 -> 1` (`Harita.jsx`).
### ADR-36: `Harita` 3-Katman, `(0,0)`/Arşiv Koruması & Sıfır-Ratchet (`FORGE-D3`)
- **2026-11-26:** `Harita` (`useHaritaController`+`haritaUtils`+3 yaprak; `(0,0)` & `arsivlendi_mi` koruması, `canManage && !arsivlendi_mi` `prefillWorkOrder`); `gate-baseline.json` `"files": {}` (`0` ratchet).
### ADR-37: `V2.4-SEAL` Finans Maskeleme, 0-Uyarı & Çapraz-Kiracı Matrisi (`FORGE-D4`)
- **2026-11-26:** `workOrderQuery/WriteService` `!hasFinanceAccess` maliyet/belge maskeler & korur; `FleetHealthWidget` `prefillWorkOrder` bağlar; `parca`/`parcaIntegrity`/`v24SealMatrix` (`<= 250`L) `0` uyarı/ratchet mührü.
### ADR-38: `V2.5` E0 12-Vektör Güvenlik & Eşzamanlılık Röntgeni (`FORGE-E0`)
- **2026-11-26:** 12 vektörlük E0 röntgeni `X-Request-Id`/steril `500` eksikliği, `TRUST_PROXY=true` prod zafiyeti, `bakim/yakit` `SYSTEM_ADMIN` çapraz-kiracı taşıma, çift sürücü zimmet yarışı ve `notifyWorkOrderRequester` kiracı sızıntısı açıklarını tespit etti.
### ADR-39: Request-Id, Steril `errorHandler`, `TRUST_PROXY` & Çapraz-Kiracı/Zimmet Kilidi (`FORGE-E1`)
- **2026-11-26:** `requestIdMiddleware` + steril 4-arg `errorHandler`/`apiNotFoundHandler` + `100kb` JSON; `parseTrustProxy` prod'da `'true'` yasaklar (`1..5`/IP/CIDR); `bakim/yakit` `CROSS_TENANT_FORBIDDEN`; `assignVehicleTx` `DRIVER_ALREADY_ASSIGNED`; `notifyWorkOrderRequester` org eşleşmesi.
### ADR-40: `geri_bildirimler`, `users.aktif_mi`, Tek-Zimmet & Destek/Yasal Kabuk (`FORGE-E2`)
- **2026-11-26:** `011` `geri_bildirimler` (20. tablo), `users.aktif_mi` (`403 ACCOUNT_DISABLED` -> oturum temizle `/login?reason=expired`), `uq_sofor_tek_aktif_zimmet`, `SupportFeedbackSheet` (`DATA_SCOPES.SUPPORT`, `getLastRequestId`), `ErrorBoundary`, `NotFoundV2`, `LegalDocsModal`, `CorporateContactCard` (`supportConfig` boşsa nötr).
### ADR-41: `LandingV2` Kurumsal Vitrin, Ölü Kod Temizliği & `reason=disabled|expired` (`FORGE-E3`)
- **2026-11-26:** `LandingV2` + `components/v2/landing/*` (`0` API/Recharts/dış URL, `LegalDocsModal key={legalTab}`), eski `HomePage`/`pages/home/*` silindi, `robots.txt` & OG meta eklendi, `api.js` + `LoginV2` `/login?reason=expired|disabled` ayrıştırır.
