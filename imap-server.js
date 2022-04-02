const { ImapFlow } = require('imapflow');
const config = require('./config');
const chalk = require('chalk');
const EventEmitter = require('events');

/**
 * A connection to a server.
 */
module.exports = class ImapServer extends EventEmitter {
  /**
   * Creates a new IMAP server.
   * @param {import('./log')} logger The base logger.
   * @param {string} name The name of this server.
   * @param {any} options Options for the IMAP client
   */
  constructor(logger, name, options) {
    super();
    /**
     * The name of the server.
     * @type {string} Any string.
     */
    this.name = name;
    /**
     * The logger.
     * @type {import('./log')} Logger instance.
     */
    this.logger = logger.fork([`[${this.name}]`]);
    this.logger.debug('Creating IMAP server');
    /**
     * The flag to add to messages to indicate that we have handled them. Marks them as read by default.
     * @type {string} Any string allowed by the mail server.
     */
    this.flag = config('Flag', '\\Seen', options);
    /**
     * The mailbox to use.
     * @type {string} Any string existing on the mail server.
     */
    this.mailbox = config('Mailbox', 'INBOX', options);
    this.lastSeq = null;
    const imapLogger = this.logger.fork([chalk.grey('[imap]')]);
    /**
     * The server to use.
     * @type {ImapFlow} The ImapFlow library client.
     */
    this.client = new ImapFlow({
      logger: {
        debug: c => imapLogger.debug(c.msg),
        info: c => imapLogger.debug(c.msg),
        warn: c => imapLogger.debug(c.msg),
        error: c => imapLogger.debug(c.msg),
      },
      ...config('Server', Error, options),
    });
  }

  async onExists(opts) {
    const logger = this.logger.fork([chalk.magenta('[listen]')]);
    const newCount = opts.count - opts.prevCount;
    logger.debug('Got ' + newCount + ' new mails in ' + opts.path);
    
    const lock = await this.client.getMailboxLock(this.mailbox);
    try {
      const msgs = [];
      if (this.lastSeq === null) {
        this.lastSeq = this.client.mailbox.exists - newCount;
      }
      // Following messages
      for await (const message of this.client.fetch((this.lastSeq + 1) + ':*', {
        envelope: true,
        flags: true,
        bodyParts: ['TEXT'],
      })) { // TODO: Or via date? { since: ... }
        this.logMessage(logger, 'info', message, 'New Message', { lastSeq: this.lastSeq });
        this.lastSeq = message.seq;
        msgs.push(message);
      }
      for (const message of msgs) {
        this.logMessage(logger, 'debug', message, 'Marking with flag', this.flag);
        message.server = this;
        this.emit('message', message);
        await this.client.messageFlagsAdd(message, [this.flag]);
      }
    } catch(error) {
      logger.error('Message handler', error);
    } finally {
      // Make sure lock is released, otherwise next `getMailboxLock()` never returns
      lock.release();
    }
    logger.debug('Finished handling new Message');
  }

  /**
   * Logs an IMAP message.
   * @param {import('imapflow').FetchMessageObject} message The message.
   */
  logMessage(logger, level, message, ...args) {
    logger.log(level, ...args, `UID(${message.uid}) SEQ(${message.seq}) ${message.envelope?.subject}`);
  }

  async listen() {
    const logger = this.logger.fork([chalk.magenta('[listen]')]);
    // Wait until client connects and authorizes
    logger.info('Connecting');
    await this.client.connect();
    logger.info('Connected');

    const lock = await this.client.getMailboxLock(this.mailbox);
    try {
      this.client.addListener('exists', opts => this.onExists(opts));
    } catch(error) {
      logger.error('SMTP Server error', error);
    } finally {
      lock.release();
    }

    // log out and close connection
    //await client.logout();
  }
}
