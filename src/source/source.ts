import EventEmitter from "events";
import Logger from "../log";

/**
 * A source describes how a message can be fetched.
 */
export default abstract class Source extends EventEmitter {
  /**
   * Constructs a new Source.
   * @param logger The logger to use.
   * @param name The name of the source.
   * @param options Options for the source.
   */
  constructor(protected readonly logger: Logger, public readonly name: string, protected readonly options: any) {
    super();
    logger.debug(`Created new source ${name}`);
  }

  /**
   * Initializes the source.
   */
  abstract init(): Promise<void>;
}
