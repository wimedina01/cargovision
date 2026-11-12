# CargoVision — Implementation Plan for GitHub Copilot

> Reference specification. Keep this file in the repo at `docs/CARGOVISION_PLAN.md`.
> Copilot builds ONE milestone at a time and stops for approval after each.

---

## 1. Product Objective

CargoVision is a ChromeOS tablet app that uses the rear camera to assist airline cargo acceptance.

Eventually it will:

- Detect a box / cargo piece
- Measure length, width, height
- Count pieces
- Detect labels, scan barcodes, and OCR printed text
- Extract Air Waybill (AWB) and shipment data
- Compare label-printed dimensions with camera-measured dimensions
- Let the employee review and correct every result
- Save inspections locally (Dataverse sync comes later)

**This build has NO Dataverse, Azure, Graph, or Entra ID.** All data stays on the device in IndexedDB.

---

## 2. Technology Stack

Area
Choice

App
React, TypeScript (strict), Vite, PWA (`vite-plugin-pwa`)

Routing
`react-router-dom`

Styling
CSS Modules + one global tokens file

Storage
IndexedDB via `idb`

Tests
Vitest, React Testing Library, `fake-indexeddb`

Quality
ESLint, Prettier

Camera
`navigator.mediaDevices.getUserMedia`, Canvas, `ImageBitmap`

Image processing
OpenCV.js (loaded lazily, run in a Web Worker)

Barcode
`@zxing/library` (or `@zxing/browser`)

OCR
`tesseract.js` (local, worker-based)

Extraction
Plain TypeScript rule-based parsers

Add a dependency only in the milestone that needs it.

---

## 3. Engineering Rules (apply to every milestone)

1. Never fabricate measurements, OCR text, barcode results, detections, or confidence scores.
2. Never convert pixels to inches/mm without a detected calibration reference.
3. Always preserve the original captured image; processed images are stored separately.
4. Store machine-generated values separately from employee-corrected values.
5. OCR, barcode reading, and cargo-data extraction are separate services.
6. Computer-vision code lives in `src/services/`, never inside React components.
7. Every CV/OCR/barcode implementation sits behind an interface so it can be swapped.
8. No secrets, keys, or connection strings in browser code.
9. No network calls to external systems.
10. App must work offline.
11. Touch-first: targets ≥ 44×44 px, readable at arm's length, minimal typing.
12. No placeholder UI that looks like it works when it doesn't. Unavailable = clearly labeled.
13. Don't rewrite working architecture without a stated reason.
14. Do not start the next milestone until told to.

---

## 4. Project Structure

```
src/
  app/            App.tsx, router, providers, ErrorBoundary
  pages/          Home, NewInspection, InspectionHistory, InspectionDetail,
                  Settings, Diagnostics, CameraTest, NotFound
  components/     Button, Card, StatusBanner, LoadingState, EmptyState,
                  ErrorState, ConfirmDialog, AppHeader, OnlineIndicator
  features/
    camera/
    inspection/
    labels/
    measurement/
    settings/
  services/
    camera/       cameraService.ts
    storage/      db.ts, InspectionRepository.ts, ImageRepository.ts,
                  SettingsRepository.ts, CalibrationRepository.ts
    imaging/      crop, perspective, enhance (OpenCV wrappers)
    barcode/      BarcodeService.ts, ZxingBarcodeService.ts
    ocr/          OcrService.ts, TesseractOcrService.ts
    extraction/   awb.ts, airports.ts, pieces.ts, weight.ts, dimensions.ts,
                  extractCargoFields.ts
    measurement/  marker.ts, scale.ts, measureBox.ts
    detection/    PieceDetector.ts (interface only until a model exists)
  models/         inspection.ts, label.ts, measurement.ts, validation.ts
  config/         appConfig.ts, featureFlags.ts
  hooks/          useOnlineStatus.ts, useCamera.ts, useInspection.ts
  workers/        imaging.worker.ts
  styles/         tokens.css, global.css
  test/           setup.ts, fixtures/
public/
  icons/          PWA icons
  data/           airports.json
docs/
  CARGOVISION_PLAN.md   (this file)
  ARCHITECTURE.md
  DEVELOPMENT.md
  TESTING.md
.github/
  copilot-instructions.md
```

