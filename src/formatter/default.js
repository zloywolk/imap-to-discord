const { MessageBuilder } = require("discord-webhook-node");
const Formatter = require("./formatter");
const config = require('../config');

module.exports = class DefaultFormatter extends Formatter {
  init() {
    this.includeSubject = config('IncludeSubject', true, this.options);
    this.includeSender = config('IncludeSender', true, this.options);
    this.includeBody = config('IncludeBody', true, this.options);
    this.includeServer = config('IncludeServer', true, this.options);
  }

  format(message) {
    const md = this.getBodyMd(message);
    let builder = new MessageBuilder()
      .setTitle(this.limit(message.envelope?.subject || 'no subject'))
      .setAuthor(this.limit(message.envelope?.from.map(f => f.name || f.address).join(', ') || 'no author'))
      .setDescription(this.limit(md))
      .setFooter(this.limit(message.server.name || 'no server'));
    return builder;
  }
}
