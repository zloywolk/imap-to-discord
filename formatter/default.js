const { MessageBuilder } = require("discord-webhook-node");
const Formatter = require("./formatter");
const TurndownService = require('turndown')

module.exports = class DefaultFormatter extends Formatter {
  init() {
    this.turndownService = new TurndownService();
  }

  /**
   * Formats the message.
   * @param {import('imapflow').FetchMessageObject} message The message.
   */
  format(message) {
    const html = message.bodyParts.get('text')?.toString() || '';
    const md = this.turndownService.turndown(html);
    return new MessageBuilder()
      .setTitle(this.limit(message.envelope?.subject || 'no subject'))
      .setAuthor(this.limit(message.envelope?.from.map(f => f.name || f.address).join(', ') || 'no author'))
      .setDescription(this.limit(md))
      .setFooter(this.limit(message.server.name || 'no server'));
  }
}
