# CargoVision architecture

## Scope

The [reference plan](./CARGOVISION_PLAN.md) describes six milestones for a full
inspection product. The approved scope is much smaller: a basic camera app that
**reads labels** and **measures packages**, entirely on the device. Nothing is
stored (no IndexedDB, history, or records), nothing is uploaded, and there is no
account. The rest of the plan is not approved and must not be built without
explicit approval.

```text
main.tsx
  StrictMode + BrowserRouter
    App
      ErrorBoundary
        AppShell
          AppHeader + OnlineIndicator
          offline/update notifications
          AppRoutes -> Home | ReadLabel | Measure | About | NotFound
          footer + controlled ConfirmDialog (app updates)
```

React Router uses browser-history URLs. Pages are eagerly imported so the app is
one precached unit. The two reading engines are loaded on demand, and both are
in the precache: zxing-wasm when the first barcode is read, and the Tesseract.js
worker when the Read label page opens (`warmUpOcr`) or the first text is read.

| Location                    | Responsibility                                                            |
| --------------------------- | ------------------------------------------------------------------------- |
| `src/app/`                  | Shell, routes, application error boundary                                 |
| `src/pages/`                | Home, Read label, Measure, About, 404                                     |
| `src/components/`           | Reusable, accessible presentation components, including `CameraCapture`   |
| `src/config/`               | App name and build-injected version                                       |
| `src/hooks/`                | Camera stream, captured-photo lifetime, connection events, PWA lifecycle  |
| `src/services/camera/`      | Turns camera failures into plain-language problems                        |
| `src/services/image/`       | Photo decoding, rotation, scaling and capture; deskew                     |
| `src/services/vision/`      | Barcode reading, OCR, and the `readLabel` pipeline                        |
| `src/services/labels/`      | Pure label interpretation: AWB, airlines, quantities, handling, DG notice |
| `src/services/measure/`     | Pure measurement geometry and reference presets                           |
| `src/services/units.ts`     | Length and weight conversions                                             |
| `src/services/app/`         | Browser reload recovery                                                   |
| `src/styles/`               | One global token file and minimal global styles                           |
| `vite-plugins/ocrAssets.ts` | Serves (dev) and emits (build) the OCR engine files under `/ocr/`         |
| `public/icons/`             | Local SVG and installable raster/maskable icons                           |

CSS Modules own component styles. Semantic CSS tokens define the navy, blue,
light-card, and status palette. System font fallbacks avoid font downloads.
No ORION component package is introduced; the app follows the requested
React/CSS Modules stack.

## Routes

- `/`: the two actions, and live offline readiness.
- `/read`: take or choose a photo, read it, and see the findings.
- `/measure`: take or choose a photo, mark a reference, then mark lengths.
- `/about`: how it works, limits, ChromeOS install steps, and app details.
- Any other path: recoverable NotFound page.

## Reading a label

`readLabel` (`src/services/vision/readLabel.ts`) is the single entry point. The
photo comes from the camera (`imageFromVideo`, which freezes the current frame)
or from the device (`imageFromFile`). Either way it is rotated upright from its
camera orientation, scaled so its longer side is at most 2560 px, and held in
memory as a JPEG.

1. **Barcodes** are read from the photo as taken, using zxing-wasm (up to ten
   symbols). Their text is returned exactly as printed. The library downloads its
   WebAssembly from a CDN by default, which cannot work offline, so the bundled
   copy is used instead.
2. **Deskew** (`src/services/image/deskew.ts`). Tesseract drops the ends of text
   lines that slope, so the photo is turned level first. Ink is found on a copy of
   at most 700 px with a local-mean threshold, and slopes from -15 to +15 degrees
   are scored by how sharply the ink collapses into rows (0.5 degree steps, then
   refined to 0.1). The photo is rotated only when the tilt is at least 0.5
   degrees and the score beats the unrotated one by at least 5%; otherwise the
   original is used. Any failure falls back to the original photo.
3. **Text** is read once, on the levelled copy, with Tesseract.js (English,
   automatic page segmentation, LSTM engine). Merging several passes was tried
   and rejected: the merged texts can contradict each other, and it doubles the
   time.
4. **Interpretation** (`src/services/labels/`) is pure string logic over the text
   and barcodes. It produces `Finding`s, each with a title, a plain-language
   detail, a tone (`ok`, `info`, or `caution`), its sources, and the exact text
   that was matched. Nothing is reported that was not on the label.

