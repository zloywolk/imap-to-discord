const config = require("../config");
const TurndownService = require('turndown');

/**
 * Base class for custom formatters.
 */
 module.exports = class Formatter {
  constructor(logger, options) {
    this.logger = logger.fork(['[formatter]']);
    this.options = options;
    this.type = config('Type', Error, options);
    this.logger.debug('Creating formatter ' + this.type);
    this.turndownService = new TurndownService();
    this.init();
  }

  init() {

  }

  /**
   * Formats the message.
   * @param {import('imapflow').FetchMessageObject} message The message.
   */
  async format() {
    throw new Error('Not implemented');
  }

  /**
   * Limits the string length for discord safety.
   * @param {string} str The string
   * @param {{length?: number, prefix?: string, suffix?: string}} opts Options
   * @returns The trimmed string
   */
  limit(str, opts = {}) {
    const prefix = opts.prefix === undefined ? '' : opts.prefix;
    const suffix = opts.suffix === undefined ? '' : opts.suffix;
    const length = (opts.length === undefined ? 1024 : opts.length) - prefix.length - suffix.length;
    if (str && str.length > length - 3) {
      return prefix + str.substring(0, length - 3) + '...' + suffix;
    }
    return prefix + (str || '\u200B') + suffix;
  }

  /**
   * Gets the body HTML.
   * @param {import('imapflow').FetchMessageObject} message The message.
   */
  getBodyHtml(message) {
    return message.bodyParts.get('text')?.toString() || '\u200B';
  }

  /**
   * Gets the body Markdown.
   * @param {import('imapflow').FetchMessageObject} message The message.
   */
  getBodyMd(message) {
    return this.turndownService.turndown(this.getBodyHtml(message)) || '\u200B';
  }
}
