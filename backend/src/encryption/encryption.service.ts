import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ALGORITHM     = 'aes-256-gcm';
const IV_BYTES      = 12;          // GCM-recommended (RFC 5116)
const TAG_BYTES     = 16;          // GCM auth tag
const VERSION_TAG   = 'enc:v1:';
const PROD_KEY_PATH = '/etc/secrets/encryption.key';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private key!: Buffer;

  onModuleInit() {
    const hex =
      process.env.NODE_ENV === 'production'
        ? this.readKeyFile()
        : process.env.ENCRYPTION_KEY;

    if (!hex) {
      throw new Error(
        'ENCRYPTION_KEY missing. ' +
          (process.env.NODE_ENV === 'production'
            ? `Expected file at ${PROD_KEY_PATH}.`
            : 'Set ENCRYPTION_KEY=<64-char-hex> in backend/.env.'),
      );
    }

    if (!/^[0-9a-fA-F]{64}$/.test(hex.trim())) {
      throw new Error('ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes).');
    }

    this.key = Buffer.from(hex.trim(), 'hex');
    this.logger.log('Encryption key loaded.');
  }

  private readKeyFile(): string {
    try {
      return readFileSync(PROD_KEY_PATH, 'utf8').trim();
    } catch (e: any) {
      throw new Error(`Cannot read ${PROD_KEY_PATH}: ${e.message}`);
    }
  }

  encrypt(plaintext: string, aad?: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));
    const ct  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return VERSION_TAG + Buffer.concat([iv, tag, ct]).toString('base64');
  }

  decrypt(blob: string, aad?: string): string {
    if (!this.isEncrypted(blob)) {
      throw new Error('Value is not an encrypted blob (missing version tag).');
    }
    const buf = Buffer.from(blob.slice(VERSION_TAG.length), 'base64');
    if (buf.length < IV_BYTES + TAG_BYTES + 1) {
      throw new Error('Ciphertext is truncated or malformed.');
    }
    const iv  = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ct  = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(tag);
    try {
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    } catch {
      throw new Error('Decryption failed (wrong key, tampered data, or AAD mismatch).');
    }
  }

  encryptIfPresent(value: string | null | undefined, aad?: string): string | null {
    if (value == null || value === '') return value ?? null;
    return this.encrypt(value, aad);
  }

  decryptIfPresent(value: string | null | undefined, aad?: string): string | null {
    if (value == null || value === '') return value ?? null;
    return this.decrypt(value, aad);
  }

  isEncrypted(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith(VERSION_TAG);
  }
}