If one reader fails, the other's results are still shown with a notice. Retaking
the photo or leaving the page aborts the read and terminates the OCR worker,
because a Tesseract job cannot be cancelled; the next read starts a fresh one.
A mean text confidence below 60% shows a "hard to read" warning.

### What the interpreter recognizes

| Finding         | Rules                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Air waybill     | 3-digit airline prefix, 7-digit serial, 1 check digit, printed as `016-1234 5675`, `016 12345675`, or `01612345675`. The check digit is the serial modulo 7. A barcode counts only when its whole content has this shape and a correct check digit. Text with a bad check digit is shown as a caution only when the prefix is a known airline or "AWB" or "waybill" precedes it. |
| Pieces          | "PIECE 2 OF 5", "PC 2/5", "PKG NO. 2 OF 5", "2 OF 5 PIECES", and counts such as "3 PCS". "PIECE2OF5" and "PIECE20F5" (a zero read for the letter O) are accepted. A position above the total is shown as a caution, never corrected.                                                                                                                                             |
| Weight          | A number with kg or lb (and common spellings), converted to the other unit. Whether it is per piece or the shipment total is left to the person.                                                                                                                                                                                                                                 |
| Dimensions      | Three numbers joined by `X` or, after a word such as DIM, by `/`, with optional in, cm, or mm. Converted between inches and centimetres. Disagreeing units are a caution, and the order printed is never assigned to length, width, or height.                                                                                                                                   |
| Handling        | A fixed glossary: Fragile, Keep upright, Do not stack, Handle with care, Keep dry, Keep cool, Keep frozen, Do not freeze, Keep away from heat, Perishable, Live animals, Human remains, and No hooks. "NON-FRAGILE" and "NO LIVE ANIMALS" are not matched. No temperatures or procedures are invented.                                                                           |
| Dangerous goods | **Not interpreted.** Wording such as FLAMMABLE, LITHIUM, DRY ICE, or `UN3480` produces one neutral notice listing the words found. A leading "NON-" or "NOT" does not suppress it: a missed hazard is worse than an unneeded notice. The notice is listed first.                                                                                                                 |

Digits that look like an air waybill number are masked before piece counts,
weights, and sizes are searched, so their digits cannot be mistaken for those
values. The airline prefix list is compiled from the public listing at
track-trace.com/aircargo; it is partial and not an official IATA source, and an
unrecognized prefix never makes a number wrong.

### Known reading limits

Text recognition runs on a still photo only. Remaining weaknesses, found by
testing generated labels in a desktop browser:

- Lines that slope are the main failure. Deskew fixed most of it on generated
  labels tilted 2 to 4 degrees, but the last characters of a line can still be
  lost, for example "WT 24.5" without its unit.
- Similar characters are confused (`0` and `O`, `5` and `S`). A misread piece
  position such as "20F5" is handled; many others are not.
- Perspective, glare, blur, and rotation beyond 15 degrees are not corrected.
- The text reader needs WebAssembly SIMD. A browser without it shows that text
  reading is unavailable, while barcodes and measuring still work.

## Measuring a package

`src/services/measure/geometry.ts` holds the pure maths. A photo is measured
against a reference of known length: the person marks the two ends of the
reference (a Letter or A4 sheet, a bank card, or a typed custom length), then
marks the two ends of each length to measure (up to six). Millimetres per image
pixel come from the reference, and each length is shown in inches and
centimetres.

- Without a reference there is no scale, and no measurement is shown.
- A reference shorter than 20 image pixels is refused, and one that spans under a
  tenth of the photo's longer side shows a warning, because it magnifies errors.
- Points can be dragged or moved with the arrow keys (Shift for larger steps).
- The method assumes the reference and the measured edge are flat in the same
  plane and the camera looks straight down. Tilt, lens distortion, and a raised
  edge add error, and nothing corrects for it. The page says these are estimates.

## Privacy and data handling

Photos live in memory and as object URLs only. They are released when the photo
is retaken, replaced, or the page is left. Nothing is written to IndexedDB, local
storage, or the cache, and no request carries photo, text, or barcode data.

## Offline lifecycle

