const Detector = require("./detector");

/**
 * Detects everything.
 */
module.exports = class AllDetector extends Detector {
  detect() {
    return true;
  }
}