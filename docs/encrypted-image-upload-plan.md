# Encrypted Image Upload — Build Plan

Direct in-app image upload with server-side encryption, stored in a **private Cloudflare R2**
bucket. Flow: **upload → backend resize → AES-256-GCM encrypt → private R2 → decrypt-and-stream on view.**

Encryption reuses the existing `EncryptionService` (AES-256-GCM, key at `/etc/secrets/encryption.key`
in prod). Custody model: **the server holds the key** — a raw R2 download is unopenable ciphertext;
only a deliberate act with the EC2 key can decrypt. Same trust model as the encrypted DB fields.

---

## Phase 0 — Prerequisites & decisions (lock first)

- [x] Create a **private** R2 bucket — no public access / no public dev URL. *(Done: `lbd-attachment`.)*
- [x] Provision R2 credentials (access key/secret + S3-compatible endpoint). Store as env vars,
      mirror into PM2 on EC2 (same pattern as `/etc/secrets` key). Add placeholders to `.env.example`.
      *(Done: R2 vars in `backend/.env`; account token scoped to include `lbd-attachment`;
      connectivity verified by a put/get/delete smoke test. Still TODO: `.env.example` placeholders + EC2/PM2 vars.)*
- [x] Add backend dep `@aws-sdk/client-s3` (R2 = S3-compatible). *(Done.)*
- [x] Add backend dep `sharp` (resize/re-encode). *(Done.)*
- [ ] Lock size policy: full-size max width (~1500px, matches banner spec), format (WebP/JPEG),
      quality (~80), thumbnail width (~400px), max accepted upload size (~15 MB),
      allowed MIME types (`image/png`, `image/jpeg`, `image/webp`).

## Phase 1 — Binary encryption support

- [x] Add `encryptBuffer(buf: Buffer): Buffer` and `decryptBuffer(buf: Buffer): Buffer` to
      `EncryptionService` — same key, same AES-256-GCM, same `IV + tag + ciphertext` layout,
      but bytes in/out (no utf8, no base64 wrapper → avoids ~33% bloat). *(Done.)*
- [x] Round-trip test: verified via the media pipeline smoke test (decrypt yields a valid WebP).

## Phase 2 — R2 storage service

- [x] New `StorageModule` / `StorageService` wrapping the S3 client configured for the R2 endpoint.
      *(Done: `src/storage/`, endpoint derived from `R2_ACCOUNT_ID`.)*
- [x] Methods: `put(key, buffer, contentType)`, `get(key): Buffer`, `delete(key)`.
- [x] Object keys carry no filename. **Design note:** keys are `img/{userId}/{uuid}` (owner embedded)
      so ownership is structural — see Phase 6.

## Phase 3 — Image processing

- [x] `ImageService` using `sharp`: raw upload → `{ full, thumb, contentType }` (full ≤1500px WebP,
      thumb 400px WebP, EXIF-rotated). Rejects undecodable input. *(Done: `src/media/image.service.ts`.)*

## Phase 4 — Upload endpoint

- [x] Auth-guarded `POST /api/media/upload` (multipart / `FileInterceptor`, 15 MB cap) in a shared
      `MediaModule` so bucket-list **and** vision canvas reuse it. *(Done.)*
- [x] Validate MIME + size, then resize (P3) → `encryptBuffer` full & thumb (P1) → `put` both to R2.
- [x] Returns `{ id }`; the entry is saved via existing create/update, storing `id` where `imageUrl`
      went (still encrypted at rest by `bucket.service`).

## Phase 5 — Data model / pointer semantics

- [x] Thumbnail key derived by convention (`img/{userId}/{uuid}_t`) — no schema/migration needed.
- [x] Pointer stays **encrypted at rest** — `bucket.service` already encrypts whatever string it
      stores, so persisting the `uuid` in `imageUrl` needs no backend change.
- [ ] Frontend **mixed-mode discriminator**: legacy Drive URL (contains `http`/`drive.google.com`)
      vs. new pointer (bare UUID). *(Belongs to Phase 8.)*

## Phase 6 — View / stream endpoint

