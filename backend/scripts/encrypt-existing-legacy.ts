/* eslint-disable no-console */
/**
 * One-shot migration: encrypts any plaintext Legacy rows already in the DB.
 * Safe to run multiple times — rows with ciphertext (enc:v1: prefix) are skipped.
 *
 * Usage:
 *   cd backend
 *   npx ts-node scripts/encrypt-existing-legacy.ts
 */
import { PrismaClient } from '@prisma/client';
import { createCipheriv, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const VERSION_TAG   = 'enc:v1:';
const PROD_KEY_PATH = '/etc/secrets/encryption.key';

function loadKey(): Buffer {
  const raw =
    process.env.NODE_ENV === 'production'
      ? readFileSync(PROD_KEY_PATH, 'utf8')
      : process.env.ENCRYPTION_KEY ?? '';
  const hex = raw.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'Invalid or missing ENCRYPTION_KEY. Must be exactly 64 hex chars.\n' +
        (process.env.NODE_ENV === 'production'
          ? `Expected at ${PROD_KEY_PATH}`
          : 'Set ENCRYPTION_KEY in backend/.env'),
    );
  }
  return Buffer.from(hex, 'hex');
}

const KEY = loadKey();

function isEncrypted(v: unknown): boolean {
  return typeof v === 'string' && v.startsWith(VERSION_TAG);
}

function encrypt(plaintext: string, aad: string): string {
  const iv     = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return VERSION_TAG + Buffer.concat([iv, tag, ct]).toString('base64');
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.legacyCanvas.findMany();
    console.log(`Found ${rows.length} Legacy row(s).`);

    let processed = 0, encrypted = 0, skipped = 0;

    for (const row of rows) {
      processed++;
      const inputRoles = (row.roleTexts as Record<string, string>) ?? {};
      let touched = false;
      const nextRoles: Record<string, string> = {};

      for (const [roleId, value] of Object.entries(inputRoles)) {
        if (isEncrypted(value)) {
          nextRoles[roleId] = value;
        } else {
          nextRoles[roleId] = encrypt(value ?? '', `legacy:${row.userId}:role:${roleId}`);
          touched = true;
        }
      }

      let nextPurpose = row.purposeText;
      if (!isEncrypted(row.purposeText)) {
        nextPurpose = encrypt(row.purposeText ?? '', `legacy:${row.userId}:purpose`);
        touched = true;
      }

      if (!touched) {
        console.log(`  Skipped  row ${row.id} — already encrypted.`);
        skipped++;
        continue;
      }

      await prisma.legacyCanvas.update({
        where: { id: row.id },
        data:  { roleTexts: nextRoles, purposeText: nextPurpose },
      });
      console.log(`  Encrypted row ${row.id} (user ${row.userId}).`);
      encrypted++;
    }

    console.log(`\nDone. processed=${processed}  encrypted=${encrypted}  skipped=${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
