import AllDetector from './all';
import config from '../config';
import CustomDetector from './custom';
import Detector from "./detector";
import Logger from "../log";
import NamedDetector from './named';
import RegexDetector from "./regex";

export default function detector(logger: Logger, options: any): Detector {
  if (!options) {
    options = { Type: 'All' };
  }
  if (typeof options === 'string') {
    options = { Type: 'Named', Name: options }
  }
  const type = config('Type', undefined, options);
  switch (type) {
    case 'All': return new AllDetector(logger, options);
    case 'Custom': return new CustomDetector(logger, options);
    case 'Named': return new NamedDetector(logger, options);
    case 'Regex': return new RegexDetector(logger, options);
    default: {
      logger.error('Unknown detector type ' + type);
      throw new Error('Unknown detector type ' + type);
    }
  }
}
