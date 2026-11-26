const jwt = require('jsonwebtoken'); // JWT token doğrulamak için kütüphaneyi dahil eder.
const pool = require('../db'); // Kullanıcıyı her istekte DB'den okumak için havuzu dahil eder.
const { getJwtSecret } = require('../utils/jwtSecret');

const authMiddleware = async (req, res, next) => { // Korunan rotalar için async kimlik doğrulama ara katmanını tanımlar.
  try { // Async hatalar Express 4'te yakalanmadığı için tüm gövde try/catch içindedir.
    const authHeader = req.headers.authorization; // Authorization başlığını alır.

    if (!authHeader || !authHeader.startsWith('Bearer ')) { // Başlık yoksa veya Bearer ile başlamıyorsa kontrol eder.
      return res.status(401).json({ message: 'Oturum bulunamadı', code: 'TOKEN_MISSING' }); // Oturum yoksa 401 döner.
    }

    const token = authHeader.split(' ')[1]; // Bearer kısmını atıp token değerini ayırır.
    const secret = getJwtSecret(); // JWT secret'ı doğrular ve döndürür; yoksa fail-fast hata fırlatır.

    let decoded; // Çözülen token payload'ını tutar.
    try {
      decoded = jwt.verify(token, secret); // Token'ı doğrular ve payload'ı çözer.
    } catch (verifyError) {
      if (verifyError.name === 'TokenExpiredError') { // Süresi dolmuş token'ı ayırt eder.
        return res.status(401).json({ message: 'Oturum süresi doldu', code: 'TOKEN_EXPIRED' }); // Süre dolduysa 401 döner.
      }
      return res.status(401).json({ message: 'Geçersiz oturum', code: 'TOKEN_INVALID' }); // Diğer tüm doğrulama hataları için 401 döner.
    }

    const result = await pool.query( // Güncel rol ve yetkiyi DB'den okur (yeniden giriş gerekmez).
      'SELECT user_id, email, org_id, role, yetkiler, token_version, aktif_mi FROM users WHERE user_id = $1',
      [decoded.user_id]
    );

    if (result.rowCount === 0) { // Kullanıcı silinmişse oturum geçersizdir.
      return res.status(401).json({ message: 'Kullanıcı bulunamadı', code: 'USER_NOT_FOUND' }); // Kullanıcı yoksa 401 döner.
    }

    const row = result.rows[0]; // DB'deki güncel kullanıcı kaydını alır.
    if (row.aktif_mi === false) {
      return res.status(403).json({
        code: 'ACCOUNT_DISABLED',
        message: 'Hesabınız pasif duruma alınmıştır. Yöneticinizle iletişime geçin.',
      });
    }
    if (Number(decoded.tv ?? 0) !== Number(row.token_version ?? 0)) {
      return res.status(401).json({ message: 'Oturum geçersiz kılındı', code: 'TOKEN_REVOKED' });
    }
    req.user = { // Token payload'ını güncel DB değerleriyle birleştirir.
      ...decoded,
      user_id: row.user_id,
      email: row.email,
      org_id: row.org_id,
      role: row.role,
      yetkiler: row.yetkiler || {},
    };

    return next(); // İstek akışını bir sonraki adıma geçirir.
  } catch (error) {
    console.error('Kimlik doğrulama hatası:', error); // DB/sistem hatasını loglar.
    return res.status(500).json({ message: 'Kimlik doğrulama servisi hatası' }); // DB/sistem hatasında asla 401 dönmez.
  }
};

module.exports = authMiddleware; // Middleware fonksiyonunu dışa aktarır.