---

## 5. Inspection Workflow (target)

```
Start Inspection
 → Capture label → Barcode + OCR → Extract fields
 → Capture cargo (with calibration marker) → Measure
 → Review & correct
 → Confirm → Save locally → Start next
```

At every step the employee can: go back, retake, enter manually, save draft, cancel, resume later.

---

## 6. Core Data Model (create in Milestone 2)

```
type InspectionStatus =
  | 'draft' | 'in_progress' | 'needs_review'
  | 'confirmed' | 'completed' | 'cancelled';

interface ReviewedValue<T> {
  machineValue: T | null;      // what the system produced
  finalValue: T | null;        // what the employee confirmed
  wasCorrected: boolean;
  correctedAt?: string;        // ISO timestamp
  correctionReason?: string;
  source: 'barcode' | 'ocr' | 'camera' | 'manual';
}

interface Dimensions { lengthMm: number; widthMm: number; heightMm: number; }

interface AwbValue {
  raw: string;                 // exactly as read
  normalized: string;          // "016-12345675"
  prefix: string;              // "016"
  serial: string;              // "12345675"
  checkDigitValid: boolean;
}

interface Inspection {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: InspectionStatus;
  currentStep: string;
  appVersion: string;
  deviceInfo: string;

  awb: ReviewedValue<AwbValue>;
  origin: ReviewedValue<string>;
  destination: ReviewedValue<string>;
  pieces: ReviewedValue<number>;
  weight: ReviewedValue<{ value: number; unit: 'KG' | 'LB' }>;
  printedDimensions: ReviewedValue<Dimensions>;   // from label
  measuredDimensions: ReviewedValue<Dimensions>;  // from camera — NEVER merged with printed

  imageIds: { original: string[]; processed: string[] };
  rawBarcodeResults: unknown[];
  rawOcrText: string | null;
  warnings: string[];
  notes: string;
}
```

Physical measurements are stored internally in millimeters; convert only for display.

---

## Milestone 1 — Application Foundation

**Goal:** Installable, offline-capable PWA shell with touch-first navigation. No camera.

Build:

- Vite + React + TypeScript strict, ESLint, Prettier, Vitest, RTL
- PWA manifest, icons, service worker (offline app shell)
- Routes: `/`, `/inspection/new`, `/history`, `/settings`, `/diagnostics`, `/camera-test`, `*`
- Reusable components: `Button`, `Card`, `StatusBanner`, `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmDialog`
- `useOnlineStatus` hook + visible online/offline indicator
- `appConfig.ts` (name, version, default unit, feature flags, developer mode)
- App-level `ErrorBoundary`
- Theme: deep navy background, bright blue accent, light cards, green/amber/red status colors, large type
- Home screen: title, short description, "Early local proof of concept" badge, Start New Inspection, Inspection History, Settings, Camera Test (disabled, "Coming in Milestone 2"), version, online status
- Docs: `ARCHITECTURE.md`, `DEVELOPMENT.md`, `TESTING.md`, `.github/copilot-instructions.md`
- Tests: app renders, each route renders, NotFound works, ErrorBoundary catches, config loads, online indicator reacts to `online`/`offline` events

Do NOT add: camera, OpenCV, OCR, barcode, measurement, IndexedDB, Dataverse, auth, fake inspection data.

**Done when:** `npm run lint`, `npm run test`, `npm run build` all pass; app installs as a PWA on ChromeOS; works in landscape and portrait; refresh on any route works; offline indicator works.

---

## Milestone 2 — Camera + Local Storage

**Goal:** Reliable rear camera capture and a full local inspection lifecycle.

Camera:

- `cameraService` / `useCamera`: support check, permission, enumerate devices, prefer `facingMode: 'environment'`, request high resolution, start/stop, switch camera, read capabilities, release tracks on unmount / page hide
- Camera Test page: live preview, camera name, resolution, permission state, start/stop/switch/capture, error panel
- High-res still capture (`ImageCapture.takePhoto()` when available, canvas fallback), preview, retake, accept
- Clear messages for: permission denied, no camera, no rear camera, camera in use, unsupported browser, stream interrupted, invalid constraints, capture failure

