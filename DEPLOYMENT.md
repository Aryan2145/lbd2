# Deploying LBD with GHCR + EC2

The flow is the same one V2E uses:

```
  you push to master  ─▶  GitHub Actions builds the images  ─▶  pushes them to GHCR
                                                                     │
                                     EC2 pulls the images  ◀─────────┘
                                     and runs them with docker compose
```

You build **once** in GitHub's cloud. EC2 never builds — it only pulls and runs.
That removes the long, memory-hungry `docker compose build` on the box, and with
it the "I pushed a fix but prod still shows the old code" class of problem.

## How LBD differs from V2E

V2E ships two images (`backend`, `frontend`). **LBD ships one image that contains
both apps**, run side by side by pm2 (`ecosystem.config.js`). So the build matrix
is over **environments**, not components:

| Image tag                              | Serves                          | Ports on EC2 |
| -------------------------------------- | ------------------------------- | ------------ |
| `ghcr.io/aryan2145/lbd2:production`     | lbd.rgbindia.com                | 3100, 4100   |

**Production only.** Staging is defined in the source-build `docker-compose.yml`
but has never run on the box, so CI doesn't build it. To add it later, append the
staging entry to the workflow matrix and re-add the `lbd_staging` service to
`docker-compose.deploy.yml` (ports 3101/4101, `env_file: .env.staging`).

Note `NEXT_PUBLIC_API_URL` is compiled into the browser bundle at build time, so
each environment needs its own build — one image cannot serve both. Every run
also publishes a `:production-<sha>` tag, so you can roll back to an exact commit.

---

## Part A — Push, and watch it build

1. Merge to `master` and push. The workflow also has a **Run workflow** button in
   the Actions tab if you want to rebuild without a code change.
2. Repo on GitHub → **Actions** → *"Build & push images"*. First run is slow (no
   cache); later runs reuse the GitHub Actions layer cache.
3. When it's green, the images are in GHCR under the repo's **Packages**.

---

## Part B — Let EC2 pull from GHCR (one-time)

Private GHCR images need a login. On EC2 you log in **once** with a GitHub token.

1. **Create a token** (github.com): Settings → Developer settings →
   **Personal access tokens** → **Tokens (classic)** → Generate new token (classic).
   Give it the **`read:packages`** scope only. Copy it (starts with `ghp_...`).

2. **SSH into EC2 and log Docker in to GHCR:**
   ```bash
   echo "ghp_YOUR_TOKEN_HERE" | docker login ghcr.io -u Aryan2145 --password-stdin
   ```
   `Login Succeeded` is saved to `~/.docker/config.json`, so this is a one-time
   step (until the token expires).

> **Already done on the current EC2 box.** V2E logged in there, and the login is
> per-registry rather than per-repo, so LBD is covered. You only need this again
> on a new box, or when the token expires.

---

## Part C — Set up the app on EC2 (one-time)

1. **Get the run-files on the box.** `docker-compose.deploy.yml` and `deploy.sh`
   are in the repo, so pulling the repo on EC2 is enough. The checkout lives at
   `/home/ec2-user/lbd` (note: `lbd`, not `lbd2`):
   ```bash
   cd /home/ec2-user/lbd && git pull
   chmod +x deploy.sh
   ```

2. **Env files must sit next to `docker-compose.deploy.yml`:** `.env.production`
   and `.env.staging` (see `.env.example`). These are *not* in git and are *not*
   baked into the image — `.dockerignore` excludes `**/.env*` deliberately.

3. **The encryption key stays a host file.** Production bind-mounts
   `/etc/secrets/encryption.key` read-only, exactly as before. Make sure it's
   still there, or the backend will fail to decrypt.

Ports, env files and the key mount are unchanged from the old build-on-the-box
compose file, so **Caddy, the RDS security group and DNS need no changes**.

---

## Part D — Deploying (every time)

```bash
cd /home/ec2-user/lbd
./deploy.sh                  # every service in the deploy compose
./deploy.sh lbd_production   # just production
```

It pulls, recreates the containers with `--force-recreate`, prunes dangling
images, and prints status. The force-recreate matters: the `:production` tag
*moves*, and without it Docker can leave the old container running — which looks
exactly like a failed deploy.

**Watch disk on the first run.** The box sits around 80% full (~3 GB free) and
also hosts V2E, Hospital, Boiler and gbdwebinar. Pulling adds a ~760 MB image
while the old locally-built one is still on disk. If the pull fails for space:

```bash
docker image prune -af      # removes unused images, not just dangling
docker builder prune -af    # build cache is dead weight now that CI builds
```

The old `lbd-lbd_production` image is only reclaimed once nothing references it,
so run the prune *after* the first successful deploy.

### Rolling back

Every run also pushes a commit-pinned tag. **It uses the full 40-character SHA**
(`github.sha`), not the 7-character short form — `:production-b680c35` does not
exist, `:production-b680c357f19cb1878d0333a0514cb767fb90a121` does. Grab it with
`git rev-parse <short-sha>`, or copy it from the Actions run.

```bash
SHA=$(git rev-parse <good-short-sha>)          # full 40 chars
docker pull  ghcr.io/aryan2145/lbd2:production-$SHA
docker tag   ghcr.io/aryan2145/lbd2:production-$SHA ghcr.io/aryan2145/lbd2:production
docker compose -f docker-compose.deploy.yml up -d --force-recreate lbd_production
```

Retagging locally is enough — `deploy.sh` would pull `:production` again and undo
it, so for a lasting rollback either revert the commit on `master` or keep
deploying by explicit tag.

---

## Database changes

**`deploy.sh` does not touch the database.** LBD has no Prisma migrations folder —
schema changes are applied by hand (see `backend/prisma/manual/`). If an image
expects a new column, run that SQL against RDS **before** deploying it.

Do not reach for `prisma db push` on a live DB: the local schema has drifted from
production, and push will happily drop what it doesn't recognise.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `docker compose pull` → `denied` / `unauthorized` | Redo Part B — token needs `read:packages`, then `docker login ghcr.io` again. |
| Changed code but EC2 shows the old version | Either the Actions build hasn't finished, or you didn't run `./deploy.sh`. Check the Actions tab first. |
| Container restarts in a loop | `docker compose -f docker-compose.deploy.yml logs lbd_production`. Usually `DATABASE_URL`, a missing env var, or the encryption key not mounted. |
| API calls fail from the browser | `NEXT_PUBLIC_API_URL` is baked at build time. If the API domain changed, update it in `.github/workflows/deploy-images.yml` and rebuild — editing it on the box does nothing. |
| Disk full on EC2 | `docker image prune -af` and `docker builder prune -af`. Pulling instead of building keeps this much rarer than it used to be. |
