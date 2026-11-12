# Testing Milestone 1

## Required gates

Run all four from the project root after every milestone:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

`npm run test` terminates after one run; it does not leave a watcher running.
`npm run format:check` is an additional formatting check.

## Automated coverage

- All six named routes plus the NotFound route render accessible headings.
- Navigation updates heading focus and page titles.
- The workspace labels its preview honestly, disables Camera Test, and never
  offers a fabricated draft.
- Start New Inspection opens an unavailable explanation, not a fake workflow.
- Unknown routes recover through the workspace link.
- Settings display configured defaults without editable/persisted controls.
- Offline registration failures and app rendering failures expose recovery.
- Online/offline events update the visible text and accessible status.
- Offline readiness waits for precaching; insecure origins are unsupported.
- Updates require confirmation, can be cancelled, and expose update failures.
- Native-dialog Escape cancellation calls Cancel, never Confirm.

Vitest tests run with two workers to keep local resource use bounded. Browser
APIs are isolated behind hooks/services. Service-worker registration is mocked in
unit tests; those tests do not prove real offline behavior.

jsdom does not implement native modal dialog behavior or window scrolling, so
the test setup supplies minimal API shims. Actual focus trapping, browser
installation, and offline navigation require browser/device checks.

## Production browser checks

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

1. Open `http://127.0.0.1:4173` in Chrome. Use a new browser profile/context when
   testing first installation; do not clear unrelated sites' data.
2. Wait for **Offline shell ready**. Inspect Application > Service Workers and
   Cache Storage in DevTools; an activated worker and precached assets must exist.
3. Visit and refresh `/`, `/inspection/new`, `/history`, `/settings`,
   `/diagnostics`, `/camera-test`, and a made-up nested path.
4. Select Offline in DevTools Network, keep service workers enabled, and refresh
   each path again. The proper screen must render; the unknown path must show the
   app's NotFound page.
5. Confirm the header says **Offline**, not merely an icon/color change. Return
   to online and confirm it updates.
6. At landscape 1280 x 800, portrait 800 x 1280, and narrow 360 x 800 CSS-pixel
   viewports, inspect for clipping/overlap and horizontal page overflow. Check
   every visible link/button target is at least 44 x 44 CSS pixels.
7. Use Tab/Shift+Tab and the skip link. Verify focus visibility, sensible ordering,
   current navigation indication, and keyboard access to working controls.
8. Check the Network panel: assets originate only from this app; no external
   API, telemetry, font, model, or image request is made.

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
   a developer PC's ordinary HTTP LAN address is insufficient.
3. On the target tablet, use a supported Chrome version and an allowed browser
   profile. Record the tablet model, ChromeOS/Chrome version, and any installation
   policy restrictions. No camera permission is needed or should be requested.

### Install and exercise

4. While connected, open the approved HTTPS address in Chrome.
5. On Workspace, wait for **Offline shell ready**. A green Online connection
   indicator alone is not enough.
6. Select Chrome's address-bar install icon, or its install-app menu, and install
   **CargoVision**. If policy blocks installation, record the block; do not weaken
   device security settings.
7. Launch CargoVision from the ChromeOS launcher. Confirm it opens in its own
   application window and displays the early-proof-of-concept badge.
8. Rotate into landscape, then portrait. Read the cards at normal working distance.
   Tap Workspace, History, Settings, and Start New Inspection. No control should
   overlap, clip, or require precision tapping.
9. Confirm Camera Test is disabled and says **Coming in Milestone 2**. Opening
   `/camera-test` directly must explain that camera access is disabled.
10. Confirm Start New Inspection says no inspection was created; history has no
    sample records; settings cannot save preferences.
11. Turn off Wi-Fi and any other network connection. Confirm **Offline** is visible.
12. Close and reopen the installed app. Navigate between screens while offline.
    Open and refresh `/settings` and `/inspection/new` in Chrome while still
    offline. Open a made-up route and verify recovery through Back to workspace.
13. Reconnect and confirm **Online** returns. Check no camera permission prompt,
    sign-in, or external-service error appeared.

Record pass/fail for each step and attach screenshots for failures. ChromeOS
installation, launcher behavior, enterprise policy, physical touch usability,
and rotation remain unverified until these steps are run on the actual tablet.

## Stop condition

Do not implement Milestone 2 during validation. After the foundation is reviewed,
request explicit approval for camera and local-storage work.
