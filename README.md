# Zeem

Electron app that automatically joins/leaves Zoom meetings on a schedule.

Features
- Add/edit/delete meetings with title, URL, start and end times
- Toggle auto-join per meeting
- Auto-join 3 minutes before start via Zoom command line
- Auto-leave at end by killing Zoom process
- Sidebar showing ongoing or next meeting and a minimal upcoming list

Requirements
- Windows with Zoom installed (default path: C:\\Users\\User\\AppData\\Roaming\\Zoom\\bin\\Zoom)
- Node.js 18+

Getting started
1. Install dependencies
   - npm install
2. Run
   - npm start

Notes
- Data is stored in an SQLite database file under your Electron userData folder (SQL.js-backed). No external service required.
- If your Windows username differs from "User" or Zoom is installed elsewhere, update the path in main.js joinZoom() accordingly.
- Time inputs are local time; they are stored as ISO strings and compared in the app.

Troubleshooting
- If Zoom does not launch, verify the executable path and that the URL is correct.
- If the app doesn't show any meetings, add one with the + Add Meeting button.

License
MIT