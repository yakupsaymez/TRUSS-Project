# TRUSS — Mimari Harita (`ARCHITECTURE_MAP.md`)

## 1. Frontend Rotaları (`Frontend/src/App.js`)
| Rota | Sayfa Bileşeni | Guard | Kapsam |
|:---|:---|:---:|:---|
|`/`|`pages/HomePage.jsx` (`pages/home/*`)|Açık|Vitrin|
|`/login`, `/register`, `/forgot-password`|`pages/v2/{Login,Register,ForgotPassword}V2.jsx`|Açık|`AuthFrame` auth|
|`/app`|`pages/v2/GenelBakis.jsx`|`horizon`|KPI, trend, bütçe, sağlık|
|`/app/filo`|`pages/v2/Filo.jsx`|`horizon`|`FleetDataTable`, `VehicleSheet`, `AssignVehicleSheet`|
|`/app/harita`|`pages/v2/Harita.jsx`|`horizon`|`FleetLiveMap`, check-in|
|`/app/hareketler`|`pages/v2/Hareketler.jsx`|`ledger`|`LedgerDataTable`, `MovementSheet`, `FuelAnomalyPanel`, `FuelImportSheet`|
|`/app/parcalar`|`pages/v2/Parcalar.jsx`|`components`|`ComponentDataTable`, `ComponentSheet`|
|`/app/is-emirleri`|`pages/v2/IsEmirleri.jsx`|`ProtectedRoute`|İş emri talep, plan, tamam|
|`/app/takvim`|`pages/v2/Takvim.jsx`|`horizon`|`FleetCalendar`|
|`/app/ekip`|`pages/v2/Ekip.jsx`|`crew`|`CrewDataTable`, `PermissionsSheet`, `ResetPasswordSheet`|
|`/app/ayarlar`|`pages/v2/Ayarlar.jsx` (`pages/v2/ayarlar/*`)|`ProtectedRoute`|Profil, şifre, bildirim, org, `?tab=denetim`|

## 2. Frontend Modülleri (`Frontend/src/`)
- **Çekirdek (`components/v2/`):** `AppShell`, `AppSheet`, `AuthFrame`, `ChannelGuard`, `CommandPalette`, `ConfirmDialog`, `EmptyState`, `SayacFieldError`, `channelAccess.js`, `navConfig.js`, `AssignVehicleSheet`, `CreateMemberSheet`, `PermissionsSheet`, `ResetPasswordSheet`, `NotificationBell`, `ActionCenterCard`, `FleetEfficiencyCard`, `FuelAnomalyPanel`, `FuelImportSheet`, `OverviewKpiStrip`, `CostTrendChart`, `BudgetVarianceCard`, `FleetHealthWidget`, `DocumentComplianceCard`, `SegmentedDistributionCard`, `CrewRoleSummaryStrip`.
- **Alt Klasörler:** `pages/home/*`, `pages/v2/ayarlar/*` (`{Genel,Profil,Organizasyon,Bildirimler,Guvenlik,Denetim}Tab`, `PasswordChangeForm`, `useAyarlarData`, `{ayarlar,denetim}Constants`), `components/v2/{app-shell,command-palette,vehicle-sheet,movement-sheet,component-sheet,fleet-data-table,ledger-data-table,component-data-table,crew-data-table,fleet-live-map,fleet-calendar,fuel-anomaly,fuel-import,budget-variance,work-orders}/*` (`useHareketlerController`, `useBudgetVariance`, `BudgetTargetSection`, `work-orders/{WorkOrderTable,WorkOrderFormSheet,WorkOrderCompleteDialog,WorkOrderCancelDialog,useIsEmirleriController,workOrderConstants}`).
- **UI/Utils/Store:** `components/ui/*` (`truss-date-picker.jsx`, `chart.jsx`, Radix), `utils/dataEvents.js`, `store/{useAuthStore,useVehicleStore,useAppStore}.js`.
- **Services (`services/`):** `api`, `{auth,arac,yakit,bakim,parca,isEmri,rapor,katalog,admin,bildirim,denetim}Service.js`.

