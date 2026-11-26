# TRUSS — Mimari Harita (`ARCHITECTURE_MAP.md`)

## 1. Frontend Rotaları & Modülleri (`Frontend/src/`)
| Rota | Sayfa | Guard | Bileşenler |
|:---|:---|:---:|:---|
|`/`|`pages/HomePage.jsx`|Açık|`pages/home/*`|
|`/login`, `/register`, `/forgot-password`|`pages/v2/{Login,Register,ForgotPassword}V2.jsx`|Açık|`AuthFrame`|
|`/app`|`pages/v2/GenelBakis.jsx`|`horizon`|`useGenelBakisController`, `OverviewKpiStrip`, `CostTrendChart`, `BudgetVarianceCard`, `FleetHealthWidget`, `ExecExportMenu`|
|`/app/filo`|`pages/v2/Filo.jsx`|`horizon`|`FleetDataTable`, `VehicleSheet`, `AssignVehicleSheet`, `HandoverInspectionSheet`|
|`/app/harita`|`pages/v2/Harita.jsx`|`horizon`|`FleetLiveMap`, check-in|
|`/app/hareketler`|`pages/v2/Hareketler.jsx`|`ledger`|`useHareketlerController`, `LedgerDataTable`, `MovementSheet`, `FuelAnomalyPanel`, `FuelImportSheet`|
|`/app/parcalar`|`pages/v2/Parcalar.jsx`|`components`|`ComponentDataTable`, `ComponentSheet`|
|`/app/is-emirleri`|`pages/v2/IsEmirleri.jsx`|`ProtectedRoute`|`work-orders/{WorkOrderTable,WorkOrderFormSheet,WorkOrderCompleteDialog,WorkOrderCancelDialog,useIsEmirleriController}`|
|`/app/takvim`|`pages/v2/Takvim.jsx`|`horizon`|`FleetCalendar`|
|`/app/ekip`|`pages/v2/Ekip.jsx`|`crew`|`CrewDataTable`, `CreateMemberSheet`, `PermissionsSheet`, `ResetPasswordSheet`|
|`/app/ayarlar`|`pages/v2/Ayarlar.jsx`|`ProtectedRoute`|`pages/v2/ayarlar/{Genel,Profil,Organizasyon,Bildirimler,Guvenlik,Denetim}Tab`, `useAyarlarData`|
- **Paylaşılan (`Frontend/src/`):** `components/v2/{AppShell,AppSheet,ChannelGuard,CommandPalette,ConfirmDialog,EmptyState,SayacFieldError,NotificationBell,ActionCenterCard,FleetEfficiencyCard,DocumentComplianceCard,SegmentedDistributionCard,channelAccess.js,navConfig.js}`, `components/v2/doc-vault/*`, `components/ui/*` (Radix/`chart.jsx`/`truss-date-picker.jsx`), `utils/dataEvents.js`, `store/{useAuthStore,useVehicleStore,useAppStore}.js`, `services/{api,auth,arac,yakit,bakim,parca,isEmri,belge,zimmet,rapor,katalog,admin,bildirim,denetim}Service.js`.

## 2. Backend (`Backend/`)
- **Giriş/DB:** `index.js`, `server.js` (`/api/health`), `db.js` (`OID 1082`), `database.sql`, `scripts/{baseSchemaSql,handoverSchemaSql,migrate,migrations,qaSeed,qaSeedHelpers}.js` (`000_base_schema` + `001..010`, `pg_advisory_lock`).
- **Routes:** `{user,admin,arac,yakit,bakim,parca,rapor,katalog,bildirim,denetim,isEmri,belge,zimmet}Routes.js`, `arac/{aracHelpers,aracHandlers,aracMutationHandlers,aracArchiveHandlers}.js`.
- **Controllers:** `{user,userSettings,admin,yakit,yakitAnomaly,yakitImport,bakim,parca,rapor,tco,katalog,bildirim,denetim,isEmri,belge,zimmet}Controller.js` (`rapor` `76`L, `userSettings` `76`L, `parca` `84`L), `admin/{adminHelpers,adminUserController,adminOrgAssignmentController}.js`.
- **Middlewares/Utils:** `middlewares/{authMiddleware,rbacMiddleware,securityHeaders,rateLimiter}.js` (`token_version`, `requirePermission`), `utils/{validateEnv,gracefulShutdown,odometerGuard,dateUtils,csvFuelParser,csvSerializer,jwtSecret,AppError,withTransaction,s3Presigner,localVaultDriver,docVaultSchema}.js`.
- **Services/Tests:** `services/{userSettingsService,yakitWriteService,bakimWriteService,parcaQueryService,parcaWriteService,workOrderWriteService,workOrderQueryService,handoverWriteService,handoverQueryService,raporQueryService,docVaultService,docVaultHelpers,notificationScheduler,notificationService,predictiveService,alertEvaluators,tcoService,fuelAnomalyService,fuelAnomalyRules,fuelImportService,auditService,emailService,smsService}.js`; `tests/{{corePure,coreDbIntegrity,writeServices,workOrder,prodShield,docVault,handover,raporExport,parca}.test,helpers/pgTestHarness}.js`.

## 3. PostgreSQL (`19` Tablo) & Kritik İndeksler
- **Ana & Hareket:** `organizations`, `users` (`token_version`), `araclar` (`org_id`, `arsivlendi_mi`), `arac_sofor_atamalari` (`uq_arac_tek_aktif_zimmet`), `yakitlar`, `bakimlar`, `parca_takip` (`uq_parca_takip_arac_parca`).
- **Katalog (`5`):** `ref_kategoriler`, `ref_markalar`, `ref_kategori_marka`, `ref_modeller`, `ref_arac_varyantlari`.
- **Yönetişim & Operasyon (`7`):** `bildirim_olaylari` (`uq_bildirim_user_kat_ref`), `yakit_anomalileri` (`uq_yakit_anomali_kayit_tip`), `denetim_kayitlari` (`org_id SET NULL`), `schema_migrations`, `is_emirleri` (`uq_is_emirleri_bakim`), `belge_kasasi`, `zimmet_muayeneleri` (`uq_zimmet_muayeneleri_is_emri`).
- **İndeksler:** `idx_araclar_org_id`, `idx_araclar_org_aktif`, `idx_yakitlar_arac_tarih_km`, `idx_bakimlar_arac_tarih_km`, `idx_parca_takip_arac_id`, `idx_atamalar_aktif_arac`, `idx_bildirim_user_okundu`, `idx_yakit_anomalileri_org_durum`, `idx_denetim_org_tarih`, `idx_is_emirleri_org_durum`, `idx_belge_kasasi_varlik`, `idx_zimmet_muayeneleri_org_tarih`.

## 4. AI-OS, FORGE & CI (`.ai/`, `.agent/`, `.github/`)
- **`.ai/` & CI:** `PROGRESS`, `SWARM_PLAYBOOK`, `ENGINEERING_GUARDRAILS`, `ARCHITECTURE_MAP`, `DECISIONS` (`ADR-01..33`), `HANDOFF_TEMPLATE`.md, `gate-baseline.json` (`5` ratchet); `scripts/{ai-gate,context-pack,context-audit,forge-meter}.mjs`; `.github/workflows/ci.yml`.
- **`.agent/`:** `rules/{00-truss-core,10-frontend-luma,20-backend-sql,30-ops-gate}.md`; `skills/{forge,critic,forge-seal,forge-qa-browser,forge-xray}/SKILL.md`; `agents/{keystone,sentinel,core-smith,shell-crafter,radar}.md`.
