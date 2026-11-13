# CargoVision development instructions

Read `docs/ARCHITECTURE.md` and this file before changing the app.
`docs/CARGOVISION_PLAN.md` is the original, much larger reference plan; it is not
the approved scope. Inspect current dependencies and explain the smallest
complete implementation and any new packages before coding.

- Approved scope: a basic camera app that reads labels, live or from a photo
  (barcodes, OCR, and plain-language interpretation), and measures packages
  against a reference object. Nothing is stored. Inspections, history, storage,
  export, video recording, camera piece counting, and cloud features from the
  plan need explicit approval first.
- Never fabricate camera results, OCR, barcodes, measurements, counts, or confidence.
  Every finding restates text that was on the label and shows it. Flag
  inconsistent values for a person to check; never silently correct them.
- Measurements need a reference of known size. Never convert pixels to units
  without one.
- Dangerous goods are not interpreted: show the neutral notice only. Do not add
  hazard meanings without a reviewed source.
- Keep unavailable functionality explicitly labeled. Do not simulate stored data.
- No Dataverse, Azure, Graph, Entra ID, auth, cloud OCR, telemetry, or external APIs.
  Photos stay on the device and are never saved.
- Strict TypeScript; no `any` or unsafe casts to bypass type errors.
- Keep browser APIs in hooks/services. Keep label interpretation and measurement
  geometry pure and out of React components.
- A photo read runs OCR once, on the deskewed copy; barcodes are read from the
  original photo. Live reading (`liveReader`) reads one camera frame at a time,
  without deskew, and shows only the newest reading. Do not merge multiple OCR
  passes or keep earlier live readings. Live frames are never displayed or
  kept, and stopping live reading must not cancel the shared OCR worker.
- OCR, WebAssembly, and language files are served from `/ocr/` by
  `vite-plugins/ocrAssets.ts` and precached. Never load engine files from a CDN,
  and check the precache size when adding assets.
- Use CSS Modules and `src/styles/tokens.css`; use text and icons for status.
- Minimum touch target: 44 x 44 CSS pixels. Respect keyboard and reduced-motion use.
- Use local assets. Offline claims require a production-build browser check:
  install, stop the server, reload, and read a label.
- Surface errors in the UI with recovery and relevant logging; no silent fallback.
- Add dependencies only when the approved scope needs them, and explain why.
- Add focused tests alongside changed code and update directly related docs.
- Test with generated labels. Do not commit real shipment data, labels, or photos.
- Preserve the supplied reference plan; record implementation clarifications in
  architecture/development docs instead of silently rewriting the specification.

After changes, run and fix:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

Report what works, changed files, new packages and reasons, command results,
ChromeOS test steps, limitations, and the recommended next step. Never claim
physical-device or live-camera verification when only a desktop browser was tested.
