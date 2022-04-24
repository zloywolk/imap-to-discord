const { MessageBuilder } = require("discord-webhook-node");
const { default: Formatter } = require("./formatter");
const config = require('../config');
const path = require('path');

/**
 * Formats using a custom function.
 */
module.exports = class CustomFormatter extends Formatter {
  async init() {
    this.file = path.join(__dirname, '../..', config('File', Error, this.options));
    /**
     * @type {Function}
     */
    this.module = require(this.file);
    this.config = config;
    if (typeof this.module.init === 'function') {
      await this.module.init.call(this, this.options, this);
    }
  }

  /**
   * Formats the message.
   * @param {import('imapflow').FetchMessageObject} message The message.
   */
  async format(message) {
    this.messageBuilder = new MessageBuilder();
    if (typeof this.module.format === 'function') {
      return await this.module.format.call(this, message, this);
    } else if (typeof this.module === 'function') {
      return await this.module.call(this, message, this);
    }
    this.logger.error('No format function provided. Please either use `module.exports = function(message) { ... }` or `module.exports = { init(options) { ... }, format(message) { ... } }`');
    throw new Error('No format function provided.');
  }
}
