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
- `zxing-wasm`: on-device barcode reading (WebAssembly, about 0.9 MB). Its
  default CDN download is overridden so the bundled copy is used offline.
- `tesseract.js`: on-device text recognition. Only its worker file is shipped
  from this package; the engine and language data come from the two packages
  below. It is loaded on demand, not in the main bundle.

### Build and quality

- `vite`, `@vitejs/plugin-react`: development and production bundling.
- `typescript`, React/DOM/Node type packages: strict type checking.
- `vite-plugin-pwa`: local manifest, service-worker generation, and registration.
  Workbox packages arrive transitively; there is no custom caching framework.
- `@tesseract.js-data/eng`: the English language data (`4.0.0_best_int`, 3 MB).
  It is a development dependency because `vite-plugins/ocrAssets.ts` copies it
  into `dist/ocr/` at build time; the browser never installs it.
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

`fake-indexeddb`, `idb`, and OpenCV are intentionally not installed: nothing is
stored, and the one image-processing step (deskew) is a small canvas
implementation in `src/services/image/deskew.ts`.

### Dependency audit

`npm audit --omit=dev` reports zero vulnerabilities, including after adding
`tesseract.js` and `zxing-wasm`. The full development tree reports 15 advisories
(13 moderate, 2 low) through lint/build dependencies including minimatch, glob,
and deepmerge. No high or critical advisories were reported. npm's suggested
fixes included major-version downgrades; no `--force` fix or untested transitive
override was applied.

Re-run both audit commands before distributing a release and reassess upstream
fixes. This is a point-in-time dependency check, not a security certification.
Keep development servers on loopback unless explicitly testing another device.

## Configuration

`src/config/appConfig.ts` exposes only the app name and the build-injected
package version. There are no feature flags, environment variables, or stored
settings.

## Assets

`public/icons/icon.svg` is the vector artwork. The 192- and 512-pixel PNGs are
bundled locally; the maskable icon has a full background and its box mark fits
inside the central safe region. The PNGs were rasterized with Windows
System.Drawing, without adding an asset-generation dependency. When changing the
mark, regenerate the raster sizes and recheck mask cropping.

The OCR worker, core, and language data are not in `public/`; they are resolved
from `node_modules` and served or emitted under `/ocr/` by
`vite-plugins/ocrAssets.ts` (see [the architecture notes](./ARCHITECTURE.md#ocr-asset-hosting)).

No stock images, remote fonts, icon CDN, or external style library is used.

## Hosting

The production files are in `dist/` (about 8 MB, nearly all of it precached on
the first visit). Serve that directory at the origin root through an
organization-approved HTTPS static host:

1. Serve real asset files and `/sw.js` as files, with appropriate MIME types
   (`.wasm` as `application/wasm`, `.js` as JavaScript).
2. Rewrite unknown application navigation paths to `/index.html` (not an HTTP 404).
3. Serve the manifest as `application/manifest+json` or an equivalent valid JSON MIME type.
4. Do not give `sw.js` or `index.html` immutable, long-lived cache headers. Hashed
   JS/CSS assets can be cached immutably. Files under `/ocr/` are not hashed, so
   do not mark them immutable either.
5. Keep `/` as the scope/base. Subpath deployment needs an explicit, coordinated
   Vite base, router basename, manifest, worker, and `/ocr/` path change.

Do not expose the Vite preview server as a production service. No hosting provider
has been provisioned or deployment performed.

The live camera (`getUserMedia`) only works on a secure context. This is a hard
browser rule, not an app setting:

- `http://127.0.0.1:4173` on the developer machine is a secure-context exception.
- `http://<PC-LAN-IP>:4173` on a tablet is not. The camera button reports that the
  page is not secure; only the choose-a-photo path works, and PWA installation
  is not possible.
- Use trusted HTTPS, or a permitted ChromeOS Linux development environment with
  ChromeOS localhost port forwarding. Do not disable browser security to bypass
  this requirement.
