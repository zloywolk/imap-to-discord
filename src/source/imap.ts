import Logger, { LogLevel } from "../log";
import Source from "./source";
import { FetchMessageObject, ImapFlow } from 'imapflow';
import config from '../config';
import chalk from 'chalk';
import packageInfo from '../../package.json';
import { stringify, parse } from 'comment-json';
import fs from 'fs-extra';
import path from 'path';
import { KVP } from "../types";

/**
 * A connection to a server.
 */
export default class IMAPSource extends Source {
  /**
   * The flag to add to messages to indicate that we have handled them. Marks them as read by default.
   */
  private readonly flag: string;
  /**
   * The mailbox to use.
   */
  private readonly mailbox: string;
  /**
   * Should the server cache its state between restarts?
   */
  private readonly cache: boolean;
    /**
     * The server to use.
     * @type {ImapFlow} The ImapFlow library client.
     */
  private readonly client: ImapFlow;
  /**
   * The last sequence ID read.
   */
  private lastSeq: number | null = null;

  /**
   * Creates a new IMAP server.
   * @param logger The base logger.
   * @param name The name of this server.
   * @param options Options for the IMAP client
   */
  constructor(logger: Logger, name: string, options: any) {
    super(logger, name, options);
    this.logger.debug('Creating IMAP server');
    this.flag = config('Flag', '\\Seen', options);
    this.mailbox = config('Mailbox', 'INBOX', options);
    this.cache = config('Cache', true, options);
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
      ...config('Server', Error, options),
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
        (message as any).server = this;
        this.emit('message', message);
        await this.client.messageFlagsAdd((message as any), [this.flag]);
      }
      await this.saveCache();
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
   * @param message The message.
   */
  logMessage(logger: Logger, level: LogLevel, message: FetchMessageObject, ...args: unknown[]) {
    logger.log(level, ...args, `UID(${message.uid}) SEQ(${message.seq}) ${message.envelope?.subject}`);
  }

  async init() {
    const logger = this.logger.fork([chalk.magenta('[listen]')]);

    // Wait until client connects and authorizes
    logger.info('Connecting');

    await this.loadCache();

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

  async saveCache(logger = this.logger.fork([chalk.green('[cache]')])) {
    if (!this.cache) {
      return;
    }
    logger.debug('Saving cache');
    const str = stringify({
      [Symbol.for('before-all')]: [{type: 'LineComment',  value: 'This file contains the cache of the server ' + this.name + '. The file is automatically generated.' }],
      [Symbol.for('before:LastSequence')] : [{ type: 'LineComment', value: 'The last sequence number handled'}],
      LastSequence: this.lastSeq,
    }, null, 2);
    const [file] = await this.cacheFile();
    await fs.writeFile(file, str, 'utf8');
    logger.debug('Written file', file);
  }

  async loadCache(logger = this.logger.fork([chalk.green('[cache]')])) {
    if (!this.cache) {
      return;
    }
    logger.debug('Loading cache');
    const [file, exists] = await this.cacheFile();
    if (!exists) {
      logger.warn('No cache file at', file);
      return;
    }
    logger.debug('Loading file', file);
    try {
      const data = await fs.readFile(file, 'utf8');
      const json = parse(data) as any;
      this.lastSeq = json.LastSequence || null;
    } catch(error) {
      logger.error('Failed to load cache', error);
    }
  }

  /**
   * Gets the cache file of the imap server. Ensures its directory exists.
   * @returns The path of the file and if it exists.
   */
  async cacheFile(): Promise<KVP<string, boolean>> {
    const cacheLocation = config('CacheLocation', './cache');
    const imapCacheLocation = path.join(cacheLocation, './imap-server/' + this.name);
    await fs.mkdirp(imapCacheLocation);
    const file = path.join(imapCacheLocation, './cache.jsonc');
    return [file, fs.existsSync(file)];
  }
}
