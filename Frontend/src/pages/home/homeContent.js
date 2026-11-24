export const NAV_LINKS = [
  { label: 'Önizleme', href: '#onizleme' },
  { label: 'Modüller', href: '#moduller' },
  { label: 'Nasıl Çalışır', href: '#nasil-calisir' },
  { label: 'Mimari', href: '#mimari' },
];

export const HERO_CONTENT = {
  eyebrow: 'KURUMSAL FİLO OPERASYON PLATFORMU · TRUSS V2',
  title: 'Filonuzun her kilometresini, maliyetini ve bakımını tek merkezden yönetin.',
  description:
    'TRUSS; kilometre (KM) ve çalışma saati (SMH) sayaç bütünlüğünü sunucu düzeyinde koruyan, yakıt, bakım, parça ömrü, bütçe ve konum operasyonlarını tek çatı altında toplayan kurumsal filo platformudur.',
};

export const HERO_SPECS = [
  {
    value: 'KM & SMH',
    metric: '2 Sayaç Tipi · 5 Katalog Tablosu',
    description: 'Çift sayaç birimi ve 4 kademeli katalog tabanlı araç envanteri',
  },
  {
    value: 'HTTP 422',
    metric: 'FOR UPDATE Satır Kilidi',
    description: 'Kronolojik sayaç geri sarma ve tarih çakışması koruması',
  },
  {
    value: '3 Rol · 6 Yetki',
    metric: 'SYSTEM_ADMIN · FLEET_MANAGER · DRIVER',
    description: 'Rol ve modül bazlı sunucu-istemci çift katmanlı erişim matrisi',
  },
  {
    value: '%100 İzole',
    metric: 'org_id & Zimmet Filtresi',
    description: 'Çoklu kiracı organizasyon ve şoför araç zimmet veri ayrımı',
  },
];

