import { MaybeArray } from "./types";
import { MessageBuilder, Webhook } from "discord-webhook-node";
import config from "./config";
import detector from "./detector";
import Detector from "./detector/detector";
import formatter from "./formatter";
import Formatter from "./formatter/formatter";
import Logger from "./log";
import Thing from "./thing/thing";

/**
 * A forward receives message events and then forwards them to the discord webhook after formatting it if the message passed the detector.
 */
export default class Forward {
  /**
   * Source related logs.
   */
  private readonly sourceLogger: Logger;
  /**
   * Message reladed logs.
   */
  private readonly messageLogger: Logger;
  /**
   * Format reladed logs.
   */
  private readonly formatLogger: Logger;
  /**
   * Detector for which sources should be forwarded.
   */
  private readonly source: Detector;
  /**
   * Detector for which messages should be forwarded.
   */
  private readonly messages: Detector;
  /**
   * The message formatter.
   */
  private readonly formatter: Formatter;
  /**
   * The discord webhook.
   */
  private readonly webhook: Webhook;
  /**
   * Is this forward exclusively handling messages or allow the message to be handled by multiple forwards?
   */
  private readonly exclusive: boolean;

  constructor(private readonly logger: Logger, public readonly name: string, private readonly options: any) {
    this.logger.debug('Creating forward');
    this.sourceLogger = this.logger.fork(['[source]']);
    this.messageLogger = this.logger.fork(['[message]']);
    this.formatLogger = this.logger.fork(['[format]']);
    this.source = detector(
      this.sourceLogger, 
      config('Source', undefined, options)
    );
    this.messages = detector(
      this.messageLogger, 
      config('Message', undefined, options)
    );
    this.formatter = formatter(
      this.formatLogger, 
      config('Formatter', undefined, options)
    ) as Formatter;
    this.webhook = new Webhook(config('Webhook', Error, options));
    this.exclusive = config('Exclusive', true, options);
  }

  /**
   * Initializes the forward.
   */
   public async init() {
    await Promise.all([
      this.source.init(),
      this.messages.init(),
      this.formatter.init(),
    ]);
  }

  /**
   * Forwards the message to the discord webhook.
   * @param thing The thing to forward
   * @returns Should the next forward be called?
   */
  public async forward(thing: Thing) {
    let hadError = false;
    // Extend thing with forward data (clear in finally due to possible non-exclusive thing sharing!)
    thing = thing
      .append('forward', this.name)
      .append('forward-thing', new Thing()
        .append('id', this.name)
        .append('name', this.name)
        .append('type', 'forward')
        .append('subtype', 'discord'));
    try {
      this.logger.debug('New incoming message');
      // Detect
      const sourceThing = thing.get<Thing>('source-thing');
      this.sourceLogger.debug('Running source detector');
      if (sourceThing && !(await this.source.detect(sourceThing))) {
        this.sourceLogger.debug('Rejected by source detector');
        return false;
      }
      this.sourceLogger.debug('Passed source detector');
      this.formatLogger.debug('Running messages detector');
      if (!(await this.messages.detect(thing))) {
        this.formatLogger.debug('Rejected by messages detector');
        return false;
      }
      this.formatLogger.debug('Passed messages detector');
      // Format
      this.formatLogger.info('Formatting incoming message');
      const formats = this.arrayWrap(await this.formatter.format(thing));
      // Send
      this.logger.debug('Sending', formats.length, 'message(s) to Webhook');
      for (const format of formats) {
        try {
          await this.webhook.send(format);
        } catch (err) {
          hadError = true;
          this.logger.error('Aborting message processing - Failed to send message to Webhook', err, format);
          try {
            await this.webhook.send('Aborting message processing - Failed to send message to Webhook from forward `' + this.name + '`: ' + (err as any)?.message);
          } catch {}
        }
      }
      // Done, is exclusive?
      this.logger.debug('Done with forward handling');
      return hadError || this.exclusive;
    } catch(error) {
      this.logger.error('Aborting message processing - Error in forward', error);
      try {
        await this.webhook.send('Aborting message processing - Error in forward `' + this.name + '`: ' + (error as any)?.message);
      } catch {}
      return true;
    } finally {
      thing = thing
        .clear('forward')
        .clear('forward-thing');
    }
  }

  private arrayWrap(arrayOrItem: MaybeArray<MessageBuilder>) {
    if (Array.isArray(arrayOrItem)) {
      return arrayOrItem;
    }
    return [arrayOrItem];
  }
}