Storage:

- IndexedDB via `idb`; stores: `inspections`, `images` (Blobs), `settings`, `calibration`
- Repository interfaces (`InspectionRepository`, `ImageRepository`, `SettingsRepository`, `CalibrationRepository`) with IndexedDB implementations — Dataverse can implement the same interfaces later
- Data model from section 6
- New Inspection flow: create draft → capture photos → notes → save draft / complete / cancel
- Drafts survive refresh; Home shows "Resume Draft" only if a draft exists
- History: list, filter by status, open, resume, delete (with confirm), export JSON

Tests: mocked `mediaDevices` (success, denied, no devices, cleanup), repositories with `fake-indexeddb`.

**Done when:** rear camera works on the target tablet; captured images persist; a draft survives refresh and can be resumed; history and export work offline.

---

## Milestone 3 — Label Capture, Barcode, OCR

**Goal:** Capture a label, prepare it, read barcodes and text — all locally.

Label preparation:

- Capture label → four-corner manual crop (draggable handles) → rotate left/right → perspective correction (OpenCV `getPerspectiveTransform` + `warpPerspective`) → optional enhancement profiles (grayscale, CLAHE contrast, adaptive threshold, sharpen)
- Original image preserved; processed image saved separately with crop points, rotation, and operations applied
- OpenCV loaded lazily, run in a Web Worker; every `cv.Mat` explicitly `.delete()`d

Barcode:

- `BarcodeService` interface, ZXing implementation
- Formats: Code 128, Code 39, QR, Data Matrix
- Return format, raw text, location if available, duration
- Show all results; never assume a barcode is an AWB; manual entry always available

OCR:

- `OcrService` interface, Tesseract.js implementation
- Worker created once, reused, terminated when leaving the flow; show load progress
- Run on the processed label only — never continuously on live video
- Return full text, blocks/words with boxes, provider confidence only where Tesseract gives it
- Raw OCR viewer, retry, try alternate preprocessing, manual text entry

**Done when:** a real label photographed on the tablet yields real barcode values and real OCR text offline; failures fall back to manual entry; raw outputs are saved.

---

## Milestone 4 — Cargo Data Extraction + Review

**Goal:** Turn raw barcode/OCR output into structured, reviewable cargo fields.

Extraction (pure functions, heavily unit-tested):

- **AWB** — accept `016-12345675`, `016 12345675`, `01612345675`. Normalize to `PPP-SSSSSSSS`.
Check digit: the 8th serial digit must equal (first 7 serial digits as a number) mod 7.
Example: `1234567 mod 7 = 5` → `016-12345675` is valid.
OCR confusions to consider as *suggested* candidates only: `O→0`, `I→1`, `l→1`, `S→5`, `B→8`, `Z→2`. Never overwrite the raw value.
- **Pieces** — `3 PCS`, `PCS 3`, `3 PIECES`, `PIECES: 3`, `3 PKG`
- **Weight** — `248 KG`, `WEIGHT 248 KG`, `546 LB`, `GROSS WT: 248.0 KGS`; keep original value + unit; record any conversion
- **Printed dimensions** — `48 X 40 X 36 IN`, `48X40X36`, `120 x 100 x 90 CM`, `DIM: 48/40/36`; stored in `printedDimensions` only
- **Airports** — lookup against `public/data/airports.json`; a 3-letter word is only an airport if it's in the list AND context supports it (e.g. near `ORIGIN`, `DEST`, `TO`, `/`); otherwise mark ambiguous
- Also attempt: special-handling codes, commodity, shipper, consignee — optional

Each extracted field records: raw source text, normalized value, validation state (`valid` / `ambiguous` / `invalid` / `missing`), and the reasons.

Review screen:

- Green = validated, Amber = needs review, Red = invalid/missing — always with text + icon, not color alone
- Tap any field to edit, pick among candidates, or enter manually
- View source image and raw OCR
- Retake label / rerun barcode / rerun OCR
- Corrections stored via `ReviewedValue` (machine value never lost)
- Confirm → status `confirmed` → saved locally

