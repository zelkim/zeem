const process = require("process");

/**
 * This is a fallback module for unsupported operating systems (like macOS).
 * It provides empty functions with the correct names so the main app
 * doesn't crash if it tries to call them.
 */
const unsupportedModule = {
  /**
   * @returns {Promise<void>}
   */
  isZoomRunning: async () => {
    // Log a warning but don't stop the app
    console.warn(
      `Zoom automation is not supported on this platform: ${process.platform}`,
    );
    return Promise.resolve(); // Fulfill the async function
  },

  /**
   * @param {string} url
   */
  joinZoom: (url) => {
    console.error(
      "Cannot join meeting: Zoom automation is unsupported on this platform.",
    );
  },

  leaveZoom: () => {
    console.error(
      "Cannot leave meeting: Zoom automation is unsupported on this platform.",
    );
  },
};

// Check the platform and export the correct module
switch (process.platform) {
  case "linux":
    console.log("Loading Linux zoom module.");
    module.exports = require("./linux");
    break;

  case "win32":
    console.log("Loading Windows zoom module.");
    module.exports = require("./windows");
    break;

  // 'darwin' is macOS. You can create a 'macos.js' file later if you want.
  case "darwin":
  default:
    // For macOS and any other unknown OS, use the safe fallback.
    module.exports = unsupportedModule;
    break;
}
