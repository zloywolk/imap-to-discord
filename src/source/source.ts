import EventEmitter from "events";
import config from "../config";
import Logger from "../log";
import Thing from "../thing/thing";

/**
 * A source describes how a message can be fetched.
 */
export default abstract class Source extends EventEmitter {
  private readonly type: string;

  /**
   * Constructs a new Source.
   * @param logger The logger to use.
   * @param name The name of the source.
   * @param options Options for the source.
   */
  constructor(protected readonly logger: Logger, public readonly name: string, protected readonly options: any) {
    super();
    this.type = config('Type', Error, options);
    logger.debug(`Created new source ${name}`);
  }

  /**
   * Initializes the source.
   */
  abstract init(): Promise<void>;

  protected getThing(): Thing {
    return new Thing()
      .append('id', this.name)
      .append('type', 'source')
      .append('subtype', this.type)
      .append('name', this.name);
  }
}