Tests: fixtures in `src/test/fixtures/ocr/` with clean text, bad spacing, missing punctuation, character substitutions, multiple AWB candidates, multiple weights, partial routing, unreadable text.

**Done when:** a real label goes from photo → structured fields → employee review → confirmed inspection, with audit trail intact.

---

## Milestone 5 — Calibrated Box Measurement

**Goal:** Measure rectangular boxes using a printed calibration marker.

- Configurable marker (type, ID, real width/height in mm). Start with an ArUco marker (OpenCV `aruco` module if available in the OpenCV.js build; otherwise a high-contrast square marker detected by contours)
- Printable marker page in Settings with "print at 100% scale, verify with a ruler" instructions
- Marker not detected → measurement disabled, reason shown
- **Step A (L × W):** box face + marker coplanar → detect marker corners → homography → detect box corners (or manual corner drag) → compute L and W in mm → draw measurement lines
- **Step B (H):** guided second view of a side face with marker on that plane → compute H
- Each dimension stores: source image, marker corners, box corners, homography, quality factors
- Quality factors (show them, don't invent a %): marker found, marker size in px, viewing angle, blur (Laplacian variance), box-edge clarity → `High` / `Medium` / `Low`
- Low quality → employee must confirm or enter manually
- Compare `measuredDimensions` vs `printedDimensions`: absolute and % difference, configurable tolerance in Settings, flag discrepancies — no automatic acceptance decisions

Validation target (not a promise): ≥ 90% of controlled rectangular-box captures within ±1 in of tape measure under consistent lighting. Include a measurement accuracy worksheet in `docs/`.

**Done when:** real boxes can be measured on the tablet, invalid conditions produce no number, and calculated vs. corrected values are both saved.

---

## Milestone 6 — Piece Counting Foundation + Field-Test Hardening

Piece counting:

- Manual piece count with +/- controls
- Optional photo of all pieces with tap-to-mark annotation
- `PieceDetector` interface (for future ONNX/YOLO/MediaPipe/backend model) — no implementation, no fake boxes
- Store machine count (null until a model exists), employee count, annotations

Hardening:

- Storage usage display, image retention settings, delete old inspections (export first), quota warnings, orphaned-image cleanup
- Recovery after app backgrounding / camera interruption
- Diagnostics (developer mode only): browser, camera, resolutions, frame rate, WASM/WebGL/WebGPU support, IndexedDB, service worker, PWA install state, OpenCV / OCR / barcode status, processing times, version
- Accessibility pass
- `docs/FIELD_TEST.md`: install steps, ChromeOS camera permissions, marker printing, test checklist, OCR accuracy worksheet, measurement accuracy worksheet, issue template

**Done when:** a full inspection runs offline end-to-end on the tablet and failures can be diagnosed from the Diagnostics page.

---

## 7. Deferred (do NOT build now)

Dataverse, Azure Blob/Functions, Entra ID, Power BI, sync, multi-user, cloud OCR, dangerous-goods recognition, damage detection, trained piece-detection model, aircraft compatibility.

Keep the repository interfaces clean so a `DataverseInspectionRepository` + `SyncService` can be added later without touching the workflow. Do not add Dataverse packages, env vars, or placeholder API calls.

---

## 8. How Copilot Works Each Milestone

**Before coding**

1. Read `docs/CARGOVISION_PLAN.md`, `docs/ARCHITECTURE.md`, `.github/copilot-instructions.md`
2. Inspect the repo and existing dependencies
3. Propose the smallest complete implementation and list any new packages with reasons

**While coding**

- Strict TypeScript, no `any`
- Browser APIs behind services/hooks
- Tests alongside code
- Update docs

**After coding** — run and fix:

```
npm run typecheck
npm run lint
npm run test
npm run build
```

**Then report**

- What works now
- Files created / modified / deleted
- Packages added and why
- Command results
- Exact steps to test on the ChromeOS tablet
- Known limitations
- Recommended next step

**Stop and wait for approval.**
