const config = require("../config");

/**
 * Base class for custom formatters.
 */
 module.exports = class Formatter {
  constructor(logger, options) {
    this.logger = logger.fork(['[formatter]']);
    this.options = options;
    this.type = config('Type', Error, options);
    this.logger.debug('Creating formatter ' + this.type);
    this.init();
  }

  init() {

  }

  async format() {
    throw new Error('Not implemented');
  }

  /**
   * Limits the string length for discord safety.
   * @param {string} str The string
   * @param {number} to Override length
   * @returns The trimmed string
   */
  limit(str, to = 1024) {
    return str.substring(0, to) || '\u200B';
  }
}
