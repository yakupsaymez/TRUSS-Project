# TRUSS — Universal AI Operating System (`AGENTS.md`)

## 1. Kimlik & Teknoloji Yığını
- **Ürün:** **TRUSS** — B2B Kurumsal Filo & Varlık Yönetimi SaaS (eski `ABTS` adı YASAKTIR).
- **Backend (`Backend/`):** Node.js, Express, PostgreSQL (`pg` pool + parametreli SQL), Joi, JWT, `bcrypt`, `nodemailer`, `node-cron`.
- **Frontend (`Frontend/`):** React 19, Vite 7, Tailwind CSS v4 (`radix-luma` OKLCH), Zustand, Recharts, TanStack Table v8, Motion.
- **Mimari Standard (`FORGE` & `ADR-24`):**
  - **BE:** Fonksiyonel Çekirdek (`req/res`-bağımsız `fn(client, actor, input)` + `AppError`) + İnce Controller Kabuğu (`<= 90`L).
  - **FE:** 3 Katmanlı Dikey Dilim (`Sayfa <= 180`L + `use*Controller <= 200`L + `Saf Görünüm <= 200`L; yaprakta API importu yasak) + `radix-luma` OKLCH.

## 2. Zorunlu Boot Protokolü (Her Oturum Başlangıcı)
İşlem öncesi sırayla oku: `AGENTS.md` -> `.ai/PROGRESS.md` -> `.ai/SWARM_PLAYBOOK.md` -> `.ai/ENGINEERING_GUARDRAILS.md` -> `.ai/DECISIONS.md` (`ADR-01..29`).

## 3. FORGE Topolojisi (5 Uzman — Rol Tablosu: `.agent/rules/00-truss-core.md`)
- `keystone` (Baş Mimar, `READ-ONLY`), `core-smith` (BE/Veri/Mühür), `shell-crafter` (FE/UI Kabuk), `sentinel` (Düşman QA, `READ-ONLY`), `radar` (Sistemik Röntgen, `READ-ONLY`).

## 4. `.ai/` Kanonik Haritası (6 Dosya)
| Dosya | Maks Satır | Amaç |
| :--- | :---: | :--- |
| `.ai/PROGRESS.md` | 120 | Canlı sprint, `FORGE-M0..M4` yol haritası, riskler ve 5 uzman panosu |
| `.ai/SWARM_PLAYBOOK.md` | 150 | `FORGE` işletim kılavuzu, Frozen Contract, ardışık/paralel akış, Caveman |
| `.ai/ENGINEERING_GUARDRAILS.md` | 140 | `radix-luma`, RBAC, `422 SAYAC_KRONOLOJI_IHLALI`, çekirdek/UI sınırları |
| `.ai/ARCHITECTURE_MAP.md` | 160 | Gerçek FE rotaları/modülleri, BE uçları, `18` PostgreSQL tablosu & indeksler |
| `.ai/DECISIONS.md` | 180 | `ADR-01..29` kalıcı mimari kararlar (`P0-to-Rule` hafızası) |
| `.ai/HANDOFF_TEMPLATE.md` | 60 | `FORGE` 5 uzman boot komutları ve Frozen Contract devir şablonu |
| `.ai/archive/` | — | Arşivlenmiş eski planlar (`.aiignore` ile hariç tutulur) |

## 5. Tek Komutluk Bağlam Paketi
```bash
npm run context:pack
```
