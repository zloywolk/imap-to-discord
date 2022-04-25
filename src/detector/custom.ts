import path from "path";
import config from "../config";
import Thing from "../thing/thing";
import Detector from "./detector";

/**
 * Detects using a custom function.
 */
export default class CustomDetector extends Detector {
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

  public async init() {
    this.file = path.join(__dirname, '../..', config('File', Error, this.options));
    this.module = require(this.file);
    if (typeof this.module.init === 'function') {
      this.module.init.call(this, this.options, this);
    }
  }

  public async detect(thing: Thing) {
    if (typeof this.module.detect === 'function') {
      return this.module.detect.call(this, thing, this);
    } else if (typeof this.module === 'function') {
      return this.module.call(this, thing, this);
    }
    this.logger.error('No detect function provided. Please either use `module.exports = function(thing) { ... }` or `module.exports = { init(options) { ... }, detect(thing) { ... } }`');
    throw new Error('No detect function provided.');
  }
}