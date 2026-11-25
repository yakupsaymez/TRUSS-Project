# TRUSS — Mimari Harita (`ARCHITECTURE_MAP.md`)

## 1. Frontend Rotaları (`Frontend/src/App.js`)
| Rota | Sayfa Bileşeni | Guard | Kapsam |
|:---|:---|:---:|:---|
| `/` | `pages/HomePage.jsx` (`pages/home/*`) | Açık | Kurumsal vitrin |
| `/login`, `/register`, `/forgot-password` | `pages/v2/{Login,Register,ForgotPassword}V2.jsx` | Açık | `AuthFrame` auth |
| `/app` | `pages/v2/GenelBakis.jsx` | `horizon` | KPI, maliyet trendi, bütçe, filo sağlığı |
| `/app/filo` | `pages/v2/Filo.jsx` | `horizon` | `FleetDataTable`, `VehicleSheet`, `AssignVehicleSheet` |
| `/app/harita` | `pages/v2/Harita.jsx` | `horizon` | `FleetLiveMap`, sürücü check-in |
| `/app/hareketler` | `pages/v2/Hareketler.jsx` | `ledger` | `LedgerDataTable`, `MovementSheet`, `FuelAnomalyPanel`, `FuelImportSheet` |
| `/app/parcalar` | `pages/v2/Parcalar.jsx` | `components` | `ComponentDataTable`, `ComponentSheet` |
| `/app/is-emirleri` | `pages/v2/IsEmirleri.jsx` | Açık | İş emri talep, planlama, tamamlama |
| `/app/takvim` | `pages/v2/Takvim.jsx` | `horizon` | `FleetCalendar` |
| `/app/ekip` | `pages/v2/Ekip.jsx` | `crew` | `CrewDataTable`, `PermissionsSheet`, `ResetPasswordSheet` |
| `/app/ayarlar` | `pages/v2/Ayarlar.jsx` (`pages/v2/ayarlar/*`) | `ProtectedRoute` | Profil, şifre, bildirim, org, `?tab=denetim` |

## 2. Frontend Modül Yapısı (`Frontend/src/`)
- **Çekirdek (`components/v2/`):** `AppShell`, `AppSheet`, `AuthFrame`, `ChannelGuard`, `CommandPalette`, `ConfirmDialog`, `EmptyState`, `SayacFieldError`, `channelAccess.js`, `navConfig.js`, `AssignVehicleSheet`, `CreateMemberSheet`, `PermissionsSheet`, `ResetPasswordSheet`, `NotificationBell`, `ActionCenterCard`, `FleetEfficiencyCard`, `FuelAnomalyPanel`, `FuelImportSheet`, `OverviewKpiStrip`, `CostTrendChart`, `BudgetVarianceCard`, `FleetHealthWidget`, `DocumentComplianceCard`, `SegmentedDistributionCard`, `CrewRoleSummaryStrip`.
- **Alt Klasörler (`<= 300`L):**
  - `pages/home/*`, `pages/v2/ayarlar/*` (`GenelTab`, `ProfilTab`, `OrganizasyonTab`, `BildirimlerTab`, `GuvenlikTab`, `DenetimTab`, `PasswordChangeForm`, `useAyarlarData`, `ayarlarConstants`, `denetimConstants`)
  - `components/v2/{app-shell,command-palette,vehicle-sheet,movement-sheet,component-sheet,fleet-data-table,ledger-data-table,component-data-table,crew-data-table,fleet-live-map,fleet-calendar,fuel-anomaly,fuel-import,budget-variance,work-orders}/*` (`ledger-data-table/useHareketlerController.js`, `budget-variance/{useBudgetVariance,BudgetTargetSection}.js*`, `work-orders/{WorkOrderTable,WorkOrderFormSheet,WorkOrderCompleteDialog,WorkOrderCancelDialog,useIsEmirleriController,workOrderConstants}`)
- **`components/ui/` & `utils/`:** `truss-date-picker.jsx`, `chart.jsx`, Radix atomlar; `utils/dataEvents.js`.
- **`store/`:** `useAuthStore.js`, `useVehicleStore.js`, `useAppStore.js`.
- **`services/`:** `api.js`, `authService.js`, `aracService.js`, `yakitService.js`, `bakimService.js`, `parcaService.js`, `isEmriService.js`, `raporService.js`, `katalogService.js`, `adminService.js`, `bildirimService.js`, `denetimService.js`.