## 3. Backend Mimari Haritası (`Backend/`)
- **Giriş/DB:** `index.js` (`startServer`, `SIGTERM`/`SIGINT`), `server.js` (`createApp`, `GET /api/health` single-flight), `db.js` (`DATABASE_URL`/`DB_*`, `OID 1082`), `database.sql`, `scripts/{baseSchemaSql,migrate,migrations}.js` (`000_base_schema` + `001..008`, `pg_advisory_lock`, `options.schema`).
- **Routes:** `{user,admin,arac,yakit,bakim,parca,rapor,katalog,bildirim,denetim,isEmri}Routes.js`, `arac/{aracHelpers,aracHandlers,aracMutationHandlers,aracArchiveHandlers}.js` (`/api/parcalar`+`/api/parca-takip`, `/api/araclar/:id/{arsiv,geri-yukle}`, `/api/denetim-kayitlari`, `/api/bildirimler`, `/api/is-emirleri`, `/api/yakitlar/anomaliler*`, `/api/yakitlar/toplu-{onizleme,aktar}` `1mb`).
- **Controllers:** `{user,admin,yakit,yakitAnomaly,yakitImport,bakim,parca,rapor,tco,katalog,bildirim,denetim,isEmri}Controller.js`, `admin/{adminHelpers,adminUserController,adminOrgAssignmentController}.js`.
- **Middlewares/Utils:** `middlewares/{authMiddleware,rbacMiddleware,securityHeaders,rateLimiter}.js` (`token_version`, 0-DB `requirePermission`, CSP/HSTS, `loginRateLimiter`/`registerRateLimiter` `429 RATE_LIMITED`), `utils/{validateEnv,gracefulShutdown,odometerGuard,dateUtils,csvFuelParser,jwtSecret,AppError,withTransaction}.js` (`FOR UPDATE`, `arsivliAracEngelle` `409`, `422 SAYAC_KRONOLOJI_IHLALI`, `aracSayaciniSenkronizeEt`).
- **Services/Tests:** `services/{yakitWriteService,bakimWriteService,workOrderWriteService,workOrderQueryService,notificationScheduler,notificationService,predictiveService,alertEvaluators,tcoService,fuelAnomalyService,fuelAnomalyRules,fuelImportService,auditService,emailService,smsService}.js` (`CRON_LOCKS`, `stopNotificationScheduler`, `UNNEST`, `logAuditEvent`); `tests/{{corePure,coreDbIntegrity,writeServices,workOrder,prodShield}.test,helpers/pgTestHarness}.js`.

