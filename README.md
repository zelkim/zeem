<img width="150" height="150" alt="Z" src="https://github.com/user-attachments/assets/e97a2604-619c-4545-8dcd-bfc20f9a4b23" />

# Zeem
<img src='https://img.shields.io/badge/DLSU-ORGLIFE-100000?style=for-the-badge&logoColor=white&labelColor=00703C&color=333333'/>  <img alt='' src='https://img.shields.io/badge/DLSU-CCS-100000?style=for-the-badge&logo=&logoColor=white&labelColor=00703C&color=333333'/>  <img alt='' src='https://img.shields.io/badge/LSCS-r&d-100000?style=for-the-badge&logo=&logoColor=white&labelColor=01087D&color=001DCB'/>

Zeem automatically joins and leaves your Zoom meetings on a weekly schedule. Set it once—no more rushing to links.

## Quick start (for everyone)

### 1) Install
- Run the installer you downloaded (Zeem-0.1.1-Setup.exe) and follow the prompts.

### 2) Add your meetings
- Click “+ Add Meeting”
- Paste your Zoom link, choose the weekday, and set the start and end times
- Save. Repeat for other meetings

### 3) Enable the meetings you want
- Toggle any meeting on/off without deleting it

### 4) Let Zeem handle it
- Leave the app running. Zeem will:
   - Join shortly before your meeting starts
   - Open Zoom if it isn’t already running
   - Leave when the meeting’s end time is reached

### Tips
- Use the “Join Meeting” button in the sidebar to join immediately
- You can keep meetings in your list and disable them temporarily
- Times follow your system clock (12/24‑hour based on your Windows settings)

### Troubleshooting
- Zoom didn’t open or join: check the link and try joining manually once, then reopen Zeem
- Didn’t auto‑leave: verify the meeting’s end time
- Blank window: quit and open Zeem again; if it persists, reinstall from the latest installer

### Privacy
- Your meetings are stored locally on your computer. Zeem doesn’t upload your data.
- Zeem has no login, **all user interactions are anonymous**.

---

## Technical guide (for developers)

Zeem is an Electron + React app. The main process schedules meetings and controls Zoom. The renderer shows your schedule and status.

### Requirements
- Windows with Zoom installed (typically `%APPDATA%/Zoom/bin/Zoom.exe` or `C:/Program Files/Zoom/bin/Zoom.exe`)
- Node.js 18+

### Scripts
- Start (build then run):
   ```cmd
   npm start
   ```
- Build production assets only:
   ```cmd
   npm run build
   ```
- Package Windows installer (NSIS):
   ```cmd
   npm run package
   ```

### Build pipeline
- Tailwind builds CSS to `dist/renderer/styles.css`
- Renderer (React) is bundled by esbuild to `dist/renderer/bundle.js` (ESM)
- `scripts/prepareRendererHtml.js` writes `dist/renderer/index.html` from `src/renderer/index.html` with corrected asset paths
- Preload is bundled to `dist/preload/index.js` (esbuild, external: electron)
- Main is bundled to `dist/main.js` (esbuild, external: electron)
- Packaging is handled by electron-builder (NSIS target) with asar enabled and `sql.js` WASM unpacked via `asarUnpack`/`extraResources`

### Project layout

```
src/
   main/                  # Electron main process (Node APIs)
      index.js             # app entry; creates DB, window, scheduler, updater
      windows/
         mainWindow.js      # BrowserWindow creation; loads dist/renderer/index.html
      ipc/
         meetings.ipc.js    # IPC for meetings CRUD and toggles
         zoom.ipc.js        # IPC for join/leave requests
      services/
         db.js              # sql.js persistence (local DB under userData)
         scheduler.js       # 15s tick; auto-join/-leave; status snapshots
         zoom.js            # Zoom launch/join/leave helpers
         updater.js         # electron-updater wiring (skips in dev)

   preload/               # Safe bridge (contextIsolation)
      index.js             # Exposes zeem API to renderer via contextBridge

   renderer/              # React UI (no Node APIs)
      index.html           # Source HTML (transformed to dist/renderer/index.html)
      src/
         main.jsx           # React bootstrap
         app.jsx            # Main app; status + meeting list
         index.css          # Tailwind entry
         components/
            Sidebar.jsx
            MeetingsList.jsx
            EditModal.jsx
            ConfirmModal.jsx
         utils/
            utils.js

dist/
   main.js                # bundled main
   preload/index.js       # bundled preload
   renderer/
      index.html           # prepared HTML
      styles.css           # Tailwind output
      bundle.js            # bundled renderer
```

### Runtime behavior
- Scheduler checks every 15 seconds and maintains a snapshot `{ ongoing, next }`
- Auto‑join triggers a few minutes before start; ensures Zoom is running
- Auto‑leave at the scheduled end time
- Renderer subscribes to scheduler events to update the UI

### Packaging and updates
- `electron-builder` config is in `package.json > build`
   - `asar: true`, `asarUnpack` and `extraResources` for `sql.js` WASM
   - Windows target: `nsis`, artifact named `${productName}-${version}-Setup.${ext}` into `release/`
   - Publish is configured for GitHub Releases under `zelkim/zeem`
- Auto‑update via `electron-updater` runs on startup (skips in development)

### Data storage
- Local database file (sql.js) lives under the Electron `userData` directory (e.g., `%APPDATA%/Zeem/zeem.sqlite`)

### Development notes
- The dev `npm start` builds assets before launching Electron to avoid missing files
- You may see Chromium cache warnings on Windows during development; they’re benign
- Keep `contextIsolation: true` and avoid Node APIs in the renderer

---

## Contributing

Thanks for your interest! PRs and issues are welcome.

1) Set up dev
```cmd
git clone https://github.com/zelkim/zeem.git
cd zeem
npm install
npm start
```

2) Make changes
- Keep code style consistent with the existing files
- Add small, focused commits with clear messages
- If you change public behavior, update README and add notes in RELEASE-NOTES.md

3) Test locally
- Ensure `npm start` runs and the UI functions (add a meeting, join/leave)
- Build/package if your changes affect production build:
```cmd
npm run build
npm run package
```

4) Open a PR
- Describe the change, motivation, and testing steps
- Link any related issues

### Reporting issues
- Include your OS version, Zeem version, and steps to reproduce
- Attach logs or screenshots where possible

## License
MIT