## 3. Backend Mimari Haritası (`Backend/`)
- **Giriş/DB:** `index.js` (`require.main` + `app` export), `server.js`, `db.js` (`OID 1082`), `database.sql`, `scripts/{migrate,migrations}.js` (`pg_advisory_lock` + `schema_migrations`).
- **Routes:** `userRoutes.js`, `adminRoutes.js`, `aracRoutes.js` + `arac/{aracHelpers,aracHandlers,aracMutationHandlers,aracArchiveHandlers}.js`, `yakitRoutes.js`, `bakimRoutes.js`, `parcaRoutes.js`, `raporRoutes.js`, `katalogRoutes.js`, `bildirimRoutes.js`, `denetimRoutes.js`, `isEmriRoutes.js` (`/api/araclar/:id/{arsiv,geri-yukle}`, `/api/denetim-kayitlari`, `/api/bildirimler`, `/api/is-emirleri`, `/api/yakitlar/anomaliler*`, `/api/yakitlar/toplu-{onizleme,aktar}` `1mb`).
- **Controllers:** `userController.js`, `adminController.js` + `admin/{adminHelpers,adminUserController,adminOrgAssignmentController}.js`, `yakitController.js`, `yakitAnomalyController.js`, `yakitImportController.js`, `bakimController.js`, `parcaController.js`, `raporController.js`, `tcoController.js`, `katalogController.js`, `bildirimController.js`, `denetimController.js`, `isEmriController.js`.
- **Middlewares/Utils:** `middlewares/{authMiddleware,rbacMiddleware}.js` (`token_version`, 0-DB `requirePermission`), `utils/{odometerGuard,dateUtils,csvFuelParser,jwtSecret,AppError,withTransaction}.js` (`FOR UPDATE`, `arsivliAracEngelle` `409`, `422 SAYAC_KRONOLOJI_IHLALI`, `aracSayaciniSenkronizeEt`).
- **Services/Tests:** `services/{yakitWriteService,bakimWriteService,workOrderWriteService,workOrderQueryService,notificationScheduler,notificationService,predictiveService,alertEvaluators,tcoService,fuelAnomalyService,fuelAnomalyRules,fuelImportService,auditService,emailService,smsService}.js` (`CRON_LOCKS`, `UNNEST`, `logAuditEvent`); `tests/{{corePure,coreDbIntegrity,writeServices,workOrder}.test,helpers/pgTestHarness}.js`.

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
11. `denetim_kayitlari` (`denetim_id`, `org_id` `fk_denetim_kayitlari_org SET NULL`, `user_id`, `kullanici_eposta`, `kullanici_rol`, `eylem`, `varlik_tipi`, `varlik_id`, `ozet`, `detay_json`, `ip_adresi`, `olusturma_tarihi`)
12. `schema_migrations` (`version`, `applied_at`, `checksum`)
13. `is_emirleri` (`is_emri_id`, `org_id`, `arac_id`, `acan_user_id`, `onaylayan_user_id`, `olusulan_bakim_id`, `baslik`, `aciklama`, `kategori`, `oncelik`, `durum`, `bildirilen_sayac`, `servis_adi`, `tahmini_maliyet`, `gerceklesen_maliyet`, `planlanan_tarih`, `red_iptal_nedeni`, `kapanis_tarihi`, `olusturma_tarihi`, `guncelleme_tarihi`)
- **İndeksler:** `idx_araclar_org_id`, `idx_araclar_org_aktif`, `idx_yakitlar_arac_tarih_km`, `idx_bakimlar_arac_tarih_km`, `idx_parca_takip_arac_id`, `idx_atamalar_aktif_arac`, `uq_bildirim_user_kat_ref`, `idx_bildirim_user_okundu`, `uq_yakit_anomali_kayit_tip`, `idx_yakit_anomalileri_org_durum`, `idx_yakit_anomalileri_arac`, `idx_denetim_org_tarih`, `idx_denetim_varlik`, `idx_is_emirleri_org_durum`, `idx_is_emirleri_arac_durum`, `uq_is_emirleri_bakim`.

## 5. AI-OS & FORGE (`.ai/`, `.agent/`)
- **Kanonik (`.ai/`):** `PROGRESS.md`, `SWARM_PLAYBOOK.md`, `ENGINEERING_GUARDRAILS.md`, `ARCHITECTURE_MAP.md`, `DECISIONS.md` (`ADR-01..27`), `HANDOFF_TEMPLATE.md` (+ `gate-baseline.json`, `scripts/{ai-gate,context-pack,context-audit}.mjs`).
- **Rules (`.agent/rules/`):** `00-truss-core.md`, `10-frontend-luma.md`, `20-backend-sql.md`, `30-ops-gate.md`.
- **Skills (`.agent/skills/*/SKILL.md`):** `forge`, `critic`, `forge-seal`, `forge-qa-browser`, `forge-xray` (`references/postgres-mcp-readonly.md`).
- **Uzmanlar (`.agent/agents/`):** `{keystone,sentinel}`(`pro`), `{core-smith,shell-crafter}`(`inherit`), `radar`(`flash`).
