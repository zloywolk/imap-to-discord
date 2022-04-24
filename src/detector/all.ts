import thing from "../thing/thing";
import Detector from "./detector";

/**
 * Detects everything.
 */
export default class AllDetector extends Detector {
  async init() {
    return;
  }

  async detect(thing: thing) {
    return true;
  }
}
