-- ============================================================================
--  Fix: cross-user weekly-plan leak via the shared "General" event group
-- ============================================================================
--
--  ROOT CAUSE
--  ----------
--  The frontend created the default "General" group with a single HARD-CODED id
--  ("eg_general") for every user, and the backend honoured that client-supplied
--  id. So the FIRST user to open the weekly page owned the only "eg_general"
--  row; every other user's default events were written with groupId="eg_general"
--  (a group they did not own). findGroups() joined nested events by groupId only,
--  so those events surfaced under the OWNER's weekly plan — one user seeing
--  another user's events.
--
--  The code fix makes the "General" bucket per-user (identified by kind='general',
--  never a shared id) and refuses to attach events to a group the caller does not
--  own. This script repairs the data already written under the old behaviour.
--
--  No schema change is required — the `kind` column already exists, so DO NOT run
--  `prisma db push` for this. Only run this SQL, once, after deploying the new
--  backend + frontend.
--
--  HOW TO RUN (EC2 -> RDS Postgres)
--  --------------------------------
--    1. Deploy the new backend & frontend build first.
--    2. Back up (RDS snapshot, or): pg_dump "$DATABASE_URL" -t event_groups -t week_events > backup_cal.sql
--    3. psql "$DATABASE_URL" -f 2026-07-24_fix_shared_general_group.sql
--
--  It is wrapped in a single transaction and is idempotent — safe to re-run.
-- ============================================================================

BEGIN;

-- 1) Promote the legacy shared group into a proper per-user General bucket for
--    whoever currently owns it. Its own events already belong to that owner, so
--    they stay put; it simply gains kind='general' like every other user's will.
UPDATE event_groups
SET kind = 'general'
WHERE id = 'eg_general'
  AND kind IS NULL;

-- 2) Give every user who has calendar events (but no General bucket yet) their
--    own General group. Name is stored as plaintext 'General'; the app's decrypt
--    path returns non-encrypted values unchanged, so it displays correctly.
--    Id is generated without pgcrypto (no extension needed).
INSERT INTO event_groups (id, "userId", name, color, archived, kind)
SELECT
  'gen_' || md5(random()::text || clock_timestamp()::text || u.id),
  u.id, 'General', '#9CA3AF', false, 'general'
FROM users u
WHERE EXISTS (SELECT 1 FROM week_events e WHERE e."userId" = u.id)
  AND NOT EXISTS (
    SELECT 1 FROM event_groups g WHERE g."userId" = u.id AND g.kind = 'general'
  );

-- 3) Re-home every leaked event: any event sitting in a group owned by a
--    DIFFERENT user is moved into that event owner's own General bucket.
--    This covers both the old shared "eg_general" case and any cross-user
--    row created via the (now-fixed) update/create IDOR paths.
UPDATE week_events e
SET "groupId" = gen.id
FROM event_groups gen
WHERE gen."userId" = e."userId"
  AND gen.kind = 'general'
  AND EXISTS (
    SELECT 1 FROM event_groups cur
    WHERE cur.id = e."groupId"
      AND cur."userId" <> e."userId"
  );

-- 4) Verification — both counts MUST be 0 after the fix. If either is non-zero,
--    ROLLBACK and investigate before committing.
--    a) events still living in another user's group:
SELECT COUNT(*) AS leaked_events_remaining
FROM week_events e
JOIN event_groups g ON g.id = e."groupId"
WHERE g."userId" <> e."userId";

--    b) users with calendar events but no General bucket:
SELECT COUNT(*) AS users_missing_general
FROM users u
WHERE EXISTS (SELECT 1 FROM week_events e WHERE e."userId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM event_groups g WHERE g."userId" = u.id AND g.kind = 'general');

COMMIT;
