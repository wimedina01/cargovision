# CargoVision

An early, local-only cargo acceptance proof of concept for ChromeOS tablets.
**Milestone 1 only:** an installable, offline-capable application shell, not an
operational inspection or acceptance tool.

## Run locally

Use Node 22.22.2+, within the supported Node 22 release line, or a supported newer
release listed in [package.json](./package.json).

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local address printed by Vite. Development mode deliberately does not
register a service worker.

## Test the production PWA

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173`, wait for **Offline shell ready** on the workspace,
and then test offline reloads. The first visit must reach the app host.
The preview server is for local verification, not production hosting.

## What works now

- Responsive workspace, navigation, settings information, and unknown-route recovery.
- Required routes, with explicit unavailable states for future features.
- Browser online/offline indicator, separately from offline-cache readiness.
- Local icons, PWA manifest, and precached application assets.
- User-confirmed app updates; no automatic page reload.
- Touch-friendly controls, keyboard focus, native confirmation dialog, and
  application-level error recovery.
- Strict TypeScript, type-aware ESLint, Prettier, and focused UI tests.

## Deliberately not built

Camera access, inspection records, IndexedDB, settings persistence, photos,
barcode reading, OCR, extraction, measurement, piece counting, cloud services,
authentication, and synchronization. No shipment data or fabricated results are
included. The inspection button opens an explanation; it creates no record.

## Documentation

- [Reference implementation plan](./docs/CARGOVISION_PLAN.md)
- [Architecture and milestone boundaries](./docs/ARCHITECTURE.md)
- [Development, dependencies, and hosting](./docs/DEVELOPMENT.md)
- [Tests and exact ChromeOS validation steps](./docs/TESTING.md)
- [Copilot instructions](./.github/copilot-instructions.md)

ChromeOS hardware installation and portrait/landscape checks must be completed on
the target tablet. A desktop browser check is not a substitute.
**Stop after Milestone 1; Milestone 2 requires explicit approval.**
