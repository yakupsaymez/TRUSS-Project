# TRUSS — Mimari Harita (`ARCHITECTURE_MAP.md`)

## 1. Frontend Rotaları (`Frontend/src/App.js`)
| Rota | Sayfa Bileşeni | Kanal Koruması (`ChannelGuard`) | Açıklama |
| :--- | :--- | :---: | :--- |
| `/` | `pages/HomePage.jsx` (`pages/home/*`) | Açık | Kurumsal açılış sayfası (`pages/home/*`) |
| `/login`, `/register`, `/forgot-password` | `pages/v2/LoginV2.jsx`, `RegisterV2.jsx`, `ForgotPasswordV2.jsx` | Açık | `AuthFrame` tabanlı kimlik doğrulama akışları |
| `/app` | `pages/v2/GenelBakis.jsx` | `horizon` | KPI şeridi, maliyet trendi, bütçe/gerçekleşen, filo sağlığı |
| `/app/filo` | `pages/v2/Filo.jsx` | `horizon` | Araç envanter tablosu (`FleetDataTable`), `VehicleSheet`, `AssignVehicleSheet` |
| `/app/harita` | `pages/v2/Harita.jsx` | `horizon` | Canlı araç konum haritası (`FleetLiveMap`) ve sürücü check-in |
| `/app/hareketler` | `pages/v2/Hareketler.jsx` | `ledger` | Birleşik yakıt & bakım defteri (`LedgerDataTable`, `MovementSheet`) |
| `/app/parcalar` | `pages/v2/Parcalar.jsx` | `components` | Parça ömrü ve değişim takibi (`ComponentDataTable`, `ComponentSheet`) |
| `/app/takvim` | `pages/v2/Takvim.jsx` | `horizon` | Belge vadesi ve periyodik bakım takvimi (`FleetCalendar`) |
| `/app/ekip` | `pages/v2/Ekip.jsx` | `crew` | Üye/sürücü yönetimi (`CrewDataTable`, `PermissionsSheet`, `ResetPasswordSheet`) |
| `/app/ayarlar` | `pages/v2/Ayarlar.jsx` (`pages/v2/ayarlar/*`) | Korumalı (`ProtectedRoute`) | Profil, şifre, bildirim matrisi ve organizasyon ayarları |

## 2. Frontend Modül Yapısı (`Frontend/src/`)
- **Çekirdek & Kabuk (`components/v2/`):** `AppShell.jsx`, `AppSheet.jsx`, `AuthFrame.jsx`, `ChannelGuard.jsx`, `CommandPalette.jsx`, `ConfirmDialog.jsx`, `EmptyState.jsx`, `SayacFieldError.jsx`, `channelAccess.js`, `navConfig.js`, `AssignVehicleSheet.jsx`, `CreateMemberSheet.jsx`, `PermissionsSheet.jsx`, `ResetPasswordSheet.jsx`, analitik kartlar (`OverviewKpiStrip`, `CostTrendChart`, `BudgetVarianceCard`, `FleetHealthWidget`, `DocumentComplianceCard`, `SegmentedDistributionCard`, `CrewRoleSummaryStrip`).
- **`REFACTOR-1` & `V2.1-FE4` Feature-Module Klasör Ağacı (`<= 300` satır Unix modüler mimari):**
  - `pages/home/`: `HomeNavbar.jsx`, `HomeHero.jsx`, `HomePreviewShowcase.jsx`, `HomeModulesSection.jsx`, `HomeArchitectureSection.jsx`, `HomeFooterCta.jsx`, `homeContent.js`
  - `pages/v2/ayarlar/`: `GenelTab.jsx`, `ProfilTab.jsx`, `OrganizasyonTab.jsx`, `BildirimlerTab.jsx`, `GuvenlikTab.jsx`, `PasswordChangeForm.jsx`, `useAyarlarData.js`, `ayarlarConstants.js`
  - `components/v2/app-shell/`: `AppShellSidebar.jsx`, `AppShellHeader.jsx`, `useAppShellState.js`, `appShellHelpers.jsx`
  - `components/v2/command-palette/`: `CommandPaletteResults.jsx`, `useCommandPaletteState.js`, `commandPaletteGroups.js`, `commandPaletteParsers.js`
  - `components/v2/vehicle-sheet/`: `VehicleCatalogSection.jsx`, `VehicleCalibrationSection.jsx`, `VehicleDocumentsSection.jsx`, `useVehicleSheetForm.js`, `useVehicleKatalog.js`, `hydrateVehicleKatalog.js`, `vehicleSheetHelpers.js`
  - `components/v2/movement-sheet/`: `MovementIdentitySection.jsx`, `MovementCostSection.jsx`, `MovementNotesSection.jsx`, `useMovementSheetForm.js`, `movementSheetHelpers.js`
  - `components/v2/component-sheet/`: `ComponentIdentitySection.jsx`, `ComponentLifecycleSection.jsx`, `useComponentSheetForm.js`, `componentSheetHelpers.js`
  - `components/v2/fleet-data-table/`: `FleetTableToolbar.jsx`, `FleetTableCells.jsx`, `FleetTablePagination.jsx`, `fleetTableColumns.jsx`, `fleetTableHelpers.js`
  - `components/v2/ledger-data-table/`: `LedgerTableHeader.jsx`, `LedgerTableToolbar.jsx`, `LedgerTablePagination.jsx`, `ledgerTableColumns.jsx`, `useLedgerTableState.js`, `ledgerTableHelpers.js`
  - `components/v2/component-data-table/`: `ComponentTableSummary.jsx`, `ComponentTableToolbar.jsx`, `ComponentTablePagination.jsx`, `componentTableColumns.jsx`, `componentTableHelpers.js`
  - `components/v2/crew-data-table/`: `CrewTableToolbar.jsx`, `CrewRowActions.jsx`, `CrewTablePagination.jsx`, `crewTableColumns.jsx`, `crewTableHelpers.js`
  - `components/v2/fleet-live-map/`: `FleetMapSidebar.jsx`, `FleetMapCanvas.jsx`, `FleetMapDetailBar.jsx`, `useFleetMapState.js`, `mapHelpers.js`
  - `components/v2/fleet-calendar/`: `CalendarToolbar.jsx`, `CalendarMonthView.jsx`, `CalendarWeekDayView.jsx`, `CalendarEventChip.jsx`, `useFleetCalendarState.js`, `calendarHelpers.js`
