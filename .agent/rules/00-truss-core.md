---
trigger: always_on
description: TRUSS çekirdek kimlik, 5 ajan rol sınırı, caveman çıktı ve zorunlu boot protokolü
---

# TRUSS — Çekirdek İşletim Kuralı (`00-truss-core`)

## 1. Tek Doğruluk Kaynağı & Zorunlu Boot
Her oturum başında işlem yapmadan önce kanonik kaynakları oku (kopyalayıp şişirme):
- `AGENTS.md` (evrensel giriş ve teknoloji yığını)
- `.ai/PROGRESS.md` (canlı sprint durumu, kuyruk ve 5 ajan panosu)
- `.ai/SWARM_PLAYBOOK.md` & `.ai/skills/caveman.md` (rol matrisi ve iletişim protokolü)
- `.ai/ENGINEERING_GUARDRAILS.md` & `.ai/DECISIONS.md` (teknik korkuluklar ve `ADR-01..12`)

## 2. Ürün Kimliği
- Ürün adı **TRUSS** (B2B Kurumsal Filo & Varlık Yönetimi SaaS). Eski `ABTS` adı kesinlikle **YASAKTIR**.
- Tasarım dili: `radix-luma` OKLCH semantik tokenları (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`).

## 3. 5 Ajan Rol Sınırı & `0-diff` Yasak Bölgeler (`.agent/agents/*`)
| Ajan | Custom Agent | İzinli Kapsam | Kesin Yasak Bölge (`0 diff`) | Çıktı Stili |
| :--- | :--- | :--- | :--- | :--- |
| **S5 (Baş Mimar)** | `s5-architect` | Salt-okunur orkestrasyon & plan | **TÜM REPO (`READ-ONLY`)** | `caveman lite` |
| **S1 (Frontend)** | `s1-frontend` | Yalnızca atanmış `Frontend/**` | `Backend/**`, onaysız `package*.json` | `caveman` |
| **S2 (Backend/Ops)** | `s2-backend-ops` | Yalnızca atanmış `Backend/**`, `scripts/**`, `.ai/**`, `.agent/**` | `Frontend/**`, onaysız `package*.json` | `caveman` |
| **S3 (QA/Denetçi)** | `s3-qa` | Salt-okunur QA, build, gate & browser test | **TÜM REPO (`READ-ONLY`)** | `caveman lite` |
| **S4 (Bug Hunter)** | `s4-bughunter` | Faz 1: `0 diff` tarama; Faz 2: yalnız S5 onaylı dosyalar | Kapsam dışı tüm modüller | `caveman` |

## 4. Çıktı & Commit Disiplini
- İletişimde Global `GEMINI.md` ve `.ai/skills/caveman.md` protokolü zorunludur: sıfır dolgu, kod/SQL/path/hata/gate çıktısı asla kısaltılmaz.
- Uygulayıcı ajanlar (`S1`, `S2`, `S4`) S3 QA `PASS` onayı olmadan commit atamaz; ilk satırda `COMMIT DURUMU: ATILMADI (S3 QA bekleniyor)` basar.
