# Deploying Cricline on Vercel

Everything in the repo is ready: Next.js auto-detect (`vercel.json`), Node 20
(`.nvmrc` + `engines`), no secrets required, proxy route requests `maxDuration = 60`,
`.next`/env files ignored.

## One-time setup (≈ 5 minutes)

1. **Push the branch** (already pushed by whoever maintains the repo):
   ```bash
   git push origin arena/74df8e59-cricscore
   ```
2. Go to <https://vercel.com/new>, **Import Git Repository**, pick `Tabish955/Cricscore`.
   - Framework preset: **Next.js** (detected; do not override).
   - Root directory: repo root.
   - Build/Install commands: defaults (`next build`, `npm install` → uses `package-lock.json`).
3. **Environment variables** (optional, Project → Settings → Environment Variables):
   | Name | Value | When to set |
   | --- | --- | --- |
   | `CRICKET_API_BASE` | `https://cricketapi-beryl.vercel.app` | Only if you self-host a compatible backend. The default is already compiled into the app. |
   No API key exists for this upstream – do not add fake ones.
4. Deploy. Vercel assigns `https://<project>.vercel.app` (+ optional custom domain).

## Tracking every change

Once imported, **every push to any branch creates a preview deployment**, and every push to
`main` updates production. Practical workflow for this project:

- Feature work lands on `arena/74df8e59-cricscore` (or PRs from it → `main`).
- Open a PR into `main`; Vercel posts a **preview URL on the PR** – click it to see the change
  rendered, with build logs for that commit.
- Merging to `main` promotes to production automatically.
- `vercel.json` pins the framework; `.nvmrc` pins Node 20; `package-lock.json` pins deps –
  the deploy is reproducible from the commit hash alone.

CLI alternative (needs your own Vercel auth – never paste tokens into chat):

```bash
npm i -g vercel
vercel link          # pick the project
vercel deploy        # preview from this branch
vercel deploy --prod # production (main only)
```

## What to verify after the first deploy

1. `/api/cricket/health` returns upstream health JSON (requires network egress from Vercel –
   it has it; your laptop sandbox did not).
2. `/about` → **Source diagnostics** → Health & Sources buttons both show success.
3. `/` → Live tab shows real matches; badges show provider provenance.
4. Hard-reload a `/match/...?league=&date=` URL – league/date survive.
5. If the upstream is unreachable from your classroom network, flip **Sample mode** ON and
   present the amber banner – see `docs/DEMO-SCRIPT.md` §0.

## Known deploy notes

- **Function duration:** upstream cold starts can exceed 10 s. The proxy sets
  `maxDuration = 60`, which fits Hobby (60 s cap) and Pro. On self-hosted or other platforms
  the export is ignored.
- **No database, no cron, no KV** – nothing else to provision. Persistence is browser
  localStorage by design.
- **Educational use only** – do not publish a hosted instance commercially; commercial use is
  prohibited by the project's terms (see About page + README).
- Preview deployments of *public* repos are public by URL. This repo is your responsibility;
  don't hand the URL out as a "live cricket service" – it is a school project demo.
