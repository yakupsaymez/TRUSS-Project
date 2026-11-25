---
name: forge-xray
description: radar %100 READ-ONLY sistemik sapma röntgeni; context:audit, gate:fast ve P0/P1/P2 tablosu.
---

# `/forge-xray` — Sistemik Röntgen & Sapma Avı (`READ-ONLY`)

- **Rol:** `radar` — **`%100 READ-ONLY` (`0 diff`)**, stil `caveman`.

## 1. Salt-Okunur Tarama Komutları
1. `npm run context:audit` (makine özeti: `node scripts/context-audit.mjs --json`)
2. `npm run gate:fast` (`301-600` uyarı bandı, `> 600` ret, `maxChunkKb: 228`)

## 2. Kod & Mimari Sapma Avı (`dosya:satır` Kanıtlı)
- **Backend Çekirdek:** `> 90`L controllerlar, `req/res`-bağımlı servisler, `try/finally` eksik `client.release()`, eksik `a.org_id = $N` / `FOR UPDATE` / `pg_try_advisory_lock`, UTC tarih, çift sorgu / N+1.
- **Frontend Kabuk:** `> 180/200/200`L 3-katman ihlalleri, yaprak görünümde API/service importu, `utils/dataEvents.js` dışı ham `'truss:data-changed'` eventleri, hardcoded renk/eski palet.
- **Kapsam & Bütçe:** `.ai/*` (`<= 7800` tok), Always-On (`<= 1600` tok), `.agent/*` (`<= 55`L), boş dizin / drift uyarıları.

## 3. Opsiyonel Lokal READ-ONLY Postgres MCP
- Canlı şema veya salt-okunur sorgu denetimi gerekiyorsa [postgres-mcp-readonly.md](./references/postgres-mcp-readonly.md) rehberini izle (**repoda şifre/bağlantı dizgisi 0**).

## 4. Çıktı Formatı
- `dosya:satır` kanıtlı **`P0 / P1 / P2` Sapma Tablosu** + **Context/Gate Özeti** + güncel 5 uzmanlı `📌 Durum Panosu`.
