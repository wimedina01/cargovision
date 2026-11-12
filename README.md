# CargoVision

A very basic camera app for ChromeOS tablets. It does two things, entirely on
the device: **read a shipping label** and **measure a package**. It is a proof
of concept, not an operational acceptance or inspection tool.

## What it does

- **Read a label.** Take or choose a photo of a label. CargoVision reads its
  barcodes ([zxing-wasm](https://github.com/Sec-ant/zxing-wasm)) and printed
  text ([Tesseract.js](https://github.com/naptha/tesseract.js)), then explains
  what it recognizes in plain language: air waybill numbers (with the check
  digit and airline), piece counts, weights, dimensions, and handling terms such
  as _Fragile_ or _Keep upright_. The text behind every finding is shown so a
  person can compare it with the label.
- **Measure a package.** Photograph a package next to an object of known size,
  such as a sheet of paper or a bank card. Mark that reference, then mark the
  edge to measure. The length is scaled from the reference; without one there
  is no measurement.
- **Stays on the device.** After the first visit the app and its reading tools
  are cached for offline use. Photos are read in memory, never saved or
  uploaded. There is no account, history, or cloud service.

## Run locally

Use Node 22.22.2+, within the supported Node 22 release line, or a supported newer
release listed in [package.json](./package.json).

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local address printed by Vite. Development mode deliberately does not
register a service worker. The camera needs a secure context: `localhost` and
`127.0.0.1` qualify, a plain-HTTP LAN address does not. Choosing a photo from
the device works everywhere.

## Test the production PWA

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173`, wait for **Ready to use offline** on the home
screen, and then test offline reloads. The first visit must reach the app host
and downloads about 8 MB of reading tools (the OCR engine and its English
language data). The preview server is for local verification, not production
hosting.

## Known limits

- Reading is approximate. Text recognition can confuse similar characters
  (such as `0` and `O`), can miss the ends of lines, and struggles with glare,
  blur, perspective, and text rotated more than about 15 degrees. Every finding
  must be checked against the label.
- Measurements are estimates. They need a flat reference lying in the same
  plane as the edge being measured, and a camera held straight above it. Use a
  tape measure for official dimensions.
- Dangerous goods marks are not interpreted. If the text contains wording that
  can mean dangerous goods, CargoVision shows a neutral notice and nothing else.
  No notice does not mean a shipment has none.
- The airline prefix list is partial. An unrecognized prefix does not make an
  air waybill number wrong.
- English printed text only.

## Deliberately not built

Inspection records, history, storage of any kind, accounts, cloud services,
synchronization, live video analysis, piece counting by camera, and a dangerous
goods glossary. The rest of the [reference plan](./docs/CARGOVISION_PLAN.md)
describes a much larger product; only the camera, label reading, and measuring
described above are approved and built.

## Validation status

Automated checks pass (typecheck, lint, format, unit and component tests, build,
and the production dependency audit). The production build was exercised in a
desktop Chromium browser with generated test labels chosen through the file
picker, including a reload and a full label read while the server was stopped.
It has **not** been tested on a ChromeOS tablet, with a live camera, or on real
cargo labels. See [the test plan](./docs/TESTING.md).

## Documentation

- [Reference implementation plan](./docs/CARGOVISION_PLAN.md)
- [Architecture, reading pipeline, and offline design](./docs/ARCHITECTURE.md)
- [Development, dependencies, and hosting](./docs/DEVELOPMENT.md)
- [Tests and exact ChromeOS validation steps](./docs/TESTING.md)
- [Copilot instructions](./.github/copilot-instructions.md)

ChromeOS installation, the live camera, and portrait/landscape checks must be
completed on the target tablet. A desktop browser check is not a substitute.
