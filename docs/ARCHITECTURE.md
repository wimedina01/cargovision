# CargoVision architecture

## Current boundary: Milestone 1

The [reference plan](./CARGOVISION_PLAN.md) describes six milestones. Only the
application foundation is implemented. No camera, storage repositories, domain
models, data extraction, or computer-vision packages are present.

```text
main.tsx
  StrictMode + BrowserRouter
    App
      ErrorBoundary
        AppShell
          AppHeader + OnlineIndicator
          offline/update notifications
          AppRoutes -> page components
          footer + controlled ConfirmDialog
```

React Router uses browser-history URLs. Pages are eagerly imported so the small
foundation is one precached application, without lazy-route loading gaps.

| Location            | Responsibility                                                         |
| ------------------- | ---------------------------------------------------------------------- |
| `src/app/`          | Shell, routes, application error boundary                              |
| `src/pages/`        | Workspace, settings information, explicit unavailable screens, 404     |
| `src/components/`   | Reusable, accessible presentation components                           |
| `src/config/`       | App version, default unit, developer mode, disabled feature flags      |
| `src/hooks/`        | Connection events, PWA lifecycle, route focus, native dialog lifecycle |
| `src/services/app/` | Browser reload recovery                                                |
| `src/styles/`       | One global token file and minimal global styles                        |
| `public/icons/`     | Local SVG and installable raster/maskable icons                        |

CSS Modules own component styles. Semantic CSS tokens define the navy, blue,
light-card, and status palette. System font fallbacks avoid font downloads.
No ORION component package is introduced; this milestone follows the requested
React/CSS Modules stack.

## Routes and truthful availability

- `/`: workspace and live offline-shell readiness.
- `/inspection/new`: explains that Milestone 2 is required; creates no inspection.
- `/history`: explains that storage/history operations are unavailable.
- `/settings`: read-only configuration and ChromeOS install instructions.
- `/camera-test`: explains that camera access is disabled; requests no permission.
- `/diagnostics`: explains that diagnostics are deferred to Milestone 6.
- Any other path: recoverable NotFound page.

Developer mode follows Vite's development build flag. The diagnostics link is
hidden in production, and its direct URL shows a developer-mode-off explanation.
This is not authentication, and no sensitive diagnostics are implemented.

## Offline lifecycle

`vite-plugin-pwa` generates the manifest and a Workbox service worker at build time.
The worker precaches the built HTML, JavaScript, CSS, manifest, and local icons.
Its navigation fallback is `/index.html`, allowing cached deep routes to open and
reload offline.

- Service workers are disabled in `npm run dev`.
- First installation needs access to the app's own host over HTTPS or loopback HTTP.
- No third-party runtime API, analytics, font, CDN, auth, or model request exists.
- Online/offline text reflects `navigator.onLine`, not a server availability probe.
- "Offline shell ready" requires a successful precache notification or an existing
  active service worker. A network signal alone never implies offline readiness.
- Installation/registration and update errors are logged and shown with recovery.
- Updates wait for a user-confirmed reload. `skipWaiting` is not automatic.
- Clearing site data or browser storage eviction can remove cached assets.

App-asset requests are necessary to install and update a PWA. "No external calls"
means no external application services; it does not mean a zero-request first
installation. Future OCR/WASM/language assets must also be self-hosted and cached
before those milestones can claim offline support.

## Accessibility and error handling

Interactive controls have at least a 44 x 44 CSS-pixel target; primary buttons are
at least 52 pixels tall. Status messages use text and icons, not color alone.
Navigation provides a skip link, active-page indication, heading focus, and page
titles. Reduced-motion preferences are respected.

Confirmation uses a native modal dialog with an accessible name and description,
a safe Cancel default, and Escape cancellation. The caller controls its open
state. Rendering failures are caught by the top-level error boundary, logged, and
shown with reload and workspace recovery actions.

## Deliberately deferred design decisions

Before Milestone 2, resolve inspection state transitions, the distinction between
confirmed/completed, transaction boundaries for images and inspections, and
whether export includes images. Before Milestone 4, define typed extraction
candidates, validation reasons, source provenance, and correction history.
Do not prematurely implement the draft reference model just to fill directories.

No milestone advances without explicit approval.
