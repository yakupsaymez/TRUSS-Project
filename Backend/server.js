const express = require('express'); // Express framework'unu projeye dahil eder.
const cors = require('cors'); // Farkli origin'lerden gelen isteklere izin verir.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); // Backend/.env dosyasini sabit yoldan yukler.
const { getJwtSecret } = require('./utils/jwtSecret');
getJwtSecret();
const userRoutes = require('./routes/userRoutes'); // Kullaniciya ait router'i ayri dosyadan dahil eder.
const aracRoutes = require('./routes/aracRoutes'); // Araclara ait router'i ayri dosyadan dahil eder.
const bakimRoutes = require('./routes/bakimRoutes'); // Bakimlara ait router'i ayri dosyadan dahil eder.
const yakitRoutes = require('./routes/yakitRoutes'); // Yakit islemlerine ait router'i ayri dosyadan dahil eder.
const parcaRoutes = require('./routes/parcaRoutes'); // Parca takip islemlerine ait router'i dahil eder.
const raporRoutes = require('./routes/raporRoutes'); // Rapor ve özet endpoint'lerini dahil eder.
const adminRoutes = require('./routes/adminRoutes'); // Ekip ve şoför yönetimi rotalarını dahil eder.
const katalogRoutes = require('./routes/katalogRoutes'); // Araç katalog (marka/model/varyant) rotalarını dahil eder.

const app = express(); // Express uygulama nesnesini olusturur.

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173'];

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json()); // JSON body verilerini okuyabilmek icin middleware ekler.

app.get('/', (req, res) => { // Kök dizin test endpoint'i.
  res.send('TRUSS Backend Çalışıyor'); // Sunucunun aktif oldugunu belirten cevap döner.
});

app.use('/api/users', userRoutes); // Kullaniciyla ilgili tum rotalari router dosyasindan baglar.
app.use('/api/araclar', aracRoutes); // Araclarla ilgili tum rotalari router dosyasindan baglar.
app.use('/api/bakimlar', bakimRoutes); // Bakimlarla ilgili tum rotalari router dosyasindan baglar.
app.use('/api/yakitlar', yakitRoutes); // Yakitlarla ilgili tum rotalari router dosyasindan baglar.
app.use('/api/parcalar', parcaRoutes); // Parca takip rotalarini uygular.
app.use('/api/parca-takip', parcaRoutes); // Geriye donuk uyumluluk icin parca takip rotasi.
app.use('/api/raporlar', raporRoutes); // Rapor ve özet rotalarını uygular.
app.use('/api/admin', adminRoutes); // Ekip ve şoför yönetimi rotalarını uygular.
app.use('/api/katalog', katalogRoutes); // Kademeli araç katalog rotalarını uygular.

module.exports = app; // Uygulama nesnesini index.js dosyasinda baslatmak uzere disa aktarir.
