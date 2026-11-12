# Development

## Prerequisites

- Node `^22.22.2`, `^24.15.0`, or `>=26.0.0`; see the package engine constraint.
- npm and a current Chrome/Chromium browser.
- Chrome 120+ is the build target, not a claim that every ChromeOS device or
  enterprise policy supports installation. Validate the actual target tablet.

Use the existing lockfile for repeatable installations:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

No environment variables, credentials, service accounts, cloud resources, or
external application services are required.

## Commands

| Command                                                        | Purpose                                          |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `npm run dev`                                                  | Development server; no service worker            |
| `npm run typecheck`                                            | Strict application, test, and Vite-config checks |
| `npm run lint`                                                 | Type-aware ESLint; warnings fail                 |
| `npm run test`                                                 | Single-run Vitest suite                          |
| `npm run test:watch`                                           | Interactive test development                     |
| `npm run build`                                                | Type checking and production PWA build           |
| `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` | Local production preview                         |
| `npm run format`                                               | Format source and documentation                  |
| `npm run format:check`                                         | Check formatting without editing                 |

The supplied reference plan is excluded from Prettier so its content is preserved.
Generated output and dependencies are ignored by both version control and format
checks. Stop local servers with Ctrl+C in their own terminal; do not terminate
other projects' processes.

## Dependencies and reasons

### Runtime

- `react`, `react-dom`: UI rendering.
- `react-router-dom`: browser-history navigation.

### Build and quality

- `vite`, `@vitejs/plugin-react`: development and production bundling.
- `typescript`, React/DOM/Node type packages: strict type checking.
- `vite-plugin-pwa`: local manifest, service-worker generation, and registration.
  Workbox packages arrive transitively; there is no custom caching framework.
- `eslint`, `@eslint/js`, `typescript-eslint`, `globals`: type-aware linting.
- `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`: React correctness
  and development-refresh rules.
- `prettier`, `eslint-config-prettier`: formatting without conflicting lint rules.
- `vitest`, `jsdom`: component/hook tests in a browser-like environment.
- `@testing-library/react`, `@testing-library/dom`,
  `@testing-library/jest-dom`, `@testing-library/user-event`: accessible UI
  assertions and interactions.

The current Vite template supplied Oxlint and TypeScript 7. Oxlint was replaced
with the requested ESLint toolchain. TypeScript is pinned to the 6.0 release line
because the installed `typescript-eslint` supports TypeScript versions below 6.1,
not TypeScript 7. Both application and build configs explicitly enable strict
checking; no `any`, lint suppressions, or forced peer-dependency installation are
used to bypass compatibility.

`fake-indexeddb`, `idb`, OpenCV, ZXing, and Tesseract are intentionally not installed.

### Dependency audit

At initial installation, `npm audit --omit=dev` reported zero vulnerabilities.
The full development tree reported 15 advisories (13 moderate, 2 low) through
lint/build dependencies including minimatch, glob, and deepmerge. No high or
critical advisories were reported. npm's suggested fixes included major-version
downgrades; no `--force` fix or untested transitive override was applied.

Re-run both audit commands before distributing a release and reassess upstream
fixes. This is a point-in-time dependency check, not a security certification.
Keep development servers on loopback unless explicitly testing another device.

## Configuration

`src/config/appConfig.ts` exposes the app name, build-injected package version,
default display unit, current milestone, developer mode, and disabled feature
flags. `src/config/featureFlags.ts` does not enable unfinished functionality.
The settings screen reads these defaults but does not persist or edit them.

## Assets

`public/icons/icon.svg` is the vector artwork. The 192- and 512-pixel PNGs are
bundled locally; the maskable icon has a full background and its box mark fits
inside the central safe region. The PNGs were rasterized with Windows
System.Drawing, without adding an asset-generation dependency. When changing the
mark, regenerate the raster sizes and recheck mask cropping.

No stock images, remote fonts, icon CDN, or external style library is used.

## Hosting

The production files are in `dist/`. Serve that directory at the origin root
through an organization-approved HTTPS static host:

1. Serve real asset files and `/sw.js` as files, with appropriate MIME types.
2. Rewrite unknown application navigation paths to `/index.html` (not an HTTP 404).
3. Serve the manifest as `application/manifest+json` or an equivalent valid JSON MIME type.
4. Do not give `sw.js` or `index.html` immutable, long-lived cache headers. Hashed
   JS/CSS assets can be cached immutably.
5. Keep `/` as the scope/base for this milestone. Subpath deployment needs an
   explicit, coordinated Vite base, router basename, and manifest/worker change.

Do not expose the Vite preview server as a production service. No hosting provider
has been provisioned or deployment performed.

`http://127.0.0.1:4173` on the developer machine is a secure-context exception.
`http://<PC-LAN-IP>:4173` on a tablet is not; it cannot validate PWA installation.
Use trusted HTTPS, or a permitted ChromeOS Linux development environment with
ChromeOS localhost port forwarding. Do not disable browser security to bypass
this requirement.
