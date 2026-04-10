const jwt = require('jsonwebtoken'); // JWT token doğrulamak için kütüphaneyi dahil eder.

const authMiddleware = (req, res, next) => { // Korunan rotalar için kimlik doğrulama ara katmanını tanımlar.
  const authHeader = req.headers.authorization; // Authorization başlığını alır.

  if (!authHeader || !authHeader.startsWith('Bearer ')) { // Başlık yoksa veya Bearer ile başlamıyorsa kontrol eder.
    return res.status(401).json({ message: 'Token bulunamadı' }); // Token yoksa 401 Unauthorized döner.
  }

  const token = authHeader.split(' ')[1]; // Bearer kısmını atıp token değerini ayırır.
  const secret = process.env.JWT_SECRET || 'gizli_anahtar_gecici'; // JWT secret'ı .env'den alır, yoksa varsayılanı kullanır.

  try {
    req.user = jwt.verify(token, secret); // Token'ı doğrular ve çözülen payload'ı req.user içine yazar.
    next(); // İstek akışını bir sonraki adıma geçirir.
  } catch (error) {
    return res.status(403).json({ message: 'Geçersiz veya süresi dolmuş token' }); // Hatalı veya süresi dolmuş token için 403 döner.
  }
};

module.exports = authMiddleware; // Middleware fonksiyonunu dışa aktarır.
