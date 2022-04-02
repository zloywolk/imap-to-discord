const config = require('../config');
const AllDetector = require('./all');
const NamedDetector = require('./named');

module.exports = function detector(logger, options) {
  if (!options) {
    options = { Type: 'All' };
  }
  if (typeof options === 'string') {
    options = { Type: 'Named', Name: options }
  }
  const type = config('Type', undefined, options);
  switch (type) {
    case 'All': return new AllDetector(logger, options);
    case 'Named': return new NamedDetector(logger, options);
    default: {
      logger.error('Unknown detector type ' + type);
      throw new Error('Unknown detector type ' + type);
    }
  }
}
