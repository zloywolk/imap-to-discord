const { MessageBuilder } = require("discord-webhook-node");
const Formatter = require("./formatter");

module.exports = class DefaultFormatter extends Formatter {
  /**
   * Formats the message.
   * @param {import('imapflow').FetchMessageObject} message The message.
   */
  format(message) {
    const md = this.getBodyMd(message);
    return new MessageBuilder()
      .setTitle(this.limit(message.envelope?.subject || 'no subject'))
      .setAuthor(this.limit(message.envelope?.from.map(f => f.name || f.address).join(', ') || 'no author'))
      .setDescription(this.limit(md))
      .setFooter(this.limit(message.server.name || 'no server'));
  }
}
