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
