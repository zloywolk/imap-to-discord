import Logger from "../log";
import Detector from "./detector";
import config from '../config';
import AllDetector from './all';
import CustomDetector from './custom';
import NamedDetector from './named';

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
    default: {
      logger.error('Unknown detector type ' + type);
      throw new Error('Unknown detector type ' + type);
    }
  }
}
