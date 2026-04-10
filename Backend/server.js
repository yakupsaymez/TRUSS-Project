const express = require('express'); // Express framework'unu projeye dahil eder.
const cors = require('cors'); // Farkli origin'lerden gelen isteklere izin verir.
require('dotenv').config(); // .env dosyasindaki degiskenleri process.env'e yukler.
const userRoutes = require('./routes/userRoutes'); // Kullaniciya ait router'i ayri dosyadan dahil eder.
const aracRoutes = require('./routes/aracRoutes'); // Araclara ait router'i ayri dosyadan dahil eder.
const bakimRoutes = require('./routes/bakimRoutes'); // Bakimlara ait router'i ayri dosyadan dahil eder.
const yakitRoutes = require('./routes/yakitRoutes'); // Yakit islemlerine ait router'i ayri dosyadan dahil eder.

const app = express(); // Express uygulama nesnesini olusturur.
const PORT = process.env.PORT || 5000; // Port bilgisini .env'den alir, yoksa 5000 kullanir.

app.use(cors()); // CORS middleware'ini aktif eder.
app.use(express.json()); // JSON body verilerini okuyabilmek icin middleware ekler.

app.get('/', (req, res) => { // Kök dizin test endpoint'i.
  res.send('ABTS Backend Çalışıyor'); // Sunucunun aktif oldugunu belirten cevap döner.
});

app.use('/api/users', userRoutes); // Kullaniciyla ilgili tum rotalari router dosyasindan baglar.
app.use('/api/araclar', aracRoutes); // Araclarla ilgili tum rotalari router dosyasindan baglar.
app.use('/api/bakimlar', bakimRoutes); // Bakimlarla ilgili tum rotalari router dosyasindan baglar.
app.use('/api/yakitlar', yakitRoutes); // Yakitlarla ilgili tum rotalari router dosyasindan baglar.

app.listen(PORT, () => { // Sunucuyu belirtilen portta dinlemeye baslatir.
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`); // Sunucunun basladigini terminale yazar.
});
