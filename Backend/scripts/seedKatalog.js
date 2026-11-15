const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../db');

const REMOTE_DATASET_URL =
  'https://raw.githubusercontent.com/matthlavacka/car-list/master/car-list.json';

// ============================================================================
// 1. 4 KADEMELİ KURUMSAL HİYERARŞİ — EN ÜST KATEGORİLER (ref_kategoriler)
// ============================================================================
const KATEGORILER = [
  { ad: 'Otomobil', slug: 'otomobil', sira_no: 1 },
  { ad: 'Arazi, SUV & Pickup', slug: 'arazi-suv-pickup', sira_no: 2 },
  { ad: 'Ticari Araçlar', slug: 'ticari-araclar', sira_no: 3 },
  { ad: 'Ağır Vasıta', slug: 'agir-vasita', sira_no: 4 },
  { ad: 'İş Makineleri', slug: 'is-makineleri', sira_no: 5 },
];

// ============================================================================
// 2. OTOMOBİL (BİNEK) EK VERİ SETİ (fetchRemoteCatalog ile birleştirilir)
// ============================================================================
const PASSENGER_EXTRA_DATA = [
  { brand: 'Togg', models: ['T10F'] },
  { brand: 'Fiat', models: ['Egea Sedan', 'Egea Hatchback', 'Egea Station Wagon', '500e', 'Linea', 'Punto', 'Bravo', 'Albea', 'Palio', 'Tempra', 'Tipo'] },
  { brand: 'Renault', models: ['Clio', 'Megane Sedan', 'Megane Hatchback', 'Megane E-Tech', 'Taliant', 'Symbol', 'Fluence', 'Talisman', 'Zoe', 'Laguna', 'Latitude', 'R19 Europa', 'Broadway'] },
  { brand: 'Ford', models: ['Focus', 'Fiesta', 'Mondeo', 'Mustang', 'Escort', 'Fusion', 'C-Max', 'B-Max', 'S-Max', 'Galaxy'] },
  { brand: 'Volkswagen', models: ['Passat', 'Passat Variant', 'Golf', 'Polo', 'Jetta', 'Arteon', 'ID.3', 'ID.7', 'Scirocco', 'Beetle', 'Bora', 'CC'] },
  { brand: 'Toyota', models: ['Corolla', 'Corolla Hatchback', 'Yaris', 'Auris', 'Avensis', 'Camry', 'Prius', 'Verso'] },
  { brand: 'Peugeot', models: ['208', '308', '408', '508', '301', '206', '207', '307', '407', 'RCZ'] },
  { brand: 'Hyundai', models: ['i10', 'i20', 'i20 N', 'i30', 'Elantra', 'Accent Blue', 'Accent Era', 'IONIQ 6', 'Sonata', 'Getz'] },
  { brand: 'Dacia', models: ['Sandero', 'Sandero Stepway', 'Jogger', 'Spring', 'Logan', 'Lodgy', 'Solenza'] },
  { brand: 'BYD', models: ['Dolphin', 'Han', 'Seal'] },
  { brand: 'Cupra', models: ['Leon', 'Born'] },
  { brand: 'Skoda', models: ['Octavia', 'Superb', 'Fabia', 'Scala', 'Rapid'] },
  { brand: 'Seat', models: ['Ibiza', 'Leon', 'Toledo', 'Cordoba'] },
  { brand: 'Opel', models: ['Corsa', 'Astra', 'Insignia', 'Vectra', 'Meriva', 'Zafira'] },
  { brand: 'Citroen', models: ['C-Elysee', 'C3', 'C4', 'C4 X', 'C5', 'Saxo', 'Xsara'] },
  { brand: 'Honda', models: ['Civic', 'City', 'Accord', 'Jazz', 'Legend'] },
];

