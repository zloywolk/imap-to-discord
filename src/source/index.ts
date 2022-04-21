import config from "../config";
import Logger from "../log";

export default function source(logger: Logger, options: any) {
  const type = config('Type', Error, options);
  switch (type) {
    case 'IMAP': return new AllDetector(logger, options);
    case 'Custom': return new CustomDetector(logger, options);
    case 'Named': return new NamedDetector(logger, options);
    default: {
      logger.error('Unknown detector type ' + type);
      throw new Error('Unknown detector type ' + type);
    }
  }
}
