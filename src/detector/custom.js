const {default: Detector} = require("./detector");

/**
 * Detects using a custom function.
 */
module.exports = class CustomDetector extends Detector {
  async init() {
    this.file = path.join(__dirname, '../..', config('File', Error, this.options));
    /**
     * @type {Function}
     */
    this.module = require(this.file);
    this.config = config;
    if (typeof this.module.init === 'function') {
      this.module.init.call(this, this.options, this);
    }
  }

  async detect(value) {
    if (typeof this.module.detect === 'function') {
      return this.module.detect.call(this, value, this);
    } else if (typeof this.module === 'function') {
      return this.module.call(this, value, this);
    }
    this.logger.error('No detect function provided. Please either use `module.exports = function(value) { ... }` or `module.exports = { init(options) { ... }, detect(value) { ... } }`');
    throw new Error('No detect function provided.');
  }
}