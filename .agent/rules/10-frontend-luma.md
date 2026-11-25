---
trigger: glob
globs: "**/Frontend/**"
description: TRUSS Frontend 3 katmanlı dikey dilim, radix-luma OKLCH, Frozen Contract ve 422 kuralları
---

# TRUSS — Frontend `radix-luma` Kuralları (`10-frontend-luma`)

- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 1. 3 Katmanlı Dikey Dilim & Sıfır Tahmin (`ADR-24`)
- **Katman Sınırları:** Sayfa Kabuğu `<= 180`L + `use*Controller <= 200`L + Saf Görünüm `<= 200`L (sert tavan `<= 600`L).
- **Yaprak Görünüm İzolasyonu:** `*View` / `*Panel` / `*Row` / `*Table` yaprak bileşenlerde API/service importu **YASAKTIR** (yalnız props + callback).
- **Frozen Contract:** Sıfır alan adı tahmini; yalnız `keystone` Frozen Contract anahtarları ve enumları kullanılır.
- **Merkezi Eventler (`ADR-20`):** Çapraz bileşen yenilemede yalnız `utils/dataEvents.js` (`DATA_SCOPES` + `truss:data-changed`) kullanılır; çift fetch yasak.

## 2. `radix-luma` OKLCH & Marka (`ADR-06`, `ADR-07`)
- **Tokenlar:** `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-destructive`, `ring-ring`.
- **Yasaklar (`0` ihlal):** Ham `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `zinc-*`, `slate-*`, `purple-*`, `emerald-*`, `amber-*`, `truss-*`, `blur-3xl`.
- **Logo & Tipografi:** İkonsuz `TRU` (`text-foreground`) + `SS` (`text-primary`); plaka, `KM`, `SMH`, `₺`, litre ve tarihte `tabular-nums`.
- **Yasaklı Import/Çağrılar:** `"use client"`, `next/*`, `sonner`, `components/ui/calendar` (`<TrussDatePicker />` kullan), `window.confirm/alert/prompt` (`<ConfirmDialog />`/`<AppSheet />` kullan).

## 3. `422` Sayaç, RBAC & Form (`ADR-03`, `ADR-08`, `ADR-09`, `ADR-12`, `ADR-15`, `ADR-16`)
- **`422 SAYAC_KRONOLOJI_IHLALI`:** Global toast **gösterilmez**; hata alan altında `<SayacFieldError />` ile satır içi gösterilir.
- **RBAC & Hidrasyon:** `<ChannelGuard />` + `channelAccess.js` (`403` double-toast yok), `updateParca` `arac_id` sabit, `RequestIdRef` kademeli dropdown, `autoResetPageIndex: false`.
