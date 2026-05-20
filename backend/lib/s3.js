const crypto = require('crypto');
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } =
  require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;

let client = null;
function getClient() {
  if (client) return client;
  if (!REGION || !BUCKET) return null;
  client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    // ─── Disable the default CRC32 checksum behaviour added in @aws-sdk/client-s3
    // ~3.729+. Without these options, presigned PUT URLs ship with a
    // `x-amz-sdk-checksum-algorithm=CRC32` query param baked in, S3 then
    // expects the uploading browser to send a matching x-amz-checksum-crc32
    // header — but the browser PUT has no way to compute that header in line
    // with the signature, and S3 rejects the upload with 403. Setting both
    // to WHEN_REQUIRED disables the auto-checksum on standard PUTs while
    // keeping it for operations that genuinely need it.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

function isConfigured() {
  return !!(REGION && BUCKET && process.env.AWS_ACCESS_KEY_ID);
}

// Build a deterministic-ish key under a folder, e.g.
//   avatars/<citizenId>/<random>.<ext>
function buildKey(folder, ownerId, contentType) {
  const ext = pickExtension(contentType);
  const rand = crypto.randomBytes(12).toString('hex');
  return `${folder}/${ownerId}/${rand}${ext}`;
}

function pickExtension(contentType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'application/pdf': '.pdf',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
  };
  return map[String(contentType || '').toLowerCase()] || '';
}

// 5-minute upload window
async function getUploadUrl({ key, contentType }) {
  const c = getClient();
  if (!c) throw new Error('S3 not configured');
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  // Remove the flexible-checksums middleware from THIS command before
  // signing. Without this, modern @aws-sdk/client-s3 versions bake a
  // `x-amz-sdk-checksum-algorithm=CRC32` query param + a placeholder
  // `x-amz-checksum-crc32` into the signed URL. The browser's PUT then
  // doesn't include a matching real CRC32, and S3 rejects the upload with
  // 403. The client-level requestChecksumCalculation:'WHEN_REQUIRED'
  // option is not honoured for PutObject in every SDK build, so we strip
  // the middleware explicitly here as a belt-and-braces fix.
  try {
    cmd.middlewareStack.remove('flexibleChecksumsMiddleware');
  } catch (_) {
    // Middleware not present in this SDK version — safe to ignore.
  }
  const url = await getSignedUrl(c, cmd, {
    expiresIn: 60 * 5,
    // Tell the presigner to not hoist these into the query string; the
    // browser will set Content-Type directly on the PUT and S3 will be
    // happy.
    unhoistableHeaders: new Set(['content-type']),
  });
  return url;
}

// 24-hour download window
async function getDownloadUrl(key, expiresIn = 60 * 60 * 24) {
  const c = getClient();
  if (!c) throw new Error('S3 not configured');
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(c, cmd, { expiresIn });
}

async function deleteObject(key) {
  const c = getClient();
  if (!c) return;
  await c.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = {
  isConfigured,
  buildKey,
  getUploadUrl,
  getDownloadUrl,
  deleteObject,
};
