import config from "../config";
import Logger from "../log";
import Thing from "../thing/thing";

/**
 * Base class for custom detectors.
 */
export default abstract class Detector {
  /**
   * The type of the detector.
   */
  private readonly type: string;

  constructor(protected readonly logger: Logger, protected readonly options: any) {
    this.type = config('Type', Error, options);
    this.logger.debug('Creating detector ' + this.type);
  }

  /**
   * Initializes the detector.
   */
  abstract init(): Promise<void>;
  /**
   * Detects if the thing is allowed by this detector.
   */
  abstract detect(thing: Thing): Promise<boolean>;
}
