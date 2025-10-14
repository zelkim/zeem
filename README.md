# Zeem

Electron app that automatically joins/leaves Zoom meetings on a schedule.

## Features
- Add/edit/delete meetings with title, URL, start and end times
- Toggle auto-join per meeting
- Auto-join ~3 minutes before start via Zoom command line
- Auto-leave at end by killing Zoom process
- Sidebar showing ongoing or next meeting and a minimal upcoming list

## Requirements
- Windows with Zoom installed (e.g. `%APPDATA%/Zoom/bin/Zoom.exe`, or under `C:/Program Files`)
- Node.js 18+

## Project layout

```
src/
   main/                # Electron main process (Node APIs)
      index.js           # app entry
      windows/
         mainWindow.js    # BrowserWindow creation
      ipc/
         meetings.ipc.js  # IPC handlers for meetings CRUD
         zoom.ipc.js      # IPC handlers for join/leave
      services/
         db.js            # sql.js persistence
         scheduler.js     # meeting scheduler
         zoom.js          # join/leave/status helpers

   preload/             # contextBridge only
      index.js

   renderer/            # React UI (no Node APIs)
      index.html
      src/
         main.jsx
         app.jsx
         index.css
         components/
            Sidebar.jsx
            MeetingsList.jsx

dist/
   renderer/            # built CSS/JS artifacts
```

## Getting started
1. Install dependencies
    - npm install
2. Run
    - npm start

## Notes
- Data is stored in an SQLite database file under your Electron `userData` folder (SQL.js-backed). No external service required.
- If your Windows username differs from "User" or Zoom is installed elsewhere, the app searches several common install paths; adjust `src/main/services/zoom.js` if needed.
- Time inputs are local time; they are stored as ISO strings and compared in the app.

## Troubleshooting
- If Zoom does not launch, verify the executable path and that the URL is correct.
- If the app doesn't show any meetings, add one with the + Add Meeting button.

## License
MIT