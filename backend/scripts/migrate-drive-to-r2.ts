/* eslint-disable no-console */
/**
 * One-shot backfill: pull each entry's Google Drive (or direct-URL) image into
 * encrypted R2 and swap its pointer to the new media id. Bucket images migrate
 * under the "dreams" scope, vision-canvas images under "vision".
 *
 * Safe + idempotent:
 *   - pointers that are already R2 media ids (bare UUIDs) are skipped,
 *   - a dead/unreachable link is left as-is (mixed-mode keeps it rendering),
 *   - the pointer is only swapped AFTER the R2 upload succeeds.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/migrate-drive-to-r2.ts             # DRY RUN (downloads + reports, no writes)
 *   npx ts-node scripts/migrate-drive-to-r2.ts --commit    # actually upload to R2 + update the DB
 *
 * In production also set NODE_ENV=production and the R2_* env vars, and ensure
 * /etc/secrets/encryption.key is present (same as the running server).
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EncryptionService } from '../src/encryption/encryption.service';
import { MediaService, type MediaScope } from '../src/media/media.service';

const COMMIT = process.argv.includes('--commit');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isMediaId = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Turn a stored pointer into a fetchable image URL. Drive links → the reliable
// thumbnail endpoint; a plain http(s) URL is used as-is. Returns null if the
// value is neither (so we never touch already-migrated ids or junk).
function toFetchUrl(raw: string): string | null {
  if (!raw) return null;
  if (raw.includes('drive.google.com/thumbnail?id=')) return raw;
  let id: string | null = null;
  let m = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);        if (m) id = m[1];
  if (!id) { m = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);      if (m) id = m[1]; }
  if (!id) { m = raw.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/); if (m) id = m[1]; }
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1500`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return null;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function download(url: string, attempt = 0): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } });
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await sleep(1500 * (attempt + 1)); // Drive rate-limit / transient → back off and retry
      return download(url, attempt + 1);
    }
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('text/html')) return null; // Drive returns HTML for dead/private links
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 100 ? buf : null;
  } catch {
    if (attempt < 2) { await sleep(1000 * (attempt + 1)); return download(url, attempt + 1); }
    return null;
  }
}

const stats: Record<string, number> = {};
const bump = (k: string) => { stats[k] = (stats[k] ?? 0) + 1; };
const failures: string[] = [];

/** Migrate one pointer; returns the new media id, or null if unchanged. */
async function migratePointer(
  media: MediaService, userId: string, scope: MediaScope, pointer: string | null, label: string,
): Promise<string | null> {
  if (!pointer)            { return null; }
  if (isMediaId(pointer))  { bump('already-r2'); return null; }
  const url = toFetchUrl(pointer);
  if (!url)                { bump('unrecognized'); failures.push(`${label}: unrecognized pointer ${JSON.stringify(pointer).slice(0, 60)}`); return null; }

  const buf = await download(url);
  await sleep(300); // be gentle with Drive
  if (!buf)                { bump('download-failed'); failures.push(`${label}: download failed ${url}`); return null; }

  if (!COMMIT)             { bump('would-migrate'); return null; }
  try {
    const { id } = await media.upload(scope, userId, buf);
    bump('migrated');
    return id;
  } catch {
    bump('not-an-image');
    failures.push(`${label}: not a decodable image ${url}`);
    return null;
  }
}

async function main() {
  console.log(COMMIT ? '── LIVE RUN (writing to R2 + DB) ──' : '── DRY RUN (no writes; --commit to apply) ──');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const enc    = app.get(EncryptionService);
  const media  = app.get(MediaService);

  const dStr = (v: unknown): string | null =>
    typeof v === 'string' && v ? (enc.isEncrypted(v) ? enc.decryptSafe(v) : v) : null;

  try {
    // ── Bucket entries (scope: dreams) ──────────────────────────────────────
    console.log('\n── Bucket Entries ──');
    const bucket = await prisma.bucketEntry.findMany();
    for (const b of bucket) {
      const data: any = {};
      const img = await migratePointer(media, b.userId, 'dreams', dStr(b.imageUrl), `bucket:${b.id}:image`);
      if (img) data.imageUrl = enc.encrypt(img);
      const mem = await migratePointer(media, b.userId, 'dreams', dStr(b.memoryPhotoUrl), `bucket:${b.id}:memory`);
      if (mem) data.memoryPhotoUrl = enc.encrypt(mem);
      if (COMMIT && Object.keys(data).length) {
        await prisma.bucketEntry.update({ where: { id: b.id }, data });
        console.log(`  updated bucket ${b.id}`);
      }
    }

    // ── Vision canvases (scope: vision) ─────────────────────────────────────
    console.log('\n── Vision Canvases ──');
    const canvases = await prisma.visionCanvas.findMany();
    for (const vc of canvases) {
      let areas: any[];
      try { areas = JSON.parse(enc.isEncrypted(vc.areas as any) ? enc.decrypt(vc.areas as any) : (vc.areas as any)); }
      catch { failures.push(`vision:${vc.userId}: areas decrypt/parse failed`); continue; }
      if (!Array.isArray(areas)) continue;

      let changed = false;
      for (const a of areas) {
        const id = await migratePointer(media, vc.userId, 'vision', a?.imageUrl ?? null, `vision:${vc.userId}:${a?.id}`);
        if (id) { a.imageUrl = id; changed = true; }
      }
      if (COMMIT && changed) {
        await prisma.visionCanvas.update({ where: { userId: vc.userId }, data: { areas: enc.encrypt(JSON.stringify(areas)) } });
        console.log(`  updated vision ${vc.userId}`);
      }
    }
  } finally {
    await app.close();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(COMMIT ? 'Backfill complete.' : 'Dry run complete (no changes written).');
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(16)}: ${v}`);
  if (failures.length) {
    console.log(`\n${failures.length} item(s) left as-is (still render via the legacy Drive path):`);
    for (const f of failures) console.log('  •', f);
  }
}

main().catch((e) => { console.error('\nMigration failed:', e); process.exit(1); });
