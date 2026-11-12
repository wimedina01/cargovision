# Testing

## Required gates

Run all four from the project root after every change:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

`npm run test` terminates after one run; it does not leave a watcher running.
`npm run format:check` is an additional formatting check.

## Automated coverage

203 tests in 20 files at the last full run.

- **Label interpretation** (`services/labels`): air waybill parsing, check digits,
  and airline prefixes; piece, weight, and dimension formats, including OCR
  confusions such as `PIECE20F5`; handling terms and their negations; the neutral
  dangerous-goods notice; finding order and ids.
- **Measurement** (`services/measure`): scale from a reference, unit conversion,
  pointer-to-photo mapping, and tiny or short references.
- **Image services** (`services/image`): scaling and orientation; deskew against
  synthetic pages with a known tilt (0, 3, -4, 8, and -12 degrees), a blank page,
  and every fallback to the original photo.
- **Reading engines** (`services/vision`), with zxing-wasm and Tesseract mocked:
  reader reuse and retry after a failed load; progress; cancelling a read and
  starting a fresh worker; a browser without WebAssembly SIMD; and `readLabel`
  itself (barcodes read from the original, OCR on the levelled copy, aborting
  before OCR starts, and one reader failing while the other still reports).
- **Camera** (`services/camera`, `useCamera`, `CameraCapture`): blocked,
  missing, busy, stopped, and insecure-context problems; rear-camera preference;
  switching cameras; turning the camera off when it is not needed; the
  choose-a-photo alternative; releasing a photo that arrives after leaving.
- **Pages** (`ReadLabel`, `Measure`): plain-language findings with the matched
  text; progress; doubtful-reading and nothing-recognized warnings; retaking and
  stale results; reference choice and custom length; undo, clear all, keyboard
  placement, nudging, dragging, and the measurement limit.
- **Shell and PWA** (`App`, `ErrorBoundary`, `usePwaStatus`, `OnlineIndicator`,
  `ConfirmDialog`): routes, focus and titles, unknown-route recovery, About copy
  that promises nothing the app does not do, offline readiness waiting for
  precaching, failures with recovery, and confirmed updates.

Vitest tests run with two workers to keep local resource use bounded. Browser
APIs are isolated behind hooks/services. Service-worker registration is mocked in
unit tests; those tests do not prove real offline behavior.

jsdom does not implement canvas, `createImageBitmap`, `mediaDevices`,
`URL.createObjectURL`, native modal dialogs, or window scrolling, so tests mock
or shim them. The real camera, canvas deskew, zxing-wasm, Tesseract, focus
trapping, installation, and offline navigation are therefore covered only by the
browser and device checks below.

## Production browser checks

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Emulating Offline in DevTools or an automation tool does not always cover a
service-worker-controlled page. The most dependable offline check is to stop the
preview server and reload.

1. Open `http://127.0.0.1:4173` in Chrome. Use a new browser profile or an origin
   the app has not been used on (for example `http://localhost:4173`) when testing
   first installation; do not clear unrelated sites' data. Do not clear Cache
   Storage behind a live service worker: the old worker keeps running and the new
   build waits for a reload.
2. Wait for **Ready to use offline** on the home screen. In DevTools >
   Application, an activated service worker and a precache of 16 distinct URLs
   must exist: the CSS, four JavaScript chunks, the ZXing `.wasm` and its
   loader, four icons, `index.html`, the manifest, and the three `/ocr/` files.
3. Read a label: open **Read label**, choose a test label photo, and compare every
   finding with the label (see "Test labels" below).
4. Stop the preview server (Ctrl+C in its terminal). Reload `/read`, `/measure`,
   `/about`, and a made-up path such as `/nope`. Each must render, the made-up
   one as the app's NotFound page. Read the label again: the result must match
   step 3.
5. Open **Measure** and check a known object (see "Measurement check").
6. At landscape 1280 x 800, portrait 800 x 1280, and narrow 360 x 800 CSS-pixel
   viewports, inspect for clipping/overlap and horizontal page overflow. Check
   every visible link/button target is at least 44 x 44 CSS pixels.
7. Use Tab/Shift+Tab and the skip link. Verify focus visibility, sensible ordering,
   current navigation indication, and keyboard access to the measurement points.
8. Check the Network panel: assets originate only from this app; no external
   API, telemetry, font, model, or image request is made, and no request
   carries photo, text, or barcode data.

