const { Webhook } = require("discord-webhook-node");
const config = require("./config");
const detector = require("./detector");
const formatter = require("./formatter");
const Detector = require("./detector/detector");
const Formatter = require("./formatter/formatter");

/**
 * A forward receives mail events and then forwards them to the discord webhook after formatting it if the mail passed the detector.
 */
module.exports = class Forward {
  constructor(logger, name, options) {
    this.name = name;
    this.logger = logger.fork([`[${this.name}]`]);
    this.logger.debug('Creating forward');
    this.serverLogger = this.logger.fork(['[server]']);
    this.mailsLogger = this.logger.fork(['[mails]']);
    /**
     * @type {Detector}
     */
    this.server = detector(
      this.serverLogger, 
      config('Server', undefined, options)
    );
    /**
     * @type {Detector}
     */
    this.mails = detector(
      this.mailsLogger, 
      config('Mails', undefined, options)
    );
    /**
     * @type {Formatter}
     */
    this.formatter = formatter(
      this.logger, 
      config('Formatter', undefined, options)
    );
    /**
     * @type {Webhook}
     */
    this.webhook = new Webhook(config('Webhook', Error, options));
    this.exclusive = config('Exclusive', true, options);
  }

  async forward(message) {
    try {
      this.logger.debug('New incoming message');
      if (!(await this.server.detect(message.server))) {
        this.serverLogger.debug('Rejected by server detector');
        return false;
      }
      if (!(await this.mails.detect(message))) {
        this.mailsLogger.debug('Rejected by mails detector');
        return false;
      }
      this.logger.info('Will handle incoming message');
      const format = await this.formatter.format(message);
      this.logger.debug('Sending to Webhook');
      await this.webhook.send(format);
      this.logger.debug('Done with forward handling');
      return this.exclusive;
    } catch(error) {
      this.logger.error('Error in forward', error);
      return true;
    }
  }
}