- **`components/ui/`:** `truss-date-picker.jsx` ve Radix/Shadcn temel UI atomları.
- **`store/`:** `useAuthStore.js` (JWT, kullanıcı, rol, kanal izinleri), `useVehicleStore.js` (aktif araç seçimi ve filo önbelleği), `useAppStore.js` (kabuk/UI durumu).
- **`services/`:** `api.js` (Axios + JWT interceptor), `authService.js`, `aracService.js`, `yakitService.js`, `bakimService.js`, `parcaService.js`, `raporService.js`, `katalogService.js`, `adminService.js`.

## 3. Backend Mimari Haritası (`Backend/`)
| Katman | Dosyalar | Sorumluluk |
| :--- | :--- | :--- |
| **Giriş & DB** | `index.js`, `db.js`, `database.sql`, `scripts/migrateV22DbPerf.js` | Express sunucusu, `pg` bağlantı havuzu (`OID 1082` saf `YYYY-MM-DD` parser), şema ve idempotent V2.2-DBPERF migrasyonu |
| **Routes** | `routes/userRoutes.js`, `adminRoutes.js`, `aracRoutes.js` + `routes/arac/{aracHelpers.js,aracHandlers.js,aracMutationHandlers.js}`, `yakitRoutes.js`, `bakimRoutes.js`, `parcaRoutes.js`, `raporRoutes.js`, `katalogRoutes.js` | `/api/*` REST uçları, Joi şema doğrulaması, `arac/*` alt handler modülleri ve middleware zinciri |
| **Controllers** | `controllers/userController.js`, `adminController.js` + `controllers/admin/{adminHelpers.js,adminUserController.js,adminOrgAssignmentController.js}`, `yakitController.js`, `bakimController.js`, `parcaController.js`, `raporController.js`, `katalogController.js` | İş mantığı, `admin/*` Feature-Module ayrımı, PostgreSQL transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) yönetimi |
| **Middlewares** | `middlewares/authMiddleware.js`, `rbacMiddleware.js` | JWT doğrulama, `FLEET_MANAGER`/`DRIVER` rol ve `org_id` erişim filtreleri |
| **Utils** | `utils/odometerGuard.js`, `utils/dateUtils.js` | `FOR UPDATE` araç kilidi, komşu sayaç sınırları (`422`), `aracSayaciniSenkronizeEt`, TR tarih yardımcıları |
| **Services** | `services/notificationScheduler.js`, `notificationService.js`, `emailService.js`, `smsService.js` | Günlük cron, `bildirim_tercihleri` JSONB filtreli e-posta/SMS uyarıları |

