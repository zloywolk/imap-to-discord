const config = require("../config");
const Detector = require("./detector");

/**
 * Detects everything with a matching name.
 */
module.exports = class NamedDetector extends Detector {
  init() {
    this.name = config('Name', '', this.options);
    this.caseSensitive = config('CaseSensitive', false, this.options);
  }

  detect(what) {
    return this.case(what.name) === this.case(this.name);
  }

  case(str) {
    return this.caseSensitive ? str : str.toLowerCase();
  }
}