export const PREVIEW_TABS = [
  {
    id: 'filo',
    label: 'Filo & Sayaç Takibi',
    badge: 'KM / SMH',
    endpoint: 'GET /api/araclar · org_id=1042',
    summary: {
      title: 'Aktif Filo Envanteri & Evrak Durumu',
      subtitle: 'Katalog doğrulamalı 48 araç · Europe/Istanbul (UTC+3)',
      kpiLabel: 'Operasyon Hazırlık',
      kpiValue: '%95,8',
    },
    rows: [
      {
        plate: '34 TRS 418',
        model: 'Mercedes-Benz Actros 1848 LS · 2024',
        meter: '142.850 KM',
        nextService: '7.150 KM kaldı',
        docStatus: 'Muayene: 18.11.2026',
        statusText: 'Operasyonda',
        tone: 'primary',
      },
      {
        plate: '06 ANK 902',
        model: 'Ford Trucks F-MAX 500 · 2023',
        meter: '218.400 KM',
        nextService: '1.600 KM kaldı',
        docStatus: 'Sigorta: 12 gün kaldı',
        statusText: 'Yaklaşan Bakım',
        tone: 'muted',
      },
      {
        plate: '41 KCL 074',
        model: 'CAT 320 Paletli Ekskavatör · 2022',
        meter: '4.820 SMH',
        nextService: '180 SMH kaldı',
        docStatus: 'Kasko: 04.03.2027',
        statusText: 'Saha Aktif',
        tone: 'primary',
      },
      {
        plate: '35 EGE 511',
        model: 'Renault Trucks T 480 · 2021',
        meter: '310.120 KM',
        nextService: '380 KM aşıldı',
        docStatus: 'Muayene: 4 gün gecikti',
        statusText: 'Servis Blokesi',
        tone: 'destructive',
      },
    ],
  },
  {
    id: 'odometer',
    label: '422 Sayaç Koruması',
    badge: 'HTTP 422',
    endpoint: 'POST /api/yakit · odometerGuard.js',
    summary: {
      title: 'Kronolojik Komşu Sayaç Doğrulaması (FOR UPDATE)',
      subtitle: 'Araç: 34 TRS 418 · Güncel Sayaç: 142.850 KM',
      kpiLabel: 'Bütünlük Kuralı',
      kpiValue: 'Atomik TX',
    },
    guardCase: {
      prevRecord: { date: '18.11.2026', km: '141.920 KM', type: 'Yakıt · 380,00 L · ₺16.720' },
      attemptedRecord: { date: '21.11.2026', km: '141.400 KM', type: 'Yakıt · 295,00 L · ₺12.980' },
      nextFloor: '≥ 141.920 KM',
      errorCode: 'HTTP 422 Unprocessable Entity',
      errorTitle: 'Sayaç Geri Sarma Tespit Edildi (-520 KM)',
      errorDetail:
        '21.11.2026 tarihli kayıt (141.400 KM), 18.11.2026 tarihli önceki kayıttan (141.920 KM) küçük olamaz. İşlem ROLLBACK ile geri alındı.',
    },
  },
  {
    id: 'parca',
    label: 'Parça Ömrü & Bakım',
    badge: 'Ömür Matrisi',
    endpoint: 'GET /api/parca · hesaplaParcaOmru()',
    summary: {
      title: 'Kritik Bileşen Ömür & Maliyet Sıralaması',
      subtitle: 'Kalan ömür yüzdesine göre otomatik risk önceliklendirmesi',
      kpiLabel: 'Aylık Bakım Bütçesi',
      kpiValue: '₺184.500 / ₺220.000',
    },
    parts: [
      { name: 'Ön Fren Balata & Disk Takımı', plate: '35 EGE 511', usage: '58.400 / 60.000 KM', remainingPct: 3, cost: '₺18.400', tone: 'destructive' },
      { name: 'Triger Seti & Devirdaim Pompası', plate: '06 ANK 902', usage: '109.200 / 120.000 KM', remainingPct: 9, cost: '₺32.750', tone: 'muted' },
      { name: 'Hidrolik Ana Filtre & Yağ Seti', plate: '41 KCL 074', usage: '390 / 500 SMH', remainingPct: 22, cost: '₺14.200', tone: 'primary' },
      { name: 'Çekici Aks Lastik Seti (4 Adet)', plate: '34 TRS 418', usage: '41.000 / 100.000 KM', remainingPct: 59, cost: '₺64.000', tone: 'primary' },
    ],
  },
  {
    id: 'rbac',
    label: 'RBAC & Çoklu Kiracı',
    badge: 'org_id İzole',
    endpoint: 'Middleware · authMiddleware + rbacMiddleware',
    summary: {
      title: 'Çoklu Kiracı İzolasyonu & 6 Kanal Yetki Matrisi',
      subtitle: 'Her SQL sorgusunda zorunlu org_id ve zimmet doğrulaması',
      kpiLabel: 'Aktif Kiracı İzolasyonu',
      kpiValue: '%100 org_id',
    },
    roles: [
      {
        role: 'SYSTEM_ADMIN',
        label: 'Sistem Admini',
        scope: 'Tüm organizasyon, bütçe, ekip ve sistem yapılandırması',
        perms: ['yakit: ✓', 'bakim: ✓', 'finans: ✓', 'zimmet: ✓', 'envanter: ✓', 'ekip: ✓'],
      },
      {
        role: 'FLEET_MANAGER',
        label: 'Filo Yöneticisi',
        scope: 'Filo envanteri, hareket defteri, parça ömrü ve şoför zimmetleme',
        perms: ['yakit: ✓', 'bakim: ✓', 'finans: ✓', 'zimmet: ✓', 'envanter: ✓', 'ekip: ✓'],
      },
      {
        role: 'DRIVER',
        label: 'Şoför (Zimmet Korumalı)',
        scope: 'Yalnızca aktif zimmetli araçlarında yakıt ve konum check-in',
        perms: ['yakit: ✓', 'check-in: ✓', 'finans: —', 'zimmet: —', 'envanter: —', 'ekip: —'],
      },
    ],
  },
];

export const TRUST_STRIP_ITEMS = [
  { code: 'ORG_ID :: MULTI-TENANT', title: 'Çoklu Kiracı İzolasyonu', metric: '0 Çapraz Sorgu', detail: 'Tüm tablolarda org_id yabancı anahtar ve ara katman sorgu kilidi.' },
  { code: 'TZ :: EUROPE/ISTANBUL', title: 'UTC+3 Zaman Disiplini', metric: 'OID 1082 Saf Tarih', detail: 'PG DATE alanlarında UTC kaymasını önleyen saf YYYY-MM-DD ayrıştırıcı.' },
  { code: 'RBAC :: 3 ROL × 6 YETKİ', title: 'Rol & Zimmet Koruması', metric: 'JWT + JSONB Yetki', detail: 'Şoför hesaplarında yalnızca aktif zimmetli araç kayıtlarına erişim.' },
  { code: 'TX :: ODOMETER GUARD', title: 'Anlık Denetim & 422 Kilidi', metric: 'BEGIN · FOR UPDATE', detail: 'Araç satırı kilitlenerek komşu kayıtlarla kronolojik sayaç doğrulaması.' },
];

