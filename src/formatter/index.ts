import config from '../config';
import CustomFormatter from './custom';
import DebugFormatter from './debug';
import DefaultFormatter from './default';
import Formatter from "./formatter";
import Logger from "../log";

export default function formatter(logger: Logger, options: any): Formatter {
  if (!options) {
    options = { Type: 'Default' };
  }
  if (typeof options === 'string') {
    options = { Type: options };
  }
  const type = config('Type', undefined, options);
  switch (type) {
    case 'Default': return new DefaultFormatter(logger, options);
    case 'Custom': return new CustomFormatter(logger, options);
    case 'Debug': return new DebugFormatter(logger, options);
    default: {
      logger.error('Unknown formatter type ' + type);
      throw new Error('Unknown formatter type ' + type);
    }
  }
}