`vite-plugin-pwa` generates the manifest and a Workbox service worker at build time.
The worker precaches the built HTML, JavaScript, CSS, manifest, local icons, the
barcode WebAssembly, and the OCR engine files: 21 manifest entries (16 distinct
URLs), about 8 MB in total. Workbox's 2 MiB per-file default is raised to 8 MiB
for the 3.9 MB OCR core and the 3 MB language data. Its navigation fallback is
`/index.html`, allowing cached deep routes to open and reload offline.

- Service workers are disabled in `npm run dev`.
- First installation needs access to the app's own host over HTTPS or loopback HTTP.
- No third-party runtime API, analytics, font, CDN, auth, or model request exists.
- Online/offline text reflects `navigator.onLine`, not a server availability probe.
- "Ready to use offline" requires a successful precache notification or an
  already-active service worker. A network signal alone never implies readiness.
- Installation/registration and update errors are logged and shown with recovery.
- Updates wait for a user-confirmed reload. `skipWaiting` is not automatic.
- Clearing site data or browser storage eviction can remove cached assets.

App-asset requests are necessary to install and update a PWA. "No external calls"
means no external application services; it does not mean a zero-request first
installation, which downloads about 8 MB.

### OCR asset hosting

Tesseract.js loads its worker, WebAssembly core, and language data by URL at run
time, and the language file must be named `eng.traineddata.gz` inside a
directory. Hashed bundler URLs cannot satisfy that, so `vite-plugins/ocrAssets.ts`
serves (development) and emits (build) three files at the fixed `/ocr/` path,
resolved from `node_modules`:

| File                                   | Size   | Origin                                      |
| -------------------------------------- | ------ | ------------------------------------------- |
| `ocr/worker.min.js`                    | 111 KB | `tesseract.js`                              |
| `ocr/tesseract-core-simd-lstm.wasm.js` | 3.9 MB | `tesseract.js-core` (SIMD, LSTM-only build) |
| `ocr/eng.traineddata.gz`               | 3.0 MB | `@tesseract.js-data/eng` (`4.0.0_best_int`) |

`ocr.ts` points Tesseract at those URLs instead of its default CDN locations,
turns off its IndexedDB language cache (`cacheMethod: 'none'`, so nothing is
stored outside the service worker precache), and loads the worker from its URL
rather than a blob (`workerBlobURL: false`) so the service worker can serve every
request. `vite preview` sends the `.gz` file with `Content-Encoding: gzip`, and
Tesseract detects gzip by its magic bytes, so a host may serve it either way.

Verified in a desktop Chromium browser: after installing the production build on
a fresh origin, with the server stopped, `/read`, `/measure`, `/about`, and an
unknown path all reloaded, and a label photo was read with all six expected
findings.

## Accessibility and error handling

Interactive controls have at least a 44 x 44 CSS-pixel target; primary buttons are
at least 52 pixels tall. Status messages use text and icons, not color alone.
Navigation provides a skip link, active-page indication, heading focus, and page
titles. Reduced-motion preferences are respected.

Confirmation uses a native modal dialog with an accessible name and description,
a safe Cancel default, and Escape cancellation. The caller controls its open
state. Rendering failures are caught by the top-level error boundary, logged, and
shown with reload and home-screen recovery actions. Camera failures (permission
denied, no camera, camera in use, insecure context) are turned into plain
language with a way forward, and choosing a photo from the device always works
as an alternative to the live camera.

## Decisions

- **Measuring uses a reference object.** A single photo has no depth, so a scale
  is only trustworthy when something of known size lies in the same plane. No
  pixel-to-unit conversion happens without one.
- **Everything runs on the device.** Barcodes and text are read locally, so the
  app works without a connection and shipment data never leaves the tablet.
- **Dangerous goods are not interpreted.** Wrong guidance is worse than none, so
  only a neutral notice is shown. Adding a glossary needs a reviewed source.
- **Barcodes are shown as scanned.** Only a complete, correctly checksummed
  air waybill barcode is interpreted; everything else stays a raw barcode.
- **Nothing is invented.** Findings only restate text that was on the label, and
  inconsistent values (a piece 20 of 5, a bad check digit) are flagged for a
  person to compare rather than silently corrected.
- **Nothing is stored.** Inspection records, history, and export from the
  reference plan are not built. Adding storage needs explicit approval and a
  design for how machine readings and human corrections are kept apart.

No further scope is approved without explicit approval.
