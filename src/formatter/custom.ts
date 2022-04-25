import { MessageBuilder } from "discord-webhook-node";
import config from '../config';
import Formatter from "./formatter";
import path from 'path';
import Thing from "../thing/thing";

/**
 * Formats using a custom function.
 */
export default class CustomFormatter extends Formatter {
  /**
   * The file name of the formatter.
   */
  private file!: string;
  /**
   * The loaded module.
   */
  private module!: any;
  /**
   * Config function for the user.
   */
  protected config = config;
  /**
   * The message builder.
   */
  protected messageBuilder: MessageBuilder | null = null;

  public async init() {
    this.file = path.join(__dirname, '../..', config('File', Error, this.options));
    this.module = require(this.file);
    if (typeof this.module.init === 'function') {
      await this.module.init.call(this, this.options, this);
    }
  }

   public async format(thing: Thing) {
     try {
      this.messageBuilder = new MessageBuilder();
      if (typeof this.module.format === 'function') {
        return await this.module.format.call(this, thing, this);
      } else if (typeof this.module === 'function') {
        return await this.module.call(this, thing, this);
      }
      this.logger.error('No format function provided. Please either use `module.exports = function(thing) { ... }` or `module.exports = { init(options) { ... }, format(thing) { ... } }`');
      throw new Error('No format function provided.');
    } finally {
      this.messageBuilder = null;
    }
  }
}
