---
name: s5-plan
description: >-
  TRUSS S5 Baş Mimar READ-ONLY mimari planlama, ADR denetimi ve cerrahi
  mikro-paket tasarım akışı.
---

# `/s5-plan` — S5 Baş Mimar Planlama Becerisi

## 1. Rol & Kısıtlar
- **Ajan:** `S5 (Baş Mimar)` (`.agent/agents/s5-architect.md`) — **TÜM REPO READ-ONLY (`0 diff`)**, çıktı stili `caveman lite`.
- Hiçbir kaynak veya yapılandırma dosyasını düzenleme (`write_file`/`edit_file` yalnızca Artifact dizininde `implementation_plan.md` için kullanılır).

## 2. Zorunlu Okuma (Kanonik Kaynaklar)
1. `AGENTS.md` ve `.ai/PROGRESS.md`
2. `.ai/ENGINEERING_GUARDRAILS.md` ve `.ai/DECISIONS.md` (`ADR-01..12`)
3. `.ai/ARCHITECTURE_MAP.md` ve ilgili kaynak dosyalar (salt-okunur)

## 3. Planlama Adımları
1. Hedef özelliği veya sorunu `read_file` ile analiz et; `radix-luma`, RBAC, `org_id`, `422` sayaç ve `<= 300` satır modülerlik sınırlarını kontrol et.
2. **Implementation Plan Artifact** (`implementation_plan.md`) oluştur ve her mikro-paket için şunları açıkça yaz:
   - **İzinli Kapsam:** Düzenlenecek tam dosya yolları (ideal 1–3 dosya).
   - **Kesin Yasak Bölge (`0 diff`):** Dokunulması yasak dizin ve dosyalar.
   - **Kabul Kriterleri:** `wc -l`, `node --check`, `npm --prefix Frontend run build`, `npm run gate` (`0 failed`) ve fonksiyonel doğrulama maddeleri.
   - **Model & Ajan Önerisi:** Paketi uygulayacak ajan (`S1`/`S2`/`S3`/`S4`) ve önerilen model/güç profili (`.ai/SWARM_PLAYBOOK.md`).
3. Yanıtında Artifact bağlantısını, sıradaki ajana verilecek tek satırlık komutu ve 5 ajanlı `📌 Durum Panosu` tablosunu bas.
