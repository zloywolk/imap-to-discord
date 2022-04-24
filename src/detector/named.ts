import config from "../config";
import Detector from "./detector";
import Thing from "../thing/thing";

/**
 * Detects everything with a matching name.
 */
export default class NamedDetector extends Detector {
  private name!: string;
  private caseSensitive!: boolean;

  async init() {
    this.name = config('Name', '', this.options);
    this.caseSensitive = config('CaseSensitive', false, this.options);
  }

  async detect(thing: Thing) {
    return this.case(thing.get<string>('name')) === this.case(this.name);
  }

  /**
   * Sets the case of the string according to the configurated case sensitiveness.
   * @param str The string if any
   * @returns The correctly cased string
   */
  private case(str: string | undefined) {
    str = str || '';
    return this.caseSensitive ? str : str.toLowerCase();
  }
}
