import { MessageBuilder, Webhook } from "discord-webhook-node";
import config from "./config";
import detector from "./detector";
import Detector from "./detector/detector";
import formatter from "./formatter";
import Formatter from "./formatter/formatter";
import Logger from "./log";
import Thing from "./thing/thing";
import { MaybeArray } from "./types";

/**
 * A forward receives mail events and then forwards them to the discord webhook after formatting it if the mail passed the detector.
 */
export default class Forward {
  private readonly serverLogger: Logger;
  private readonly mailsLogger: Logger;
  private readonly server: Detector;
  private readonly mails: Detector;
  private readonly formatter: Formatter;
  private readonly webhook: Webhook;
  private readonly exclusive: boolean;

  constructor(private readonly logger: Logger, public readonly name: string, private readonly options: any) {
    this.logger.debug('Creating forward');
    this.serverLogger = this.logger.fork(['[server]']);
    this.mailsLogger = this.logger.fork(['[mails]']);
    /**
     * @type {Detector}
     */
    this.server = detector(
      this.serverLogger, 
      config('Server', undefined, options)
    ) as Detector;
    /**
     * @type {Detector}
     */
    this.mails = detector(
      this.mailsLogger, 
      config('Mails', undefined, options)
    ) as Detector;
    /**
     * @type {Formatter}
     */
    this.formatter = formatter(
      this.logger, 
      config('Formatter', undefined, options)
    ) as Formatter;
    /**
     * @type {Webhook}
     */
    this.webhook = new Webhook(config('Webhook', Error, options));
    this.exclusive = config('Exclusive', true, options);
  }

  async forward(thing: Thing) {
    let hadError = false;
    try {
      this.logger.debug('New incoming message');
      /*if (!(await this.server.detect(message.server))) {
        this.serverLogger.debug('Rejected by server detector');
        return false;
      }
      if (!(await this.mails.detect(message))) {
        this.mailsLogger.debug('Rejected by mails detector');
        return false;
      }*/
      this.logger.info('Will handle incoming message');
      const formats = this.arrayWrap(await this.formatter.format(thing));
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
      this.logger.debug('Done with forward handling');
      return hadError || this.exclusive;
    } catch(error) {
      this.logger.error('Aborting message processing - Error in forward', error);
      try {
        await this.webhook.send('Aborting message processing - Error in forward `' + this.name + '`: ' + (error as any)?.message);
      } catch {}
      return true;
    }
  }

  arrayWrap(arrayOrItem: MaybeArray<MessageBuilder>) {
    if (Array.isArray(arrayOrItem)) {
      return arrayOrItem;
    }
    return [arrayOrItem];
  }
}