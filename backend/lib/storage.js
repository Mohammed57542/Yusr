import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ═══════════════════════════════════════════════════════════
// Object Storage Abstraction
// Supports: local (dev) | s3 (production via AWS SDK or R2)
// ═══════════════════════════════════════════════════════════

class LocalStorage {
  constructor(baseDir) {
    this.baseDir = baseDir;
    fs.mkdirSync(baseDir, { recursive: true });
  }

  async upload(key, buffer, contentType) {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return { key, size: buffer.length, contentType };
  }

  async getSignedUrl(key, expiresIn = 3600) {
    // For local storage, return the direct path
    return `/uploads/${key}`;
  }

  async delete(key) {
    const filePath = path.join(this.baseDir, key);
    try { fs.unlinkSync(filePath); } catch {}
    return true;
  }

  async getUploadUrl(key, contentType, expiresIn = 3600) {
    throw new Error('getUploadUrl غير مدعوم بالتخزين المحلي — استخدم S3 أو R2');
  }

  async getBuffer(key) {
    const filePath = path.join(this.baseDir, key);
    return fs.readFileSync(filePath);
  }
}

class S3Storage {
  constructor(config) {
    this.bucket = config.bucket;
    this.region = config.region || 'auto';
    this.endpoint = config.endpoint; // For R2: https://<account_id>.r2.cloudflarestorage.com
    this.publicBase = config.publicBase; // CDN URL for public files
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this._client = null;
  }

  async _getClient() {
    if (this._client) return this._client;
    const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
    this._client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
    this._PutObjectCommand = PutObjectCommand;
    this._DeleteObjectCommand = DeleteObjectCommand;
    this._GetObjectCommand = GetObjectCommand;
    return this._client;
  }

  async upload(key, buffer, contentType) {
    const client = await this._getClient();
    await client.send(new this._PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return { key, size: buffer.length, contentType };
  }

  async getSignedUrl(key, expiresIn = 3600) {
    if (this.publicBase) {
      return `${this.publicBase}/${key}`;
    }
    // Generate presigned URL for private files
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = await this._getClient();
    const command = new this._GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(client, command, { expiresIn });
  }

  async delete(key) {
    const client = await this._getClient();
    await client.send(new this._DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return true;
  }

  async getUploadUrl(key, contentType, expiresIn = 3600) {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = await this._getClient();
    const command = new this._PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(client, command, { expiresIn });
    return { url, key, expiresInSeconds: expiresIn };
  }
}

// ─── Factory ───
let storageInstance = null;

export function getStorage() {
  if (storageInstance) return storageInstance;

  const driver = process.env.STORAGE_DRIVER || 'local';

  if (driver === 's3' || driver === 'r2') {
    storageInstance = new S3Storage({
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      publicBase: process.env.S3_PUBLIC_BASE,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    });
    console.log(`☁️  Storage: ${driver.toUpperCase()} (${process.env.S3_BUCKET})`);
  } else {
    const uploadDir = path.join(process.cwd(), 'backend', 'data', 'uploads');
    storageInstance = new LocalStorage(uploadDir);
    console.log('💾 Storage: local disk');
  }

  return storageInstance;
}

export function resetStorage() {
  storageInstance = null;
}

export default { getStorage, resetStorage };
