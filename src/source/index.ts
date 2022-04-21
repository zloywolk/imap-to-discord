import config from "../config";
import Logger from "../log";
import GraphSource from "./graph";
import IMAPSource from "./imap";

export default function source(logger: Logger, name: string, options: any) {
  const type = config('Type', Error, options);
  switch (type) {
    case 'IMAP': return new IMAPSource(logger, name, options);
    case 'Graph': return new GraphSource(logger, name, options);
    default: {
      logger.error('Unknown source type ' + type);
      throw new Error('Unknown source type ' + type);
    }
  }
}
