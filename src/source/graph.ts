import { cacheComment } from "../cache";
import { Client, PageCollection, PageIterator } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import config from "../config";
import Logger from "../log";
import Source from "./source";
import Thing from "../thing/thing";

interface Cache {
  LastId: string;
  LastDate: string;
}

/**
 * A source using the Microsoft Graph API for Azure.
 */
export default class GraphSource extends Source<Cache> {
  /**
   * The Microsoft Graph API client.
   */
  private readonly client: Client;
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly userId: string;
  private readonly mailbox: string;
  private readonly clientSecret: string;
  private readonly scopes: string[];
  private readonly pollingInterval: number;

  /**
   * The last ID handled by this endpoint.
   */
  private lastId: string | null = null;
  /**
   * The last date handled by this endpoint.
   */
  private lastDate: Date = new Date();
  /**
   * Use date or ID handling for mail de-dupe.
   */
  private mailDeduplication: 'Id' | 'Date';

  constructor(logger: Logger, name: string, options: any) {
    super(logger, name, options);
    this.tenantId = config('TenantId', Error, options);
    this.clientId = config('ClientId', Error, options);
    this.clientSecret = config('ClientSecret', Error, options);
    this.scopes = config('Scopes', ['https://graph.microsoft.com/.default'], options);
    this.userId = this.ensureSafeForGraphUrl(config('UserId', Error, options));
    this.mailbox = this.ensureSafeForGraphUrl(config('Mailbox', 'Inbox', options));
    this.pollingInterval = config('PollingInterval', 30000, options);
    this.mailDeduplication = config('MailDeduplication', 'Date', options);
    this.logger.debug('Using deduplication strategy', this.mailDeduplication);

    const credential = new ClientSecretCredential(this.tenantId, this.clientId, this.clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: this.scopes,
    });
    
    this.client = Client.initWithMiddleware({
      authProvider,
    });
  }

  async init() {
    setInterval(() => this.poll(), this.pollingInterval);
  }

  protected async saveCache() {
    return {
      // LastId
      ...cacheComment('before:LastId', 'The last ID handled. IDs are ephemeral in Azure, and may change at any time. All mails are handled until a mail with this ID is found.  \n!! LEGACY WARNING - Can potentially re-send ALL of your mails to the forward in case of an ID mismatch - Does not work with empty Mailboxes !!\n(Enable with "MailDeduplication": "Id" in source config)'),
      LastId: this.lastId,
      // LastDate
      ...cacheComment('before:LastDate', 'The date of the last message handled. Messages before it will be ignored.\n(Enable with "MailDeduplication": "Date" in source config; default enabled)'),
      LastDate: this.lastDate.toISOString(),
    } as Cache;
  }

  protected async loadCache(cache: Cache) {
    this.lastId = cache.LastId;
    this.lastDate = new Date(cache.LastDate);
  }

  async poll() {
    try {
      this.logger.debug('Starting poll ( LastId:', this.lastId, 'LastDate:', this.lastDate, ')');
      const select = [
        'subject', 'body', 'from', 'toRecipients', 'receivedDateTime',
      ];
      const res: PageCollection = await this.client.api(`/users/${this.userId}/mailFolders/${this.mailbox}/messages`).select(select).get();
      let newLastId = this.lastId;
      let newLastDate = this.lastDate;
      const messages: any[] = [];
      const iterator = new PageIterator(this.client, res, data => {
        // Should dedupe?
        const id = data.id;
        const receivedDateTime = new Date(data.receivedDateTime);
        switch (this.mailDeduplication) {
          case 'Date': {
            if (receivedDateTime <= this.lastDate) {
              return false;
            }
            newLastId = id;
            newLastDate = receivedDateTime;
            break;
          }
          case 'Id': {
            if (this.lastId === id) {
              return false;
            }
            // Save even though we dont actually handle the mail since it's the first and ID based handling needs a first one.
            newLastId = id;
            newLastDate = receivedDateTime;
            if (this.lastId === null) {
              return false;
            }
            break;
          }
        }
        // Handle
        this.logger.debug('New message from Graph', data.subject);
        messages.push(data);
        return true;
      });
      await iterator.iterate();
      this.lastId = newLastId;
      this.lastDate = newLastDate;
      // Emit messages
      for (const message of messages) {
        const thing = this.createMessageThing(message);
        this.emit('message', thing);
      }
      this.logger.debug('Finished poll ( LastId:', this.lastId, 'LastDate:', this.lastDate, ')');
    } catch(err) {
      this.logger.error('Error while polling', err);
    }
  }

  createMessageThing(message: any) {
    return new Thing()
      .append('id', message.id)
      .append('type', 'message')
      .append('subtype', 'graph')
      .append('name', message.subject)
      .append('content', message.body.content)
      .append('origin', this.mail(message.from))
      .append('destination', this.mail(message.toRecipients));
  }

  mail(a: any): null | { id: string, name: string }[] {
    if (!a) {
      return null;
    }
    if (!Array.isArray(a)) {
      a = [a];
    }
    return a.map((v: any) => ({ id: v.emailAddress.address, name: v.emailAddress.name }));
  }

  ensureSafeForGraphUrl(str: string) {
    if (str.includes('/') || str.includes("'")) {
      throw new Error('The Graph resource may not contain apostrophes or slashes. Please use the GUID instead. (' + str + ')');
    }
    return str;
  }

  public getThing(): Thing {
    return super.getThing()
      .append('collection', this.mailbox)
      .append('user', this.userId);
  }
}