---
name: truss-qa-browser
description: >-
  TRUSS S3 QA Baş Denetçi için Browser Subagent canlı UI, açık/koyu tema, 422
  SayacFieldError, RBAC ve konsol/ağ 0-hata doğrulama protokolü.
---

# TRUSS — Browser Subagent Canlı QA Protokolü (`truss-qa-browser`)

- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 1. Canlı Doğrulama Kapsamı (`localhost`)
UI etkileyen her pakette (`S1` / `S4` FE) `S3 (QA)` Browser Subagent ile aşağıdaki yüzeyleri canlı doğrular:
- **Genel & Auth:** `/` (`HomePage v2` kurumsal vitrin), `/login` (`AuthFrame`).
- **Uygulama (`/app/*`):** İlgili modül rotaları (`Dashboard`, `Araclar`, `Yakit`, `Bakim`, `Parcalar`, `Raporlar`, `Suruculer`).

## 2. Zorunlu Kontrol Listesi
1. **Light / Dark Tema (`radix-luma` OKLCH — `ADR-06`, `ADR-07`):**
   - Açık ve koyu tema geçişlerinde kontrast kırılması, sabit/eski palet sızıntısı veya `blur-3xl` olmadığını doğrula.
   - İkonsuz tipografik `TRU` (`text-foreground`) + `SS` (`text-primary`) logosunu ve sayısal sütunlarda (`KM`, `SMH`, `₺`, litre, tarih, plaka) `tabular-nums` hizasını kontrol et.
2. **`422` Odometer Guard (`ADR-03`):**
   - Yakıt/bakım formlarında kronolojiye aykırı sayaç (`KM`/`SMH`) girildiğinde global toast **tetiklenmediğini**, hatanın ilgili alan altında `<SayacFieldError />` (`ODOMETER_VIOLATION` / `SAYAC_GERI_GIDEMEZ`) ile satır içi gösterildiğini doğrula.
3. **RBAC Görünürlük & Kanal Koruması (`ADR-08`):**
   - `FLEET_MANAGER` ve `DRIVER` görünümlerinde `<ChannelGuard />` rota korumasını, yetkisiz aksiyonların gizlendiğini ve `403` durumunda double-toast oluşmadığını doğrula.
4. **Konsol & Ağ Sıfır Hata:**
   - Tarayıcı konsolunda **`0 console.error`** ve ağ trafiğinde beklenmeyen **`0` adet `4xx/5xx`** (`422` validación testi hariç) olduğunu kanıtla; sonuçları Walkthrough Artifact içine kaydet.