// ============================================================================
// 3. SUV, PICKUP & TİCARİ ARAÇLAR DEVASA VERİ SETİ (SUV_COMMERCIAL_DATA)
// ============================================================================
const SUV_COMMERCIAL_DATA = {
  suv_pickup: [
    {
      brand: 'Nissan',
      models: ['Qashqai', 'X-Trail', 'Juke', 'Navara', 'Skystar', 'Pathfinder', 'Patrol', 'Terrano', 'Ariya'],
      variants: [
        { kasa_tipi: 'SUV (4x2)', motor_adi: '1.3 DIG-T Mild Hybrid 158HP', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik (X-Tronic)', beygir_gucu_hp: 158, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (e-POWER)', motor_adi: '1.5 e-POWER 190HP', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 190, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Pickup (4x4 Çift Kabin)', motor_adi: '2.3 dCi TwinTurbo 190HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 190, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Toyota',
      models: ['Hilux', 'RAV4', 'Corolla Cross', 'Yaris Cross', 'C-HR', 'Land Cruiser Prado', 'Land Cruiser V8', 'bZ4X', 'FJ Cruiser'],
      variants: [
        { kasa_tipi: 'Pickup (4x4 Invincible)', motor_adi: '2.8 D-4D 204HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 204, onerilen_bakim_km: 15000, triger_degisim_km: 150000, calisma_saati_bakim: null },
        { kasa_tipi: 'Pickup (4x2 Adventure)', motor_adi: '2.4 D-4D 150HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 150, onerilen_bakim_km: 15000, triger_degisim_km: 150000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (Hybrid)', motor_adi: '1.8 / 2.0 Hybrid e-CVT', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik (e-CVT)', beygir_gucu_hp: 140, onerilen_bakim_km: 15000, triger_degisim_km: 150000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Ford',
      models: ['Ranger', 'Ranger Raptor', 'Kuga', 'Puma', 'Explorer', 'Bronco', 'Edge', 'EcoSport', 'Maverick', 'F-150'],
      variants: [
        { kasa_tipi: 'Pickup (4x4 Wildtrak)', motor_adi: '2.0L EcoBlue Bi-Turbo 205HP', yakit_tipi: 'Dizel', sanziman_tipi: '10 İleri Otomatik', beygir_gucu_hp: 205, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Pickup (4x4 V6)', motor_adi: '3.0L EcoBlue V6 240HP', yakit_tipi: 'Dizel', sanziman_tipi: '10 İleri Otomatik', beygir_gucu_hp: 240, onerilen_bakim_km: 15000, triger_degisim_km: 150000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV', motor_adi: '1.5L EcoBoost 186HP', yakit_tipi: 'Benzin', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 186, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Volkswagen',
      models: ['Tiguan', 'Tiguan Allspace', 'T-Roc', 'Taigo', 'T-Cross', 'Touareg', 'Amarok', 'ID.4', 'ID.5'],
      variants: [
        { kasa_tipi: 'SUV', motor_adi: '1.5 eTSI 150HP DSG', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik (DSG)', beygir_gucu_hp: 150, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (4Motion)', motor_adi: '2.0 TDI 200HP 4Motion', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (DSG)', beygir_gucu_hp: 200, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Pickup (4Motion Aventura)', motor_adi: '3.0 V6 TDI 240HP', yakit_tipi: 'Dizel', sanziman_tipi: '10 İleri Otomatik', beygir_gucu_hp: 240, onerilen_bakim_km: 15000, triger_degisim_km: 150000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Dacia',
      models: ['Duster', 'Bigster'],
      variants: [
        { kasa_tipi: 'SUV (4x4)', motor_adi: '1.5 Blue dCi 115HP 4x4', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 115, onerilen_bakim_km: 15000, triger_degisim_km: 90000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (4x2)', motor_adi: '1.3 TCe 150HP EDC', yakit_tipi: 'Benzin', sanziman_tipi: 'Otomatik (EDC)', beygir_gucu_hp: 150, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (Eco-G)', motor_adi: '1.0 TCe 100HP Eco-G', yakit_tipi: 'Benzin / LPG', sanziman_tipi: 'Manuel', beygir_gucu_hp: 100, onerilen_bakim_km: 15000, triger_degisim_km: 90000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Peugeot',
      models: ['2008', 'e-2008', '3008', 'e-3008', '5008', 'e-5008', '4008', 'Landtrek'],
      variants: [
        { kasa_tipi: 'SUV', motor_adi: '1.5 BlueHDi 130HP EAT8', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (EAT8)', beygir_gucu_hp: 130, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV', motor_adi: '1.2 PureTech 130HP EAT8', yakit_tipi: 'Benzin', sanziman_tipi: 'Otomatik (EAT8)', beygir_gucu_hp: 130, onerilen_bakim_km: 15000, triger_degisim_km: 90000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (Hybrid)', motor_adi: '1.2 Hybrid 136HP e-DCS6', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 136, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Renault',
      models: ['Austral', 'Captur', 'Kadjar', 'Koleos', 'Rafale', 'Symbioz', 'Duster', 'Alaskan'],
      variants: [
        { kasa_tipi: 'SUV', motor_adi: '1.3 Mild Hybrid 160HP', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 160, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (E-Tech)', motor_adi: '1.2 E-Tech Full Hybrid 200HP', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 200, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Hyundai',
      models: ['Tucson', 'Kona', 'Santa Fe', 'Bayon', 'IONIQ 5', 'ix35', 'Terracan', 'Galloper'],
      variants: [
        { kasa_tipi: 'SUV (4x4)', motor_adi: '1.6 CRDi 136HP DCT 4x4', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (DCT)', beygir_gucu_hp: 136, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV', motor_adi: '1.6 T-GDI 180HP DCT', yakit_tipi: 'Benzin', sanziman_tipi: 'Otomatik (DCT)', beygir_gucu_hp: 180, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Kia',
      models: ['Sportage', 'Sorento', 'Stonic', 'XCeed', 'Niro', 'EV6', 'EV9', 'EV3'],
      variants: [
        { kasa_tipi: 'SUV', motor_adi: '1.6 T-GDI Mild Hybrid 150HP', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik (DCT)', beygir_gucu_hp: 150, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (4x4)', motor_adi: '1.6 CRDi Mild Hybrid 136HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (DCT)', beygir_gucu_hp: 136, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Togg',
      models: ['T10X'],
      variants: [
        { kasa_tipi: 'SUV (V1 RWD)', motor_adi: '160 kW Standart Menzil', yakit_tipi: 'Elektrik', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 218, onerilen_bakim_km: 20000, triger_degisim_km: null, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (V2 RWD)', motor_adi: '160 kW Uzun Menzil', yakit_tipi: 'Elektrik', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 218, onerilen_bakim_km: 20000, triger_degisim_km: null, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (AWD)', motor_adi: '320 kW Çift Motor 4x4', yakit_tipi: 'Elektrik', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 435, onerilen_bakim_km: 20000, triger_degisim_km: null, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Chery',
      models: ['Omoda 5', 'Omoda 5 Pro', 'Tiggo 7 Pro', 'Tiggo 7 Pro Max', 'Tiggo 8 Pro', 'Tiggo 8 Pro Max'],
      variants: [
        { kasa_tipi: 'SUV', motor_adi: '1.6 TGDI 183HP DCT', yakit_tipi: 'Benzin', sanziman_tipi: '7 İleri Otomatik (DCT)', beygir_gucu_hp: 183, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Land Rover',
      models: ['Defender 90', 'Defender 110', 'Defender 130', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque', 'Freelander 2'],
      variants: [
        { kasa_tipi: 'Arazi / SUV (4x4)', motor_adi: '3.0 D300 Ingenium 300HP AWD', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (ZF)', beygir_gucu_hp: 300, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Arazi / SUV (4x4)', motor_adi: '2.0 D240 TwinTurbo 240HP AWD', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (ZF)', beygir_gucu_hp: 240, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Jeep',
      models: ['Wrangler Rubicon', 'Wrangler Sahara', 'Grand Cherokee', 'Compass', 'Renegade', 'Avenger', 'Cherokee', 'Gladiator'],
      variants: [
        { kasa_tipi: 'Arazi / SUV (4x4)', motor_adi: '2.0 GME Turbo 272HP 4x4', yakit_tipi: 'Benzin', sanziman_tipi: '8 İleri Otomatik', beygir_gucu_hp: 272, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'SUV (4xe)', motor_adi: '1.3 Turbo 4xe Plug-in Hybrid 240HP', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 240, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Mitsubishi',
      models: ['L200 Tornado', 'L200 Magnum', 'L200 Crawler', 'Eclipse Cross', 'Outlander', 'ASX', 'Pajero'],
      variants: [
        { kasa_tipi: 'Pickup (4x4 Çift Kabin)', motor_adi: '2.2 DI-D 150HP 4x4', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 150, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Pickup (4x2)', motor_adi: '2.4 DI-D 181HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 181, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Isuzu',
      models: ['D-Max V-Cross', 'D-Max V-Go', 'D-Max V-Life', 'D-Max V-Joy'],
      variants: [
        { kasa_tipi: 'Pickup (4x4 Çift Kabin)', motor_adi: '1.9 Ddi 164HP 4x4', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 164, onerilen_bakim_km: 15000, triger_degisim_km: 150000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'SsangYong (KGM)',
      models: ['Musso Grand', 'Torres', 'Torres EVX', 'Korando', 'Rexton', 'Actyon Sports', 'Kyron'],
      variants: [
        { kasa_tipi: 'Pickup (4x4)', motor_adi: '2.2 e-XDi 202HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 202, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Subaru',
      models: ['Forester', 'Outback', 'XV', 'Crosstrek', 'Solterra'],
      variants: [
        { kasa_tipi: 'SUV (Symmetrical AWD)', motor_adi: '2.0i e-Boxer 150HP AWD', yakit_tipi: 'Hibrit', sanziman_tipi: 'Lineartronic CVT', beygir_gucu_hp: 150, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Suzuki',
      models: ['Vitara', 'S-Cross', 'Jimny'],
      variants: [
        { kasa_tipi: 'SUV (AllGrip 4x4)', motor_adi: '1.4 Boosterjet Hybrid 129HP', yakit_tipi: 'Hibrit', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 129, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
  ],

  ticari_araclar: [
    {
      brand: 'Ford',
      models: ['Transit Van', 'Transit Kamyonet', 'Transit Minibüs', 'Transit Custom', 'Tourneo Custom', 'Tourneo Courier', 'Transit Courier', 'Tourneo Connect', 'Transit Connect', 'E-Transit'],
      variants: [
        { kasa_tipi: 'Panelvan (350L Yüksek Tavan)', motor_adi: '2.0L EcoBlue 170HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 170, onerilen_bakim_km: 20000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Kamyonet (Çift Kabin Kasalı)', motor_adi: '2.0L EcoBlue 165HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 165, onerilen_bakim_km: 20000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Camlı Van / Combi', motor_adi: '1.5L EcoBlue 100HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 100, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Fiat',
      models: ['Ducato Van', 'Ducato Kamyonet', 'Ducato Minibüs', 'Doblo Combi', 'Doblo Cargo', 'Fiorino Combi', 'Fiorino Cargo', 'Scudo', 'Ulysse', 'Pratico'],
      variants: [
        { kasa_tipi: 'Panelvan (Maxi 15m³)', motor_adi: '2.2 Multijet3 140HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 140, onerilen_bakim_km: 20000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Hafif Ticari (Combi)', motor_adi: '1.6 Multijet 120HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 120, onerilen_bakim_km: 20000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'Hafif Ticari (Cargo)', motor_adi: '1.3 Multijet 95HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 95, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Volkswagen',
      models: ['Transporter Panelvan', 'Transporter City Van', 'Transporter Camlı Van', 'Transporter Kamyonet', 'Caravelle', 'Multivan', 'Caddy', 'Caddy Cargo', 'Crafter Panelvan', 'Crafter Servis / Okul'],
      variants: [
        { kasa_tipi: 'Panelvan (Uzun Şasi)', motor_adi: '2.0 TDI 150HP DSG', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (DSG)', beygir_gucu_hp: 150, onerilen_bakim_km: 20000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Panelvan (Ekstra Uzun)', motor_adi: '2.0 TDI 177HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 177, onerilen_bakim_km: 20000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Camlı Van', motor_adi: '2.0 TDI 122HP DSG', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (DSG)', beygir_gucu_hp: 122, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Mercedes-Benz',
      models: ['Sprinter Panelvan', 'Sprinter Minibüs', 'Sprinter Kamyonet', 'Vito Tourer', 'Vito Panelvan', 'Vito Mixto', 'V-Serisi', 'Citan'],
      variants: [
        { kasa_tipi: 'Panelvan / Minibüs (317 CDI)', motor_adi: '2.0 OM654 170HP 9G-Tronic', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (9G-Tronic)', beygir_gucu_hp: 170, onerilen_bakim_km: 20000, triger_degisim_km: 150000, calisma_saati_bakim: null },
        { kasa_tipi: 'Tourer / VIP (119 CDI)', motor_adi: '2.0 OM654 190HP 9G-Tronic', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (9G-Tronic)', beygir_gucu_hp: 190, onerilen_bakim_km: 20000, triger_degisim_km: 150000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Renault',
      models: ['Master Panelvan', 'Master Kamyonet', 'Master Minibüs', 'Trafic Panelvan', 'Trafic Multix', 'Kangoo Multix', 'Kangoo Van', 'Express Van', 'Express Combi'],
      variants: [
        { kasa_tipi: 'Panelvan (L3H2 13m³)', motor_adi: '2.3 dCi 165HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 165, onerilen_bakim_km: 20000, triger_degisim_km: 120000, calisma_saati_bakim: null },
        { kasa_tipi: 'Hafif Ticari', motor_adi: '1.5 Blue dCi 95HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 95, onerilen_bakim_km: 20000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Peugeot',
      models: ['Rifter', 'Partner Van', 'Expert Van', 'Expert Traveller', 'Boxer Van', 'Boxer Kamyonet', 'Bipper'],
      variants: [
        { kasa_tipi: 'Camlı Van', motor_adi: '1.5 BlueHDi 130HP EAT8', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (EAT8)', beygir_gucu_hp: 130, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'Panelvan (L4H2)', motor_adi: '2.2 BlueHDi 165HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 165, onerilen_bakim_km: 20000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Citroen',
      models: ['Berlingo', 'Berlingo Van', 'Jumpy', 'Spacetourer', 'Jumper Panelvan', 'Jumper Kamyonet', 'Nemo'],
      variants: [
        { kasa_tipi: 'Camlı Van', motor_adi: '1.5 BlueHDi 130HP EAT8', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (EAT8)', beygir_gucu_hp: 130, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'Panelvan', motor_adi: '2.2 BlueHDi 140HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 140, onerilen_bakim_km: 20000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Opel',
      models: ['Combo Life', 'Combo Cargo', 'Vivaro', 'Zafira Life', 'Movano'],
      variants: [
        { kasa_tipi: 'Camlı Van', motor_adi: '1.5 Dizel 130HP AT8', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 130, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Toyota',
      models: ['Proace City', 'Proace City Cargo', 'Proace Verso', 'Proace Cargo', 'Hiace'],
      variants: [
        { kasa_tipi: 'Camlı Van', motor_adi: '1.5 D 130HP Otomatik', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 130, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Iveco',
      models: ['Daily Panelvan 35S16', 'Daily Kamyonet 35C16', 'Daily Kamyonet 70C18', 'Daily Minibüs'],
      variants: [
        { kasa_tipi: 'Kamyonet / Panelvan (Çift Teker)', motor_adi: '3.0L F1C 180HP Hi-Matic', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik (Hi-Matic)', beygir_gucu_hp: 180, onerilen_bakim_km: 25000, triger_degisim_km: 150000, calisma_saati_bakim: null },
        { kasa_tipi: 'Panelvan (35S)', motor_adi: '2.3L F1A 156HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 156, onerilen_bakim_km: 25000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Hyundai',
      models: ['Staria', 'H-100 Kamyonet', 'Starex', 'H350 Panelvan'],
      variants: [
        { kasa_tipi: 'Kamyonet (Kasalı)', motor_adi: '2.5 CRDi 130HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 130, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
        { kasa_tipi: 'Minivan (9+1)', motor_adi: '2.2 CRDi 177HP HTRAC', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik', beygir_gucu_hp: 177, onerilen_bakim_km: 15000, triger_degisim_km: 120000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Kia',
      models: ['Bongo K2500'],
      variants: [
        { kasa_tipi: 'Kamyonet (Açık Kasa)', motor_adi: '2.5 CRDi 130HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel', beygir_gucu_hp: 130, onerilen_bakim_km: 15000, triger_degisim_km: 100000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Karsan',
      models: ['Jest+', 'e-Jest', 'Atak', 'e-Atak', 'J9 Premier'],
      variants: [
        { kasa_tipi: 'Minibüs / Midibüs', motor_adi: '2.3L FPT Euro 6 170HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel / Otomatik', beygir_gucu_hp: 170, onerilen_bakim_km: 25000, triger_degisim_km: 150000, calisma_saati_bakim: null },
      ],
    },
    {
      brand: 'Otokar',
      models: ['Sultan Comfort', 'Sultan Mega', 'Sultan LF', 'Atlas 8.5T', 'Atlas 12T', 'Kent LF'],
      variants: [
        { kasa_tipi: 'Midibüs / Kamyonet', motor_adi: '4.5L Cummins ISB4.5 190HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Manuel / Allison', beygir_gucu_hp: 190, onerilen_bakim_km: 30000, triger_degisim_km: 180000, calisma_saati_bakim: null },
      ],
    },
  ],
};

// ============================================================================
// 4. AĞIR VASITA & TIR DEVASA VERİ SETİ (HEAVY_COMMERCIAL_DATA)
// ============================================================================
const HEAVY_COMMERCIAL_DATA = [
  {
    brand: 'Mercedes-Benz',
    models: [
      'Actros 1845 LS',
      'Actros 1848 LS',
      'Actros 1851 LS',
      'Actros 1853 LS',
      'Actros 1863 LS',
      'Actros 2545 L',
      'Actros 2651 LS (6x4)',
      'Arocs 1842 LS',
      'Arocs 3240 B (8x4 Mikser)',
      'Arocs 3345 K (6x4 Damper)',
      'Arocs 4145 K (8x4 Damper)',
      'Arocs 4151 K (8x4 Ağır Damper)',
      'Atego 1018',
      'Atego 1518',
      'Atego 1621',
      'Atego 2424 (6x2)',
      'Axor 1840 LS',
      'Axor 2529',
      'Axor 3229',
      'Axor 3240',
      'Unimog U 4000 / U 5000',
      'Zetros 2733 / 3643',
      'Travego 15 SHD / 16 SHD',
      'Tourismo 15 RHD / 16 RHD',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 Standart / Mega)', motor_adi: '12.8L OM471 Euro 6 • 450HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 3 (12 İleri)', beygir_gucu_hp: 450, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 Uzun Yol)', motor_adi: '12.8L OM471 Euro 6 • 480HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 3 Retarderli', beygir_gucu_hp: 480, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 GigaSpace)', motor_adi: '12.8L OM471 Euro 6 • 510HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 3 Retarderli', beygir_gucu_hp: 510, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (Ağır Nakliye)', motor_adi: '15.6L OM473 Euro 6 • 625HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 3 Turbo Retarder', beygir_gucu_hp: 625, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (8x4 Damper / İnşaat)', motor_adi: '12.8L OM471 Euro 6 • 450HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 3 Off-Road', beygir_gucu_hp: 450, onerilen_bakim_km: 40000, triger_degisim_km: 250000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (6x2 Kırkayak)', motor_adi: '7.7L OM936 Euro 6 • 320HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 3', beygir_gucu_hp: 320, onerilen_bakim_km: 50000, triger_degisim_km: 250000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'Ford Trucks',
    models: [
      'F-MAX 500',
      'F-MAX 500 L (Uzun Şasi)',
      'F-MAX Lowliner (Mega)',
      'F-MAX Select',
      'F-LINE 1845T Çekici',
      'F-LINE 3545D (6x4 Damper)',
      'F-LINE 4145D (8x4 Damper)',
      'F-LINE 2533 (6x2 Kamyon)',
      'F-LINE 3233S (8x2 Kamyon)',
      'Cargo 1848T Çekici',
      'Cargo 1842T Çekici',
      'Cargo 1838T Çekici',
      'Cargo 2538 Kırkayak',
      'Cargo 3238S (8x2)',
      'Cargo 3542D Damper',
      'Cargo 4142D (8x4 Damper)',
      'Cargo 4142M (8x4 Mikser)',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 F-MAX)', motor_adi: '12.7L Ecotorq Gen2 Euro 6 • 500HP', yakit_tipi: 'Dizel', sanziman_tipi: '16 İleri Ecotorq Otomatik', beygir_gucu_hp: 500, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 Standart)', motor_adi: '12.7L Ecotorq Euro 6 • 450HP', yakit_tipi: 'Dizel', sanziman_tipi: 'ZF 12 İleri Otomatik', beygir_gucu_hp: 450, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (8x4 Damper / Mikser)', motor_adi: '12.7L Ecotorq Euro 6 • 420HP', yakit_tipi: 'Dizel', sanziman_tipi: '16 İleri Otomatik / Manuel', beygir_gucu_hp: 420, onerilen_bakim_km: 40000, triger_degisim_km: 250000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (6x2 / 8x2 Nakliye)', motor_adi: '9.0L Ecotorq Euro 6 • 330HP', yakit_tipi: 'Dizel', sanziman_tipi: '9 İleri Manuel / Otomatik', beygir_gucu_hp: 330, onerilen_bakim_km: 50000, triger_degisim_km: 250000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'Scania',
    models: [
      'R 450',
      'R 460 Super',
      'R 500',
      'R 540',
      'R 560 Super',
      'R 590 V8',
      'S 500 Highline',
      'S 540 Highline',
      'S 560 Super',
      'S 660 V8',
      'S 770 V8',
      'G 410',
      'G 450',
      'G 500 XT (Ağır Şantiye)',
      'P 360',
      'P 410',
      'P 450 (8x4 Mikser / Damper)',
      'L 320 (Şehir İçi)',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 Super)', motor_adi: '13.0L DC13 Super Euro 6 • 500HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Opticruise G33CM Retarder', beygir_gucu_hp: 500, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 Uzun Yol)', motor_adi: '13.0L DC13 Euro 6 • 540HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Opticruise Retarderli', beygir_gucu_hp: 540, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (V8 Amiral Gemisi)', motor_adi: '16.4L DC16 V8 Euro 6 • 770HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Opticruise G33 Retarder', beygir_gucu_hp: 770, onerilen_bakim_km: 60000, triger_degisim_km: 400000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (8x4 XT Şantiye)', motor_adi: '13.0L DC13 Euro 6 • 450HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Opticruise Off-Road', beygir_gucu_hp: 450, onerilen_bakim_km: 40000, triger_degisim_km: 250000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'Volvo Trucks',
    models: [
      'FH 460 Globetrotter',
      'FH 500 I-Save',
      'FH 540 Globetrotter XL',
      'FH Aero 500',
      'FH16 600',
      'FH16 750',
      'FH16 780 XXL',
      'FM 420',
      'FM 460',
      'FM 500',
      'FMX 420 (8x4 Mikser)',
      'FMX 460 (6x4 / 8x4 Damper)',
      'FMX 500 (8x4 Ağır Damper)',
      'FMX 540 (Ağır Maden)',
      'FE 320',
      'FL 250',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 I-Save)', motor_adi: '12.8L D13TC Turbo Compound • 500HP', yakit_tipi: 'Dizel', sanziman_tipi: 'I-Shift (12 İleri)', beygir_gucu_hp: 500, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 Globetrotter)', motor_adi: '12.8L D13K Euro 6 • 540HP', yakit_tipi: 'Dizel', sanziman_tipi: 'I-Shift Dual Clutch', beygir_gucu_hp: 540, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (Ağır Nakliye FH16)', motor_adi: '17.3L D17A Euro 6 • 780HP', yakit_tipi: 'Dizel', sanziman_tipi: 'I-Shift Crawler Gears', beygir_gucu_hp: 780, onerilen_bakim_km: 60000, triger_degisim_km: 400000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (8x4 FMX Damper)', motor_adi: '12.8L D13K Euro 6 • 460HP', yakit_tipi: 'Dizel', sanziman_tipi: 'I-Shift Construction', beygir_gucu_hp: 460, onerilen_bakim_km: 40000, triger_degisim_km: 250000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'MAN',
    models: [
      'TGX 18.470',
      'TGX 18.510',
      'TGX 18.520 Individual Lion S',
      'TGX 18.640',
      'TGX 26.510 (6x2 / 6x4)',
      'TGS 18.430',
      'TGS 33.430 (6x4 Damper)',
      'TGS 41.430 (8x4 Damper)',
      'TGS 41.470 (8x4 Ağır Damper)',
      'TGM 18.290',
      'TGL 12.220',
      'Lion\'s Coach',
      'Neoplan Tourliner',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 GX Kabin)', motor_adi: '12.4L D2676 Euro 6e • 510HP', yakit_tipi: 'Dizel', sanziman_tipi: 'MAN TipMatic 12 Retarder', beygir_gucu_hp: 510, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 GM Kabin)', motor_adi: '12.4L D2676 Euro 6e • 470HP', yakit_tipi: 'Dizel', sanziman_tipi: 'MAN TipMatic 12', beygir_gucu_hp: 470, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (8x4 Damper)', motor_adi: '12.4L D2676 Euro 6 • 430HP', yakit_tipi: 'Dizel', sanziman_tipi: 'MAN TipMatic Offroad', beygir_gucu_hp: 430, onerilen_bakim_km: 40000, triger_degisim_km: 250000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'DAF',
    models: [
      'XF 450 FT',
      'XF 480 FT Super Space Cab',
      'XF 530 FT',
      'XG 480 FT',
      'XG 530 FT',
      'XG+ 530 FT',
      'XD 410',
      'XD 450',
      'CF 410 (8x4 Mikser)',
      'CF 480 (8x4 Damper)',
      'LF 260',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 XG+ Kabin)', motor_adi: '12.9L PACCAR MX-13 • 530HP', yakit_tipi: 'Dizel', sanziman_tipi: 'TraXon 12 İleri Intarder', beygir_gucu_hp: 530, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 XF Kabin)', motor_adi: '12.9L PACCAR MX-13 • 480HP', yakit_tipi: 'Dizel', sanziman_tipi: 'TraXon 12 İleri Otomatik', beygir_gucu_hp: 480, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici / Kamyon (XD)', motor_adi: '10.8L PACCAR MX-11 • 450HP', yakit_tipi: 'Dizel', sanziman_tipi: 'TraXon Otomatik', beygir_gucu_hp: 450, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'Iveco',
    models: [
      'S-Way AS440S49T/P (490HP)',
      'S-Way AS440S53T/P (530HP)',
      'S-Way AS440S57T/P (570HP)',
      'S-Way LNG (460HP Doğalgazlı)',
      'T-Way AD410T45 (8x4 Damper)',
      'T-Way AD410T51 (8x4 Ağır Damper)',
      'X-Way AS440X48',
      'Stralis Hi-Way 460',
      'Stralis Hi-Way 480',
      'Trakker 410 / 450',
      'Eurocargo ML120 / ML180',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 S-Way)', motor_adi: '12.9L Cursor 13 Euro 6 • 530HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Hi-Tronix 12 İleri Retarder', beygir_gucu_hp: 530, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 S-Way)', motor_adi: '12.9L Cursor 13 Euro 6 • 490HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Hi-Tronix 12 İleri Otomatik', beygir_gucu_hp: 490, onerilen_bakim_km: 60000, triger_degisim_km: 300000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (8x4 T-Way Damper)', motor_adi: '12.9L Cursor 13 • 450HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Hi-Tronix Off-Road', beygir_gucu_hp: 450, onerilen_bakim_km: 40000, triger_degisim_km: 250000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'Renault Trucks',
    models: [
      'T 480 Evolution',
      'T 480 Turbo Compound',
      'T High 520',
      'C 430 (8x4 Mikser)',
      'C 480 (6x2 / 8x4)',
      'K 440 (8x4 Şantiye Damper)',
      'K 480 (8x4 Ağır Damper)',
      'K 520 XTrem',
      'D Wide 320',
      'Premium 460',
      'Magnum 500',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 T High)', motor_adi: '12.8L DE13 Turbo Compound • 480HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Optidriver 12 İleri', beygir_gucu_hp: 480, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Çekici (4x2 T High)', motor_adi: '12.8L DTI 13 Euro 6 • 520HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Optidriver Voith Retarder', beygir_gucu_hp: 520, onerilen_bakim_km: 60000, triger_degisim_km: 350000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (8x4 K Serisi Damper)', motor_adi: '12.8L DTI 13 • 480HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Optidriver Xtrem', beygir_gucu_hp: 480, onerilen_bakim_km: 40000, triger_degisim_km: 250000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'BMC',
    models: [
      'Tuğra TGR 1846 Çekici',
      'Tuğra TGR 3540 (6x4 Damper)',
      'Tuğra TGR 4140 (8x4 Damper)',
      'Tuğra TGR 3232 (8x2 Kamyon)',
      'Pro 1142 Çekici',
      'Pro 935 Kırkayak',
      'Pro 827 Kamyon',
      'Pro 625',
    ],
    variants: [
      { kasa_tipi: 'Çekici (4x2 Tuğra)', motor_adi: '11.1L FPT Cursor 11 Euro 6 • 460HP', yakit_tipi: 'Dizel', sanziman_tipi: 'ZF 12 İleri TraXon', beygir_gucu_hp: 460, onerilen_bakim_km: 50000, triger_degisim_km: 250000, calisma_saati_bakim: null },
      { kasa_tipi: 'Kamyon (8x4 Tuğra Damper)', motor_adi: '8.7L FPT Cursor 9 Euro 6 • 400HP', yakit_tipi: 'Dizel', sanziman_tipi: 'ZF 16 İleri Manuel / Otomatik', beygir_gucu_hp: 400, onerilen_bakim_km: 40000, triger_degisim_km: 200000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'Isuzu',
    models: ['N-Wide', 'NPR 10 Long', 'NPR 3D', 'Tora', 'NLR', 'F-Series FTR'],
    variants: [
      { kasa_tipi: 'Kamyon (10 Teker / 6 Teker)', motor_adi: '5.2L 4HK1-TCC Euro 6 • 190HP', yakit_tipi: 'Dizel', sanziman_tipi: 'NEES2 Yarı Otomatik', beygir_gucu_hp: 190, onerilen_bakim_km: 30000, triger_degisim_km: 200000, calisma_saati_bakim: null },
    ],
  },
  {
    brand: 'Mitsubishi Fuso',
    models: ['Canter TF B75', 'Canter TF B90', 'Canter 9B18', 'Canter FE859'],
    variants: [
      { kasa_tipi: 'Kamyon (Hafif / Orta Tonaj)', motor_adi: '3.0L 4P10 Euro 6 • 175HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Duonic Çift Kavrama', beygir_gucu_hp: 175, onerilen_bakim_km: 30000, triger_degisim_km: 180000, calisma_saati_bakim: null },
    ],
  },
];

// ============================================================================
// 5. İŞ MAKİNELERİ DEVASA VERİ SETİ (CONSTRUCTION_EQUIPMENT_DATA)
// Bakımlar KM değil, Çalışma Saati (calisma_saati_bakim: 250 / 500 Saat) bazlıdır!
// ============================================================================
const CONSTRUCTION_EQUIPMENT_DATA = [
  {
    brand: 'Caterpillar',
    models: [
      '428 Kazıcı Yükleyici (Beko Loder)',
      '432 Kazıcı Yükleyici (Beko Loder)',
      '434 Kazıcı Yükleyici (Beko Loder)',
      '444 Kazıcı Yükleyici (Beko Loder)',
      '320 Paletli Ekskavatör',
      '323 Paletli Ekskavatör',
      '330 Paletli Ekskavatör',
      '336 Paletli Ekskavatör',
      '349 Ağır Hizmet Ekskavatör',
      '374 Maden Ekskavatörü',
      'M318 Lastikli Ekskavatör',
      'M320 Lastikli Ekskavatör',
      '950 GC Lastikli Yükleyici (Loder)',
      '966 GC Lastikli Yükleyici (Loder)',
      '966L Lastikli Yükleyici (Loder)',
      '972M Lastikli Yükleyici (Loder)',
      '980M Kaya Yükleyici',
      'D6R Dozer',
      'D6 XE Dozer',
      'D8T Dozer',
      'D9T Maden Dozeri',
      '140 GC Motorlu Greyder',
      '140M Motorlu Greyder',
      'TH357 Telehandler',
      '246D3 Mini Yükleyici (Skid Steer)',
      '305 CR Mini Ekskavatör',
      '745 Belden Kırmalı Kaya Kamyonu',
    ],
    variants: [
      { kasa_tipi: 'Kazıcı Yükleyici (Beko Loder)', motor_adi: '3.6L Cat C3.6 Stage V • 102HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift Autoshift 4WD', beygir_gucu_hp: 102, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
      { kasa_tipi: 'Paletli Ekskavatör (20-36 Ton)', motor_adi: '7.0L Cat C7.1 ACERT • 174HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Elektro-Hidrolik Paletli', beygir_gucu_hp: 174, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Ekskavatör', motor_adi: '4.4L Cat C4.4 ACERT • 174HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Hidrostatik 4WD', beygir_gucu_hp: 174, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Yükleyici (Loder)', motor_adi: '9.3L Cat C9.3B Stage V • 321HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Planetary Powershift', beygir_gucu_hp: 321, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Paletli Dozer', motor_adi: '15.2L Cat C15 ACERT • 354HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Tork Konvertörlü Powershift', beygir_gucu_hp: 354, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Motorlu Greyder', motor_adi: '7.0L Cat C7.1 • 196HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Direct Drive Powershift', beygir_gucu_hp: 196, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'JCB',
    models: [
      '3CX Eco Kazıcı Yükleyici (Beko Loder)',
      '3CX Pro Kazıcı Yükleyici (Beko Loder)',
      '4CX Eco Kazıcı Yükleyici (Beko Loder)',
      '4CX Pro Kazıcı Yükleyici (Beko Loder)',
      '5CX Wastemaster',
      '1CX Mini Beko Loder',
      'JS130 Paletli Ekskavatör',
      'JS200 Paletli Ekskavatör',
      'JS220 LC Paletli Ekskavatör',
      '220X LC Paletli Ekskavatör',
      'JS300 LC Paletli Ekskavatör',
      'JS160W Lastikli Ekskavatör',
      'Hydradig 110W Lastikli Ekskavatör',
      '535-95 Telehandler (Teleskopik Yükleyici)',
      '540-170 Telehandler (17 Metre)',
      '540-200 Telehandler (20 Metre)',
      '427 ZX Lastikli Yükleyici',
      '457 ZX Lastikli Yükleyici',
      '8026 CTS Mini Ekskavatör',
      '55Z-1 Mini Ekskavatör',
    ],
    variants: [
      { kasa_tipi: 'Kazıcı Yükleyici (Beko Loder)', motor_adi: '4.8L JCB EcoMAX Stage V • 109HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Autoshift 6 İleri TorqueLock', beygir_gucu_hp: 109, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
      { kasa_tipi: 'Paletli Ekskavatör', motor_adi: '4.8L JCB Dieselmax • 173HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Hidrostatik Paletli', beygir_gucu_hp: 173, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Telehandler (Teleskopik Yükleyici)', motor_adi: '4.4L JCB EcoMAX • 109HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 4WD', beygir_gucu_hp: 109, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
      { kasa_tipi: 'Lastikli Yükleyici (Loder)', motor_adi: '6.7L Cummins QSB6.7 • 195HP', yakit_tipi: 'Dizel', sanziman_tipi: 'ZF Otomatik Powershift', beygir_gucu_hp: 195, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'Hidromek',
    models: [
      'HMK 102B Alpha Kazıcı Yükleyici',
      'HMK 102B Supra Kazıcı Yükleyici',
      'HMK 102S Alpha (Büyük Teker Beko Loder)',
      'HMK 102S Supra (Büyük Teker Beko Loder)',
      'HMK 62 SS Mini Kazıcı Yükleyici',
      'HMK 140 LC Paletli Ekskavatör',
      'HMK 145 LCSR Kısa Kuyruk Ekskavatör',
      'HMK 220 LC H4 Paletli Ekskavatör',
      'HMK 230 LC H4 Paletli Ekskavatör',
      'HMK 300 LC H4 Paletli Ekskavatör',
      'HMK 310 LC H4 Paletli Ekskavatör',
      'HMK 390 LC HD Ağır Hizmet Ekskavatör',
      'HMK 500 LC HD Maden Ekskavatörü',
      'HMK 140 W Lastikli Ekskavatör',
      'HMK 210 W H4 Lastikli Ekskavatör',
      'HMK 635 WL Lastikli Yükleyici (Loder)',
      'HMK 640 WL Lastikli Yükleyici (Loder)',
      'HMK 600 MG Motorlu Greyder',
      'HMK 130 CS Toprak Silindiri',
    ],
    variants: [
      { kasa_tipi: 'Kazıcı Yükleyici (Beko Loder)', motor_adi: '3.6L Perkins 904J Stage V • 100HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Autoshift 6 İleri Lock-Up', beygir_gucu_hp: 100, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
      { kasa_tipi: 'Paletli Ekskavatör (H4 Serisi)', motor_adi: '5.1L Isuzu 4HK1X • 172HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Çift Pompalı Hidrolik', beygir_gucu_hp: 172, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Ağır Paletli Ekskavatör (30-50 Ton)', motor_adi: '7.8L Isuzu 6HK1X • 284HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Elektronik Hidrolik', beygir_gucu_hp: 284, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Yükleyici (Loder)', motor_adi: '10.7L Mercedes OM470 • 324HP', yakit_tipi: 'Dizel', sanziman_tipi: 'ZF 5 İleri Ağır Hizmet', beygir_gucu_hp: 324, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'Komatsu',
    models: [
      'WB93R-8 Kazıcı Yükleyici (Beko Loder)',
      'WB97S-8 Kazıcı Yükleyici (Beko Loder)',
      'PC138US-11 Kısa Kuyruk Ekskavatör',
      'PC200-8M0 Paletli Ekskavatör',
      'PC210LC-11 Paletli Ekskavatör',
      'PC290LC-11 Paletli Ekskavatör',
      'PC360LC-11 Paletli Ekskavatör',
      'PC490LC-11 Maden Ekskavatörü',
      'PW180-11 Lastikli Ekskavatör',
      'WA320-8 Lastikli Yükleyici',
      'WA380-8 Lastikli Yükleyici',
      'WA470-8 Lastikli Yükleyici',
      'WA500-8 Kaya Yükleyici',
      'D65EX-18 Paletli Dozer',
      'D85EX-18 Paletli Dozer',
      'D155AX-8 Maden Dozeri',
      'GD675-7 Motorlu Greyder',
      'HM400-5 Belden Kırmalı Kaya Kamyonu',
    ],
    variants: [
      { kasa_tipi: 'Kazıcı Yükleyici (Beko Loder)', motor_adi: '3.8L Komatsu SAA4D99E • 102HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 4WD', beygir_gucu_hp: 102, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
      { kasa_tipi: 'Paletli Ekskavatör (PC Serisi)', motor_adi: '6.7L Komatsu SAA6D107E • 165HP', yakit_tipi: 'Dizel', sanziman_tipi: 'CLSS Hidrolik Sistem', beygir_gucu_hp: 165, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Yükleyici (WA Serisi)', motor_adi: '6.7L Komatsu SAA6D107E • 192HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik Tork Konvertörlü', beygir_gucu_hp: 192, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Paletli Dozer (D Serisi)', motor_adi: '8.9L Komatsu SAA6D114E • 217HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Torqflow Otomatik', beygir_gucu_hp: 217, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'Volvo CE',
    models: [
      'BL61B Kazıcı Yükleyici (Beko Loder)',
      'BL71B Kazıcı Yükleyici (Beko Loder)',
      'EC140E Paletli Ekskavatör',
      'EC210D Paletli Ekskavatör',
      'EC220E Paletli Ekskavatör',
      'EC250E Paletli Ekskavatör',
      'EC300E Paletli Ekskavatör',
      'EC380E Ağır Ekskavatör',
      'EC480E Maden Ekskavatörü',
      'EW160E Lastikli Ekskavatör',
      'EW220E Lastikli Ekskavatör',
      'L90H Lastikli Yükleyici',
      'L120H Lastikli Yükleyici',
      'L150H Lastikli Yükleyici',
      'L180H Lastikli Yükleyici',
      'L220H Kaya Yükleyici',
      'A30G Belden Kırmalı Kaya Kamyonu',
      'A40G Belden Kırmalı Kaya Kamyonu',
      'SD115B Toprak Silindiri',
    ],
    variants: [
      { kasa_tipi: 'Paletli Ekskavatör (EC Serisi)', motor_adi: '5.7L Volvo D6J • 174HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Elektro-Hidrolik ECO Mod', beygir_gucu_hp: 174, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Yükleyici (L Serisi)', motor_adi: '8.0L Volvo D8J Stage V • 276HP', yakit_tipi: 'Dizel', sanziman_tipi: 'OptiShift HTE 205', beygir_gucu_hp: 276, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Kaya Kamyonu (Belden Kırmalı 6x6)', motor_adi: '12.8L Volvo D13J • 476HP', yakit_tipi: 'Dizel', sanziman_tipi: 'PowerTronic Otomatik 6x6', beygir_gucu_hp: 476, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'Liebherr',
    models: [
      'R 922 Paletli Ekskavatör',
      'R 926 Paletli Ekskavatör',
      'R 936 Paletli Ekskavatör',
      'R 946 Paletli Ekskavatör',
      'A 918 Lastikli Ekskavatör',
      'A 920 Litronic Lastikli Ekskavatör',
      'L 538 Lastikli Yükleyici',
      'L 550 XPower Lastikli Yükleyici',
      'L 566 XPower Lastikli Yükleyici',
      'L 580 XPower Lastikli Yükleyici',
      'PR 726 Litronic Dozer',
      'PR 736 Litronic Dozer',
      'LTM 1100 Mobil Vinç',
    ],
    variants: [
      { kasa_tipi: 'Paletli / Lastikli Ekskavatör', motor_adi: '6.8L Liebherr D924 • 204HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Positive Control Hidrolik', beygir_gucu_hp: 204, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Yükleyici (XPower)', motor_adi: '9.0L Liebherr D936 • 299HP', yakit_tipi: 'Dizel', sanziman_tipi: 'XPower Güç Bölümlü', beygir_gucu_hp: 299, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'Hitachi',
    models: [
      'ZX135US-6 Kısa Kuyruk Ekskavatör',
      'ZX210LC-6 Paletli Ekskavatör',
      'ZX250LC-6 Paletli Ekskavatör',
      'ZX300LC-6 Paletli Ekskavatör',
      'ZX350LC-6 Paletli Ekskavatör',
      'ZX490LCH-6 Maden Ekskavatörü',
      'ZX190W-6 Lastikli Ekskavatör',
      'ZW220-6 Lastikli Yükleyici',
      'ZW310-6 Lastikli Yükleyici',
    ],
    variants: [
      { kasa_tipi: 'Paletli Ekskavatör (Zaxis)', motor_adi: '5.2L Isuzu 4HK1 • 172HP', yakit_tipi: 'Dizel', sanziman_tipi: 'TRIAS II Hidrolik', beygir_gucu_hp: 172, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Yükleyici (ZW)', motor_adi: '6.7L Cummins QSB6.7 • 200HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Otomatik Powershift', beygir_gucu_hp: 200, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'Develon (Doosan)',
    models: [
      'DX140LCR-7 Paletli Ekskavatör',
      'DX225LC-7 Paletli Ekskavatör',
      'DX300LC-7 Paletli Ekskavatör',
      'DX340LC-7 Paletli Ekskavatör',
      'DX380LC-7 Paletli Ekskavatör',
      'DX530LC-7 Maden Ekskavatörü',
      'DX190W-7 Lastikli Ekskavatör',
      'DL250-7 Lastikli Yükleyici',
      'DL320-7 Lastikli Yükleyici',
      'DL420-7 Lastikli Yükleyici',
    ],
    variants: [
      { kasa_tipi: 'Paletli Ekskavatör (DX Serisi)', motor_adi: '5.9L Doosan DL06V • 174HP', yakit_tipi: 'Dizel', sanziman_tipi: 'D-ECOPOWER Hidrolik', beygir_gucu_hp: 174, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Yükleyici (DL Serisi)', motor_adi: '7.6L Doosan DL08 • 275HP', yakit_tipi: 'Dizel', sanziman_tipi: 'ZF Powershift', beygir_gucu_hp: 275, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'Hyundai CE',
    models: [
      'HX140A L Paletli Ekskavatör',
      'HX220A L Paletli Ekskavatör',
      'HX300A L Paletli Ekskavatör',
      'HX380A L Paletli Ekskavatör',
      'HW160A Lastikli Ekskavatör',
      'HW210A Lastikli Ekskavatör',
      'HL955A Lastikli Yükleyici',
      'HL970A Lastikli Yükleyici',
      'H940S Kazıcı Yükleyici (Beko Loder)',
    ],
    variants: [
      { kasa_tipi: 'Paletli Ekskavatör (HX Serisi)', motor_adi: '6.7L Cummins B6.7 • 173HP', yakit_tipi: 'Dizel', sanziman_tipi: 'EPFC Hidrolik Sistem', beygir_gucu_hp: 173, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
      { kasa_tipi: 'Lastikli Yükleyici (HL Serisi)', motor_adi: '6.7L Cummins B6.7 • 200HP', yakit_tipi: 'Dizel', sanziman_tipi: 'ZF 5 İleri Otomatik', beygir_gucu_hp: 200, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'CASE',
    models: [
      '580SV Kazıcı Yükleyici (Beko Loder)',
      '590SV Kazıcı Yükleyici (Beko Loder)',
      '695SV (Büyük Teker Beko Loder)',
      'CX210E Paletli Ekskavatör',
      'CX300E Paletli Ekskavatör',
      '721G Lastikli Yükleyici',
      '821G Lastikli Yükleyici',
      'SR175B Mini Yükleyici',
    ],
    variants: [
      { kasa_tipi: 'Kazıcı Yükleyici (Beko Loder)', motor_adi: '3.6L FPT F36 Stage V • 110HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 4WD', beygir_gucu_hp: 110, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
      { kasa_tipi: 'Paletli Ekskavatör / Yükleyici', motor_adi: '6.7L FPT NEF6 • 180HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Elektronik Hidrolik', beygir_gucu_hp: 180, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
  {
    brand: 'New Holland',
    models: [
      'B110D Kazıcı Yükleyici (Beko Loder)',
      'B115D (Büyük Teker Beko Loder)',
      'E215C Paletli Ekskavatör',
      'W170D Lastikli Yükleyici',
      'L318 Mini Yükleyici (Skid Steer)',
    ],
    variants: [
      { kasa_tipi: 'Kazıcı Yükleyici (Beko Loder)', motor_adi: '3.6L FPT F36 • 110HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 4WD', beygir_gucu_hp: 110, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
    ],
  },
  {
    brand: 'Bobcat',
    models: [
      'S450 Mini Yükleyici (Skid Steer)',
      'S530 Mini Yükleyici (Skid Steer)',
      'S570 Mini Yükleyici (Skid Steer)',
      'S650 Mini Yükleyici (Skid Steer)',
      'T590 Paletli Mini Yükleyici',
      'E19 Mini Ekskavatör',
      'E27z Mini Ekskavatör',
      'E35z Mini Ekskavatör',
      'E55z Mini Ekskavatör',
      'TL38.70HF Telehandler',
      'B730 R Kazıcı Yükleyici (Beko Loder)',
    ],
    variants: [
      { kasa_tipi: 'Mini Yükleyici / Mini Ekskavatör', motor_adi: '2.4L Bobcat D24 Stage V • 68HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Hidrostatik 2 Hızlı', beygir_gucu_hp: 68, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
      { kasa_tipi: 'Telehandler / Beko Loder', motor_adi: '3.4L Bobcat D34 • 100HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Hidrostatik / Powershift', beygir_gucu_hp: 100, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
    ],
  },
  {
    brand: 'MST',
    models: [
      'M542 Plus Kazıcı Yükleyici',
      'M544 Plus Kazıcı Yükleyici',
      'M642 Plus Kazıcı Yükleyici',
      'M644 Plus (Büyük Teker Beko Loder)',
      'ST 7.40 Telehandler',
      'ST 9.40 Telehandler',
      'ST 17.40 Telehandler',
      'M300LC Paletli Ekskavatör',
    ],
    variants: [
      { kasa_tipi: 'Kazıcı Yükleyici (Beko Loder)', motor_adi: '3.6L Perkins Stage V • 100HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Carraro Autoshift 4WD', beygir_gucu_hp: 100, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
      { kasa_tipi: 'Telehandler (Teleskopik Yükleyici)', motor_adi: '4.4L Perkins • 110HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Powershift 4WD', beygir_gucu_hp: 110, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
    ],
  },
  {
    brand: 'Manitou',
    models: [
      'MT 1440 Easy Telehandler',
      'MT 1840 Easy Telehandler (18m)',
      'MT 625 H Kompakt Telehandler',
      'MLT 737-130 PS+ Telehandler',
      'MRT 2150 Privilege Plus Döner Kuleli',
    ],
    variants: [
      { kasa_tipi: 'Telehandler (Teleskopik Yükleyici)', motor_adi: '3.6L Deutz Stage V • 100HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Tork Konvertörlü 4WD', beygir_gucu_hp: 100, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
    ],
  },
  {
    brand: 'Bomag',
    models: [
      'BW 211 D-5 Toprak Silindiri',
      'BW 213 D-5 Toprak Silindiri',
      'BW 161 AD-5 Tandem Asfalt Silindiri',
      'BF 600 C-2 Asfalt Finişeri',
    ],
    variants: [
      { kasa_tipi: 'Toprak / Asfalt Silindiri', motor_adi: '3.8L Deutz TCD 3.6 • 128HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Hidrostatik Çift Tambur', beygir_gucu_hp: 128, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 250 },
    ],
  },
  {
    brand: 'Sany',
    models: [
      'SY75C Mini Ekskavatör',
      'SY135C Paletli Ekskavatör',
      'SY215C Paletli Ekskavatör',
      'SY335C Paletli Ekskavatör',
      'SY500H Maden Ekskavatörü',
      'SW955K1 Lastikli Yükleyici',
    ],
    variants: [
      { kasa_tipi: 'Paletli Ekskavatör (SY Serisi)', motor_adi: '5.2L Isuzu 4HK1 • 172HP', yakit_tipi: 'Dizel', sanziman_tipi: 'Kawasaki Hidrolik', beygir_gucu_hp: 172, onerilen_bakim_km: null, triger_degisim_km: null, calisma_saati_bakim: 500 },
    ],
  },
];

// ============================================================================
// STANDART BİNEK & EV VARYANT ŞABLONLARI
// ============================================================================
const PASSENGER_VARIANT_PROFILES = [
  {
    kasa_tipi: 'Sedan',
    motor_adi: '1.5 Dizel • 120HP',
    yakit_tipi: 'Dizel',
    sanziman_tipi: 'Otomatik',
    beygir_gucu_hp: 120,
    onerilen_bakim_km: 15000,
    triger_degisim_km: 90000,
    calisma_saati_bakim: null,
  },
  {
    kasa_tipi: 'Hatchback',
    motor_adi: '1.2 Turbo Benzin • 130HP',
    yakit_tipi: 'Benzin',
    sanziman_tipi: 'Otomatik',
    beygir_gucu_hp: 130,
    onerilen_bakim_km: 15000,
    triger_degisim_km: 100000,
    calisma_saati_bakim: null,
  },
  {
    kasa_tipi: 'Sedan',
    motor_adi: '1.4 Atmosferik • 100HP',
    yakit_tipi: 'Benzin / LPG',
    sanziman_tipi: 'Manuel',
    beygir_gucu_hp: 100,
    onerilen_bakim_km: 10000,
    triger_degisim_km: 80000,
    calisma_saati_bakim: null,
  },
];

const EV_VARIANT_PROFILES = [
  {
    kasa_tipi: 'Binek / SUV (RWD)',
    motor_adi: '160 kW RWD Uzun Menzil',
    yakit_tipi: 'Elektrik',
    sanziman_tipi: 'Otomatik',
    beygir_gucu_hp: 218,
    onerilen_bakim_km: 20000,
    triger_degisim_km: null,
    calisma_saati_bakim: null,
  },
  {
    kasa_tipi: 'Binek / SUV (AWD)',
    motor_adi: '320 kW AWD Çift Motor',
    yakit_tipi: 'Elektrik',
    sanziman_tipi: 'Otomatik',
    beygir_gucu_hp: 435,
    onerilen_bakim_km: 20000,
    triger_degisim_km: null,
    calisma_saati_bakim: null,
  },
];

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function fetchRemoteCatalog() {
  try {
    const res = await fetch(REMOTE_DATASET_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Uzak katalog kaynağına erişilemedi, yerel genişletilmiş veri seti kullanılacak:', err.message);
    return [];
  }
}

async function seedKatalog() {
  const client = await pool.connect();

  try {
    console.log('1/6 Uzak uluslararası binek araç kataloğu indiriliyor (fetchRemoteCatalog)...');
    const remoteList = await fetchRemoteCatalog();

    // Kategori bazlı (Marka -> { models: Set, variants: Array }) haritaları
    const categoryDataMap = {
      otomobil: new Map(),
      'arazi-suv-pickup': new Map(),
      'ticari-araclar': new Map(),
      'agir-vasita': new Map(),
      'is-makineleri': new Map(),
    };

    const registerCategoryItems = (catSlug, items, defaultVariants = null) => {
      const targetMap = categoryDataMap[catSlug];
      for (const item of items) {
        const brandName = String(item?.brand || '').trim();
        if (!brandName) continue;

        if (!targetMap.has(brandName)) {
          targetMap.set(brandName, { models: new Set(), variants: item.variants || defaultVariants || [] });
        }
        const entry = targetMap.get(brandName);
        if (item.variants && item.variants.length > 0) {
          entry.variants = item.variants;
        }
        if (Array.isArray(item.models)) {
          for (const m of item.models) {
            const cleanModel = String(m || '').trim();
            if (cleanModel) entry.models.add(cleanModel);
          }
        }
      }
    };

    // 1) Otomobil (Uzak JSON + Türkiye Binek Ekleri)
    registerCategoryItems('otomobil', [...remoteList, ...PASSENGER_EXTRA_DATA], PASSENGER_VARIANT_PROFILES);

    // 2) Arazi, SUV & Pickup
    registerCategoryItems('arazi-suv-pickup', SUV_COMMERCIAL_DATA.suv_pickup);

    // 3) Ticari Araçlar (Panelvan, Kamyonet, Minibüs, Midibüs)
    registerCategoryItems('ticari-araclar', SUV_COMMERCIAL_DATA.ticari_araclar);

    // 4) Ağır Vasıta (Çekici / Tır, Kamyon, Kırkayak, Mikser)
    registerCategoryItems('agir-vasita', HEAVY_COMMERCIAL_DATA);

    // 5) İş Makineleri (Beko Loder, Ekskavatör, Loder, Dozer, Greyder, Telehandler)
    registerCategoryItems('is-makineleri', CONSTRUCTION_EQUIPMENT_DATA);

    // Tüm benzersiz markaları ve ana kategorilerini topla
    const brandPrimaryCategory = new Map();
    for (const [catSlug, brandMap] of Object.entries(categoryDataMap)) {
      for (const brandName of brandMap.keys()) {
        if (!brandPrimaryCategory.has(brandName)) {
          brandPrimaryCategory.set(brandName, catSlug);
        }
      }
    }

    await client.query('BEGIN');

    // Şema ve Tabloların varlığından emin ol
    await client.query(`
      CREATE TABLE IF NOT EXISTS ref_kategoriler (
          kategori_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          ad VARCHAR(100) NOT NULL UNIQUE,
          slug VARCHAR(100) NOT NULL UNIQUE,
          sira_no SMALLINT NOT NULL DEFAULT 1,
          aktif BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS ref_markalar (
          marka_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL,
          ad VARCHAR(100) NOT NULL UNIQUE,
          slug VARCHAR(100) NOT NULL UNIQUE,
          logo_url TEXT,
          aktif BOOLEAN NOT NULL DEFAULT TRUE
      );

      ALTER TABLE ref_markalar
          ADD COLUMN IF NOT EXISTS kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL;

      CREATE TABLE IF NOT EXISTS ref_kategori_marka (
          kategori_id INT NOT NULL REFERENCES ref_kategoriler(kategori_id) ON DELETE CASCADE,
          marka_id INT NOT NULL REFERENCES ref_markalar(marka_id) ON DELETE CASCADE,
          PRIMARY KEY (kategori_id, marka_id)
      );

      CREATE TABLE IF NOT EXISTS ref_modeller (
          model_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          marka_id INT NOT NULL REFERENCES ref_markalar(marka_id) ON DELETE CASCADE,
          kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL,
          ad VARCHAR(120) NOT NULL,
          arac_sinifi VARCHAR(50) DEFAULT 'Binek',
          baslangic_yili SMALLINT NOT NULL DEFAULT 1990,
          bitis_yili SMALLINT,
          CONSTRAINT uq_marka_model UNIQUE (marka_id, ad)
      );

      ALTER TABLE ref_modeller
          ADD COLUMN IF NOT EXISTS kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL;

      ALTER TABLE araclar
          ADD COLUMN IF NOT EXISTS kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS kategori VARCHAR(100) DEFAULT 'Otomobil';

      CREATE TABLE IF NOT EXISTS ref_arac_varyantlari (
          varyant_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          model_id INT NOT NULL REFERENCES ref_modeller(model_id) ON DELETE CASCADE,
          uretim_yili_baslangic SMALLINT NOT NULL DEFAULT 2015,
          uretim_yili_bitis SMALLINT,
          kasa_tipi VARCHAR(80) NOT NULL,
          motor_adi VARCHAR(120) NOT NULL,
          yakit_tipi VARCHAR(50) NOT NULL,
          sanziman_tipi VARCHAR(50) NOT NULL,
          beygir_gucu_hp SMALLINT,
          onerilen_bakim_km INT DEFAULT 15000,
          triger_degisim_km INT DEFAULT 90000,
          calisma_saati_bakim INT,
          CONSTRAINT uq_model_varyant UNIQUE (model_id, kasa_tipi, motor_adi, sanziman_tipi)
      );

      ALTER TABLE ref_arac_varyantlari
          ALTER COLUMN kasa_tipi TYPE VARCHAR(80),
          ALTER COLUMN motor_adi TYPE VARCHAR(120),
          ALTER COLUMN yakit_tipi TYPE VARCHAR(50),
          ALTER COLUMN sanziman_tipi TYPE VARCHAR(50),
          ADD COLUMN IF NOT EXISTS calisma_saati_bakim INT;

      CREATE INDEX IF NOT EXISTS idx_ref_kategori_marka_kat ON ref_kategori_marka (kategori_id);
      CREATE INDEX IF NOT EXISTS idx_ref_kategori_marka_marka ON ref_kategori_marka (marka_id);
      CREATE INDEX IF NOT EXISTS idx_ref_modeller_marka ON ref_modeller (marka_id);
      CREATE INDEX IF NOT EXISTS idx_ref_modeller_kategori_marka ON ref_modeller (kategori_id, marka_id);
      CREATE INDEX IF NOT EXISTS idx_ref_varyantlar_model ON ref_arac_varyantlari (model_id);
    `);

    // Eski slug kalıntısını yeni ağır vasıta slug'ına taşı
    await client.query(`
      DELETE FROM ref_kategoriler WHERE slug = 'agir-vasita-tir';
    `);

    // 2/6 KATEGORİLERİ BULK INSERT YAP
    console.log(`2/6 ${KATEGORILER.length} ana kategori BULK INSERT ile kaydediliyor...`);
    await client.query(
      `INSERT INTO ref_kategoriler (ad, slug, sira_no, aktif)
       SELECT UNNEST($1::varchar[]), UNNEST($2::varchar[]), UNNEST($3::smallint[]), TRUE
       ON CONFLICT (slug) DO UPDATE SET ad = EXCLUDED.ad, sira_no = EXCLUDED.sira_no, aktif = TRUE`,
      [
        KATEGORILER.map((k) => k.ad),
        KATEGORILER.map((k) => k.slug),
        KATEGORILER.map((k) => k.sira_no),
      ]
    );

    const dbKategorilerRes = await client.query('SELECT kategori_id, ad, slug FROM ref_kategoriler');
    const kategoriIdBySlug = new Map(dbKategorilerRes.rows.map((r) => [r.slug, r.kategori_id]));

    // 3/6 MARKALARI BULK INSERT YAP
    const brands = Array.from(brandPrimaryCategory.keys()).sort((a, b) => a.localeCompare(b));
    const brandSlugs = brands.map((b, idx) => `${slugify(b) || 'brand'}-${idx}`);
    const brandKategoriIds = brands.map((b) => kategoriIdBySlug.get(brandPrimaryCategory.get(b)) || null);

    console.log(`3/6 ${brands.length} marka BULK INSERT ile kaydediliyor...`);
    await client.query(
      `INSERT INTO ref_markalar (ad, slug, kategori_id, aktif)
       SELECT UNNEST($1::varchar[]), UNNEST($2::varchar[]), UNNEST($3::int[]), TRUE
       ON CONFLICT (ad) DO UPDATE SET kategori_id = COALESCE(ref_markalar.kategori_id, EXCLUDED.kategori_id)`,
      [brands, brandSlugs, brandKategoriIds]
    );

    const dbBrandsRes = await client.query('SELECT marka_id, ad FROM ref_markalar');
    const brandIdByName = new Map(dbBrandsRes.rows.map((r) => [r.ad, r.marka_id]));

    // 4/6 KATEGORİ-MARKA N:M İLİŞKİLERİNİ BULK INSERT YAP
    const kmKategoriIds = [];
    const kmMarkaIds = [];

    for (const [catSlug, brandMap] of Object.entries(categoryDataMap)) {
      const kategoriId = kategoriIdBySlug.get(catSlug);
      if (!kategoriId) continue;

      for (const brandName of brandMap.keys()) {
        const markaId = brandIdByName.get(brandName);
        if (!markaId) continue;
        kmKategoriIds.push(kategoriId);
        kmMarkaIds.push(markaId);
      }
    }

    console.log(`4/6 ${kmKategoriIds.length} kategori-marka ilişkisi BULK INSERT ile kaydediliyor...`);
    await client.query(
      `INSERT INTO ref_kategori_marka (kategori_id, marka_id)
       SELECT UNNEST($1::int[]), UNNEST($2::int[])
       ON CONFLICT (kategori_id, marka_id) DO NOTHING`,
      [kmKategoriIds, kmMarkaIds]
    );

    // 5/6 MODELLERİ KATEGORİLERİYLE BİRLİKTE BULK INSERT YAP
    const sinifBySlug = {
      otomobil: 'Otomobil',
      'arazi-suv-pickup': 'SUV & Pickup',
      'ticari-araclar': 'Ticari Araç',
      'agir-vasita': 'Ağır Vasıta',
      'is-makineleri': 'İş Makinesi',
    };

    const modelRowsMap = new Map(); // key: `${markaId}::${modelName}`
    const modelCustomVariantsMap = new Map(); // key: `${markaId}::${modelName}` -> variants[]

    for (const catSlug of ['otomobil', 'arazi-suv-pickup', 'ticari-araclar', 'agir-vasita', 'is-makineleri']) {
      const kategoriId = kategoriIdBySlug.get(catSlug);
      const aracSinifi = sinifBySlug[catSlug] || 'Binek';
      const brandMap = categoryDataMap[catSlug];

      for (const [brandName, entry] of brandMap.entries()) {
        const markaId = brandIdByName.get(brandName);
        if (!markaId) continue;

        for (const modelName of entry.models) {
          const cleanName = modelName.slice(0, 120);
          const key = `${markaId}::${cleanName}`;
          modelRowsMap.set(key, {
            markaId,
            kategoriId,
            ad: cleanName,
            aracSinifi,
            catSlug,
            brandName,
          });
          if (entry.variants && entry.variants.length > 0) {
            modelCustomVariantsMap.set(key, entry.variants);
          }
        }
      }
    }

    const modelMarkaIds = [];
    const modelKategoriIds = [];
    const modelNames = [];
    const modelSiniflari = [];

    for (const item of modelRowsMap.values()) {
      modelMarkaIds.push(item.markaId);
      modelKategoriIds.push(item.kategoriId);
      modelNames.push(item.ad);
      modelSiniflari.push(item.aracSinifi);
    }

    console.log(`5/6 ${modelNames.length} model BULK INSERT ile kaydediliyor...`);
    await client.query(
      `INSERT INTO ref_modeller (marka_id, kategori_id, ad, arac_sinifi, baslangic_yili)
       SELECT UNNEST($1::int[]), UNNEST($2::int[]), UNNEST($3::varchar[]), UNNEST($4::varchar[]), 2000
       ON CONFLICT (marka_id, ad) DO UPDATE
       SET kategori_id = EXCLUDED.kategori_id,
           arac_sinifi = EXCLUDED.arac_sinifi`,
      [modelMarkaIds, modelKategoriIds, modelNames, modelSiniflari]
    );

    // 6/6 VARYANTLARI KATEGORİ VE ENDÜSTRİYEL PROFİLE GÖRE BULK INSERT YAP
    // Önce eski uyumsuz varyantları temizle
    await client.query('TRUNCATE TABLE ref_arac_varyantlari RESTART IDENTITY CASCADE');

    const dbModelsRes = await client.query(`
      SELECT m.model_id, m.marka_id, m.ad AS model_ad, mk.ad AS marka_ad, k.slug AS kategori_slug
      FROM ref_modeller m
      INNER JOIN ref_markalar mk ON mk.marka_id = m.marka_id
      LEFT JOIN ref_kategoriler k ON k.kategori_id = m.kategori_id
    `);

    const vModelIds = [];
    const vKasa = [];
    const vMotor = [];
    const vYakit = [];
    const vSanziman = [];
    const vHp = [];
    const vBakimKm = [];
    const vTrigerKm = [];
    const vCalismaSaati = [];

    for (const row of dbModelsRes.rows) {
      const key = `${row.marka_id}::${row.model_ad}`;
      const isEvBrand = ['Togg', 'Tesla', 'BYD'].includes(row.marka_ad);

      let profiles = modelCustomVariantsMap.get(key);
      if (!profiles || profiles.length === 0) {
        profiles = isEvBrand ? EV_VARIANT_PROFILES : PASSENGER_VARIANT_PROFILES;
      } else if (isEvBrand && row.kategori_slug === 'otomobil') {
        profiles = EV_VARIANT_PROFILES;
      }

      for (const p of profiles) {
        vModelIds.push(row.model_id);
        vKasa.push(p.kasa_tipi);
        vMotor.push(p.motor_adi);
        vYakit.push(p.yakit_tipi);
        vSanziman.push(p.sanziman_tipi);
        vHp.push(p.beygir_gucu_hp ?? null);
        vBakimKm.push(p.onerilen_bakim_km ?? null);
        vTrigerKm.push(p.triger_degisim_km ?? null);
        vCalismaSaati.push(p.calisma_saati_bakim ?? null);
      }
    }

    console.log(`6/6 ${vModelIds.length} endüstriyel/binek varyant BULK INSERT ile kaydediliyor...`);
    await client.query(
      `INSERT INTO ref_arac_varyantlari (
         model_id, kasa_tipi, motor_adi, yakit_tipi, sanziman_tipi,
         beygir_gucu_hp, onerilen_bakim_km, triger_degisim_km, calisma_saati_bakim
       )
       SELECT
         UNNEST($1::int[]),
         UNNEST($2::varchar[]),
         UNNEST($3::varchar[]),
         UNNEST($4::varchar[]),
         UNNEST($5::varchar[]),
         UNNEST($6::smallint[]),
         UNNEST($7::int[]),
         UNNEST($8::int[]),
         UNNEST($9::int[])
       ON CONFLICT (model_id, kasa_tipi, motor_adi, sanziman_tipi) DO UPDATE
       SET onerilen_bakim_km = EXCLUDED.onerilen_bakim_km,
           triger_degisim_km = EXCLUDED.triger_degisim_km,
           calisma_saati_bakim = EXCLUDED.calisma_saati_bakim`,
      [vModelIds, vKasa, vMotor, vYakit, vSanziman, vHp, vBakimKm, vTrigerKm, vCalismaSaati]
    );

    await client.query('COMMIT');
    console.log(
      `TRUSS Kurumsal Katalog Seeder tamamlandı: ${KATEGORILER.length} Kategori, ${brands.length} Marka, ${modelNames.length} Model, ${vModelIds.length} Varyant aktif.`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Katalog seed hatası:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedKatalog();
