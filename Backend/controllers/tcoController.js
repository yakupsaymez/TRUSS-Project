const Joi = require('joi');
const { computeTcoAnalysis } = require('../services/tcoService');

const tcoQuerySchema = Joi.object({
  donem_gun: Joi.number().integer().valid(90, 180, 365).default(90),
});

const getTcoAnalizi = async (req, res) => {
  try {
    const { error, value } = tcoQuerySchema.validate({
      donem_gun: req.query.donem_gun,
    });

    if (error) {
      return res.status(400).json({
        code: 'INVALID_PERIOD',
        message: 'donem_gun 90, 180 veya 365 olmalıdır.',
      });
    }

    const data = await computeTcoAnalysis(req.user, value.donem_gun);
    return res.status(200).json(data);
  } catch (err) {
    console.error('RAPOR TCO-ANALIZI HATASI:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

module.exports = { getTcoAnalizi };
