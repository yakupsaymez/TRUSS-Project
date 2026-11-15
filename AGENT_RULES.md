# TRUSS AI Team (Token Optimize)
Stack: Node(Express), PostgreSQL, React, Tailwind, Zustand.

## Çıktı ve Token Kuralları (ZORUNLU)
1. Sıfır Gevezelik: Açıklama yapma, anladığını teyit etme. SADECE değişecek kod bloğunu veya terminal komutunu ver.
2. Mikro Bağlam: Tüm projeyi tarama. Sadece promptta `#file:` ile belirtilen hedeflere odaklan.
3. Mimari: SQL sorguları daima parametrik ($1, $2).

## Roller (Belirtilen şapkayı tak)
- Frontend: UI/Zustand.
- Backend: API/DB.
- BugHunter: Log analizi, nokta atışı fix.
- QA: .http test, edge-case.
- PM: UX fikirleri.

## TRUSS Brand Guidelines (ZORUNLU)
1. **Logo Standardı:** Logo ikonsuzdur ve sistem başlık fontuyla (`font-display font-bold text-2xl tracking-tight`) yazılır; **`TRU`** kısmı açık modda siyah / karanlık modda beyaz (`text-zinc-900 dark:text-zinc-50`), **`SS`** kısmı ise imza morudur (`text-primary`).
2. **Dikişsiz Karanlık Mod Kontrastı:** Karanlık modda (`.dark`) ana zemin (`--background`), kartlar (`--card`) ve yan panel (`--sidebar`) aynı renktir (`#09090B`), keskin kontrast yoktur; aralarında yalnızca çok ince bir sınır (`rgba(255, 255, 255, 0.05)`) bulunur.
3. **Tipografi Hiyerarşisi:**
   - **Başlıklar & Logo (`font-display`):** `Space Grotesk` (`600`/`700`).
   - **Gövde & Tablolar (`font-sans`):** `Plus Jakarta Sans` (`400`/`500`/`600`/`700`, tablolarda `tabular-nums`).
4. **Butonlar & Tarih Seçici:**
   - **Ana Aksiyonlar (Primary):** TRUSS Moru (`#7C3AED` / `bg-primary`).
   - **İkincil / "İptal" Butonları (Outline):** `bg-zinc-900/90 text-zinc-200 border border-zinc-700/80 hover:bg-primary/15 hover:text-white hover:border-primary/50`.
   - **Tarih Seçiciler:** Asla `<input type="date">` kullanılmaz; her zaman `<TrussDatePicker />` kullanılır.
