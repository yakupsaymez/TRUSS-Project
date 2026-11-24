# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Dal & Sürüm Durumu
- **Aktif Dal:** `main` (Temel sürüm: `v2.0.0` — `cbca5d0`)
- **Son Doğrulanan Paketler:**
  - `V2.1-BE` (`3026455`): Backend P0/P1/P2 mantık yamaları (`pg` DATE parser `1082`, TR gece yarısı zimmet, 2. `FLEET_MANAGER` org izolasyonu, `araclar` GET/POST/PUT RBAC + Joi + `422` `SAYAC_GERI_GIDEMEZ`, `updateParca` `arac_id` kilidi, `updateYakit`/`updateBakim` `arac_id` değişiminde eski+yeni araç sayaç senkronu, `getOrganization` `DRIVER` `403`, bildirim scheduler `bildirim_tercihleri` JSONB filtresi) — **11/11 PASS**.
  - `V2.1-FE1` (`67e0203`): Frontend temel tema/bileşen/RBAC hizalaması — **PASS**.
  - `V2.1-FE2` (`92857bb`): Frontend sayfa & sheet entegrasyonları — **PASS**.
  - `OPS-1` (Aktif Commit): Evrensel TRUSS AI-OS (`AGENTS.md` + `.ai/*` + `scripts/context-pack.mjs`) kurulumu ve v1 zehirli kural temizliği — **PASS**.

## 2. Aktif Görev (Şu An)
- **`V2.1-FE3`:** `HomePage v2` A/B QA denetimi ve nihai varyant seçimi (`Frontend/src/pages/HomePage.jsx` + `Frontend/src/components/v2/home/`).

## 3. Sıradaki Kuyruk (Öncelik Sırasıyla)
1. **`OPS-2`:** `scripts/ai-gate.mjs` otomatik kalite kapısı + dosya satır limiti Ratchet (`≤300` hedef / `>600` sert ret) + yasaklı token/import tarayıcısı.
2. **`PERF-1`:** `React.lazy` rota bazlı kod bölme + Vite `manualChunks` (`entry chunk ≤350 KB` hedef / `450 KB` sert üst sınır) + font ve ölü paket temizliği.
3. **`REFACTOR-1`:** `>400` satırlık monolit dosyaların Unix modüler mimariye (`Feature-Module` klasör kuralı) bölünmesi.

## 4. Tamamlanan Faz 3 & V2.1 Özeti
| Paket | Kapsam | Durum |
| :--- | :--- | :---: |
| `MP-7` / `MP-7b` / `MP-8` | Odometer Guard (`422`) + `update`/`delete` sonrası `aracSayaciniSenkronizeEt` | ✅ PASS |
| `F3-2A` / `F3-3A` | Şifre değiştirme, yönetici şifre sıfırlama, zimmet kaldırma, organizasyon profili | ✅ PASS |
| `F3-4A` / `F3-5A` / `F3-6A` | Bildirim tercih matrisi (JSONB), aylık bütçe/gerçekleşen analizi, canlı konum check-in | ✅ PASS |
| `V2.1-BE` | S4 denetiminde bulunan 11 Backend P0/P1/P2 bulgusunun cerrahi yaması (`3026455`) | ✅ PASS |
| `V2.1-FE1` / `V2.1-FE2` | `radix-luma` v2 arayüz, RBAC kanal koruması ve sheet/tablo yamaları (`67e0203`, `92857bb`) | ✅ PASS |
| `OPS-1` | Evrensel AI-OS (`AGENTS.md`, `.ai/*`, `scripts/context-pack.mjs`) & v1 temizliği | ✅ PASS |

## 5. 📌 Durum Panosu (Her Yanıt Sonunda Zorunlu Şablon)
| Ajan | Rol | Güç / Model | Aktif Görev | Durum |
| :--- | :--- | :--- | :--- | :--- |
| **S5** | Baş Mimar (READ-ONLY) | `Neon High` (`Neon X-High` / Opus) | `OPS-1` kabul & `V2.1-FE3` orkestrasyonu | 🟢 Aktif |
| **S1** | Frontend Developer | `Neon` Normal (`Neon High` / Sonnet) | `V2.1-FE3` (`HomePage v2` A/B seçimi) | 🟡 Hazır |
| **S2** | Backend / Ops | `Argon` / `Neon` Normal (Sonnet) | `OPS-1` tamamlandı → `OPS-2` bekliyor | 🟢 Tamamlandı |
| **S3** | QA / Baş Denetçi (READ-ONLY) | `Hidrojen` / `Argon` (`Neon High`) | `OPS-1` & `V2.1-FE3` doğrulama | 🟡 Hazır |
| **S4** | Bug Hunter | `2.8 Flash` / `Hidrojen` (`Neon High`) | `V2.1-BE` tamamlandı (11/11 PASS) | ⚪ Beklemede |
