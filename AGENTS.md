# TRUSS — Universal AI Operating System (`AGENTS.md`)

## 1. Kimlik & Teknoloji Yığını
- **Ürün:** **TRUSS** — B2B Kurumsal Filo & Varlık Yönetimi SaaS (Eski `ABTS` adı kesinlikle YASAKTIR).
- **Backend (`Backend/`):** Node.js, Express, PostgreSQL (`pg` pool + raw SQL), Joi, JWT, `bcrypt`, `nodemailer`, `node-cron`.
- **Frontend (`Frontend/`):** React 19, Vite 7, Tailwind CSS v4 (`radix-luma` OKLCH semantik tema), Zustand, Recharts, TanStack Table v8, Motion.
- **Tasarım Dili:** `radix-luma` semantik tokenları (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`). Ham hex/rgb veya eski `truss-*`/`zinc-*`/`slate-*` sınıfları YASAKTIR.

## 2. Zorunlu Boot Protokolü (Her Oturum Başlangıcı)
Herhangi bir yanıt üretmeden veya dosya düzenlemeden önce sırasıyla oku:
1. `AGENTS.md` (bu dosya — evrensel giriş noktası)
2. `.ai/PROGRESS.md` (canlı durum, tamamlanan paketler, aktif kuyruk ve 5 ajan durum panosu)
3. `.ai/SWARM_PLAYBOOK.md` + `.ai/skills/caveman.md` (atanan rol sınırları, güç profilleri ve çıktı stili)
4. `.ai/ENGINEERING_GUARDRAILS.md` + `.ai/DECISIONS.md` (kod yazmadan veya denetlemeden önce zorunlu teknik kurallar ve ADR'ler)

## 3. 5 Ajanlı Swarm Rolleri (Özet)
- **S5 (Baş Mimar):** READ-ONLY orkestratör; mimari karar, mikro-paket dağıtımı ve bağlam yönetimi (`caveman lite`).
- **S1 (Frontend):** Yalnızca `Frontend/*` üzerinde `radix-luma` UI/UX ve bileşen geliştirme (`caveman`).
- **S2 (Backend / Ops):** Yalnızca `Backend/*`, `scripts/*` ve `.ai/*` üzerinde API, SQL, TX ve otomasyon (`caveman`).
- **S3 (QA / Baş Denetçi):** READ-ONLY denetçi; build, lint, tema, RBAC ve regresyon doğrulaması (`caveman lite`).
- **S4 (Bug Hunter):** Yalnızca atanmış modülde cerrahi P0/P1/P2 hata avı ve kök neden yaması (`caveman`).

## 4. `.ai/` Dizin Haritası
| Dosya | Maks Satır | Amaç |
| :--- | :---: | :--- |
| `.ai/PROGRESS.md` | 120 | Canlı sprint durumu, son commitler, sıradaki kuyruk ve 5 ajan panosu |
| `.ai/SWARM_PLAYBOOK.md` | 150 | S1..S5 rol matrisi, yasak bölgeler, model güç profilleri ve iş akışı |
| `.ai/ENGINEERING_GUARDRAILS.md` | 140 | `radix-luma`, RBAC, `422` Odometer Guard, dosya boyutu ve chunk bütçesi |
| `.ai/ARCHITECTURE_MAP.md` | 160 | Gerçek Frontend rotaları/bileşenleri, Backend uçları ve 12 PostgreSQL tablosu |
| `.ai/DECISIONS.md` | 180 | `ADR-01`..`ADR-10` kalıcı mimari kararlar (`P0-to-Rule` hafızası) |
| `.ai/skills/caveman.md` | 50 | `caveman` ve `caveman lite` token tasarruflu iletişim protokolü |
| `.ai/HANDOFF_TEMPLATE.md` | 60 | S1..S5 tek satırlık boot komutları ve oturum devir şablonu |
| `.ai/archive/` | — | Arşivlenmiş eski planlar (`.aiignore` ile AI taramasından hariç tutulur) |

## 5. Tek Komutluk Bağlam Paketi
Yeni bir AI oturumuna tam bağlam aktarmak için kök dizinde çalıştır:
```bash
npm run context:pack
# macOS panoya kopyalama: npm run context:pack | pbcopy
```
