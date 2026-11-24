# TRUSS — Mimari Harita (`ARCHITECTURE_MAP.md`)

## 1. Frontend Rotaları (`Frontend/src/App.js`)
| Rota | Sayfa Bileşeni | Kanal Koruması (`ChannelGuard`) | Açıklama |
| :--- | :--- | :---: | :--- |
| `/` | `pages/HomePage.jsx` | Açık | Kurumsal açılış sayfası (`components/v2/home/*`) |
| `/login`, `/register`, `/forgot-password` | `pages/v2/LoginV2.jsx`, `RegisterV2.jsx`, `ForgotPasswordV2.jsx` | Açık | `AuthFrame` tabanlı kimlik doğrulama akışları |
| `/app` | `pages/v2/GenelBakis.jsx` | `horizon` | KPI şeridi, maliyet trendi, bütçe/gerçekleşen, filo sağlığı |
| `/app/filo` | `pages/v2/Filo.jsx` | `horizon` | Araç envanter tablosu (`FleetDataTable`), `VehicleSheet`, `AssignVehicleSheet` |
| `/app/harita` | `pages/v2/Harita.jsx` | `horizon` | Canlı araç konum haritası (`FleetLiveMap`) ve sürücü check-in |
| `/app/hareketler` | `pages/v2/Hareketler.jsx` | `ledger` | Birleşik yakıt & bakım defteri (`LedgerDataTable`, `MovementSheet`) |
| `/app/parcalar` | `pages/v2/Parcalar.jsx` | `components` | Parça ömrü ve değişim takibi (`ComponentDataTable`, `ComponentSheet`) |
| `/app/takvim` | `pages/v2/Takvim.jsx` | `horizon` | Belge vadesi ve periyodik bakım takvimi (`FleetCalendar`) |
| `/app/ekip` | `pages/v2/Ekip.jsx` | `crew` | Üye/sürücü yönetimi (`CrewDataTable`, `PermissionsSheet`, `ResetPasswordSheet`) |
| `/app/ayarlar` | `pages/v2/Ayarlar.jsx` | Korumalı (`ProtectedRoute`) | Profil, şifre, bildirim matrisi ve organizasyon ayarları |

## 2. Frontend Modül Yapısı (`Frontend/src/`)
- **`components/v2/`:** `AppShell.jsx`, `AppSheet.jsx`, `AuthFrame.jsx`, `ChannelGuard.jsx`, `CommandPalette.jsx`, `ConfirmDialog.jsx`, `EmptyState.jsx`, `SayacFieldError.jsx`, `channelAccess.js`, `navConfig.js`, veri tabloları (`FleetDataTable`, `LedgerDataTable`, `ComponentDataTable`, `CrewDataTable`), sheet formları (`VehicleSheet`, `AssignVehicleSheet`, `MovementSheet`, `ComponentSheet`, `CreateMemberSheet`, `PermissionsSheet`, `ResetPasswordSheet`) ve analitik kartlar (`OverviewKpiStrip`, `CostTrendChart`, `BudgetVarianceCard`, `FleetHealthWidget`, `DocumentComplianceCard`, `SegmentedDistributionCard`, `CrewRoleSummaryStrip`, `FleetCalendar`, `FleetLiveMap`).
- **`components/ui/`:** `truss-date-picker.jsx` ve Radix/Shadcn temel UI atomları.
- **`store/`:** `useAuthStore.js` (JWT, kullanıcı, rol, kanal izinleri), `useVehicleStore.js` (aktif araç seçimi ve filo önbelleği), `useAppStore.js` (kabuk/UI durumu).
- **`services/`:** `api.js` (Axios + JWT interceptor), `authService.js`, `aracService.js`, `yakitService.js`, `bakimService.js`, `parcaService.js`, `raporService.js`, `katalogService.js`, `adminService.js`.

## 3. Backend Mimari Haritası (`Backend/`)
| Katman | Dosyalar | Sorumluluk |
| :--- | :--- | :--- |
| **Giriş & DB** | `index.js`, `db.js`, `database.sql` | Express sunucusu, `pg` bağlantı havuzu (`OID 1082` saf `YYYY-MM-DD` parser), şema |
| **Routes** | `routes/userRoutes.js`, `adminRoutes.js`, `aracRoutes.js`, `yakitRoutes.js`, `bakimRoutes.js`, `parcaRoutes.js`, `raporRoutes.js`, `katalogRoutes.js` | `/api/*` REST uçları, Joi şema doğrulaması ve middleware zinciri |
| **Controllers** | `controllers/userController.js`, `adminController.js`, `yakitController.js`, `bakimController.js`, `parcaController.js`, `raporController.js`, `katalogController.js` | İş mantığı, PostgreSQL transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) yönetimi |
| **Middlewares** | `middlewares/authMiddleware.js`, `rbacMiddleware.js` | JWT doğrulama, `FLEET_MANAGER`/`DRIVER` rol ve `org_id` erişim filtreleri |
| **Utils** | `utils/odometerGuard.js`, `utils/dateUtils.js` | `FOR UPDATE` araç kilidi, komşu sayaç sınırları (`422`), `aracSayaciniSenkronizeEt`, TR tarih yardımcıları |
| **Services** | `services/notificationScheduler.js`, `notificationService.js`, `emailService.js`, `smsService.js` | Günlük cron, `bildirim_tercihleri` JSONB filtreli e-posta/SMS uyarıları |

## 4. PostgreSQL Veritabanı Tabloları (12 Tablo)
1. **`organizations`:** Kurumsal kiracı kaydı (`org_id`, `unvan`, `vergi_no`, `plan_tipi`, `aylik_yakit_butcesi`, `aylik_bakim_butcesi`).
2. **`users`:** Kullanıcılar (`user_id`, `org_id`, `rol`, `kanal_izinleri`, `bildirim_tercihleri` JSONB).
3. **`araclar`:** Filo envanteri (`arac_id`, `kullanici_id`, `plaka`, `sayac_tipi` [`KM`/`SMH`], `guncel_km`, `guncel_calisma_saati`, `son_enlem`, `son_boylam`, `son_konum_adi`, `son_konum_zamani`).
4. **`arac_sofor_atamalari`:** Aktif ve geçmiş araç-sürücü zimmet kayıtları (`atama_id`, `arac_id`, `sofor_id`, `atanma_tarihi`, `bitis_tarihi`).
5. **`yakitlar`:** Yakıt alım hareketleri (`yakit_id`, `arac_id`, `tarih`, `litre`, `tutar`, `km`).
6. **`bakimlar`:** Bakım/servis hareketleri (`bakim_id`, `arac_id`, `tarih`, `aciklama`, `tutar`, `km`).
7. **`parca_takip`:** Araç bileşen/parça ömür takibi (`parca_id`, `arac_id`, `parca_adi`, `takilma_tarihi`, `takilma_km`, `beklenen_omur_km`, `son_bakim_tarihi`).
8. **`ref_kategoriler`, `ref_markalar`, `ref_kategori_marka`, `ref_modeller`, `ref_arac_varyantlari`:** 5'li normalize araç katalog referans tabloları.
