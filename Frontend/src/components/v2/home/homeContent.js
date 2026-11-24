export const NAV_LINKS = [
  { label: 'Modüller', href: '#moduller' },
  { label: 'Nasıl Çalışır', href: '#nasil-calisir' },
  { label: 'Mimari', href: '#mimari' },
];

export const HERO_CONTENT = {
  eyebrow: 'KURUMSAL FİLO OPERASYON PLATFORMU',
  title: 'Filonuzun her kilometresini, maliyetini ve bakımını tek merkezden yönetin.',
  description:
    'TRUSS; kilometre ve çalışma saati (SMH) sayaç bütünlüğünü sunucu düzeyinde koruyan, yakıt, bakım, parça ömrü, bütçe ve konum operasyonlarını tek çatı altında toplayan kurumsal filo platformudur.',
};

export const HERO_SPECS = [
  {
    value: 'KM & SMH',
    description: 'Çift sayaç birimi ve katalog tabanlı araç envanteri',
  },
  {
    value: '422 Kilidi',
    description: 'Kronolojik sayaç geri sarma ve tutarsızlık koruması',
  },
  {
    value: '3 Rol · 6 Yetki',
    description: 'Yönetici, filo yöneticisi ve şoför erişim matrisi',
  },
  {
    value: '%100 İzole',
    description: 'Organizasyon ve araç zimmet bazlı veri ayrımı',
  },
];

export const MODULES = [
  {
    iconKey: 'filo',
    title: 'Filo & Çift Sayaç (KM / SMH)',
    description:
      'Marka/model/varyant kataloğu, araç kimliği, muayene-sigorta-kasko takibi ve periyodik bakım eşikleri.',
  },
  {
    iconKey: 'hareketler',
    title: 'Yakıt, Bakım & 422 Koruması',
    description:
      'Tüm yakıt ve servis kayıtları atomik sayaç doğrulamasından geçer; geri sarma ve tarih çakışması engellenir.',
  },
  {
    iconKey: 'parcalar',
    title: 'Parça Ömür Matrisi',
    description:
      'Kritik bileşenler kilometre ve saat bazlı kalan ömür oranına göre otomatik olarak en üstte önceliklendirilir.',
  },
  {
    iconKey: 'butce',
    title: 'Bütçe & Maliyet Görünürlüğü',
    description:
      'Aylık yakıt ve bakım bütçe hedefleri gerçekleşen harcamalarla karşılaştırılır; sapmalar anlık izlenir.',
  },
  {
    iconKey: 'harita',
    title: 'Canlı Harita & Check-In',
    description:
      "Şoförler zimmetli araçları için 16 lojistik merkezden veya cihaz GPS'inden tek adımda konum bildirir.",
  },
  {
    iconKey: 'takvim',
    title: 'Takvim, Ekip & Cmd+K',
    description:
      '4 kaynaklı operasyon takvimi, 3 rollü ekip/zimmet yönetimi ve doğal dil destekli hızlı komut paleti.',
  },
];

export const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Filo & Katalog Kurulumu',
    description:
      'Araçları 4 kademeli marka/model/varyant kataloğu ve KM veya SMH sayaç tipiyle sisteme tanımlayın.',
  },
  {
    step: '02',
    title: 'Ekip, Rol & Zimmet',
    description:
      'Yönetici ve şoför hesaplarını oluşturun; araç zimmetlerini ve modül yetkilerini (yakit, bakim, finans, zimmet, envanter, ekip) atayın.',
  },
  {
    step: '03',
    title: 'Doğrulanmış Saha Kayıtları',
    description:
      'Yakıt, bakım, parça değişimi ve konum check-in girişleri sunucu tarafında kronolojik sayaç kuralıyla doğrulansın.',
  },
  {
    step: '04',
    title: 'Sürekli Kontrol & Bütçe',
    description:
      'Evrak vadelerini takvimden, parça risklerini matristen, aylık bütçe sapmalarını genel bakıştan kesintisiz takip edin.',
  },
];

export const ARCHITECTURE_GUARANTEES = [
  {
    title: 'Atomik Sayaç Bütünlüğü (HTTP 422)',
    description:
      'Geçmişe dönük veya güncel sayacı geri saran kayıtlar veritabanı işlemi düzeyinde reddedilir.',
  },
  {
    title: 'Çok Katmanlı Rol & Yetki Denetimi',
    description:
      'SYSTEM_ADMIN, FLEET_MANAGER ve DRIVER sınırları hem arayüzde hem API ara katmanında zorunlu uygulanır.',
  },
  {
    title: 'Organizasyon & Zimmet İzolasyonu',
    description:
      'Her sorgu org_id ve şoför araç zimmet filtresiyle izole edilir; yetkisiz araç erişimi engellenir.',
  },
  {
    title: 'Tek Standartta Açık & Koyu Operasyon',
    description:
      'Uzun vardiyalar ve saha kullanımı için düşük göz yorgunluklu semantik arayüz ve yerel saat (UTC+3) uyumu.',
  },
];
