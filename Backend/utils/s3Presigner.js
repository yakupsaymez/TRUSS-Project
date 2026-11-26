const crypto = require('node:crypto');

const sha256Hex = (data) => crypto.createHash('sha256').update(data, 'utf8').digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest();

/**
 * RFC-3986 uyumlu URI segment kodlaması yapar (!*'() dahil).
 */
const rfc3986Encode = (str) =>
  encodeURIComponent(String(str)).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

/**
 * Content-Disposition dosya adını kontrol karakterleri ve tırnaklardan temizler.
 */
const sanitizeDispositionFilename = (filename) => {
  const cleaned = String(filename || 'belge')
    .replace(/[\r\n"\\/;<>]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_')
    .trim();
  return cleaned.slice(0, 140) || 'belge';
};

const formatAmzDate = (date) => {
  const iso = date.toISOString();
  const amzDate = iso.replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
};

const deriveSigningKey = (secretAccessKey, dateStamp, region, service = 's3') => {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
};

const asciiCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * AWS SigV4 (Cloudflare R2 & S3 uyumlu) ön-imzalı path-style URL üretir.
 */
function createPresignedUrl({
  method,
  endpoint,
  bucket,
  key,
  accessKeyId,
  secretAccessKey,
  region = 'auto',
  expiresIn = 300,
  contentType = '',
  disposition = '',
  filename = '',
  nowFn = () => new Date(),
}) {
  const upperMethod = String(method || 'GET').toUpperCase();
  const parsed = new URL(endpoint);
  const basePath = parsed.pathname.replace(/\/+$/, '');
  const encodedBucket = rfc3986Encode(bucket);
  const encodedKey = String(key)
    .replace(/^\/+/, '')
    .split('/')
    .map(rfc3986Encode)
    .join('/');
  const canonicalUri = `${basePath}/${encodedBucket}/${encodedKey}`;
  const host = parsed.host;
  const resolvedRegion = String(region || 'auto').trim() || 'auto';
  const ttl = Math.max(1, Math.min(604800, Math.trunc(Number(expiresIn) || 300)));

  const { amzDate, dateStamp } = formatAmzDate(nowFn());
  const scope = `${dateStamp}/${resolvedRegion}/s3/aws4_request`;

  const headers = [['host', host]];
  if (upperMethod === 'PUT') {
    const ct = String(contentType || 'application/octet-stream').trim();
    headers.push(['content-type', ct]);
  }
  headers.sort((a, b) => asciiCompare(a[0], b[0]));

  const canonicalHeaders = headers.map(([k, v]) => `${k}:${v}\n`).join('');
  const signedHeaders = headers.map(([k]) => k).join(';');

  const queryParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKeyId}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(ttl)],
    ['X-Amz-SignedHeaders', signedHeaders],
  ];

  if (upperMethod === 'GET' && (disposition || filename)) {
    const mode = disposition === 'attachment' ? 'attachment' : 'inline';
    const safeName = sanitizeDispositionFilename(filename);
    queryParams.push(['response-content-disposition', `${mode}; filename="${safeName}"`]);
  }

  const encodedQuery = queryParams
    .map(([k, v]) => [rfc3986Encode(k), rfc3986Encode(v)])
    .sort((a, b) => asciiCompare(a[0], b[0]) || asciiCompare(a[1], b[1]));

  const canonicalQuery = encodedQuery.map(([k, v]) => `${k}=${v}`).join('&');
  const canonicalRequest = [
    upperMethod,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = deriveSigningKey(secretAccessKey, dateStamp, resolvedRegion, 's3');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return `${parsed.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

const presignPutObject = (opts) => createPresignedUrl({ ...opts, method: 'PUT' });
const presignGetObject = (opts) => createPresignedUrl({ ...opts, method: 'GET' });

module.exports = {
  rfc3986Encode,
  sanitizeDispositionFilename,
  deriveSigningKey,
  createPresignedUrl,
  presignPutObject,
  presignGetObject,
};
