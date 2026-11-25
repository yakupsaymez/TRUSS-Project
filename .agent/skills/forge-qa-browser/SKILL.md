---
name: forge-qa-browser
description: sentinel canlı v2 E2E protokolü; Light/Dark OKLCH, 422 inline, RBAC ve 0-hata temizlik.
---

# `/forge-qa-browser` — Sentinel Canlı E2E Protokolü

- **Rol:** `sentinel` UI doğrulaması (`READ-ONLY` repo, canlı `localhost` kontrolü).

## 1. Gerçek v2 Rota Kapsamı
- **Genel & Auth:** `/`, `/login`, `/register`, `/forgot-password`
- **Uygulama (`/app/*`):** `/app`, `/app/filo`, `/app/harita`, `/app/hareketler`, `/app/parcalar`, `/app/is-emirleri`, `/app/takvim`, `/app/ekip`, `/app/ayarlar`

## 2. Zorunlu Kırılma & E2E Kontrol Listesi
1. **Light / Dark Tema (`ADR-06`, `ADR-07`):**
   - Açık/koyu tema geçişinde kontrast, `radix-luma` OKLCH uyumu, ikonsuz `TRU`+`SS` logo ve sayısal `tabular-nums` hizası.
2. **`422 SAYAC_KRONOLOJI_IHLALI` (`ADR-03`):**
   - Yakıt/bakım formlarında kronoloji dışı sayaçta global toast **tetiklenmediğini**, hatanın alan altında `<SayacFieldError />` ile satır içi göründüğünü kanıtla.
3. **RBAC & Kiracı İzolasyonu (`ADR-08`, `ADR-13`):**
   - `FLEET_MANAGER` vs `DRIVER` görünümlerinde `<ChannelGuard />`, gizli finans/yönetim aksiyonları ve `0` `403` double-toast kontrolü.
4. **Konsol & Ağ Sıfır Hata:**
   - **`0 console.error`** ve beklenmeyen **`0` adet `4xx/5xx`** (kasıtlı `422` validasyon testi hariç).
5. **Test Sonrası Zorunlu Temizlik:**
   - Testte açılan aktif zimmetleri kapat / test kayıtlarını temizle, test DB snapshot'ını geri yükle ve açılan dev sunucu portlarını kapat.
