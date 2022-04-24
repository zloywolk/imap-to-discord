import config from "../config";
import Detector from "./detector";
import Thing from "../thing/thing";

/**
 * Matches a field against a regex.
 */
export default class RegexDetector extends Detector {
  /**
   * The pattern of the regex.
   */
  private pattern!: string;
  /**
   * The regex flags.
   */
  private flags!: string | undefined;
  /**
   * The key to match against.
   */
  private key!: string;
  /**
   * The regex to use.
   */
  private regex!: RegExp;
  /**
   * Pass the detector if the value is undefined.
   */
  private allowMissing!: boolean;

  async init() {
    this.key = config('Key', Error, this.options);
    this.pattern = config('Pattern', Error, this.options);
    this.flags = config('Flags', undefined, this.options);
    this.allowMissing = config('AllowMissing', false, this.options);
    this.regex = new RegExp(this.pattern, this.flags)
  }

  async detect(thing: Thing) {
    const value = thing.get(this.key);
    if (value === undefined) {
      this.logger.debug('Key', this.key, ' not found; missing keys are', this.allowMissing ? 'allowed' : 'not allowed');
      return this.allowMissing;
    }
    const str = '' + value;
    const match = this.regex.test(str);
    this.logger.debug(`Matching ${str} against ${this.pattern}${this.flags ? ' with flags ' + this.flags : ''}: ${match}`);
    return match;
  }
}