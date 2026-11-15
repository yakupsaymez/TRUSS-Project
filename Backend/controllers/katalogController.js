const pool = require('../db');

// 1. GET /api/katalog/kategoriler
const getKategoriler = async (req, res) => {
  try {
    const query = `
      SELECT kategori_id, ad, slug, sira_no
      FROM ref_kategoriler
      WHERE aktif = TRUE
      ORDER BY sira_no ASC, kategori_id ASC
    `;
    const result = await pool.query(query);
    return res.status(200).json({
      message: 'Kategoriler listelendi',
      kategoriler: result.rows,
    });
  } catch (err) {
    console.error('Kategori listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 2. GET /api/katalog/markalar?kategori_id=X
const getMarkalar = async (req, res) => {
  const { kategori_id } = req.query;

  try {
    let result;
    if (kategori_id) {
      const query = `
        SELECT m.marka_id, m.ad, m.slug, m.logo_url, km.kategori_id
        FROM ref_markalar m
        INNER JOIN ref_kategori_marka km ON km.marka_id = m.marka_id
        WHERE m.aktif = TRUE
          AND km.kategori_id = $1
        ORDER BY m.ad ASC
      `;
      result = await pool.query(query, [Number(kategori_id)]);
    } else {
      const query = `
        SELECT marka_id, ad, slug, logo_url
        FROM ref_markalar
        WHERE aktif = TRUE
        ORDER BY ad ASC
      `;
      result = await pool.query(query);
    }

    return res.status(200).json({
      message: 'Markalar listelendi',
      markalar: result.rows,
    });
  } catch (err) {
    console.error('Marka listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 3. GET /api/katalog/modeller?marka_id=X&kategori_id=Y
const getModellerByMarka = async (req, res) => {
  const { marka_id, kategori_id } = req.query;

  if (!marka_id) {
    return res.status(400).json({ message: 'marka_id parametresi zorunludur.' });
  }

  try {
    let result;
    if (kategori_id) {
      const filteredQuery = `
        SELECT model_id, marka_id, kategori_id, ad, arac_sinifi, baslangic_yili, bitis_yili
        FROM ref_modeller
        WHERE marka_id = $1
          AND kategori_id = $2
        ORDER BY ad ASC
      `;
      result = await pool.query(filteredQuery, [Number(marka_id), Number(kategori_id)]);

      // Markanın ilgili kategoride özel modeli yoksa markanın tüm modellerini dön
      if (result.rows.length === 0) {
        const fallbackQuery = `
          SELECT model_id, marka_id, kategori_id, ad, arac_sinifi, baslangic_yili, bitis_yili
          FROM ref_modeller
          WHERE marka_id = $1
          ORDER BY ad ASC
        `;
        result = await pool.query(fallbackQuery, [Number(marka_id)]);
      }
    } else {
      const query = `
        SELECT model_id, marka_id, kategori_id, ad, arac_sinifi, baslangic_yili, bitis_yili
        FROM ref_modeller
        WHERE marka_id = $1
        ORDER BY ad ASC
      `;
      result = await pool.query(query, [Number(marka_id)]);
    }

    return res.status(200).json({
      message: 'Modeller listelendi',
      modeller: result.rows,
    });
  } catch (err) {
    console.error('Model listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 4. GET /api/katalog/varyantlar?model_id=X
const getVaryantlarByModel = async (req, res) => {
  const { model_id } = req.query;

  if (!model_id) {
    return res.status(400).json({ message: 'model_id parametresi zorunludur.' });
  }

  try {
    const query = `
      SELECT
        varyant_id,
        model_id,
        kasa_tipi,
        motor_adi,
        yakit_tipi,
        sanziman_tipi,
        beygir_gucu_hp,
        onerilen_bakim_km,
        triger_degisim_km,
        calisma_saati_bakim,
        (kasa_tipi || ' • ' || motor_adi || ' • ' || sanziman_tipi || ' (' || yakit_tipi || ')') AS etiket
      FROM ref_arac_varyantlari
      WHERE model_id = $1
      ORDER BY kasa_tipi ASC, motor_adi ASC
    `;
    const result = await pool.query(query, [Number(model_id)]);
    return res.status(200).json({
      message: 'Varyantlar listelendi',
      varyantlar: result.rows,
    });
  } catch (err) {
    console.error('Varyant listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = {
  getKategoriler,
  getMarkalar,
  getModellerByMarka,
  getVaryantlarByModel,
};
