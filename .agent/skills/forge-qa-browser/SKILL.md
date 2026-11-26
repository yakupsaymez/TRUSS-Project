---
name: forge-qa-browser
description: sentinel canlı v2 E2E protokolü; Light/Dark OKLCH, 422 inline, RBAC ve 0-hata temizlik.
---

# `/forge-qa-browser` — Sentinel Canlı E2E Protokolü

- **Rol:** `sentinel` UI doğrulaması (`READ-ONLY` repo, canlı `localhost` kontrolü).

## 1. Hedefli E2E Kapsamı (`<= 10` Adım Hedef, `15` Tavan)
- **`Frontend/**` `0 diff` ise tarayıcı E2E AÇILMAZ.**
- Tüm 13 rotayı (`/`, `/login`, `/app/*`) gezme; **yalnız `FROZEN CONTRACT` içinde değişen rota/sheet** üzerinde doğrulama yap.

## 2. Hedefli Kırılma & E2E Kontrol Listesi
1. **Light / Dark Tema (`ADR-06`, `ADR-07`):**
   - Değişen rota/sheet üzerinde açık/koyu tema kontrastı, `radix-luma` OKLCH ve sayısal `tabular-nums` kontrolü.
2. **`422 SAYAC_KRONOLOJI_IHLALI` & RBAC (`ADR-03`, `ADR-08`, `ADR-13`):**
   - İlgili form değiştiyse satır içi `<SayacFieldError />` (global toast yok); yetki değiştiyse `<ChannelGuard />` ve `0` `403` double-toast kontrolü.
3. **Konsol & Ağ Sıfır Hata:**
   - **`0 console.error`** ve beklenmeyen **`0` adet `4xx/5xx`** (kasıtlı `422` testi hariç).
4. **Temizlik & Adım Bütçesi:**
   - Test kayıtlarını/zimmeti/dev portunu temizle; hedef **`<= 10` adım**, sert tavan **`15` adım** (aşılırsa dur, `STEP_BUDGET_EXCEEDED` bas ve tarayıcıyı kapat).
