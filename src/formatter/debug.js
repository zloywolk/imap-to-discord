const { MessageBuilder } = require("discord-webhook-node");
const Formatter = require("./formatter");

/**
 * A formatter that adds debug information.
 */
module.exports = class DebugFormatter extends Formatter {
  /**
   * Formats the message.
   * @param {import('imapflow').FetchMessageObject} message The message.
   */
  format(message) {
    const html = this.getBodyHtml(message);
    console.log(html.substring(0, 1024))
    const steps = 3;
    let step = 1;
    const server = new MessageBuilder()
      .setTitle(`Server (${step++}/${steps})`)
      .addField('Identifiers', this.limit(`SEQ(${message.server.lastSeq}) ID(${message.server.client.id})`))
      .addField('Name', this.limit(message.server.name))
      .addField('Host', this.limit(message.server.client.host))
      .addField('Port', this.limit(message.server.client.port.toString()))
      .addField('Greeting', this.limit(message.server.client.greeting))
      .addField('Mailbox', this.limit(message.server.mailbox))
      .addField('Flag', this.limit(message.server.flag))
    const envelope = new MessageBuilder()
      .setTitle(`Envelope (${step++}/${steps})`)
      .addField('Subject',this.limit( message.envelope?.subject))
      .addField('From', this.limit(this.addresses(message.envelope?.from)))
      .addField('Identifiers', this.limit(`SEQ(${message.seq}) UID(${message.uid}) ID(${message.id})`))
      .addField('Sender', this.limit(this.address(message.envelope?.sender)))
      .addField('To', this.limit(this.addresses(message.envelope?.to)))
      .addField('Reply To', this.limit(this.addresses(message.envelope?.replyTo)))
      .addField('To', this.limit(this.addresses(message.envelope?.to)))
      .addField('CC', this.limit(this.addresses(message.envelope?.cc)))
      .addField('BCC', this.limit(this.addresses(message.envelope?.bcc)))
      .addField('Flags', this.limit(this.join(message.flags)));
    const body = new MessageBuilder()
      .setTitle(`Body (${step++}/${steps})`)
      .addField('Text', this.limit(html, { prefix: '```html\n', suffix: '\n```' }))
    return [server, envelope, body];
  }

  /**
   * @param {import('imapflow').MessageAddressObject[] | null | undefined} addresses
   */
  addresses(addresses) {
    if (!addresses) {
      return 'none';
    }
    const values = addresses.map(a => this.address(a));
    return this.join(values) || 'none';
  }

  /**
   * @param {string[] | Set<string> | null | undefined} strs
   */
  join(strs) {
    if (strs instanceof Set) {
      strs = Array.from(strs);
    }
    if (!strs || strs.length === 0) {
      return 'none';
    }
    return strs.join(', ');
  }

  /**
   * @param {import('imapflow').MessageAddressObject} address
   */
  address(address) {
    if (!address) {
      return 'none';
    }
    if (address.name) {
      return `${address.name} <${address.address}>`;
    }
    return address.address;
  }
}
