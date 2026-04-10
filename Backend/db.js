const { Pool } = require('pg'); // pg paketinden PostgreSQL bağlantı havuzunu oluşturmak için Pool sınıfını içe aktarır.
require('dotenv').config(); // .env dosyasındaki veritabanı ayarlarını process.env içine yükler.

const pool = new Pool({ // PostgreSQL bağlantı havuzunu oluşturur.
  user: process.env.DB_USER, // Veritabanı kullanıcı adını .env içinden alır.
  password: process.env.DB_PASSWORD, // Veritabanı şifresini .env içinden alır.
  host: process.env.DB_HOST, // Veritabanı sunucusunun adresini .env içinden alır.
  port: parseInt(process.env.DB_PORT, 10) || 5432, // Veritabanı portunu sayıya çevirir, yoksa varsayılan 5432 kullanır.
  database: process.env.DB_NAME, // Bağlanılacak veritabanı adını .env içinden alır.
}); // Pool yapılandırmasını tamamlar.

module.exports = pool; // Oluşturulan pool nesnesini diğer dosyalarda kullanılmak üzere dışa aktarır.

