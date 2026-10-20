# CI/CD — automated build & deploy

`.github/workflows/deploy.yml` builds the web app and deploys `app-web` to the VPS on every push to `main` (or manual "Run workflow"). It replaces the manual tar → scp → `_deploy.sh` loop.

## Pipeline
1. **Build gate** — `npm ci`, `prisma generate`, `next build`. If the build fails, nothing deploys.
2. **Deploy** — tars the repo (excluding `node_modules`, `.next`, `.git`, `.env`, `mobile`), scps it to the VPS, extracts into `/var/www/app`, and runs `_deploy.sh` (which rebuilds + recreates `app-web`), then tails the deploy log.

## One-time setup (you)

### 1. Create a deploy SSH key
On your machine:
```bash
ssh-keygen -t ed25519 -f app-deploy-key -N "" -C "github-actions-deploy"
```
Add the **public** key to the VPS so Actions can log in:
```bash
ssh vps 'cat >> ~/.ssh/authorized_keys' < app-deploy-key.pub
```

### 2. Add two GitHub repo secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
- **`VPS_SSH_KEY`** — the full contents of the **private** key file `app-deploy-key` (begins `-----BEGIN OPENSSH PRIVATE KEY-----`).
- **`VPS_HOST`** — `203.0.113.10`

Then delete the local key files. Never commit the private key.

### 3. Enable it
The workflow is already committed. Push to `main` (or use **Actions → Build & Deploy → Run workflow**) and it deploys automatically.

## Notes
- `mobile/` is excluded from the deploy (native app, not part of `app-web`).
- Only `app-web` is rebuilt by `_deploy.sh`. Service changes (billing/engagement) still deploy via their own recreate — extend `_deploy.sh` if you want those in CI too.
- The build gate uses a dummy `DATABASE_URL`; real secrets live in the server `.env` and are never in CI.
