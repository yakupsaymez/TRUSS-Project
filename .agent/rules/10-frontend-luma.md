---
trigger: glob
globs: "**/Frontend/**"
description: TRUSS Frontend radix-luma OKLCH tema, bileşen, 422 ve ADR korkulukları
---

# TRUSS — Frontend `radix-luma` Kuralları (`10-frontend-luma`)

- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 1. `radix-luma` OKLCH Semantik Tema (`ADR-06`)
- **Zorunlu Tokenlar:** `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-destructive`, `ring-ring`.
- **Sıfır Tolerans Yasaklar (`0` ihlal):**
  - Ham `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()` renkleri.
  - Eski/sabit paletler: `zinc-*`, `slate-*`, `purple-*`, `emerald-*`, `amber-*`, `truss-*`.
  - Ağır GPU efektleri: `blur-3xl`.

## 2. Marka, Tipografi & Bileşen Standartları (`ADR-07`)
- **Logo (`ADR-07`):** Her yüzeyde ikonsuz, saf tipografik `TRU` (`text-foreground`) + `SS` (`text-primary`).
- **Sayısal Veri:** Plaka, `KM`, `SMH`, tutar (`₺`), litre ve tarihlerde `tabular-nums` zorunludur.
- **Tarih Seçici:** Tüm tarih alanlarında `<TrussDatePicker />` kullanılır.
- **Yasaklı Import & Çağrılar:** `"use client"`, `next/*`, `sonner`, `components/ui/calendar`, `window.confirm`, `window.alert`, `window.prompt`.

## 3. `422` Sayaç, RBAC & Form Kuralları (`ADR-03`, `ADR-08`, `ADR-09`, `ADR-12`)
- **`422` Odometer Guard (`ADR-03`):** `422` (`ODOMETER_VIOLATION` / `SAYAC_GERI_GIDEMEZ`) hatalarında global toast **gösterilmez**; ilgili alan altında `<SayacFieldError />` ile satır içi gösterilir.
- **RBAC (`ADR-08`):** Rota seviyesinde `<ChannelGuard />`, bileşen seviyesinde `channelAccess.js` (`403` double-toast yasak).
- **Parça `arac_id` (`ADR-09`):** Parça düzenlemede `arac_id` değiştirilemez.
- **Async Dropdown & Hidrasyon (`ADR-12`):** Kademeli seçimlerde alt listeler temizlenip `RequestIdRef` artırılır; async hidrasyon tüm formu ezmez, `prev` üzerine kısmi patch uygular.

## 4. Dosya Boyutu & Modülerlik
- Hedef `<= 300` satır (`> 400` satırda `FeatureName/index.jsx` modül yapısı), sert üst sınır **`<= 600` satır**.
