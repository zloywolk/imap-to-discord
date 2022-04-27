import { cacheComment } from "../cache";
import { FetchMessageObject, ImapFlow, MessageAddressObject } from 'imapflow';
import chalk from 'chalk';
import config from '../config';
import Logger, { LogLevel } from "../log";
import packageInfo from '../../package.json';
import Source from "./source";
import Thing from "../thing/thing";
import { MaybeArray } from "../types";

interface Cache {
  LastSequence: number; 
}

/**
 * A connection to a server.
 */
export default class IMAPSource extends Source<Cache> {
  /**
   * The flag to add to messages to indicate that we have handled them. Marks them as read by default.
   */
  private readonly flag: string;
  /**
   * The mailbox to use.
   */
  private readonly mailbox: string;
    /**
     * The server to use.
     * @type {ImapFlow} The ImapFlow library client.
     */
  private readonly client: ImapFlow;
  /**
   * The user used for the mailbox.
   */
  private readonly user: string;
  /**
   * The last sequence ID read.
   */
  private lastSeq: number | null = null;

  constructor(logger: Logger, name: string, options: any) {
    super(logger, name, options);
    this.logger.debug('Creating IMAP server');
    this.flag = config('Flag', '\\Seen', options);
    this.mailbox = config('Mailbox', 'INBOX', options);
    const imapLogger = this.logger.fork([chalk.grey('[imap]')]);
    function imapLog(level: LogLevel, c: any) {
      if (level === 'error' || c.err) {
        imapLogger.error('An error occurred', c);
      } else if (c.msg) {
        imapLogger.log(level, c.msg)
      } else {
        imapLogger.log(level, c)
      }
    }
    const imapServer = config('Server', Error, options);
    this.user = imapServer.auth?.user || 'no user';
    this.client = new ImapFlow({
      logger: {
        debug: c => imapLog('debug', c),
        info: c => imapLog('info', c),
        warn: c => imapLog('warn', c),
        error: c => imapLog('error', c),
      },
      clientInfo: {
        vendor: packageInfo.author,
        'support-url': packageInfo.bugs.url,
        name: packageInfo.name,
        version: packageInfo.version,
      },
      ...imapServer,
    });
  }

  async onExists(opts: any) {
    const logger = this.logger.fork([chalk.magenta('[listen]')]);
    const newCount = opts.count - opts.prevCount;
    logger.debug('Got ' + newCount + ' new mails in ' + opts.path);
    
    const lock = await this.client.getMailboxLock(this.mailbox);
    try {
      const msgs = [];
      if (this.lastSeq === null && typeof this.client.mailbox !== 'boolean') {
        this.lastSeq = this.client.mailbox.exists - newCount;
      }
      // Following messages
      for await (const message of this.client.fetch((this.lastSeq === null ? 0 : this.lastSeq + 1) + ':*', {
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
        const thing = this.createMessageThing(message);
        this.emit('message', thing);
        await this.client.messageFlagsAdd((message as any), [this.flag]);
      }
    } catch(error) {
      logger.error('Message handler', error);
    } finally {
      // Make sure lock is released, otherwise next `getMailboxLock()` never returns
      lock.release();
    }
    logger.debug('Finished handling new Message');
  }

  createMessageThing(message: FetchMessageObject) {
    return new Thing<MessageThing>({
      id: message.uid.toString(),
      type: 'message',
      subtype: 'imap',
      name:  message.envelope.subject,
      content: message.bodyParts.get('text')?.toString() || 'no content',
      origin: this.mail(message.envelope.sender),
      destination: [
        ...this.mail(message.envelope.to),
        ...this.mail(message.envelope.cc),
        ...this.mail(message.envelope.bcc)
      ],
    });
  }

  mail(a: MaybeArray<MessageAddressObject>): { id: string, name: string }[] {
    if (!a) {
      return [];
    }
    if (!Array.isArray(a)) {
      a = [a];
    }
    return a.map(v => ({ id: v.address || '', name: v.name || '' }));
  }

  /**
   * Logs an IMAP message.
   * @param message The message.
   */
  logMessage(logger: Logger, level: LogLevel, message: FetchMessageObject, ...args: unknown[]) {
    logger.log(level, ...args, `UID(${message.uid}) SEQ(${message.seq}) ${message.envelope?.subject}`);
  }

  async init() {
    const logger = this.logger.fork([chalk.magenta('[listen]')]);

    // Wait until client connects and authorizes
    logger.info('Connecting');

    await this.client.connect();
    logger.info('Connected');

    const tree = await this.client.listTree();
    for (const folder of tree.folders) {
      logger.debug('Available mailbox', folder.path);
    }

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

  protected async saveCache() {
    return {
      // LastSequence
      ...cacheComment('before:LastSequence', 'The last sequence number handled'),
      LastSequence: this.lastSeq,
    } as Cache;
  }

  protected async loadCache(cache: Cache) {
    this.lastSeq = cache.LastSequence;
  }

  public getThing(): Thing<SourceThing> {
    return super.getThing()
      .clear('collection').append('collection', this.mailbox)
      .clear('user').append('user', this.user);
  }
}