## 4. PostgreSQL (`17` Tablo) & İndeksler
1. `organizations` (`org_id`, `unvan`, `vergi_no`, `plan_tipi`, `aktif`, `olusturulma_tarihi`, `aylik_yakit_butcesi`, `aylik_bakim_butcesi`)
2. `users` (`user_id`, `ad_soyad`, `email`, `sifre`, `telefon`, `org_id`, `role`, `yetkiler`, `token_version`, `bildirim_tercihleri`, `email_bildirim_aktif`, `sms_bildirim_aktif`, `dil`, `para_birimi`, `olcu_birimi`, `kayit_tarihi`)
3. `araclar` (`arac_id`, `kullanici_id`, `org_id`, `plaka`, `kategori_id`, `kategori`, `marka`, `model`, `yil`, `sayac_tipi`, `guncel_km`, `guncel_calisma_saati`, `varyant_id`, `onerilen_bakim_km`, `triger_degisim_km`, `calisma_saati_bakim`, `depo_kapasitesi_l`, `hedef_tuketim`, `muayene_tarihi`, `kasko_tarihi`, `sigorta_tarihi`, `son_enlem`, `son_boylam`, `son_konum_adi`, `son_konum_zamani`, `arsivlendi_mi`, `arsiv_tarihi`, `arsiv_nedeni`)
4. `arac_sofor_atamalari` (`atama_id`, `arac_id`, `sofor_user_id`, `atanma_tarihi`, `teslim_tarihi`, `aktif`)
5. `yakitlar` (`yakit_id`, `arac_id`, `yakit_tipi`, `tarih`, `litre`, `tutar`, `km`, `notlar`, `fatura_no`, `belge_url`, `olusturan_user_id`)
6. `bakimlar` (`bakim_id`, `arac_id`, `bakim_tipi`, `tarih`, `km`, `maliyet`, `notlar`, `fatura_no`, `belge_url`, `olusturan_user_id`)
7. `parca_takip` (`parca_id`, `arac_id`, `parca_adi`, `son_degisim_km`, `degisim_araligi_km`, `son_degisim_tarihi`, `maliyet`, `notlar`)
8. `ref_kategoriler`, `ref_markalar`, `ref_kategori_marka`, `ref_modeller`, `ref_arac_varyantlari` (5 katalog)
9. `bildirim_olaylari` (`bildirim_id`, `org_id`, `user_id`, `arac_id`, `kategori`, `seviye`, `referans_anahtar`, `baslik`, `mesaj`, `link_url`, `meta_json`, `okundu_mu`, `eposta_gonderildi`, `olusturma_tarihi`, `okunma_tarihi`)
10. `yakit_anomalileri` (`anomali_id`, `org_id`, `arac_id`, `yakit_id`, `tip`, `seviye`, `olculen_deger`, `beklenen_esik`, `aciklama`, `durum`, `inceleyen_user_id`, `inceleme_notu`, `olusturma_tarihi`, `inceleme_tarihi`)
11. `denetim_kayitlari` (`denetim_id`, `org_id` `SET NULL`, `user_id`, `kullanici_eposta`, `kullanici_rol`, `eylem`, `varlik_tipi`, `varlik_id`, `ozet`, `detay_json`, `ip_adresi`, `olusturma_tarihi`)
12. `schema_migrations` (`version`, `applied_at`, `checksum`)
13. `is_emirleri` (`is_emri_id`, `org_id`, `arac_id`, `acan_user_id`, `onaylayan_user_id`, `olusulan_bakim_id`, `baslik`, `aciklama`, `kategori`, `oncelik`, `durum`, `bildirilen_sayac`, `servis_adi`, `tahmini_maliyet`, `gerceklesen_maliyet`, `planlanan_tarih`, `red_iptal_nedeni`, `kapanis_tarihi`, `olusturma_tarihi`, `guncelleme_tarihi`)
- **İndeksler:** `idx_araclar_org_id`, `idx_araclar_org_aktif`, `idx_yakitlar_arac_tarih_km`, `idx_bakimlar_arac_tarih_km`, `idx_parca_takip_arac_id`, `idx_atamalar_aktif_arac`, `uq_bildirim_user_kat_ref`, `idx_bildirim_user_okundu`, `uq_yakit_anomali_kayit_tip`, `idx_yakit_anomalileri_org_durum`, `idx_yakit_anomalileri_arac`, `idx_denetim_org_tarih`, `idx_denetim_varlik`, `idx_is_emirleri_org_durum`, `idx_is_emirleri_arac_durum`, `uq_is_emirleri_bakim`.

## 5. AI-OS, FORGE & CI (`.ai/`, `.agent/`, `.github/`)
- **`.ai/` & CI:** `PROGRESS`, `SWARM_PLAYBOOK`, `ENGINEERING_GUARDRAILS`, `ARCHITECTURE_MAP`, `DECISIONS` (`ADR-01..28`), `HANDOFF_TEMPLATE`.md, `gate-baseline.json`; `scripts/{ai-gate,context-pack,context-audit}.mjs`; `.github/workflows/ci.yml` (PG 16 CI).
- **`.agent/`:** `rules/{00-truss-core,10-frontend-luma,20-backend-sql,30-ops-gate}.md`; `skills/{forge,critic,forge-seal,forge-qa-browser,forge-xray}/SKILL.md` (`references/postgres-mcp-readonly.md`); `agents/{keystone,sentinel,core-smith,shell-crafter,radar}.md`.