## 4. PostgreSQL Veritabanı Tabloları (12 Tablo)
1. **`organizations`:** Kurumsal kiracı kaydı (`org_id`, `unvan`, `vergi_no`, `plan_tipi`, `aktif`, `olusturulma_tarihi`, `aylik_yakit_butcesi`, `aylik_bakim_butcesi`).
2. **`users`:** Kullanıcılar (`user_id`, `ad_soyad`, `email`, `sifre`, `telefon`, `org_id`, `role`, `yetkiler` JSONB, `bildirim_tercihleri` JSONB, `email_bildirim_aktif`, `sms_bildirim_aktif`, `dil`, `para_birimi`, `olcu_birimi`, `kayit_tarihi`).
3. **`araclar`:** Filo envanteri (`arac_id`, `kullanici_id`, `org_id`, `plaka`, `kategori_id`, `kategori`, `marka`, `model`, `yil`, `sayac_tipi` [`KM`/`SMH`], `guncel_km`, `guncel_calisma_saati`, `varyant_id`, `onerilen_bakim_km`, `triger_degisim_km`, `calisma_saati_bakim`, `muayene_tarihi`, `kasko_tarihi`, `sigorta_tarihi`, `son_enlem`, `son_boylam`, `son_konum_adi`, `son_konum_zamani`).
4. **`arac_sofor_atamalari`:** Aktif ve geçmiş araç-sürücü zimmet kayıtları (`atama_id`, `arac_id`, `sofor_user_id`, `atanma_tarihi`, `teslim_tarihi`, `aktif`).
5. **`yakitlar`:** Yakıt alım hareketleri (`yakit_id`, `arac_id`, `yakit_tipi`, `tarih`, `litre`, `tutar`, `km`, `notlar`, `fatura_no`, `belge_url`, `olusturan_user_id`).
6. **`bakimlar`:** Bakım/servis hareketleri (`bakim_id`, `arac_id`, `bakim_tipi`, `tarih`, `km`, `maliyet`, `notlar`, `fatura_no`, `belge_url`, `olusturan_user_id`).
7. **`parca_takip`:** Araç bileşen/parça ömür takibi (`parca_id`, `arac_id`, `parca_adi`, `son_degisim_km`, `degisim_araligi_km`, `son_degisim_tarihi`, `maliyet`, `notlar`).
8. **`ref_kategoriler`, `ref_markalar`, `ref_kategori_marka`, `ref_modeller`, `ref_arac_varyantlari`:** 5'li normalize araç katalog referans tabloları.
9. **`V2.2-DBPERF` İndeksleri:** `idx_araclar_org_id`, `idx_yakitlar_arac_tarih_km`, `idx_bakimlar_arac_tarih_km`, `idx_parca_takip_arac_id`, `idx_atamalar_aktif_arac` (`WHERE aktif = TRUE`).

## 5. AI-OS & Antigravity v2.34.0 Katmanı (`.ai/` & `.agent/` — `OPS-1..5`)
- **Kanonik Hafıza & Otomasyon (`.ai/` & `scripts/`):** `PROGRESS.md`, `SWARM_PLAYBOOK.md`, `ENGINEERING_GUARDRAILS.md`, `ARCHITECTURE_MAP.md`, `DECISIONS.md` (`ADR-01..12`), `gate-baseline.json`, `skills/caveman.md` + `scripts/ai-gate.mjs` (`gate`/`gate:fast`), `scripts/context-pack.mjs` (`context:pack`), `scripts/context-audit.mjs` (`context:audit`) & `.githooks/pre-commit`.
- **Native Rules (`.agent/rules/`):** `00-truss-core.md` (`always_on`), `10-frontend-luma.md` (`**/Frontend/**`), `20-backend-sql.md` (`**/Backend/**`), `30-ops-gate.md` (`**/.ai/**, **/scripts/**, **/.githooks/**, **/.agent/**`).
- **Modern Skills (`.agent/skills/*/SKILL.md` — 9 Skill):** `truss`, `s5-plan`, `s1-fe`, `s2-be`, `s2-seal`, `s3-qa`, `s4-sweep`, `truss-audit` (`references/postgres-mcp-readonly.md`), `truss-qa-browser`.
- **Custom Agents (`.agent/agents/`):** `s5-architect.md` (`pro`, `READ-ONLY`), `s3-qa.md` (`pro`, `READ-ONLY` + Browser Subagent), `s4-bughunter.md` (`flash`), `s1-frontend.md` (`inherit`), `s2-backend-ops.md` (`inherit`).
