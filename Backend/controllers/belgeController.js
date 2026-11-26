const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { logAuditEvent } = require('../services/auditService');
const { presignUploadSchema, bindDocumentSchema, listDocumentsSchema, accessQuerySchema } = require('../utils/docVaultSchema');
const { verifyLocalPutQuery, verifyLocalGetQuery, writeLocalObject, readLocalObject } = require('../utils/localVaultDriver');
const { requestUploadUrlTx, bindDocumentEndpointTx, listDocuments, getDocumentAccess, deleteDocumentTx } = require('../services/docVaultService');

const getBaseUrl = (req) => { const h = req.get('host'); return h ? `${req.protocol || 'http'}://${h}` : ''; };
const parseId = (raw) => {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'INVALID_ID', 'Geçersiz belge kimliği.');
  return n;
};
const validate = (schema, data) => {
  const { error, value } = schema.validate(data || {}, { convert: true, stripUnknown: true });
  if (error) throw new AppError(400, 'VALIDATION_ERROR', error.details[0].message);
  return value;
};
const handleErr = (res, err, label) => {
  if (err instanceof AppError) return res.status(err.statusCode).json(err.toBody());
  console.error(`${label} hatası:`, err);
  return res.status(500).json({ message: 'Sunucu hatası' });
};

const yuklemeUrlAl = async (req, res) => {
  try {
    const val = validate(presignUploadSchema, req.body);
    const data = await withTransaction((c) => requestUploadUrlTx(c, req.user, val, { baseUrl: getBaseUrl(req) }));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json(data);
  } catch (err) { return handleErr(res, err, 'Belge yükleme URL'); }
};
const belgeBagla = async (req, res) => {
  try {
    const belgeId = parseId(req.params.belge_id);
    const val = validate(bindDocumentSchema, req.body);
    const belge = await withTransaction((c) => bindDocumentEndpointTx(c, req.user, { belgeId, varlikTipi: val.varlik_tipi, varlikId: val.varlik_id }));
    return res.status(200).json({ message: 'Belge bağlandı', belge });
  } catch (err) { return handleErr(res, err, 'Belge bağlama'); }
};
const belgeleriListele = async (req, res) => {
  try { return res.status(200).json({ belgeler: await listDocuments(req.user, validate(listDocumentsSchema, req.query)) }); }
  catch (err) { return handleErr(res, err, 'Belge listeleme'); }
};
const belgeErisimAl = async (req, res) => {
  try {
    const val = validate(accessQuerySchema, req.query);
    const lookup = req.params.belge_id !== undefined ? { belgeId: parseId(req.params.belge_id) } : { anahtar: val.anahtar };
    if (lookup.belgeId === undefined && !lookup.anahtar) throw new AppError(400, 'INVALID_KEY', 'Belge kimliği veya anahtar zorunludur.');
    const data = await getDocumentAccess(req.user, lookup, { indir: val.indir, baseUrl: getBaseUrl(req) });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) { return handleErr(res, err, 'Belge erişim'); }
};
const belgeSil = async (req, res) => {
  try {
    const out = await withTransaction((c) => deleteDocumentTx(c, req.user, { belgeId: parseId(req.params.belge_id) }));
    if (out.auditCtx) await logAuditEvent(req, out.auditCtx);
    return res.status(200).json({ message: 'Belge silindi' });
  } catch (err) { return handleErr(res, err, 'Belge silme'); }
};
const localNesneYukle = async (req, res) => {
  try {
    const verified = verifyLocalPutQuery(req.query);
    const ct = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (ct !== verified.ct) throw new AppError(400, 'CONTENT_TYPE_MISMATCH', 'İçerik tipi uyuşmuyor.');
    if (!Buffer.isBuffer(req.body)) throw new AppError(400, 'INVALID_BODY', 'Geçersiz dosya gövdesi.');
    if (req.body.byteLength !== Number(verified.len)) throw new AppError(400, 'INVALID_FILE_SIZE', 'Dosya boyutu uyuşmuyor.');
    await writeLocalObject(verified.key, req.body);
    return res.status(200).json({ ok: true, key: verified.key });
  } catch (err) { return handleErr(res, err, 'Yerel nesne yükleme'); }
};
const localNesneIndir = async (req, res) => {
  try {
    const verified = verifyLocalGetQuery(req.query);
    const buf = await readLocalObject(verified.key);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', verified.ct);
    res.setHeader('Content-Disposition', verified.disp);
    return res.status(200).send(buf);
  } catch (err) { return handleErr(res, err, 'Yerel nesne indirme'); }
};

module.exports = { yuklemeUrlAl, belgeBagla, belgeleriListele, belgeErisimAl, belgeSil, localNesneYukle, localNesneIndir };
