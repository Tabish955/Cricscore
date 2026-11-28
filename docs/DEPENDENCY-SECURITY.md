# Website dependency remediation

Baseline: GitHub commit 837aa0d (the previously applied player-page patch).
This update does not add biographies, portraits or career statistics.

## Changes

- Upgrade Vitest 3 to patched Vitest 4.1.12 or later within major 4.
  This removes the reported vulnerable test/mocking dependencies, including
  the old tinypool dependency. It is not a production data-source change.
- Upgrade Zod 3 to patched Zod 4.6.7 or later within major 4.
  Explicit string-key schemas were added to the two z.record calls.
  Existing normalization/proxy/scorecard tests remain unchanged and pass.
- Override only Next's PostCSS dependency to ^8.5.34. Next remains 15.5.29
  in the lockfile; this is not a Next 16 migration. Revisit/remove the override
  when a future Next release already uses a patched compatible PostCSS.
- Pin Vite's major to 7 via a direct development dependency, which is supported
  by Vitest 4 and retains the existing esbuild JSX config. Vite 8 changes that
  config surface, so no untested Vite 8 migration is included.
- Document the effective Node minimum: ^20.19.0 || >=22.12.0, matching Vite 7.
  The existing .nvmrc requests Node 22.

The regenerated lockfile also refreshes compatible versions within existing
ranges. Do not apply npm audit fix --force on top of this patch.

## Local verification

Node 22.22.3, npm 11.19.0 for lockfile installation:

```
npx --yes npm@11.19.0 ci --ignore-scripts
npm run typecheck
npm test
npm run build
npm audit
```

- 197 tests pass (22 files).
- TypeScript passes.
- Next production build passes.
- npm audit: 0 known vulnerabilities in the resolved graph at verification time.

This is a registry-audit snapshot, not a claim that the software is vulnerability
free. No browser visual regression check or Vercel deployment is claimed.
No install-script approval was needed for these checks. If a different platform
needs an esbuild install script, review that specific package through npm's
install-script controls rather than enabling all scripts blindly.

npm 10 in the agent environment hit an edgesOut installer error during dependency
resolution. npm 11.19.0 (the user's reported version) successfully installed the
lockfile. Use the tested npm version rather than deleting the lockfile.

## Deployment

Only apply to the Cricscore website repository, after pulling the previously
pushed player-page update. Review the four changed files, test, then commit and
push there. The API repository and its deployed schema are unaffected.
