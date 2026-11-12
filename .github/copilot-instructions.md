# CargoVision development instructions

Read `docs/CARGOVISION_PLAN.md`, `docs/ARCHITECTURE.md`, and this file before
changing the app. Inspect current dependencies and explain the smallest complete
implementation and any new packages before coding.

- Only Milestone 1 is currently approved. Stop after each milestone for approval.
- Never fabricate camera results, OCR, barcodes, measurements, counts, or confidence.
- Keep unavailable functionality explicitly labeled. Do not simulate stored data.
- No Dataverse, Azure, Graph, Entra ID, auth, cloud OCR, telemetry, or external APIs.
- Strict TypeScript; no `any` or unsafe casts to bypass type errors.
- Keep browser APIs in hooks/services and domain/CV code out of React components.
- Keep machine values separate from employee corrections when storage is approved.
- Use CSS Modules and `src/styles/tokens.css`; use text and icons for status.
- Minimum touch target: 44 x 44 CSS pixels. Respect keyboard and reduced-motion use.
- Use local assets. Offline claims require a production-build browser check.
- Surface errors in the UI with recovery and relevant logging; no silent fallback.
- Add dependencies only in the milestone that needs them.
- Add focused tests alongside changed code and update directly related docs.
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
ChromeOS test steps, limitations, and the recommended next milestone. Never claim
physical-device verification when only a desktop browser was tested.
