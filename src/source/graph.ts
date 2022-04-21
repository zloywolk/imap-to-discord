import Source from "./source";
import { ClientSecretCredential } from "@azure/identity";
import { Client, PageCollection, PageIterator } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import Logger from "../log";
import config from "../config";
import Thing from "../thing/thing";

/**
 * A source using the Microsoft Graph API for Azure.
 */
export default class GraphSource extends Source {
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

  constructor(logger: Logger, name: string, options: any) {
    super(logger, name, options);
    this.tenantId = config('TenantId', Error, options);
    this.clientId = config('ClientId', Error, options);
    this.clientSecret = config('ClientSecret', Error, options);
    this.scopes = config('Scopes', ['https://graph.microsoft.com/.default'], options);
    this.userId = this.ensureSafeForGraphUrl(config('UserId', Error, options));
    this.mailbox = this.ensureSafeForGraphUrl(config('Mailbox', 'Inbox', options));
    this.pollingInterval = config('PollingInterval', 30000, options);

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

  async poll() {
    this.logger.debug('Starting poll with old last ID', this.lastId);
    const select = [
      'subject', 'body', 'from', 'toRecipients',
    ];
    const res: PageCollection = await this.client.api(`/users/${this.userId}/mailFolders/${this.mailbox}/messages`).select(select).get();
    let newLastId = this.lastId;
    const messages: any[] = [];
    const iterator = new PageIterator(this.client, res, data => {
      if (this.lastId === data.id) {
        return false;
      }
      newLastId = data.id;
      if (this.lastId === null) {
        return false;
      }
      this.logger.debug('New message from Graph', data.subject);
      messages.push(data);
      return true;
    });
    await iterator.iterate();
    this.lastId = newLastId;
    // Emit messages
    for (const message of messages) {
      const thing = new Thing()
        .append('id', message.id)
        .append('type', 'message')
        .append('subtype', 'message')
        .append('name', message.subject)
        .append('content', message.body.content)
        .append('source', this.name)
        .append('origin', this.mail(message.from))
        .append('destination', this.mail(message.toRecipients))
        .append('source-thing', this.getThing());
      this.emit('message', thing);
    }
    this.logger.debug('Finished poll with new last ID', this.lastId);
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

  protected getThing(): Thing {
    return super.getThing()
      .append('collection', this.mailbox)
      .append('user', this.userId);
  }
}