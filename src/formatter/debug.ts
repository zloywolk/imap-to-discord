import { MessageBuilder } from "discord-webhook-node";
import Thing from "../thing/thing";
import Formatter from "./formatter";

/**
 * A formatter that adds debug information.
 */
export default class DebugFormatter extends Formatter {
  init() {
  }

  format(thing: Thing) {
    const steps = 3;
    let step = 1;
    const sourceThing = thing.get<Thing>('source-thing');
    const serverMessage = new MessageBuilder()
      .setTitle(`Source (${step++}/${steps})`)
      .addField('Keys', this.limit(this.join(sourceThing?.keys())))
      .addField('Id', this.limit(sourceThing?.get<string>('id')))
      .addField('Name', this.limit(sourceThing?.get<string>('name')))
    const messageMessage = new MessageBuilder()
      .setTitle(`Message (${step++}/${steps})`)
      .addField('Keys', this.limit(this.join(thing?.keys())))
      .addField('Id', this.limit(thing?.get<string>('id')))
      .addField('Name', this.limit(thing?.get<string>('name')))
    const bodyMessage = new MessageBuilder()
      .setTitle(`Body (${step++}/${steps})`)
      .addField('HTML', this.limit(thing.get<string>('content'), {
        prefix: '```html\n',
        suffix: '\n```',
      }))
      .addField('Markdown', this.limit(this.md(thing.get<string>('content'))))
    return [serverMessage, messageMessage, bodyMessage];
  }

  /**
   * @param {import('imapflow').MessageAddressObject[] | null | undefined} addresses
   
  addresses(addresses) {
    if (!addresses) {
      return 'none';
    }
    const values = addresses.map(a => this.address(a));
    return this.join(values) || 'none';
  }*/

  join(strs: string[] | Set<string> | null | undefined) {
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
   
  address(address) {
    if (!address) {
      return 'none';
    }
    if (address.name) {
      return `${address.name} <${address.address}>`;
    }
    return address.address;
  }*/
}