### Test labels

Any printed or on-screen label with these lines works. The air waybill barcode is
Code 128 containing `01612345675` (1234567 modulo 7 is 5, so the check digit is
correct):

```text
AWB 016-1234 5675
PIECE 2 OF 5
WT 24.5 KG
DIM: 48 X 40 X 36 CM
FRAGILE
THIS SIDE UP
```

Expected findings: Air waybill 016-12345675 (United Airlines, check digit
correct), Piece 2 of 5, Weight 24.5 kg, Dimensions 48 × 40 × 36 cm, Fragile, and
Keep upright. Also try a label tilted by about 3 degrees; a blank sheet (no
findings, and normally the "hard to read" warning); and a page with the word
FLAMMABLE, which must produce only the neutral "Dangerous goods wording found"
notice. Generated labels read well; real labels with glare, curvature, blur, or
small print will miss details. Each finding shows the label text it came from,
and the full text that was read is listed under the findings, so a person can
always compare.

### Measurement check

Lay a US Letter sheet flat beside a box of known size, photograph straight down,
mark the sheet's 11 in side as the reference, then mark the box edges. A generated
flat image of a 6 x 4 in box beside a Letter sheet measured 6.0 in and 4.0 in.
With a real camera, tilt the camera or raise the box and record how far the
estimate drifts; the app does not correct for either.

### Update behavior

For a manual update test, open a production build, make a visible version/source
change locally, rebuild, and check for a worker update in DevTools. The page must
not reload automatically. **Review update** opens a dialog; Cancel/Escape leaves
the page intact; **Reload and update** applies the waiting worker. Restore any
test-only version/source changes afterwards.

## Exact ChromeOS tablet acceptance steps

### Prepare

1. Build with the required gates above on the development machine.
2. Have the contents of `dist/` served at the root of an organization-approved,
   trusted HTTPS address with SPA navigation rewrites. See
   [hosting requirements](./DEVELOPMENT.md#hosting). Hosting is a prerequisite;
   a developer PC's ordinary HTTP LAN address is insufficient, and the camera
   does not work on it.
3. On the target tablet, use a supported Chrome version and an allowed browser
   profile. Record the tablet model, ChromeOS/Chrome version, and any installation
   policy restrictions.
4. Gather a few real shipping labels (including one with an air waybill number
   and barcode), a sheet of paper or a bank card, and a box of known length with
   a tape measure.

### Install and exercise

5. While connected, open the approved HTTPS address in Chrome.
6. On Home, wait for **Ready to use offline**. The first load downloads about
   8 MB. A green Online connection indicator alone is not enough.
7. Select Chrome's address-bar install icon, or its install-app menu, and install
   **CargoVision**. If policy blocks installation, record the block; do not weaken
   device security settings.
8. Launch CargoVision from the ChromeOS launcher. Confirm it opens in its own
   application window.
9. Open **Read label** and allow the camera when Chrome asks. Confirm the preview
   uses the rear camera (or switch to it), then photograph a label. Compare every
   finding with the label, and check that anything misread is visible in the text
   shown. Repeat with a tilted, a dim, and a glared label and note what is missed
   or wrong. Record how long a read takes on this tablet.
10. Block the camera for the site (Chrome site settings) and confirm the
    explanation appears and **Choose a photo** still works.
11. Open **Measure**. Photograph a box beside the sheet or card, mark the
    reference and then the edges, and compare with the tape measure. Record the
    error for a flat, straight-down photo and for an angled one. Confirm points
    can be dragged accurately with a finger.
12. Rotate into landscape, then portrait. Read the screens at normal working
    distance. No control should overlap, clip, or require precision tapping.
13. Turn off Wi-Fi and any other network connection. Confirm **Offline** is
    visible. Close and reopen the installed app, then read a label and take a
    measurement offline. Open a made-up route and verify recovery through the
    home link.
14. Reconnect and confirm **Online** returns. Confirm no sign-in or
    external-service error appeared, and that the browser's site storage holds
    only the app's offline cache and no photos.

Record pass/fail for each step and attach screenshots for failures. ChromeOS
installation, launcher behavior, enterprise policy, the live camera, reading
speed and accuracy on real labels, physical touch usability, and rotation remain
unverified until these steps are run on the actual tablet.

## After validation

Do not add storage, history, or other features from the reference plan during
validation. Review the recorded results first, then request explicit approval for
any further work.
