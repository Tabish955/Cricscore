# Apply the website profile repair

Website baseline: main 565e7ec. This patch does not change dependencies or the
scorecard rendering component. It replaces the old match-only player notice
with a separately fetched personal profile and available career coverage.

API PR12 is already in production, so this UI patch can be applied now. Kusal
Perera's biography/career data additionally requires the new API PR13 to be
approved, merged and its production deployment verified. The candidate PR13
endpoint was read live and returns Kusal's biography and career tables with
ESPN300631 and Cricbuzz8116 kept separate. Coverage is FIVE reviewed players,
not all cricketers: Kohli, Williamson, Dhoni, Gill and Perera. Other player
personal details can load while career data remains explicitly unavailable.

## Apply locally (PowerShell)

First run the supplied transfer script to create Downloads/website-repair.zip.
That script only creates the ZIP and verifies SHA256; it does not edit your code.
Back up local uncommitted changes to these files before extraction.

```powershell
Set-Location -LiteralPath 'D:\CricScore\Cricscore'
git status --short
Expand-Archive -LiteralPath "$HOME\Downloads\website-repair.zip" -DestinationPath 'D:\CricScore\Cricscore' -Force
npm run typecheck
npm test
npm run build
```

Only after those checks pass and you have reviewed the changes:

```powershell
git add -- src/components/PlayerCareer.tsx src/components/PlayerObserved.tsx src/lib/api/allowlist.ts 'src/app/players/[provider]/[id]/page.tsx' tests/player-career.test.tsx docs/APPLY-WEBSITE-REPAIR.md
git diff --cached --stat
git commit -m "Display verified player profiles separately from match performance"
git push origin main
```

## Confirm the website release

Wait for the website deployment for your new commit. Open player ESPN300631
from match1557451. A 'Player profile' section must appear above 'Match
performance', and the old 'does not currently request biography' sentence must
be gone. After API PR13's production release, expand 'Read biography from
Cricbuzz' and check career tables. If the old notice remains, inspect the website
commit/deployment rather than repeatedly merging API changes.

Website candidate: TypeScript pass, 203 tests / 23 files pass, production build
pass. No browser visual regression or production website verification is claimed.
The independent scorecard fallback repair has 76 passing API tests; the exact
reported match currently returns detailed rows in both production and candidate.
Other missing-scorecard reports still need their exact website/match URLs.