- [x] Auth-guarded `GET /api/media/:id` and `/:id/thumb` → rebuild key from the **authenticated**
      userId → `get` ciphertext → `decryptBuffer` → stream as `image/webp`. Ownership is structural
      (key embeds userId); a foreign id 404s. `DELETE /api/media/:id` removes both variants. *(Done.)*
- [x] Buffered in memory (small, resized files); nothing written to disk or cached at rest.
      *(Verified: R2 blob is unopenable, cross-user fetch blocked.)*

## Phase 7 — Frontend: upload UI + rendering

- [x] `BucketEntrySheet.tsx` — replaced paste-a-URL input with a file picker (upload / preview /
      replace / remove + progress + validation); stores the returned media id. Same for
      `memoryPhotoUrl` in `AchievedTransition.tsx`. *(Done.)*
- [x] Images render via `<VisionImg>` — thumb on bucket-list cards, full in the sheet/celebration.
      `<img src>` can't send the auth header, so R2 media is fetched as a blob (object URL, revoked
      on cleanup). *(Done.)*
- [x] `lib/api.ts` gained `uploadMedia()` + `fetchMediaObjectUrl()`; client-side size/type checks.
      No `bucketTypes` change needed (pointer is still a string field).

## Phase 8 — Mixed-mode rendering (transition safety)

- [x] `lib/visionImage.tsx` centralizes the discriminator: bare UUID → encrypted stream endpoint;
      anything else → legacy `toDriveImgUrl`. Existing Drive-link entries keep working untouched,
      so the migration can flip entries one at a time. *(Done.)*

## Phase 9 — Backfill migration

- [ ] `scripts/migrate-drive-to-r2.ts`, modeled on `scripts/encrypt-all-existing.ts`. Per entry with
      a Drive pointer: decrypt URL → download from Drive → resize → encrypt → put to R2 → update
      pointer to R2 key.
- [ ] Dry-run mode first; graceful handling of dead/revoked links (log + skip, leave original intact);
      print succeeded/failed/skipped counts.
- [ ] User comms: notify users their images are now stored privately in-app, and that their original
      **Drive copies remain publicly shared** until they un-share/delete them (we can't touch their Drive).

## Phase 10 — Cleanup & hardening

- [x] **No orphans in R2** (hard requirement). Three guards:
      1. *Deferred upload* — the sheet/celebration stage the file locally and only upload on Save,
         so an abandoned form never touches R2.
      2. *Delete-on-delete / delete-on-replace* — `bucket.service` purges the old R2 objects when an
         entry is deleted or its image replaced/removed (`cleanupPointer` → `MediaService.remove`,
         guarded by `isMediaId` so legacy Drive URLs are ignored).
      3. *Create-failure rollback* — if the `/bucket` POST fails after an upload, `AppStore` deletes
         the just-uploaded media.
- [ ] Known residual edge: an *update* PATCH that fails after a replace upload can orphan the new
      object (rare). Candidate for a periodic reaper if it ever matters.
- [ ] Set request body-size limits (`main.ts`); confirm PM2 memory headroom for concurrent uploads.
- [ ] After migration, retire Drive-specific code (`toDriveImgUrl`) and the mixed-mode branch.
- [ ] Run `tsc --noEmit --incremental false` before any push that touches types.

---

## Suggested build order (dependency-safe)

`1 → 2 → 3 → 4 → 6` (backend path works end-to-end, testable via curl/Postman) → `5` (wire pointers)
→ `7 → 8` (frontend live, mixed-mode safe) → `9` (migrate) → `10` (clean up).

**First milestone:** Phases 1–4 + 6 — upload via API, watch a ciphertext blob land in R2, hit the
view endpoint, confirm a real image streams back. Proves the full encryption round-trip before any UI.

## Notes

- **Size control belongs in the backend, not the AI prompt.** Image generators (ChatGPT/DALL·E, etc.)
  don't honor file-size instructions in prose; the backend resize (P3) clamps every source
  deterministically.
- **Vision canvas** now uses the same pipeline: `PolaroidCard`'s dialog uploads via the shared
  `MediaModule`/`VisionImg` (deferred upload, staged local preview), and `vision.service.upsert`
  purges any image a save drops (delete-on-replace), mirroring the bucket flow.
- **Never cache decrypted images at rest** — plaintext on disk would break the "even I can't open it"
  promise. In-memory/short-lived only.
