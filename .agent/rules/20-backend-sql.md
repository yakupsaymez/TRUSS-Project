---
trigger: glob
globs: "**/Backend/**"
description: TRUSS Backend PostgreSQL, TX, RBAC, org_id ve ADR korkulukları
---

# TRUSS — Backend & SQL Kuralları (`20-backend-sql`)

- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 1. Parametreli SQL & `org_id` İzolasyonu (`ADR-05`, `ADR-08`)
- Tüm `pg` sorguları parametreli (`$1, $2`) olmalıdır; string birleştirme ile SQL yazmak yasaktır.
- Tüm korumalı uçlarda `authMiddleware` + `rbacMiddleware` (`buildVehicleAccessFilter`, `checkVehicleOwnership`) zorunludur.
- Çoklu `FLEET_MANAGER` izolasyonu (`ADR-05`): `user.org_id` varsa `EXISTS (SELECT 1 FROM users o WHERE o.user_id = a.kullanici_id AND o.org_id = $N)` filtresi uygulanır.

## 2. Tarih & Saat Dilimi (`ADR-01`, `ADR-02`)
- `Backend/db.js` içinde `DATE` (`OID 1082`) saf `YYYY-MM-DD` string olarak parse edilir (`ADR-01`).
- Gelecek tarih kontrolünde UTC bazlı `Joi.date().max('now')` **yasaktır**; `Backend/utils/dateUtils.js` (`tarihStr` + `ileriTarihMi`, `Europe/Istanbul`) kullanılır (`ADR-02`).

## 3. Transaction, Satır Kilidi & Sayaç (`ADR-03`, `ADR-04`)
- `pool.connect()` kullanılan her fonksiyonda `let client;` tanımı ve `try / finally` içinde `if (client) client.release()` zorunludur.
- Yakıt/bakım yazma işlemlerinde `araclariKilitle` (`FOR UPDATE`) + `sayacSinirlari` kontrolü zorunludur; ihlalde `422` (`ODOMETER_VIOLATION` / `SAYAC_GERI_GIDEMEZ`) döner (`ADR-03`).
- Yakıt/bakım `update` ve `delete` sonrası (araç değiştiyse hem eski hem yeni araç için) TX içinde `aracSayaciniSenkronizeEt` çağrılır (`ADR-04`).

## 4. Mutasyon & Katalog Kuralları (`ADR-09`, `ADR-11`)
- `updateParca` (`PUT /api/parcalar/:id`) farklı `arac_id` gönderildiğinde `400` döner ve `arac_id` kolonunu asla güncellemez (`ADR-09`).
- Nullable FK/katalog alanlarında (`PATCH`/`PUT`) `undefined vs null` ayrımı falsy kontrolle değil `field !== undefined ? (field ? Number(field) : null) : mevcut.field` kalıbıyla işlenir (`ADR-11`).

## 5. Dosya Boyutu & Doğrulama
- Hedef `<= 300` satır (sert sınır `<= 600` satır). Her değişiklikte `node --check` + `npm run gate` zorunludur.
