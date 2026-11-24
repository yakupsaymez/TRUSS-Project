# TRUSS — Oturum Başlatma & Devir Şablonu (`HANDOFF_TEMPLATE.md`)

## 1. Tek Satırlık Ajan Boot Komutları
Yeni bir AI oturumu açtığında ilgili ajanın rolüne göre aşağıdaki tek satırı yapıştır:

- **S5 (Baş Mimar — READ-ONLY):**
  `/caveman lite. AGENTS.md, .ai/PROGRESS.md, .ai/SWARM_PLAYBOOK.md ve .ai/DECISIONS.md dosyalarını oku. SWARM ROLÜN: S5 (Baş Mimar — READ-ONLY). Hiçbir dosyayı düzenleme; aktif durumu analiz et ve sıradaki mikro-paketi hazırla.`
- **S1 (Frontend Developer):**
  `/caveman. AGENTS.md, .ai/PROGRESS.md, .ai/ENGINEERING_GUARDRAILS.md ve .ai/skills/caveman.md dosyalarını oku. SWARM ROLÜN: S1 (Frontend Developer). Backend/* dosyalarına DOKUNMA. Görev komutunu bekle.`
- **S2 (Backend / Ops Developer):**
  `/caveman. AGENTS.md, .ai/PROGRESS.md, .ai/ENGINEERING_GUARDRAILS.md, .ai/DECISIONS.md ve .ai/skills/caveman.md dosyalarını oku. SWARM ROLÜN: S2 (Backend / Ops). Frontend/* dosyalarına DOKUNMA. Görev komutunu bekle.`
- **S3 (QA / Baş Denetçi — READ-ONLY):**
  `/caveman lite. AGENTS.md, .ai/PROGRESS.md, .ai/ENGINEERING_GUARDRAILS.md ve .ai/DECISIONS.md dosyalarını oku. SWARM ROLÜN: S3 (QA / Baş Denetçi — READ-ONLY). Hiçbir dosyayı düzenleme; son değişiklikleri denetle.`
- **S4 (Bug Hunter):**
  `/caveman. AGENTS.md, .ai/PROGRESS.md, .ai/ENGINEERING_GUARDRAILS.md ve .ai/DECISIONS.md dosyalarını oku. SWARM ROLÜN: S4 (Bug Hunter). Yalnızca atanacak hedef modülde cerrahi kök neden analizi ve yama yap.`

## 2. Tek Komutla Tam Bağlam Paketi Üretimi
Oturumlar arası sıfır kayıplı devir için terminalde çalıştır:
```bash
npm run context:pack
# macOS panoya doğrudan kopyalamak için:
npm run context:pack | pbcopy
```

## 3. Mikro-Paket Devir Şablonu (S5 → S1/S2/S4)
```markdown
/caveman
SWARM ROLÜN: S[1|2|4] — [Rol Adı] (TRUSS Projesi).
GÖREV: [Paket Kodu] — [Tek satır hedef].
İZİNLİ DOSYALAR: [Tam dosya yolları]
KESİN YASAK BÖLGE: [Dokunulmayacak dizin/dosyalar] (`0 diff`).
YAPILACAKLAR:
1. ...
DOĞRULAMA:
- [Çalıştırılacak test/build/check komutu]
```
