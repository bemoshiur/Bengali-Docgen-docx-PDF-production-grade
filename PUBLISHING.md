# Publishing

The packages are published to **GitHub Packages** under your `@bemoshiur` scope:

- `@bemoshiur/lipi`
- `@bemoshiur/lipi-fonts`

(`lipi` is already taken on the public npm registry, so we use the scoped name.)

## Automated — recommended (no personal token needed)

`.github/workflows/publish.yml` publishes both packages using the Actions
built-in `GITHUB_TOKEN` (which has `packages: write` for this repo). It runs:

- automatically when you **publish a GitHub Release**, and
- on demand: **Actions → "Publish to GitHub Packages" → Run workflow**, or
  `gh workflow run publish.yml`.

Bump the `version` in both `packages/*/package.json` before republishing — a
version that already exists will be rejected.

## Making the packages public

GitHub Packages published from a public repo are associated with it, but you may
need to confirm visibility once: repo → **Packages** (right sidebar) → each
package → **Package settings** → set visibility to **Public** if it isn't.

Note: even public GitHub Packages require the installer to authenticate to
`npm.pkg.github.com`. For a truly no-auth download, use the **release tarballs**
attached to each GitHub Release (`npm install ./bemoshiur-lipi-*.tgz`).

## Installing from GitHub Packages (consumers)

```bash
# .npmrc in the consumer project
@bemoshiur:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN   # needs read:packages

npm install @bemoshiur/lipi @bemoshiur/lipi-fonts
```

## Manual publish (if you prefer, needs a write:packages token)

```bash
export NODE_AUTH_TOKEN=ghp_xxx        # a GitHub token with write:packages
pnpm build
pnpm --filter @bemoshiur/lipi-fonts publish --no-git-checks
pnpm --filter @bemoshiur/lipi publish --no-git-checks
```

## Publishing to public npm instead

If you later want the frictionless public-npm experience, pick an available name
(`bangla-docgen` was free at last check) or keep `@bemoshiur/lipi`, run
`npm login`, set `publishConfig.registry` back to the default npm registry, and
`pnpm -r publish`.
