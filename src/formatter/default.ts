import { MessageBuilder } from "discord-webhook-node";
import Formatter from "./formatter";
import config from '../config';
import Thing from "../thing/thing";

export default class DefaultFormatter extends Formatter {
  private includeSubject!: boolean;
  private includeSender!: boolean;
  private includeBody!: boolean;
  private includeServer!: boolean;

  init() {
    this.includeSubject = config('IncludeSubject', true, this.options);
    this.includeSender = config('IncludeSender', true, this.options);
    this.includeBody = config('IncludeBody', true, this.options);
    this.includeServer = config('IncludeServer', true, this.options);
  }

  format(thing: Thing) {
    const md = this.md(thing.get<string>('content'));
    const sourceThing = thing.get<Thing>('source-thing');
    const origin = thing.get<any[]>('origin');
    let builder = new MessageBuilder();
    if (this.includeSubject) {
      builder = builder.setTitle(this.limit(thing?.get<string>('name')));
    }
    if (this.includeSender) {
      builder = builder.setAuthor(this.limit(this.address(origin)));
    }
    if (this.includeBody) {
      builder = builder.setDescription(this.limit(md));
    }
    if (this.includeServer) {
      const server = `${sourceThing?.get<string>('name')}: ${sourceThing?.get<string>('user')} (${sourceThing?.get<string>('collection')})`;
      builder = builder.setFooter(this.limit(server));
    }      
    return builder;
  }
}
