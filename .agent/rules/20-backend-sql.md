---
trigger: glob
globs: "**/Backend/**"
description: TRUSS Backend Fonksiyonel Çekirdek, a.org_id izolasyonu, TX ve 422/409 kodları
---

# TRUSS — Backend & SQL Kuralları (`20-backend-sql`)

- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 1. Fonksiyonel Çekirdek / İnce Kabuk (`ADR-24`)
- **İnce Controller (`<= 90`L):** Joi şeması + HTTP cevabı + `AppError` eşleme; iş mantığı barındırmaz.
- **Saf Çekirdek:** `*WriteService` / `*Rules` fonksiyonları `req/res`-bağımsız `fn(client, actor, input)` imzası taşır ve `AppError` fırlatır.

## 2. Parametreli SQL & `a.org_id` İzolasyonu (`ADR-08`, `ADR-13`, `ADR-17`)
- Tüm `pg` sorguları parametreli (`$1, $2`) olmalıdır; string birleştirme ve runtime `ALTER TABLE` yasaktır.
- Tüm korumalı uçlarda `authMiddleware` + `rbacMiddleware` (`buildVehicleAccessFilter`, `checkVehicleOwnership`) zorunludur.
- Kiracı izolasyonu doğrudan indeksli **`a.org_id = $N`** ile sağlanır (`ADR-17`); `SYSTEM_ADMIN` için `user.org_id` tanımlıysa `a.org_id = $N`, yalnız `org_id IS NULL` iken `'1=1'` döner (`ADR-13`).

## 3. Tarih, Transaction & Kilitler (`ADR-01..04`, `ADR-23`)
- `Backend/db.js` `DATE` (`OID 1082`) saf `YYYY-MM-DD` string döner (`ADR-01`); gelecek tarih için UTC `.max('now')` yasak, `dateUtils` (`tarihStr` + `ileriTarihMi`) kullanılır (`ADR-02`).
- `pool.connect()` için `let client;` + `try/finally { if (client) client.release(); }` zorunludur.
- Yazma TX'lerinde `araclariKilitle` (`FOR UPDATE`) + `sayacSinirlari` uygulanır, cron işlerinde `pg_try_advisory_lock` kullanılır; ihlalde **`422 SAYAC_KRONOLOJI_IHLALI`** (`ADR-03`) ve arşivli araçta **`409 VEHICLE_ARCHIVED`** (`ADR-23`) döner.
- Yakıt/bakım `update`/`delete` sonrası TX içinde `aracSayaciniSenkronizeEt` çağrılır (`ADR-04`).

## 4. Mutasyon, Doğrulama & Boyut (`ADR-09`, `ADR-11`)
- `updateParca` `arac_id` değişimini `400` ile reddeder (`ADR-09`); nullable FK `field !== undefined ? (field ? Number(field) : null) : mevcut.field` (`ADR-11`).
- Hedef `<= 300`L (sert sınır `<= 600`L); her değişiklikte `node --check` + `npm run gate`.
