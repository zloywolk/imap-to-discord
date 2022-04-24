import Logger from "../log";
import config from "../config";
import TurndownService from 'turndown';
import Thing from "../thing/thing";
import { MessageBuilder } from "discord-webhook-node";
import { MaybeArray, MaybePromise } from "../types";

/**
 * Base class for custom formatters.
 */
export default abstract class Formatter {
  private readonly type: string;
  private readonly turndownService: TurndownService;

  constructor(private readonly logger: Logger, protected readonly options: any) {
    this.type = config('Type', Error, options);
    this.logger.debug('Creating formatter ' + this.type);
    this.turndownService = new TurndownService();
  }

  /**
   * Initializes the formatter.
   */
  abstract init(): MaybePromise<void>;

  /**
   * Formats a thing.
   * @param thing The thing.
   */
   abstract format(thing: Thing): MaybePromise<MaybeArray<MessageBuilder>>;

  /**
   * Limits the string length for discord safety.
   * @param str The string
   * @param opts Options
   * @returns The trimmed string
   */
  limit(str: string | undefined | null, opts: {length?: number, prefix?: string, suffix?: string} = {}): string {
    const prefix = opts.prefix === undefined ? '' : opts.prefix;
    const suffix = opts.suffix === undefined ? '' : opts.suffix;
    const length = (opts.length === undefined ? 1024 : opts.length) - prefix.length - suffix.length;
    if (str && str.length > length - 3) {
      return prefix + str.substring(0, length - 3) + '...' + suffix;
    }
    return prefix + (str || '\u200B') + suffix;
  }

  /**
   * Gets the body Markdown.
   * @param str The string.
   */
  md(str: string | undefined | null): string {
    return (str && this.turndownService.turndown(str) || '\u200B')
      // Comments
      .replace(/\s*<!--.*?-->\s*/g, '');
  }

  address(address: any) {
    if (!address) {
      return 'none';
    }
    if (!Array.isArray(address)) {
      address = [address];
    }
    return address.map((a: any) => `${a.name} <${a.id}>`).join(', ');
  }
}