export const BENTO_MODULES = [
  { iconKey: 'filo', code: 'MOD-01 · ENVANTER', title: 'Filo & Çift Sayaç (KM / SMH)', description: 'Marka/model/varyant kataloğu, araç kimliği, evrak vadeleri ve bakım eşikleri.', snippetType: 'filo' },
  { iconKey: 'hareketler', code: 'MOD-02 · DEFTER', title: 'Yakıt, Bakım & 422 Koruması', description: 'Tüm yakıt ve servis kayıtları atomik sayaç doğrulamasından geçer; geri sarma engellenir.', snippetType: 'hareketler' },
  { iconKey: 'parcalar', code: 'MOD-03 · BİLEŞEN', title: 'Parça Ömür Matrisi', description: 'Kritik bileşenler kilometre ve saat bazlı kalan ömür oranına göre en üstte önceliklendirilir.', snippetType: 'parcalar' },
  { iconKey: 'butce', code: 'MOD-04 · FİNANS', title: 'Bütçe & Maliyet Görünürlüğü', description: 'Aylık yakıt ve bakım bütçe hedefleri gerçekleşen harcamalarla karşılaştırılır; sapmalar izlenir.', snippetType: 'butce' },
  { iconKey: 'harita', code: 'MOD-05 · TELEMETRİ', title: 'Canlı Harita & Check-In', description: "Şoförler zimmetli araçları için 16 lojistik merkezden veya cihaz GPS'inden konum bildirir.", snippetType: 'harita' },
  { iconKey: 'takvim', code: 'MOD-06 · KOMUT', title: 'Takvim, Ekip & Cmd+K', description: '4 kaynaklı operasyon takvimi, 3 rollü ekip/zimmet yönetimi ve doğal dil komut paleti.', snippetType: 'takvim' },
];

export const WORKFLOW_STEPS = [
  { step: '01', metric: '5 Referans Tablo · KM / SMH', title: 'Filo & Katalog Kurulumu', description: 'Araçları 4 kademeli marka/model/varyant kataloğu ve KM veya SMH sayaç tipiyle tanımlayın.' },
  { step: '02', metric: '3 Rol · 6 Modül Yetkisi', title: 'Ekip, Rol & Zimmet', description: 'Yönetici ve şoför hesaplarını oluşturun; araç zimmetlerini ve modül yetkilerini atayın.' },
  { step: '03', metric: 'FOR UPDATE · HTTP 422', title: 'Doğrulanmış Saha Kayıtları', description: 'Yakıt, bakım, parça değişimi ve konum girişleri sunucu tarafında kronolojik kuralla doğrulansın.' },
  { step: '04', metric: 'Cron 08:00 · E-Posta / SMS', title: 'Sürekli Kontrol & Bütçe', description: 'Evrak vadelerini takvimden, parça risklerini matristen, bütçe sapmalarını genel bakıştan izleyin.' },
];

export const ARCHITECTURE_GUARANTEES = [
  { code: 'ADR-04 · ODOMETER GUARD', title: 'Atomik Sayaç Bütünlüğü (HTTP 422)', description: 'Geçmişe dönük veya güncel sayacı geri saran kayıtlar PostgreSQL satır kilidiyle reddedilir.' },
  { code: 'ADR-02 · RBAC MATRİSİ', title: 'Çok Katmanlı Rol & Yetki Denetimi', description: 'SYSTEM_ADMIN, FLEET_MANAGER ve DRIVER sınırları hem arayüzde hem API katmanında uygulanır.' },
  { code: 'ADR-01 · TENANT İZOLASYONU', title: 'Organizasyon & Zimmet İzolasyonu', description: 'Her sorgu org_id ve şoför araç zimmet filtresiyle izole edilir; yetkisiz erişim engellenir.' },
  { code: 'ADR-05 · RADIX-LUMA & UTC+3', title: 'Tek Standartta Açık & Koyu Operasyon', description: 'Uzun vardiyalar için düşük göz yorgunluklu semantik arayüz ve Europe/Istanbul yerel saat uyumu.' },
];
