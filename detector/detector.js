const config = require("../config");

/**
 * Base class for custom detectors.
 */
module.exports = class Detector {
  constructor(logger, options) {
    this.logger = logger.fork(['[detector]']);
    this.options = options;
    this.type = config('Type', Error, options);
    this.logger.debug('Creating detector ' + this.type);
    this.init();
  }

  init() {

  }

  async detect() {
    throw new Error('Not implemented');
  }
}
