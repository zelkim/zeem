const { exec } = require("child_process");

let detectedZoomType = "none";

/**
 * Checks if a Zoom process is either flatpak, snap, or system (pacman/apt).
 */
function initZoomDetection() {
  return new Promise((resolve) => {
    console.log("Running Linux Zoom detection...");

    // Priority 1: Check for Flatpak
    exec("flatpak list", (error, stdout, stderr) => {
      if (!error && stdout && stdout.includes("us.zoom.Zoom")) {
        detectedZoomType = "flatpak";
        console.log("Detected Zoom: Flatpak");
        resolve();
        return;
      }

      // Priority 2: Check for Snap
      console.log("Flatpak not found, checking for Snap...");
      exec("snap list", (error, stdout, stderr) => {
        if (!error && stdout && stdout.includes("zoom-client")) {
          detectedZoomType = "snap";
          console.log("Detected Zoom: Snap");
          resolve();
          return;
        }

        // Priority 3: Check for system
        console.log("Snap not found, checking for system binary...");
        exec("command -v zoom", (error, stdout, stderr) => {
          if (!error && stdout && stdout.trim().length > 0) {
            detectedZoomType = "system";
            console.log(`Detected Zoom: System (at ${stdout.trim()})`);
            resolve();
            return;
          }

          console.error("CRITICAL: No Zoom installation detected.");
          detectedZoomType = "none";
          resolve();
        });
      });
    });
  });
}

/**
 * Checks if a Zoom process is currently running.
 * @returns {Promise<boolean>} - Resolves true if Zoom is running, false otherwise.
 */
async function isZoomRunning() {
  await initZoomDetection();

  return new Promise((resolve) => {
    let command;

    switch (detectedZoomType) {
      case "flatpak":
        // Check the list of running flatpak processes for Zoom
        command = "flatpak ps | grep -q us.zoom.Zoom";
        break;
      case "snap":
      case "system":
        // 'pgrep -f' searches the full command line for "zoom"
        // This is robust and finds the process however it was started
        command = "pgrep -f zoom";
        break;
      case "none":
      default:
        // If it's not installed, it can't be running
        resolve(false);
        return;
    }

    exec(command, { shell: true }, (error, stdout, stderr) => {
      if (!error) {
        // Command succeeded (exit code 0)
        // For pgrep/grep, this means a match was found.
        resolve(true); // Yes, it's running
      } else {
        // Command failed (exit code > 0)
        // This means pgrep/grep found no match.
        resolve(false); // No, it's not running
      }
    });
  });
}

/**
 * Joins a Zoom meeting using the detected method.
 * @param {string} meetingUrl - The full zoommtg:// link or https link.
 */
async function joinZoom(meetingUrl) {
  await initZoomDetection();
  let command;

  // Ensure the URL is quoted to handle special characters
  const safeUrl = `"${meetingUrl}"`;

  switch (detectedZoomType) {
    case "flatpak":
      command = `flatpak run us.zoom.Zoom ${safeUrl}`;
      break;
    case "snap":
      command = `snap run zoom-client ${safeUrl}`;
      break;
    case "system":
      // xdg-open is the standard, desktop-agnostic way to open URLs.
      // It will find the system-installed (pacman/apt) app.
      command = `xdg-open ${safeUrl}`;
      break;
    case "none":
    default:
      console.error(
        `Cannot join meeting: No Zoom installation found (type: ${detectedZoomType}).`,
      );
      return;
  }

  // This is a "fire and forget" command. We don't need to wait for it.
  exec(command, (error) => {
    if (error) {
      console.error(
        `Error joining meeting with command "${command}": ${error.message}`,
      );
    }
  });
}

/**
 * Leaves a Zoom meeting by killing the process.
 */
async function leaveZoom() {
  await initZoomDetection();
  let command;

  switch (detectedZoomType) {
    case "flatpak":
      // Safely kills only the Flatpak instance
      command = `flatpak kill us.zoom.Zoom`;
      break;
    case "snap":
    case "system":
      // pkill -f will find the process by its full name/command
      // This is more robust than 'killall zoom'
      command = `pkill -f zoom`;
      break;
    case "none":
    default:
      console.error(
        `Cannot leave meeting: No Zoom installation found (type: ${detectedZoomType}).`,
      );
      return;
  }

  exec(command, (error) => {
    if (error) {
      // It's normal to get an error if the process wasn't running.
      // We can safely ignore "No process found" or "not running" errors.
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("no process") || errorMsg.includes("not running")) {
        console.log("Attempted to leave, but Zoom was not running.");
      } else {
        console.error(
          `Error leaving meeting with command "${command}": ${error.message}`,
        );
      }
    } else {
      console.log("Successfully left meeting.");
    }
  });
}

// Export the three public functions for the "factory" to use
module.exports = {
  isZoomRunning,
  joinZoom,
  leaveZoom,
};
